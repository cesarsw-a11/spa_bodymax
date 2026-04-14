import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireSuperAdmin } from "@/lib/auth";

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
    email?: string;
    role?: "USER" | "ADMIN";
    adminRoleId?: number | null;
    password?: string;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return errJson(400, "NAME_REQUIRED", "El nombre es obligatorio.");
    data.name = name;
  }

  if ("email" in body) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return errJson(400, "INVALID_EMAIL", "Indica un correo electrónico válido.");
    data.email = email;
  }

  if ("role" in body) {
    if (body.role !== "USER" && body.role !== "ADMIN") {
      return errJson(400, "INVALID_ROLE", "Rol inválido.");
    }
    data.role = body.role;
  }

  if ("adminRoleId" in body) {
    const roleIdRaw = Number(body.adminRoleId);
    data.adminRoleId = Number.isFinite(roleIdRaw) ? roleIdRaw : null;
  }

  if ("password" in body) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password && password.length < 6) {
      return errJson(400, "PASSWORD_MIN", "La contraseña debe tener al menos 6 caracteres.");
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
  }

  if (Object.keys(data).length === 0) return errJson(400, "NO_CHANGES", "No hay cambios que aplicar.");

  const nextRole = data.role ?? (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role;
  if (!nextRole) return errJson(404, "USER_NOT_FOUND", "Empleado no encontrado.");
  if (nextRole === "ADMIN" && typeof data.adminRoleId === "number") {
    const r = await prisma.adminRole.findUnique({ where: { id: data.adminRoleId } });
    if (!r) return errJson(400, "ROLE_NOT_FOUND", "Rol no encontrado.");
  }
  if (nextRole === "USER") data.adminRoleId = null;

  try {
    const row = await prisma.user.update({
      where: { id },
      data,
      include: { adminRole: { select: { id: true, name: true, active: true } } },
    });
    return Response.json({
      ok: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        adminRoleId: row.adminRoleId,
        adminRole: row.adminRole,
      },
    });
  } catch {
    return errJson(404, "USER_NOT_FOUND", "Empleado no encontrado.");
  }
}
