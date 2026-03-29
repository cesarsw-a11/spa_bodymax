import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
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
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!name) {
    return errJson(400, "NAME_REQUIRED", "El nombre es obligatorio.");
  }
  if (!description) {
    return errJson(400, "DESC_REQUIRED", "La descripción es obligatoria.");
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return errJson(400, "PRICE_INVALID", "El precio debe ser un número mayor que 0.");
  }

  const durationMin = Math.round(Number(body.durationMin));
  if (!Number.isFinite(durationMin) || durationMin < 1) {
    return errJson(
      400,
      "DURATION_INVALID",
      "La duración debe ser un entero mayor o igual a 1 (minutos).",
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
    return errJson(500, "DB_ERROR", message);
  }
}