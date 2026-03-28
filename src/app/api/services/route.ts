import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function parsePagination(searchParams: URLSearchParams) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  if (pageRaw === null && limitRaw === null) return null;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitRaw || "10", 10) || 10));
  return { page, limit };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pagination = parsePagination(searchParams);

  if (pagination) {
    const { page, limit } = pagination;
    const [total, data] = await Promise.all([
      prisma.service.count(),
      prisma.service.findMany({
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return Response.json({
      ok: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  const data = await prisma.service.findMany({ orderBy: { id: "asc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Cuerpo de la petición no válido (JSON esperado)." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!name) {
    return Response.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!description) {
    return Response.json({ ok: false, error: "La descripción es obligatoria." }, { status: 400 });
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return Response.json({ ok: false, error: "El precio debe ser un número mayor que 0." }, { status: 400 });
  }

  const durationMin = Math.round(Number(body.durationMin));
  if (!Number.isFinite(durationMin) || durationMin < 1) {
    return Response.json(
      { ok: false, error: "La duración debe ser un entero mayor o igual a 1 (minutos)." },
      { status: 400 },
    );
  }

  try {
    const data = await prisma.service.create({
      data: {
        name,
        description,
        imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
        price,
        durationMin,
        active: body.active !== false,
      },
    });
    return Response.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar en la base de datos.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}