import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const data = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
  if (!data) return Response.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });
  return Response.json({ ok: true, data });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const body = await req.json();
  const data = await prisma.booking.update({ where: { id }, data: { status: body.status } });
  return Response.json({ ok: true, data });
}