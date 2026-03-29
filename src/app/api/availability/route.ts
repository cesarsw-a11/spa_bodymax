import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { computeEnd } from "@/lib/utils";

export async function POST(req: Request) {
  let body: { serviceVariantId?: unknown; start?: unknown };
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const variantId = Number(body.serviceVariantId);
  if (!Number.isInteger(variantId) || variantId < 1) {
    return errJson(400, "VARIANT_REQUIRED", "Indica una opción de servicio válida (serviceVariantId).");
  }

  const variant = await prisma.serviceVariant.findUnique({
    where: { id: variantId },
    include: { service: true },
  });

  if (!variant || !variant.active || !variant.service.active) {
    return errJson(400, "VARIANT_INVALID", "Opción de servicio no disponible.");
  }

  const begin = new Date(body.start as string);
  if (isNaN(begin.getTime())) {
    return errJson(400, "INVALID_DATE", "Fecha no válida.");
  }

  const end = computeEnd(begin, variant.durationMin);

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        serviceId: variant.serviceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [{ AND: [{ date: { lt: end } }, { endDate: { gt: begin } }] }],
      },
    }),
    prisma.blockedSlot.findMany({
      where: { AND: [{ start: { lt: end } }, { end: { gt: begin } }] },
    }),
  ]);

  if (bookings.length > 0) {
    return Response.json({ ok: true, available: false, reason: "Horario ocupado" });
  }
  if (blocks.length > 0) {
    return Response.json({
      ok: true,
      available: false,
      reason: blocks[0].reason || "Bloqueado",
    });
  }
  return Response.json({ ok: true, available: true });
}
