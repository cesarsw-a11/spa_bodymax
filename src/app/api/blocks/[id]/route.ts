import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdminModule } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("blocked");
  if (unauthorized) return unauthorized;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) {
    return errJson(400, "INVALID_ID", "ID inválido");
  }

  try {
    await prisma.blockedSlot.delete({ where: { id } });
  } catch {
    return errJson(404, "BLOCK_NOT_FOUND", "Bloqueo no encontrado");
  }

  return Response.json({ ok: true });
}
