import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeImageUrl(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t ? t : null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const data: {
    name?: string;
    description?: string;
    nameEn?: string | null;
    descriptionEn?: string | null;
    imageUrl?: string | null;
    price?: number;
    durationMin?: number;
    active?: boolean;
  } = {};

  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return errJson(400, "NAME_EMPTY", "El nombre no puede estar vacío.");
    }
    data.name = name;
  }

  if ("description" in body) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) {
      return errJson(400, "DESC_EMPTY", "La descripción no puede estar vacía.");
    }
    data.description = description;
  }

  if ("nameEn" in body) {
    data.nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() || null : null;
  }

  if ("descriptionEn" in body) {
    data.descriptionEn = typeof body.descriptionEn === "string" ? body.descriptionEn.trim() || null : null;
  }

  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return errJson(400, "PRICE_INVALID", "El precio debe ser un número mayor que 0.");
    }
    data.price = price;
  }

  if ("durationMin" in body) {
    const durationMin = Math.round(Number(body.durationMin));
    if (!Number.isFinite(durationMin) || durationMin < 1) {
      return errJson(
        400,
        "DURATION_INVALID",
        "La duración debe ser un entero mayor o igual a 1 (minutos).",
      );
    }
    data.durationMin = durationMin;
  }

  if ("imageUrl" in body) {
    const n = normalizeImageUrl(body.imageUrl);
    if (n !== undefined) {
      data.imageUrl = n;
    }
  }

  if (Object.keys(data).length === 0) {
    return errJson(400, "NO_CHANGES", "No hay cambios que aplicar.");
  }

  try {
    const row = await prisma.service.update({ where: { id }, data });
    return Response.json({ ok: true, data: row });
  } catch {
    return errJson(404, "SERVICE_NOT_FOUND", "Servicio no encontrado.");
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingsCount > 0) {
    return errJson(
      409,
      "SERVICE_DELETE_BOOKINGS",
      "No se puede eliminar: el servicio tiene reservas asociadas.",
    );
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    return errJson(404, "SERVICE_NOT_FOUND", "Servicio no encontrado.");
  }

  return Response.json({ ok: true });
}
