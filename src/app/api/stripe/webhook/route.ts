import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { paymentIntentIdFromCheckoutSession } from "@/lib/stripeBooking";
import type Stripe from "stripe";

export const runtime = "nodejs";

type GiftCardOrderStatusUpdate = "CONFIRMED" | "CANCELLED";

async function handleGiftCardSession(
  session: Stripe.Checkout.Session,
  outcome: GiftCardOrderStatusUpdate,
): Promise<Response | null> {
  const giftCardId = Number(session?.metadata?.giftCardOrderId);
  if (!Number.isFinite(giftCardId) || giftCardId <= 0) {
    return new Response("Invalid giftCardOrderId metadata", { status: 400 });
  }

  if (outcome === "CONFIRMED") {
    const stripePaymentIntentId = paymentIntentIdFromCheckoutSession(session);
    await prisma.giftCardOrder.updateMany({
      where: { id: giftCardId, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      },
    });
  } else {
    await prisma.giftCardOrder.updateMany({
      where: { id: giftCardId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }
  return null;
}

async function handleBookingSession(
  session: Stripe.Checkout.Session,
  outcome: GiftCardOrderStatusUpdate,
): Promise<Response | null> {
  const bookingId = session?.metadata?.bookingId;
  const id = Number(bookingId);
  if (!bookingId || Number.isNaN(id)) {
    return new Response("Invalid bookingId metadata", { status: 400 });
  }

  if (outcome === "CONFIRMED") {
    const stripePaymentIntentId = paymentIntentIdFromCheckoutSession(session);
    await prisma.booking.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
      },
    });
  } else {
    await prisma.booking.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }
  return null;
}

function isGiftCardSession(session: Stripe.Checkout.Session): boolean {
  return session?.metadata?.kind === "gift_card" || Boolean(session?.metadata?.giftCardOrderId);
}

export async function POST(req: Request) {
  let event: Stripe.Event;
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });

  const body = await req.text();
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const failure = isGiftCardSession(session)
        ? await handleGiftCardSession(session, "CONFIRMED")
        : await handleBookingSession(session, "CONFIRMED");
      if (failure) return failure;
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const failure = isGiftCardSession(session)
        ? await handleGiftCardSession(session, "CANCELLED")
        : await handleBookingSession(session, "CANCELLED");
      if (failure) return failure;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
