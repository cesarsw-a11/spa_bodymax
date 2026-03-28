import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
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
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const data = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!data) return Response.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });

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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const body = await req.json();
  const nextStatus = body?.status as string | undefined;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return Response.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });

  if (nextStatus === "CONFIRMED") {
    if (booking.status !== "PENDING") {
      return Response.json(
        { ok: false, error: "Solo se puede confirmar una reserva en estado PENDIENTE." },
        { status: 409 },
      );
    }
    const data = await prisma.booking.update({ where: { id }, data: { status: "CONFIRMED" } });
    return Response.json({ ok: true, data });
  }

  if (nextStatus === "CANCELLED") {
    if (booking.status === "CANCELLED") {
      return Response.json({ ok: false, error: "La reserva ya está cancelada." }, { status: 409 });
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
        return Response.json(
          { ok: false, error: `No se pudo procesar el reembolso en Stripe: ${msg}` },
          { status: 502 },
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

  return Response.json({ ok: false, error: "Estado no válido. Usa CONFIRMED o CANCELLED." }, { status: 400 });
}