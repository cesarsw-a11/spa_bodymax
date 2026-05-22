import { prisma } from "@/lib/prisma";
import type { GiftCardOrder, Service, ServiceVariant } from "@prisma/client";
import type Stripe from "stripe";

/** Caracteres seguros para códigos: sin O/0/I/1/L para evitar confusión visual. */
const REDEEM_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Genera un código de canje del estilo "GIFT-XXXX-XXXX" usando un alfabeto sin
 * caracteres ambiguos. El módulo `crypto` se usa para reducir colisiones.
 */
export function generateRedeemCode(): string {
  const bytes = randomBytes(8);
  let core = "";
  for (let i = 0; i < bytes.length; i++) {
    core += REDEEM_ALPHABET[bytes[i] % REDEEM_ALPHABET.length];
  }
  return `GIFT-${core.slice(0, 4)}-${core.slice(4, 8)}`;
}

function randomBytes(n: number): Uint8Array {
  // En Node 18+ existe webcrypto en runtime nodejs.
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) {
    const out = new Uint8Array(n);
    g.crypto.getRandomValues(out);
    return out;
  }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

/** Genera un código único intentando varias veces ante una colisión muy improbable. */
export async function reserveUniqueRedeemCode(maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRedeemCode();
    const existing = await prisma.giftCardOrder.findUnique({ where: { redeemCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique redeem code");
}

/** Convierte Decimal/string/number en number con dos decimales. */
export function decimalToNumber(value: unknown): number {
  if (value && typeof (value as { toNumber?: unknown }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type GiftCardServiceSnapshot = {
  serviceNameSnapshot: string;
  serviceNameEnSnapshot: string | null;
  variantLabelSnapshot: string | null;
  variantLabelEnSnapshot: string | null;
  variantDurationSnapshot: number | null;
  amount: number;
};

export function buildServiceSnapshot(
  service: Service,
  variant: ServiceVariant | null,
): GiftCardServiceSnapshot {
  const amount = decimalToNumber(variant ? variant.price : service.price);
  return {
    serviceNameSnapshot: service.name,
    serviceNameEnSnapshot: service.nameEn ?? null,
    variantLabelSnapshot: variant?.label ?? null,
    variantLabelEnSnapshot: variant?.labelEn ?? null,
    variantDurationSnapshot: variant?.durationMin ?? service.durationMin,
    amount,
  };
}

/**
 * Devuelve el nombre legible para el comprador a partir del snapshot ya guardado
 * (no del catálogo vivo, para mantener consistencia con lo pagado).
 */
export function resolveSnapshotServiceName(order: GiftCardOrder, locale: "es" | "en"): string {
  if (locale === "en" && order.serviceNameEnSnapshot && order.serviceNameEnSnapshot.trim()) {
    return order.serviceNameEnSnapshot;
  }
  return order.serviceNameSnapshot;
}

export function resolveSnapshotVariantLabel(order: GiftCardOrder, locale: "es" | "en"): string | null {
  const en = order.variantLabelEnSnapshot?.trim();
  const es = order.variantLabelSnapshot?.trim();
  if (locale === "en") return en || es || null;
  return es || en || null;
}

/** Extrae el id de PaymentIntent desde una Checkout Session de Stripe. */
export function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string" && pi.startsWith("pi_")) return pi;
  if (pi && typeof pi === "object" && "id" in pi && typeof (pi as { id: unknown }).id === "string") {
    const id = (pi as { id: string }).id;
    return id.startsWith("pi_") ? id : null;
  }
  return null;
}
