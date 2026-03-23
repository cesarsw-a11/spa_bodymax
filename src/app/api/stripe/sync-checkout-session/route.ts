import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const bookingId = Number(body.bookingId);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!sessionId || Number.isNaN(bookingId)) {
    return Response.json({ ok: false, error: "bookingId/sessionId inválidos" }, { status: 400 });
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return Response.json({ ok: false, error: "No se pudo recuperar el session en Stripe" }, { status: 400 });
  }

  const sessionBookingId = session?.metadata?.bookingId;
  if (!sessionBookingId || Number(sessionBookingId) !== bookingId) {
    return Response.json({ ok: false, error: "session_id no corresponde a esta reserva" }, { status: 400 });
  }

  const isPaid = session.payment_status === "paid";

  if (isPaid) {
    await prisma.booking.updateMany({ where: { id: bookingId, status: "PENDING" }, data: { status: "CONFIRMED" } });
  } else {
    await prisma.booking.updateMany({ where: { id: bookingId, status: "PENDING" }, data: { status: "CANCELLED" } });
  }

  return Response.json({ ok: true, status: isPaid ? "CONFIRMED" : "CANCELLED" });
}

