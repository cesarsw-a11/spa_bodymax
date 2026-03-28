import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) {
    return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.blockedSlot.delete({ where: { id } });
  } catch {
    return Response.json({ ok: false, error: "Bloqueo no encontrado" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
