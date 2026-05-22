import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { decimalToNumber } from "@/lib/giftCard";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) return errJson(400, "INVALID_ID", "Identificador no válido.");

  const order = await prisma.giftCardOrder.findUnique({ where: { id } });
  if (!order) return errJson(404, "GIFT_CARD_NOT_FOUND", "Tarjeta de regalo no encontrada.");

  return Response.json({
    ok: true,
    data: {
      id: order.id,
      status: order.status,
      amount: decimalToNumber(order.amount),
      currency: order.currency,
      serviceNameSnapshot: order.serviceNameSnapshot,
      serviceNameEnSnapshot: order.serviceNameEnSnapshot,
      variantLabelSnapshot: order.variantLabelSnapshot,
      variantLabelEnSnapshot: order.variantLabelEnSnapshot,
      variantDurationSnapshot: order.variantDurationSnapshot,
      recipientName: order.recipientName,
      senderName: order.senderName,
      senderEmail: order.senderEmail,
      message: order.message,
      redeemCode: order.status === "CONFIRMED" ? order.redeemCode : null,
      createdAt: order.createdAt,
    },
  });
}
