import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdminModule } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseAddonIdsFromJson(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");
  const data = await prisma.booking.findUnique({
    where: { id },
    include: { service: true, serviceVariant: true },
  });
  if (!data) return errJson(404, "BOOKING_NOT_FOUND", "Reserva no encontrada");

  const addonIds = parseAddonIdsFromJson(data.addonsJson);
  let addonNames: string[] = [];
  if (addonIds.length > 0) {
    const rows = await prisma.addon.findMany({ where: { id: { in: addonIds } } });
    addonNames = addonIds
      .map((aid) => rows.find((r: { id: number; name: string }) => r.id === aid)?.name)
      .filter((n): n is string => !!n);
  }

  const { stripePaymentIntentId: _pi, ...bookingRest } = data;
  void _pi;
  return Response.json({ ok: true, data: { ...bookingRest, addonNames } });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("bookings");
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");
  const body = await req.json();
  const nextStatus = body?.status as string | undefined;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return errJson(404, "BOOKING_NOT_FOUND", "Reserva no encontrada");

  if (nextStatus === "CONFIRMED") {
    if (booking.status !== "PENDING") {
      return errJson(
        409,
        "CONFIRM_PENDING_ONLY",
        "Solo se puede confirmar una reserva en estado PENDIENTE.",
      );
    }
    const data = await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED" } });
    return Response.json({ ok: true, data });
  }

  if (nextStatus === "CANCELLED") {
    if (booking.status === "CANCELLED") {
      return errJson(409, "BOOKING_ALREADY_CANCELLED", "La reserva ya está cancelada.");
    }

    let refundId: string | null = null;
    const piId = booking.stripePaymentIntentId?.trim() || null;

    if (booking.status === "CONFIRMED" && piId) {
      try {
        const stripe = getStripe();
        const refund = await stripe.refunds.create({ payment_intent: piId });
        refundId = refund.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido en Stripe";
        return errJson(
          502,
          "REFUND_STRIPE_FAILED",
          `No se pudo procesar el reembolso en Stripe: ${msg}`,
        );
      }
    }

    const data = await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });

    return Response.json({
      ok: true,
      data,
      refund:
        booking.status === "CONFIRMED" && piId
          ? { processed: true, refundId }
          : booking.status === "CONFIRMED" && !piId
            ? { processed: false, reason: "Sin PaymentIntent guardado (pago previo a esta función o confirmación manual)." }
            : { processed: false, reason: "Reserva pendiente sin cobro confirmado en Stripe." },
    });
  }

  return errJson(400, "INVALID_STATUS", "Estado no válido. Usa CONFIRMED o CANCELLED.");
}