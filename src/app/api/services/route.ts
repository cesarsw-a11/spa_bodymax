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
  await requireAdmin();
  const body = await req.json();
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return Response.json({ ok: false, error: "El precio debe ser un número mayor que 0." }, { status: 400 });
  }
  const data = await prisma.service.create({ data: {
    name: body.name,
    description: body.description,
    imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    price,
    durationMin: body.durationMin,
    active: body.active ?? true
  }});
  return Response.json({ ok: true, data });
}