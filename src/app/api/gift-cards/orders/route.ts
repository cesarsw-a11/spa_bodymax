import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { buildServiceSnapshot, reserveUniqueRedeemCode } from "@/lib/giftCard";
import { isValidEmailFormat, isValidPersonName, normalizeGiftMessage, normalizePersonName } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const serviceId = Number(body.serviceId);
  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    return errJson(400, "INVALID_ID", "Identificador de servicio no válido.");
  }

  const variantIdRaw = body.serviceVariantId;
  const serviceVariantId =
    variantIdRaw === undefined || variantIdRaw === null || variantIdRaw === ""
      ? null
      : Number(variantIdRaw);
  if (serviceVariantId !== null && (!Number.isFinite(serviceVariantId) || serviceVariantId <= 0)) {
    return errJson(400, "VARIANT_INVALID", "Esa opción de servicio no está disponible.");
  }

  const recipientName = normalizePersonName(typeof body.recipientName === "string" ? body.recipientName : "");
  const senderName = normalizePersonName(typeof body.senderName === "string" ? body.senderName : "");
  const senderEmailRaw = typeof body.senderEmail === "string" ? body.senderEmail.trim() : "";
  const message = normalizeGiftMessage(typeof body.message === "string" ? body.message : "");

  if (!isValidPersonName(recipientName)) return errJson(400, "GC_RECIPIENT_REQUIRED", "El nombre de quien recibe es obligatorio.");
  if (!isValidPersonName(senderName)) return errJson(400, "GC_SENDER_REQUIRED", "El nombre de quien envía es obligatorio.");
  if (senderEmailRaw && !isValidEmailFormat(senderEmailRaw)) {
    return errJson(400, "INVALID_EMAIL", "Indica un correo electrónico válido.");
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId }, include: { variants: true } });
  if (!service || !service.active) {
    return errJson(400, "SERVICE_UNAVAILABLE", "Servicio no disponible.");
  }

  let variant = null as Awaited<ReturnType<typeof prisma.serviceVariant.findUnique>> | null;
  if (serviceVariantId !== null) {
    variant = service.variants.find((v) => v.id === serviceVariantId && v.active) ?? null;
    if (!variant) return errJson(400, "VARIANT_INVALID", "Esa opción de servicio no está disponible.");
  } else {
    const active = service.variants.filter((v) => v.active);
    if (active.length === 1) variant = active[0];
    else if (active.length > 1) {
      return errJson(400, "VARIANT_REQUIRED", "Debes elegir una opción de duración o precio para el servicio.");
    }
  }

  const snapshot = buildServiceSnapshot(service, variant);
  if (snapshot.amount <= 0) return errJson(400, "PRICE_INVALID", "El precio debe ser un número mayor que 0.");

  let redeemCode: string;
  try {
    redeemCode = await reserveUniqueRedeemCode();
  } catch {
    return errJson(500, "DB_ERROR", "No se pudo generar el código de canje. Intenta nuevamente.");
  }

  try {
    const order = await prisma.giftCardOrder.create({
      data: {
        status: "PENDING",
        amount: snapshot.amount,
        currency: "mxn",
        serviceId: service.id,
        serviceVariantId: variant?.id ?? null,
        serviceNameSnapshot: snapshot.serviceNameSnapshot,
        serviceNameEnSnapshot: snapshot.serviceNameEnSnapshot,
        variantLabelSnapshot: snapshot.variantLabelSnapshot,
        variantLabelEnSnapshot: snapshot.variantLabelEnSnapshot,
        variantDurationSnapshot: snapshot.variantDurationSnapshot,
        recipientName,
        senderName,
        senderEmail: senderEmailRaw || null,
        message: message || null,
        redeemCode,
      },
    });
    return Response.json({ ok: true, data: { id: order.id, amount: snapshot.amount, currency: order.currency, status: order.status, redeemCode: order.redeemCode } });
  } catch (e) {
    return errJson(500, "DB_ERROR", e instanceof Error ? e.message : "Error al guardar.");
  }
}
