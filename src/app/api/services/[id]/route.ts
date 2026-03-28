import { prisma } from "@/lib/prisma";
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
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Cuerpo de la petición no válido (JSON esperado)." }, { status: 400 });
  }

  const data: {
    name?: string;
    description?: string;
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
      return Response.json({ ok: false, error: "El nombre no puede estar vacío." }, { status: 400 });
    }
    data.name = name;
  }

  if ("description" in body) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description) {
      return Response.json({ ok: false, error: "La descripción no puede estar vacía." }, { status: 400 });
    }
    data.description = description;
  }

  if ("price" in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return Response.json({ ok: false, error: "El precio debe ser un número mayor que 0." }, { status: 400 });
    }
    data.price = price;
  }

  if ("durationMin" in body) {
    const durationMin = Math.round(Number(body.durationMin));
    if (!Number.isFinite(durationMin) || durationMin < 1) {
      return Response.json(
        { ok: false, error: "La duración debe ser un entero mayor o igual a 1 (minutos)." },
        { status: 400 },
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
    return Response.json({ ok: false, error: "No hay cambios que aplicar." }, { status: 400 });
  }

  try {
    const row = await prisma.service.update({ where: { id }, data });
    return Response.json({ ok: true, data: row });
  } catch {
    return Response.json({ ok: false, error: "Servicio no encontrado." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingsCount > 0) {
    return Response.json(
      { ok: false, error: "No se puede eliminar: el servicio tiene reservas asociadas." },
      { status: 409 },
    );
  }

  try {
    await prisma.service.delete({ where: { id } });
  } catch {
    return Response.json({ ok: false, error: "Servicio no encontrado." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
