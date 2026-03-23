import Stripe from "stripe";

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  // apiVersion fija para evitar cambios inesperados.
  return new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET env var");
  }
  return secret;
}

