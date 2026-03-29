import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawServiceId, variantId: rawVid } = await params;
  const serviceId = Number(rawServiceId);
  const variantId = Number(rawVid);
  if (Number.isNaN(serviceId) || Number.isNaN(variantId)) {
    return errJson(400, "INVALID_ID", "ID inválido");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const existing = await prisma.serviceVariant.findFirst({
    where: { id: variantId, serviceId },
  });
  if (!existing) return errJson(404, "VARIANT_NOT_FOUND", "Variante no encontrada.");

  const data: {
    durationMin?: number;
    price?: number;
    label?: string | null;
    labelEn?: string | null;
    sortOrder?: number;
    active?: boolean;
  } = {};

  if ("durationMin" in body) {
    const durationMin = Math.round(Number(body.durationMin));
    if (!Number.isFinite(durationMin) || durationMin < 1) {
      return errJson(400, "DURATION_INVALID", "La duración debe ser un entero mayor o igual a 1 (minutos).");
    }
    data.durationMin = durationMin;
  }

  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return errJson(400, "PRICE_INVALID", "El precio debe ser un número mayor que 0.");
    }
    data.price = price;
  }

  if ("label" in body) {
    data.label = typeof body.label === "string" ? body.label.trim() || null : null;
  }

  if ("labelEn" in body) {
    data.labelEn = typeof body.labelEn === "string" ? body.labelEn.trim() || null : null;
  }

  if ("sortOrder" in body) {
    const sortOrder = Math.round(Number(body.sortOrder));
    if (Number.isFinite(sortOrder)) data.sortOrder = sortOrder;
  }

  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  if (Object.keys(data).length === 0) {
    return errJson(400, "NO_CHANGES", "No hay cambios que aplicar.");
  }

  const row = await prisma.serviceVariant.update({ where: { id: variantId }, data });

  // Mantener Service.price/durationMin alineados con la primera variante (legacy / listados)
  const first = await prisma.serviceVariant.findFirst({
    where: { serviceId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  if (first) {
    await prisma.service.update({
      where: { id: serviceId },
      data: { price: first.price, durationMin: first.durationMin },
    });
  }

  return Response.json({ ok: true, data: row });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawServiceId, variantId: rawVid } = await params;
  const serviceId = Number(rawServiceId);
  const variantId = Number(rawVid);
  if (Number.isNaN(serviceId) || Number.isNaN(variantId)) {
    return errJson(400, "INVALID_ID", "ID inválido");
  }

  const existing = await prisma.serviceVariant.findFirst({
    where: { id: variantId, serviceId },
  });
  if (!existing) return errJson(404, "VARIANT_NOT_FOUND", "Variante no encontrada.");

  const count = await prisma.booking.count({ where: { serviceVariantId: variantId } });
  if (count > 0) {
    return errJson(
      409,
      "VARIANT_DELETE_BOOKINGS",
      "No se puede eliminar: hay reservas asociadas a esta opción.",
    );
  }

  const remainingBefore = await prisma.serviceVariant.count({ where: { serviceId } });
  if (remainingBefore <= 1) {
    return errJson(400, "VARIANT_LAST", "El servicio debe tener al menos una opción de duración/precio.");
  }

  await prisma.serviceVariant.delete({ where: { id: variantId } });

  const first = await prisma.serviceVariant.findFirst({
    where: { serviceId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  if (first) {
    await prisma.service.update({
      where: { id: serviceId },
      data: { price: first.price, durationMin: first.durationMin },
    });
  }

  return Response.json({ ok: true });
}
