"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

function IconSuccess({ className = "h-10 w-10 shrink-0" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-sm" />
      <svg viewBox="0 0 24 24" className="relative h-full w-full text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="10" className="text-emerald-200" strokeWidth="1.5" />
        <path d="M8 12.5l2.5 2.5 5-5" className="text-emerald-600" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function IconError({ className = "h-10 w-10 shrink-0" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-rose-400/25 blur-sm" />
      <svg viewBox="0 0 24 24" className="relative h-full w-full text-rose-600" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="10" className="text-rose-200" strokeWidth="1.5" />
        <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

type BannerBaseProps = {
  title?: string;
  message?: string;
  children?: ReactNode;
  className?: string;
  /** Cierra el aviso (muestra botón X). */
  onDismiss?: () => void;
  /** Oculta automáticamente (útil en éxitos). Requiere onDismiss. */
  autoHideMs?: number;
};

function FeedbackShell({
  variant,
  title,
  message,
  children,
  className = "",
  onDismiss,
  autoHideMs,
}: BannerBaseProps & { variant: "success" | "error" }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!autoHideMs) return;
    const t = window.setTimeout(() => dismissRef.current?.(), autoHideMs);
    return () => window.clearTimeout(t);
  }, [autoHideMs]);

  const shell =
    variant === "success"
      ? "border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50/30 shadow-md shadow-emerald-600/5"
      : "border-rose-200/90 bg-gradient-to-br from-white via-rose-50/55 to-fuchsia-50/25 shadow-md shadow-rose-500/10";

  const titleClass = variant === "success" ? "text-emerald-900" : "text-rose-900";
  const textClass = variant === "success" ? "text-emerald-800/90" : "text-rose-800/90";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`relative flex gap-3 rounded-2xl border px-4 py-3 ${onDismiss ? "pr-10" : ""} ${shell} ${className}`}
    >
      {variant === "success" ? <IconSuccess /> : <IconError />}
      <div className="min-w-0 flex-1 pt-0.5">
        {title ? <p className={`text-sm font-semibold ${titleClass}`}>{title}</p> : null}
        {message ? (
          <p className={`text-sm leading-relaxed [text-wrap:balance] ${title ? "mt-0.5" : ""} ${textClass}`}>{message}</p>
        ) : null}
        {children ? <div className={`mt-1 text-sm ${textClass}`}>{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-800"
          aria-label="Cerrar aviso"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      ) : null}
    </div>
  );
}

/** Éxito: misma familia visual que las tarjetas de carga (bordes suaves, gradiente ligero). */
export function SuccessBanner(props: BannerBaseProps) {
  return <FeedbackShell variant="success" {...props} />;
}

/** Error: acento rosa/fucsia acorde al sitio. */
export function ErrorBanner(props: BannerBaseProps) {
  return <FeedbackShell variant="error" {...props} />;
}

/** Versión compacta bajo botones o en formularios. */
export function FeedbackInline({
  variant,
  message,
  className = "",
}: {
  variant: "success" | "error";
  message: string;
  className?: string;
}) {
  const styles =
    variant === "success"
      ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900"
      : "border-rose-200/80 bg-rose-50/80 text-rose-900";

  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3 py-2 text-sm font-medium [text-wrap:balance] ${styles} ${className}`}
    >
      {message}
    </p>
  );
}
