import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { getStripe } from "@/lib/stripe";
import { decimalToNumber, resolveSnapshotServiceName } from "@/lib/giftCard";
import type { AppLocale } from "@/i18n/routing";

export const runtime = "nodejs";

function parseLocale(raw: unknown): AppLocale {
  return raw === "en" ? "en" : "es";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const giftCardOrderId = Number(body.giftCardOrderId);
  if (!Number.isFinite(giftCardOrderId) || giftCardOrderId <= 0) {
    return errJson(400, "INVALID_ID", "Identificador de tarjeta no válido.");
  }
  const locale = parseLocale(body.locale);

  const order = await prisma.giftCardOrder.findUnique({ where: { id: giftCardOrderId } });
  if (!order) return errJson(404, "GIFT_CARD_NOT_FOUND", "Tarjeta de regalo no encontrada.");
  if (order.status !== "PENDING") {
    return errJson(409, "GIFT_CARD_NOT_PAYABLE", `La tarjeta no está lista para pagar (status=${order.status})`);
  }

  const amountCents = Math.round(decimalToNumber(order.amount) * 100);
  if (amountCents <= 0) return errJson(400, "PRICE_INVALID", "El precio debe ser mayor que 0.");

  const host = req.headers.get("host") ?? "";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  const successUrl = `${baseUrl}/${locale}/gift-cards/confirmacion?giftCardOrderId=${encodeURIComponent(String(order.id))}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/${locale}/gift-cards/confirmacion?giftCardOrderId=${encodeURIComponent(String(order.id))}&cancelled=1&session_id={CHECKOUT_SESSION_ID}`;
  const productName = `${locale === "en" ? "Gift card" : "Tarjeta de regalo"} · ${resolveSnapshotServiceName(order, locale)}`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: order.currency || "mxn",
        product_data: { name: productName },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    customer_email: order.senderEmail ?? undefined,
    metadata: { kind: "gift_card", giftCardOrderId: String(order.id) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) return errJson(500, "STRIPE_NO_URL", "No se pudo crear la sesión de pago");

  await prisma.giftCardOrder.updateMany({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return Response.json({ ok: true, url: session.url });
}
