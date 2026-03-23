import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const bookingIdRaw = body.bookingId;
  const bookingId = Number(bookingIdRaw);

  if (!bookingIdRaw || Number.isNaN(bookingId)) {
    return Response.json({ ok: false, error: "bookingId inválido" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) return Response.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });
  if (booking.status !== "PENDING") {
    return Response.json(
      { ok: false, error: `La reserva no está lista para pagar (status=${booking.status})` },
      { status: 409 }
    );
  }
  if (!booking.service || !booking.service.active) {
    return Response.json({ ok: false, error: "Servicio no disponible" }, { status: 400 });
  }

  const priceValue = booking.price as unknown;
  const priceNumber =
    typeof (priceValue as { toNumber?: unknown }).toNumber === "function"
      ? (priceValue as { toNumber: () => number }).toNumber()
      : Number(priceValue);
  const amountCents = Math.round(priceNumber * 100);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/reserve/confirmacion?bookingId=${encodeURIComponent(String(booking.id))}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/reserve/confirmacion?bookingId=${encodeURIComponent(String(booking.id))}&cancelled=1&session_id={CHECKOUT_SESSION_ID}`;

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
    return Response.json({ ok: false, error: "No se pudo crear la sesión de pago" }, { status: 500 });
  }

  return Response.json({ ok: true, url: session.url });
}

