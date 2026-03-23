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
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const pagination = parsePagination(searchParams);

  if (pagination) {
    const { page, limit } = pagination;
    const [total, data] = await Promise.all([
      prisma.blockedSlot.count(),
      prisma.blockedSlot.findMany({
        orderBy: { start: "desc" },
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

  const data = await prisma.blockedSlot.findMany({ orderBy: { start: "desc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const data = await prisma.blockedSlot.create({ data: { start: new Date(body.start), end: new Date(body.end), reason: body.reason } });
  return Response.json({ ok: true, data });
}