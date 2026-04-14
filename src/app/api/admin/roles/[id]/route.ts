import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireSuperAdmin } from "@/lib/auth";
import { normalizeAdminPermissions, stringifyPermissions } from "@/lib/admin-permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const data: {
    name?: string;
    active?: boolean;
    permissionsJson?: string;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return errJson(400, "ROLE_NAME_REQUIRED", "El nombre del rol es obligatorio.");
    data.name = name;
  }

  if (typeof body.active === "boolean") data.active = body.active;
  if ("permissions" in body) {
    data.permissionsJson = stringifyPermissions(normalizeAdminPermissions(body.permissions));
  }
  if (Object.keys(data).length === 0) return errJson(400, "NO_CHANGES", "No hay cambios que aplicar.");

  try {
    const row = await prisma.adminRole.update({ where: { id }, data });
    return Response.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        active: row.active,
        permissions: normalizeAdminPermissions(JSON.parse(row.permissionsJson)),
      },
    });
  } catch {
    return errJson(404, "ROLE_NOT_FOUND", "Rol no encontrado.");
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  const role = await prisma.adminRole.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return errJson(404, "ROLE_NOT_FOUND", "Rol no encontrado.");
  if (role._count.users > 0) {
    return errJson(409, "ROLE_IN_USE", "No se puede eliminar el rol porque tiene empleados asignados.");
  }
  await prisma.adminRole.delete({ where: { id } });
  return Response.json({ ok: true });
}
