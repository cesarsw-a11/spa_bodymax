import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  const unauthorized = await requireSuperAdmin();
  if (unauthorized) return unauthorized;

  const rows = await prisma.user.findMany({
    orderBy: [{ id: "asc" }],
    include: { adminRole: { select: { id: true, name: true, active: true } } },
  });
  const data = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    adminRoleId: u.adminRoleId,
    adminRole: u.adminRole,
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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "USER" ? "USER" : "ADMIN";
  const adminRoleIdRaw = Number(body.adminRoleId);
  const adminRoleId = Number.isFinite(adminRoleIdRaw) ? adminRoleIdRaw : null;

  if (!name) return errJson(400, "NAME_REQUIRED", "El nombre es obligatorio.");
  if (!email) return errJson(400, "INVALID_EMAIL", "Indica un correo electrónico válido.");
  if (!password || password.length < 6) {
    return errJson(400, "PASSWORD_MIN", "La contraseña debe tener al menos 6 caracteres.");
  }

  if (role === "ADMIN" && adminRoleId) {
    const r = await prisma.adminRole.findUnique({ where: { id: adminRoleId } });
    if (!r) return errJson(400, "ROLE_NOT_FOUND", "Rol no encontrado.");
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const row = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role,
        adminRoleId: role === "ADMIN" ? adminRoleId : null,
      },
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
    return errJson(409, "EMAIL_TAKEN", "Ya existe un usuario con ese correo.");
  }
}
