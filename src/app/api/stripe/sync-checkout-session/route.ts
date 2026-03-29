import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { getStripe } from "@/lib/stripe";
import { paymentIntentIdFromCheckoutSession } from "@/lib/stripeBooking";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const bookingId = Number(body.bookingId);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!sessionId || Number.isNaN(bookingId)) {
    return errJson(400, "SYNC_BAD_INPUT", "bookingId/sessionId inválidos");
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return errJson(400, "STRIPE_SESSION_NOT_FOUND", "No se pudo recuperar el session en Stripe");
  }

  const sessionBookingId = session?.metadata?.bookingId;
  if (!sessionBookingId || Number(sessionBookingId) !== bookingId) {
    return errJson(400, "SESSION_BOOKING_MISMATCH", "session_id no corresponde a esta reserva");
  }

  const isPaid = session.payment_status === "paid";

  if (isPaid) {
    const stripePaymentIntentId = paymentIntentIdFromCheckoutSession(session);
    await prisma.booking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      },
    });
  } else {
    await prisma.booking.updateMany({ where: { id: bookingId, status: "PENDING" }, data: { status: "CANCELLED" } });
  }

  return Response.json({ ok: true, status: isPaid ? "CONFIRMED" : "CANCELLED" });
}

