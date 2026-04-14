import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireSuperAdmin } from "@/lib/auth";
import {
  normalizeAdminPermissions,
  stringifyPermissions,
  type AdminPermissions,
} from "@/lib/admin-permissions";

export async function GET() {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const rows = await prisma.adminRole.findMany({
    orderBy: [{ name: "asc" }],
    include: { _count: { select: { users: true } } },
  });
  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    active: r.active,
    permissions: normalizeAdminPermissions(JSON.parse(r.permissionsJson)),
    usersCount: r._count.users,
  }));
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return errJson(400, "ROLE_NAME_REQUIRED", "El nombre del rol es obligatorio.");
  const permissions = normalizeAdminPermissions(body.permissions);

  try {
    const row = await prisma.adminRole.create({
      data: {
        name,
        active: body.active !== false,
        permissionsJson: stringifyPermissions(permissions),
      },
    });
    return Response.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        active: row.active,
        permissions: permissions as AdminPermissions,
      },
    });
  } catch {
    return errJson(409, "ROLE_NAME_TAKEN", "Ya existe un rol con ese nombre.");
  }
}
