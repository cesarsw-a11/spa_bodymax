import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const data = await prisma.service.findMany({ orderBy: { id: "asc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const data = await prisma.service.create({ data: {
    name: body.name,
    description: body.description,
    imageUrl: typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    price: body.price,
    durationMin: body.durationMin,
    active: body.active ?? true
  }});
  return Response.json({ ok: true, data });
}