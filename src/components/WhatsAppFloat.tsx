"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const DEFAULT_WA_MESSAGE =
  "Hola, me gustaría información sobre Spa BodyMax y disponibilidad para una cita.";

function digitsOnly(phone: string | undefined) {
  return (phone ?? "").replace(/\D/g, "") || "5215555555555";
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function WhatsAppFloat() {
  const waPhone = digitsOnly(process.env.NEXT_PUBLIC_WHATSAPP_E164);
  const defaultWaFromEnv = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_DEFAULT?.trim();

  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [waMessage, setWaMessage] = useState(DEFAULT_WA_MESSAGE);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => setOpen(false), []);

  const openModal = useCallback(() => {
    setContactName("");
    setNameError(false);
    setWaMessage(defaultWaFromEnv || DEFAULT_WA_MESSAGE);
    setOpen(true);
  }, [defaultWaFromEnv]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("#float-wa-contact-name")?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const sendWhatsApp = () => {
    const name = contactName.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const main = waMessage.trim() || DEFAULT_WA_MESSAGE;
    const text = `Hola, soy ${name}.\n\n${main}`;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    close();
  };

  const nameInputClass =
    "w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 " +
    (nameError
      ? "border-rose-400/50 focus:border-rose-400/60"
      : "border-violet-400/20 focus:border-violet-400/50");

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="fixed z-[90] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-900/35 transition hover:scale-105 hover:bg-[#20BD5A] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))]"
        aria-label="Contactar por WhatsApp"
      >
        <IconWhatsApp className="h-7 w-7" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm motion-reduce:backdrop-blur-none"
            aria-hidden
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative w-full max-w-md rounded-2xl border border-violet-400/25 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-2xl shadow-violet-950/50 ring-1 ring-white/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                  <IconWhatsApp className="h-6 w-6" />
                </span>
                <div>
                  <h2 id={titleId} className="text-lg font-semibold text-white">
                    WhatsApp
                  </h2>
                  <p id={descId} className="text-xs text-violet-200/65">
                    Tu mensaje se abrirá en WhatsApp hacia +{waPhone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-lg p-2 text-violet-200/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Cerrar"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="float-wa-contact-name" className="mb-1.5 block text-xs font-medium text-violet-200/90">
                  Tu nombre <span className="text-rose-300/90">*</span>
                </label>
                <input
                  id="float-wa-contact-name"
                  type="text"
                  autoComplete="name"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (nameError) setNameError(false);
                  }}
                  className={nameInputClass}
                  placeholder="Ej. María González"
                  aria-invalid={nameError}
                  aria-describedby={nameError ? "float-wa-name-error" : undefined}
                />
                {nameError ? (
                  <p id="float-wa-name-error" className="mt-1.5 text-xs text-rose-300/90" role="alert">
                    Escribe tu nombre para continuar.
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="float-wa-msg" className="mb-1.5 block text-xs font-medium text-violet-200/90">
                  Tu mensaje
                </label>
                <textarea
                  id="float-wa-msg"
                  rows={4}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  className="w-full resize-y rounded-xl border border-violet-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej. Quisiera reservar un masaje relajante el sábado…"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="cursor-pointer rounded-full border border-violet-400/30 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500"
                >
                  <IconWhatsApp className="h-4 w-4" />
                  Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
