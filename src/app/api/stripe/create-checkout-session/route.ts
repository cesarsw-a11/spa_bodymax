import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { getStripe } from "@/lib/stripe";
import type { AppLocale } from "@/i18n/routing";

export const runtime = "nodejs";

function parseLocale(raw: unknown): AppLocale {
  return raw === "en" ? "en" : "es";
}

export async function POST(req: Request) {
  const body = await req.json();
  const bookingIdRaw = body.bookingId;
  const bookingId = Number(bookingIdRaw);
  const locale = parseLocale(body.locale);

  if (!bookingIdRaw || Number.isNaN(bookingId)) {
    return errJson(400, "INVALID_BOOKING_ID", "bookingId inválido");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) return errJson(404, "BOOKING_NOT_FOUND", "Reserva no encontrada");
  if (booking.status !== "PENDING") {
    return errJson(
      409,
      "BOOKING_NOT_PAYABLE",
      `La reserva no está lista para pagar (status=${booking.status})`,
    );
  }
  if (!booking.service || !booking.service.active) {
    return errJson(400, "SERVICE_UNAVAILABLE", "Servicio no disponible");
  }

  const priceValue = booking.price as unknown;
  const priceNumber =
    typeof (priceValue as { toNumber?: unknown }).toNumber === "function"
      ? (priceValue as { toNumber: () => number }).toNumber()
      : Number(priceValue);
  const amountCents = Math.round(priceNumber * 100);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/${locale}/reserve/confirmacion?bookingId=${encodeURIComponent(String(booking.id))}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/${locale}/reserve/confirmacion?bookingId=${encodeURIComponent(String(booking.id))}&cancelled=1&session_id={CHECKOUT_SESSION_ID}`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: booking.service.name,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: booking.email ?? undefined,
    metadata: { bookingId: String(booking.id) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    return errJson(500, "STRIPE_NO_URL", "No se pudo crear la sesión de pago");
  }

  return Response.json({ ok: true, url: session.url });
}
