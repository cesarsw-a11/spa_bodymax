"use client";

import type { ReactNode } from "react";

/**
 * Estados de carga alineados con la identidad visual del SPA (violeta / fucsia / rosa suave).
 */

export function BrandSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const border = size === "sm" ? "border-2" : "border-[3px]";

  return (
    <div className={`relative ${dim} shrink-0`} role="status" aria-label="Cargando">
      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 opacity-25 blur-sm" />
      <div className={`absolute inset-0 rounded-full ${border} border-violet-100`} />
      <div
        className={`absolute inset-0 rounded-full ${border} border-transparent border-t-violet-600 border-r-fuchsia-500 animate-spin [animation-duration:0.85s]`}
      />
    </div>
  );
}

export function LoadingMessage({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-sm font-medium text-slate-600 [text-wrap:balance]">{children}</p>
  );
}

/** Bloque dentro de una tarjeta o sección (lista vacía mientras carga). */
export function LoadingCard({
  message = "Cargando…",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-violet-100/80 bg-gradient-to-b from-white to-violet-50/40 px-8 py-12 shadow-sm ${className}`}
    >
      <BrandSpinner size="md" />
      <LoadingMessage>{message}</LoadingMessage>
    </div>
  );
}

/** Fila compacta: spinner + texto (disponibilidad, etc.). */
export function LoadingInline({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-violet-700">
      <BrandSpinner size="sm" />
      <span className="font-medium">{message}</span>
    </span>
  );
}

/** Cubre el viewport o un contenedor relativo para acciones largas (envío, guardado). */
export function LoadingOverlay({
  message = "Procesando…",
  submessage,
  fixed = true,
}: {
  message?: string;
  submessage?: string;
  fixed?: boolean;
}) {
  return (
    <div
      className={
        fixed
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          : "absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/75 p-4 backdrop-blur-sm"
      }
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/80 bg-white/95 p-8 shadow-xl shadow-violet-500/10">
        <div className="flex flex-col items-center gap-4">
          <BrandSpinner size="lg" />
          <p className="text-center text-base font-semibold text-slate-800">{message}</p>
          {submessage ? <p className="text-center text-xs text-slate-500">{submessage}</p> : null}
        </div>
      </div>
    </div>
  );
}
