"use client";
import { useSession } from "next-auth/react";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <div className="p-6">Cargando…</div>;
  if (status !== "authenticated") return <div className="p-6">No autorizado</div>;
  return <>{children}</>;
}