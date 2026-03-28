// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        const valid = await bcrypt.compare(creds.password, user.password);
        if (!valid) return null;
        return { id: String(user.id), name: user.name, email: user.email, role: user.role } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      (session as any).user.role = token.role;
      return session;
    }
  }
};

import { getServerSession } from "next-auth";

/** Devuelve 401 JSON si no hay sesión admin; si no, `null`. */
export async function requireAdmin(): Promise<Response | null> {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return Response.json(
      { ok: false, error: "No autorizado. Inicia sesión de nuevo como administrador." },
      { status: 401 },
    );
  }
  return null;
}
