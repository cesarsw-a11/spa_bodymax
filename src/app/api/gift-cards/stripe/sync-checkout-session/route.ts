import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { getStripe } from "@/lib/stripe";
import { paymentIntentIdFromSession } from "@/lib/giftCard";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const giftCardOrderId = Number(body.giftCardOrderId);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  if (!sessionId || !Number.isFinite(giftCardOrderId) || giftCardOrderId <= 0) {
    return errJson(400, "SYNC_BAD_INPUT", "Identificadores de tarjeta o sesión no válidos.");
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return errJson(400, "STRIPE_SESSION_NOT_FOUND", "No se pudo recuperar la sesión en Stripe.");
  }

  const sessionGiftId = session?.metadata?.giftCardOrderId;
  if (!sessionGiftId || Number(sessionGiftId) !== giftCardOrderId) {
    return errJson(400, "SESSION_GIFT_MISMATCH", "La sesión no corresponde a esta tarjeta.");
  }

  const isPaid = session.payment_status === "paid";

  if (isPaid) {
    const stripePaymentIntentId = paymentIntentIdFromSession(session);
    await prisma.giftCardOrder.updateMany({
      where: { id: giftCardOrderId, status: "PENDING" },
      data: { status: "CONFIRMED", ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}) },
    });
  } else {
    await prisma.giftCardOrder.updateMany({
      where: { id: giftCardOrderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }

  return Response.json({ ok: true, status: isPaid ? "CONFIRMED" : "CANCELLED" });
}
