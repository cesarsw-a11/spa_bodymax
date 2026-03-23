import type Stripe from "stripe";

/** Obtiene el id del PaymentIntent desde una Checkout Session (string o objeto expandido). */
export function paymentIntentIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string" && pi.startsWith("pi_")) return pi;
  if (pi && typeof pi === "object" && "id" in pi && typeof (pi as { id: unknown }).id === "string") {
    const id = (pi as { id: string }).id;
    return id.startsWith("pi_") ? id : null;
  }
  return null;
}
