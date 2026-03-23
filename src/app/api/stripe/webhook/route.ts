import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { paymentIntentIdFromCheckoutSession } from "@/lib/stripeBooking";
import type Stripe from "stripe";

export const runtime = "nodejs";

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
      const bookingId = session?.metadata?.bookingId;

      const id = Number(bookingId);
      if (!bookingId || Number.isNaN(id)) return new Response("Invalid bookingId metadata", { status: 400 });

      const stripePaymentIntentId = paymentIntentIdFromCheckoutSession(session);
      await prisma.booking.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
        },
      });
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session?.metadata?.bookingId;

      const id = Number(bookingId);
      if (!bookingId || Number.isNaN(id)) return new Response("Invalid bookingId metadata", { status: 400 });

      await prisma.booking.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}

