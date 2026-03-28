"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const DEFAULT_EMAIL_SUBJECT = "Consulta — Body Max Spa";

/** Dispara mailto de forma compatible (location.href + cerrar modal a la vez suele fallar). */
function triggerMailto(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.rel = "noopener noreferrer";
  a.style.position = "fixed";
  a.style.left = "-9999px";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
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

export default function FooterContactActions() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hola@spabodymax.com";
  const defaultSubjectFromEnv = process.env.NEXT_PUBLIC_CONTACT_EMAIL_SUBJECT?.trim();

  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [emailSubject, setEmailSubject] = useState(defaultSubjectFromEnv || DEFAULT_EMAIL_SUBJECT);
  const [emailBody, setEmailBody] = useState("");
  const [copiedHint, setCopiedHint] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => setOpen(false), []);

  const openEmail = useCallback(() => {
    setContactName("");
    setNameError(false);
    setEmailSubject(defaultSubjectFromEnv || DEFAULT_EMAIL_SUBJECT);
    setEmailBody("");
    setCopiedHint(false);
    setOpen(true);
  }, [defaultSubjectFromEnv]);

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
      panelRef.current?.querySelector<HTMLInputElement>("#footer-contact-name")?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const buildEmailPayload = () => {
    const name = contactName.trim();
    if (!name) return null;
    const subj = emailSubject.trim() || DEFAULT_EMAIL_SUBJECT;
    const body = emailBody.trim();
    const fullBody = `Nombre: ${name}\n\n${body}`;
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(fullBody)}`;
    const plainDraft = `Para: ${contactEmail}\nAsunto: ${subj}\n\n${fullBody}`;
    return { mailto, plainDraft };
  };

  const sendEmail = () => {
    const payload = buildEmailPayload();
    if (!payload) {
      setNameError(true);
      return;
    }
    setNameError(false);
    triggerMailto(payload.mailto);
    // Cerrar después: si el modal se desmonta en el mismo tick, algunos navegadores no abren el cliente de correo.
    window.setTimeout(() => close(), 450);
  };

  const copyEmailDraft = async () => {
    const payload = buildEmailPayload();
    if (!payload) {
      setNameError(true);
      return;
    }
    setNameError(false);
    try {
      await navigator.clipboard.writeText(payload.plainDraft);
      setCopiedHint(true);
      window.setTimeout(() => setCopiedHint(false), 2800);
    } catch {
      setCopiedHint(false);
      window.prompt("Copia este texto y pégalo en tu correo:", payload.plainDraft);
    }
  };

  const nameInputClass =
    "w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 " +
    (nameError
      ? "border-rose-400/50 focus:border-rose-400/60"
      : "border-violet-400/20 focus:border-violet-400/50");

  const cardBtn =
    "group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-violet-400/25 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  return (
    <>
      <ul className="mt-5 space-y-3">
        <li>
          <button type="button" onClick={openEmail} className={cardBtn}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25 transition group-hover:bg-violet-500/25">
              <IconMail className="h-5 w-5" />
            </span>
            <span className="pt-2">
              <span className="block text-sm font-medium text-white">Correo</span>
              <span className="text-xs text-violet-200/70 break-all">{contactEmail}</span>
            </span>
          </button>
        </li>
      </ul>

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
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30">
                  <IconMail className="h-6 w-6" />
                </span>
                <div>
                  <h2 id={titleId} className="text-lg font-semibold text-white">
                    Correo electrónico
                  </h2>
                  <p id={descId} className="text-xs text-violet-200/65">
                    Intentamos abrir tu programa de correo. Si no pasa nada (común en Linux sin cliente
                    configurado), usa <span className="text-violet-100/90">Copiar borrador</span>.
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
                <label htmlFor="footer-contact-name" className="mb-1.5 block text-xs font-medium text-violet-200/90">
                  Tu nombre <span className="text-rose-300/90">*</span>
                </label>
                <input
                  id="footer-contact-name"
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
                  aria-describedby={nameError ? "footer-name-error-email" : undefined}
                />
                {nameError ? (
                  <p id="footer-name-error-email" className="mt-1.5 text-xs text-rose-300/90" role="alert">
                    Escribe tu nombre para continuar.
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="footer-email-subj" className="mb-1.5 block text-xs font-medium text-violet-200/90">
                  Asunto
                </label>
                <input
                  id="footer-email-subj"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-violet-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label htmlFor="footer-email-body" className="mb-1.5 block text-xs font-medium text-violet-200/90">
                  Mensaje
                </label>
                <textarea
                  id="footer-email-body"
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full resize-y rounded-xl border border-violet-400/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Cuéntanos en qué podemos ayudarte…"
                />
              </div>
              {copiedHint ? (
                <p className="text-center text-xs font-medium text-emerald-300/95" role="status">
                  Borrador copiado — pégalo en Gmail o tu correo web.
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="cursor-pointer rounded-full border border-violet-400/30 px-4 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-white/5 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={copyEmailDraft}
                  className="cursor-pointer rounded-full border border-violet-300/35 bg-white/5 px-4 py-2.5 text-sm font-medium text-violet-50 transition hover:bg-white/10 sm:order-2"
                >
                  Copiar borrador
                </button>
                <button
                  type="button"
                  onClick={sendEmail}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 sm:order-3"
                >
                  <IconMail className="h-4 w-4" />
                  Abrir correo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
