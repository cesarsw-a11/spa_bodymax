import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const body = await req.json();
  const data = await prisma.service.update({ where: { id }, data: { active: body.active } });
  return Response.json({ ok: true, data });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  await requireAdmin();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingsCount > 0) {
    return Response.json(
      { ok: false, error: "No se puede eliminar: el servicio tiene reservas asociadas." },
      { status: 409 }
    );
  }

  await prisma.service.delete({ where: { id } });
  return Response.json({ ok: true });
}