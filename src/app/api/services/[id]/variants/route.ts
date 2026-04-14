import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdminModule } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

const variantOrderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

export async function GET(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("services");
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const serviceId = Number(rawId);
  if (Number.isNaN(serviceId)) return errJson(400, "INVALID_ID", "ID inválido");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return errJson(404, "SERVICE_NOT_FOUND", "Servicio no encontrado.");

  const variants = await prisma.serviceVariant.findMany({
    where: { serviceId },
    orderBy: variantOrderBy,
  });
  return Response.json({ ok: true, data: variants });
}

export async function POST(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("services");
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const serviceId = Number(rawId);
  if (Number.isNaN(serviceId)) return errJson(400, "INVALID_ID", "ID inválido");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return errJson(404, "SERVICE_NOT_FOUND", "Servicio no encontrado.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return errJson(400, "PRICE_INVALID", "El precio debe ser un número mayor que 0.");
  }

  const durationMin = Math.round(Number(body.durationMin));
  if (!Number.isFinite(durationMin) || durationMin < 1) {
    return errJson(400, "DURATION_INVALID", "La duración debe ser un entero mayor o igual a 1 (minutos).");
  }

  const label = typeof body.label === "string" ? body.label.trim() || null : null;
  const labelEn = typeof body.labelEn === "string" ? body.labelEn.trim() || null : null;
  const sortOrder = Math.round(Number(body.sortOrder));
  const active = body.active !== false;

  const row = await prisma.serviceVariant.create({
    data: {
      serviceId,
      durationMin,
      price,
      label,
      labelEn,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      active,
    },
  });

  return Response.json({ ok: true, data: row });
}
