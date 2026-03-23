import "../../globals.css";
import AdminNav from "@/components/AdminNav";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // si usas NextAuth v4 (Opción A)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return (
      <div className="p-6">
        No autorizado. <a href="/auth/login" className="underline">Inicia sesión</a>.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
