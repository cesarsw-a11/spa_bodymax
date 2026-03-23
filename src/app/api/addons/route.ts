import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("all") === "1") {
    await requireAdmin();
    const rows = await prisma.addon.findMany({ orderBy: { id: "asc" } });
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      active: r.active,
    }));
    return Response.json({ ok: true, data });
  }

  const rows = await prisma.addon.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true, name: true, price: true },
  });
  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price),
  }));
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  const active = body.active !== false;
  if (!name) {
    return Response.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return Response.json({ ok: false, error: "El precio debe ser mayor que 0." }, { status: 400 });
  }
  const row = await prisma.addon.create({
    data: { name, price, active },
  });
  return Response.json({ ok: true, data: { ...row, price: Number(row.price) } });
}
