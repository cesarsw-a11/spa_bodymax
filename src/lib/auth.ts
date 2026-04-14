import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  parsePermissionsJson,
  type AdminModule,
  type AdminPermissions,
} from "./admin-permissions";

type AuthUserPayload = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  adminRoleId: number | null;
  adminPermissions: AdminPermissions | null;
};

function unauthorizedResponse() {
  return Response.json(
    {
      ok: false,
      errorCode: "UNAUTHORIZED",
      error: "No autorizado. Inicia sesión de nuevo como administrador.",
    },
    { status: 401 },
  );
}

function forbiddenModuleResponse() {
  return Response.json(
    {
      ok: false,
      errorCode: "FORBIDDEN_MODULE",
      error: "No tienes permisos para este módulo.",
    },
    { status: 403 },
  );
}

async function buildAuthPayload(email: string): Promise<AuthUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { adminRole: true },
  });
  if (!user) return null;
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    adminRoleId: user.adminRoleId ?? null,
    adminPermissions:
      user.role === "ADMIN" && user.adminRole
        ? parsePermissionsJson(user.adminRole.permissionsJson)
        : null,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          include: { adminRole: true },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(creds.password, user.password);
        if (!valid) return null;
        const payload: AuthUserPayload = {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          adminRoleId: user.adminRoleId ?? null,
          adminPermissions:
            user.role === "ADMIN" && user.adminRole
              ? parsePermissionsJson(user.adminRole.permissionsJson)
              : null,
        };
        return payload as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.adminRoleId = (user as any).adminRoleId ?? null;
        token.adminPermissions = (user as any).adminPermissions ?? null;
      }
      if (token?.email && typeof token.email === "string") {
        const fresh = await buildAuthPayload(token.email);
        if (fresh) {
          token.role = fresh.role;
          token.adminRoleId = fresh.adminRoleId;
          token.adminPermissions = fresh.adminPermissions;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user.role = token.role;
      (session as any).user.adminRoleId =
        typeof token.adminRoleId === "number" ? token.adminRoleId : null;
      (session as any).user.adminPermissions = (token.adminPermissions ??
        null) as AdminPermissions | null;
      return session;
    },
  },
};

export async function requireAdmin(): Promise<Response | null> {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return unauthorizedResponse();
  }
  return null;
}

export async function requireSuperAdmin(): Promise<Response | null> {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return unauthorizedResponse();
  }
  const adminRoleId = (session.user as any)?.adminRoleId;
  if (typeof adminRoleId === "number" && adminRoleId > 0) {
    return forbiddenModuleResponse();
  }
  return null;
}

export async function requireAdminModule(module: AdminModule): Promise<Response | null> {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return unauthorizedResponse();
  }
  const adminRoleId = (session.user as any)?.adminRoleId;
  if (typeof adminRoleId !== "number" || adminRoleId < 1) {
    return null;
  }
  const permissions =
    ((session.user as any)?.adminPermissions as AdminPermissions | null | undefined) ??
    DEFAULT_ADMIN_PERMISSIONS;
  if (!permissions[module]) {
    return forbiddenModuleResponse();
  }
  return null;
}

export function canAccessAdminModuleFromSession(
  session: { user?: unknown } | null | undefined,
  module: AdminModule,
): boolean {
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return false;
  const adminRoleId = (session?.user as any)?.adminRoleId;
  if (typeof adminRoleId !== "number" || adminRoleId < 1) return true;
  const permissions =
    ((session?.user as any)?.adminPermissions as AdminPermissions | null | undefined) ??
    DEFAULT_ADMIN_PERMISSIONS;
  return permissions[module] === true;
}
