import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");
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
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");
  await prisma.addon.delete({ where: { id } });
  return Response.json({ ok: true });
}
