import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { decimalToNumber } from "@/lib/giftCard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (se esperaba JSON).");
  }

  const raw = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!raw) return errJson(400, "GIFT_CARD_CODE_REQUIRED", "Indica el código de la tarjeta de regalo.");

  const order = await prisma.giftCardOrder.findUnique({
    where: { redeemCode: raw },
    include: { service: true, serviceVariant: true },
  });

  if (!order) return errJson(404, "GIFT_CARD_NOT_FOUND", "Tarjeta de regalo no encontrada.");
  if (order.status !== "CONFIRMED") {
    return errJson(409, "GIFT_CARD_NOT_REDEEMABLE", "Esta tarjeta aún no está pagada o fue cancelada y no se puede canjear.");
  }
  if (order.redeemedAt) return errJson(409, "GIFT_CARD_ALREADY_REDEEMED", "Esta tarjeta de regalo ya fue canjeada.");
  if (!order.service.active) return errJson(409, "GIFT_CARD_SERVICE_UNAVAILABLE", "El servicio asociado a esta tarjeta ya no está disponible.");
  if (order.serviceVariant && !order.serviceVariant.active) {
    return errJson(409, "GIFT_CARD_VARIANT_UNAVAILABLE", "La opción asociada a esta tarjeta ya no está disponible.");
  }

  return Response.json({
    ok: true,
    data: {
      redeemCode: order.redeemCode,
      recipientName: order.recipientName,
      senderName: order.senderName,
      amount: decimalToNumber(order.amount),
      currency: order.currency,
      serviceId: order.serviceId,
      serviceVariantId: order.serviceVariantId,
      serviceNameSnapshot: order.serviceNameSnapshot,
      serviceNameEnSnapshot: order.serviceNameEnSnapshot,
      variantLabelSnapshot: order.variantLabelSnapshot,
      variantLabelEnSnapshot: order.variantLabelEnSnapshot,
      variantDurationSnapshot: order.variantDurationSnapshot ?? order.serviceVariant?.durationMin ?? null,
    },
  });
}
