import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const body = await req.json();
  const data = await prisma.addon.update({
    where: { id },
    data: { active: Boolean(body.active) },
  });
  return Response.json({ ok: true, data: { ...data, price: Number(data.price) } });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  await prisma.addon.delete({ where: { id } });
  return Response.json({ ok: true });
}
