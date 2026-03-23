"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { type Service } from "@prisma/client";
import DateTimePicker from "@/components/DateTimePicker";
import { computeDynamicPrice } from "@/lib/utils";
import { isTenDigitPhone, isValidEmailFormat, normalizePhoneDigits } from "@/lib/validation";
import { computeAddonsTotalFromList } from "@/lib/addons";
import { LoadingCard, LoadingInline, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </header>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Servicio", "Fecha y hora", "Datos", "Confirmación"];
  return (
    <nav aria-label="Progreso" className="mb-6">
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, idx) => {
          const active = idx + 1 <= step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {idx + 1}
              </span>
              <span className={`text-sm ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100 my-4" />;
}

type PublicAddon = { id: number; name: string; price: number };

function ReservaPageContent() {
  const searchParams = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");

  const [serviceId, setServiceId] = useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [addonCatalog, setAddonCatalog] = useState<PublicAddon[]>([]);
  const [loadingAddonsCatalog, setLoadingAddonsCatalog] = useState(true);
  const [addonsCatalogError, setAddonsCatalogError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availabilityCheckError, setAvailabilityCheckError] = useState<string | null>(null);

  const [availabilityStatus, setAvailabilityStatus] =
    useState<"idle" | "checking" | "available" | "unavailable">("idle");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingServices(true);
        setServicesError(null);
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error("No pudimos cargar los tratamientos. Intenta recargar la página.");
        const json: unknown = await res.json();
        const maybeData = typeof json === "object" && json !== null ? (json as { data?: unknown }).data : undefined;
        const list: Service[] = Array.isArray(json)
          ? (json as Service[])
          : Array.isArray(maybeData)
            ? (maybeData as Service[])
            : [];
        if (mounted) setServices(list);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setServices([]);
          setServicesError(e instanceof Error ? e.message : "No pudimos cargar los tratamientos.");
        }
      } finally {
        if (mounted) setLoadingServices(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingAddonsCatalog(true);
        setAddonsCatalogError(null);
        const res = await fetch("/api/addons", { cache: "no-store" });
        if (!res.ok) throw new Error("No pudimos cargar complementos.");
        const json: unknown = await res.json();
        const data =
          typeof json === "object" && json !== null && Array.isArray((json as { data?: unknown }).data)
            ? ((json as { data: PublicAddon[] }).data)
            : [];
        if (mounted) setAddonCatalog(data);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setAddonCatalog([]);
          setAddonsCatalogError(e instanceof Error ? e.message : "Error al cargar complementos.");
        }
      } finally {
        if (mounted) setLoadingAddonsCatalog(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedAddonIds((prev) => prev.filter((id) => addonCatalog.some((a) => a.id === id)));
  }, [addonCatalog]);

  useEffect(() => {
    if (loadingServices || !preselectServiceId || services.length === 0) return;
    const idStr = String(preselectServiceId).trim();
    if (!idStr) return;
    const exists = services.some((s) => String(s.id) === idStr);
    if (exists) setServiceId(idStr);
  }, [services, loadingServices, preselectServiceId]);

  const selectedService = useMemo(
    () =>
      Array.isArray(services)
        ? services.find((s) => String(s.id) === String(serviceId)) || null
        : null,
    [services, serviceId]
  );

  const addonsCatalogRows = useMemo(
    () => addonCatalog.map((a) => ({ id: a.id, price: a.price })),
    [addonCatalog],
  );

  const addonsTotal = useMemo(
    () => computeAddonsTotalFromList(addonsCatalogRows, selectedAddonIds).total,
    [addonsCatalogRows, selectedAddonIds],
  );

  /** Precio del servicio en resumen: base al elegir servicio; con fecha/hora aplica tarifa por horario pico. */
  const serviceSubtotal = useMemo(() => {
    if (!selectedService) return 0;
    const base = Number(selectedService.price);
    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      return computeDynamicPrice(base, selectedDate);
    }
    return Math.round(base * 100) / 100;
  }, [selectedService, selectedDate]);

  const total = useMemo(
    () => Math.round((serviceSubtotal + addonsTotal) * 100) / 100,
    [serviceSubtotal, addonsTotal],
  );

  const canContinueDate =
    !!selectedService &&
    selectedDate instanceof Date &&
    !isNaN(selectedDate.getTime()) &&
    availabilityStatus === "available";

  const nameOk = name.trim().length > 0;
  const phoneOk = isTenDigitPhone(phone);
  const emailOk = isValidEmailFormat(email);

  const dataStepComplete = nameOk && phoneOk && emailOk;

  const canSubmit = canContinueDate && dataStepComplete;

  const step = useMemo(() => {
    if (!serviceId) return 1;
    const hasDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
    if (!hasDate || availabilityStatus !== "available") return 2;
    if (!dataStepComplete) return 3;
    return 4;
  }, [serviceId, selectedDate, availabilityStatus, dataStepComplete]);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!selectedService || !selectedDate) {
        setAvailabilityStatus("idle");
        return;
      }
      setAvailabilityStatus("checking");
      setAvailabilityCheckError(null);
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: selectedService.id,
            start: selectedDate.toISOString(),
          }),
        });
        if (!res.ok) {
          if (!active) return;
          setAvailabilityCheckError("No pudimos verificar la disponibilidad. Revisa tu conexión o prueba otro horario.");
          setAvailabilityStatus("idle");
          return;
        }
        const data = (await res.json()) as { available: boolean };
        if (!active) return;
        setAvailabilityStatus(data.available ? "available" : "unavailable");
      } catch (e) {
        console.error(e);
        if (!active) return;
        setAvailabilityCheckError("Ocurrió un error al consultar disponibilidad. Intenta de nuevo.");
        setAvailabilityStatus("idle");
      }
    }
    verify();
    return () => { active = false; };
  }, [selectedService, selectedDate]);

  function toggleAddon(id: number) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!canSubmit) return;
  setIsSubmitting(true);
  setSubmitError(null);

  try {
    const payload = {
      serviceId,
      date: selectedDate!.toISOString(),
      customer: name.trim(),
      phone,
      email: email.trim(),
      notes: notes.trim() || undefined,
      addons: selectedAddonIds,
      total,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const msg =
        errJson && typeof errJson === "object" && "error" in errJson && typeof (errJson as { error?: string }).error === "string"
          ? (errJson as { error: string }).error
          : "Error al crear la reserva";
      throw new Error(msg);
    }

    const json = await res.json(); // { ok: true, data: { id, folio? } }
    const bookingId = json?.data?.id ?? json?.data?.folio ?? json?.id;
    if (!bookingId) throw new Error("bookingId no recibido");

    const stripeRes = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const stripeJson = await stripeRes.json();
    if (!stripeRes.ok || !stripeJson?.url) {
      throw new Error(stripeJson?.error || "No se pudo iniciar el pago");
    }

    window.location.href = stripeJson.url;
  } catch (err) {
    console.error(err);
    setSubmitError(
      err instanceof Error ? err.message : "No pudimos completar tu reserva. Revisa los datos e intenta de nuevo.",
    );
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <div className="relative mx-auto max-w-6xl p-4">
      {isSubmitting ? (
        <LoadingOverlay
          message="Preparando tu pago"
          submessage="Estamos creando tu reserva y abriendo Stripe de forma segura…"
        />
      ) : null}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 p-6 text-white shadow-sm mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-semibold">Reserva en línea</h1>
          <p className="text-white/90 mt-1 text-sm md:text-base">Elige tu servicio, fecha y horario. Te tomará menos de 2 minutos ✨</p>
        </div>
      </div>

      <Stepper step={step} />

      <div className="mb-4 space-y-3">
        {servicesError ? (
          <ErrorBanner
            title="No se cargaron los servicios"
            message={servicesError}
            onDismiss={() => setServicesError(null)}
          />
        ) : null}
        {availabilityCheckError ? (
          <ErrorBanner
            title="Disponibilidad"
            message={availabilityCheckError}
            onDismiss={() => setAvailabilityCheckError(null)}
          />
        ) : null}
        {submitError ? (
          <ErrorBanner
            title="No se pudo continuar"
            message={submitError}
            onDismiss={() => setSubmitError(null)}
          />
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Servicio" subtitle="Selecciona el tratamiento que deseas reservar" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loadingServices ? (
                <LoadingCard message="Cargando tratamientos disponibles…" className="md:col-span-2 min-h-[200px]" />
              ) : Array.isArray(services) && services.length > 0 ? (
                services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(String(s.id))}
                    className={`group cursor-pointer text-left rounded-2xl ring-1 ring-slate-200 p-4 hover:ring-violet-300 hover:shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed ${
                      serviceId === String(s.id) ? "ring-2 ring-violet-600 shadow" : ""
                    }`}
                    aria-pressed={serviceId === String(s.id)}
                    disabled={loadingServices}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-800">{s.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{s.durationMin} min</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          ${selectedDate ? computeDynamicPrice(Number(s.price), selectedDate) : Number(s.price)}
                        </p>
                        <p className="text-xs text-slate-500">MXN</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500 md:col-span-2">No hay servicios disponibles en este momento.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Fecha y hora" subtitle="Selecciona el día y horario disponible" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <DateTimePicker value={selectedDate} onChange={setSelectedDate} minDate={new Date()} />
                <p className="mt-2 flex min-h-[1.5rem] flex-wrap items-center gap-2 text-sm">
                  {availabilityStatus === "idle" && !availabilityCheckError && (
                    <span className="text-slate-500">Selecciona servicio y horario.</span>
                  )}
                  {availabilityStatus === "checking" && <LoadingInline message="Verificando disponibilidad…" />}
                  {availabilityStatus === "available" && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                      Horario disponible
                    </span>
                  )}
                  {availabilityStatus === "unavailable" && (
                    <span className="font-medium text-rose-700">Horario no disponible, elige otra fecha u hora.</span>
                  )}
                </p>
              </div>
            </div>

            <Divider />
            <SectionHeader
              title="Complementos (opcional)"
              subtitle="Personaliza tu experiencia con extras disponibles."
            />
            {addonsCatalogError ? (
              <p className="mb-3 text-sm text-amber-800">{addonsCatalogError}</p>
            ) : null}
            {loadingAddonsCatalog ? (
              <LoadingInline message="Cargando complementos…" />
            ) : addonCatalog.length === 0 ? (
              <p className="text-sm text-slate-500">Por ahora no hay complementos disponibles.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {addonCatalog.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-violet-300"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={selectedAddonIds.includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-500">+ ${Number(a.price).toFixed(2)} MXN</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionHeader
              title="Tus datos"
              subtitle="Nombre, teléfono y correo son obligatorios para confirmar el pago. Las notas son opcionales."
            />
            <p className="mb-4 text-xs text-slate-500">
              <span className="font-semibold text-rose-600">*</span> obligatorio · Teléfono: exactamente 10 dígitos (celular o fijo en México).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Nombre completo <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && !nameOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder="Ej. María López García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {canContinueDate && !nameOk ? (
                  <p className="mt-1 text-xs text-rose-600">Escribe tu nombre completo.</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Teléfono <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 font-mono tabular-nums tracking-wide focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && phone.length > 0 && !phoneOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder="10 dígitos, ej. 5512345678"
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="mt-1 text-xs text-slate-500">
                  {phone.length}/10 dígitos
                </p>
                {canContinueDate && phone.length > 0 && !phoneOk ? (
                  <p className="mt-0.5 text-xs text-rose-600">Deben ser exactamente 10 dígitos.</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Correo electrónico <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && email.trim() !== "" && !emailOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {canContinueDate && email.trim() !== "" && !emailOk ? (
                  <p className="mt-1 text-xs text-rose-600">Usa un formato de correo válido (ej. nombre@dominio.com).</p>
                ) : null}
                {canContinueDate && email.trim() === "" ? (
                  <p className="mt-1 text-xs text-amber-700/90">El correo es obligatorio.</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Notas <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500"
                  rows={3}
                  placeholder="Alergias, preferencias, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-4 lg:sticky lg:top-4">
            <SectionHeader title="Resumen" subtitle="Revisa los detalles antes de confirmar" />
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Servicio</dt>
                <dd className="text-slate-800 font-medium">{selectedService ? selectedService.name : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Duración</dt>
                <dd className="text-slate-800">{selectedService ? `${selectedService.durationMin} min` : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Fecha</dt>
                <dd className="text-slate-800">{selectedDate ? selectedDate.toLocaleDateString() : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Hora</dt>
                <dd className="text-slate-800">{selectedDate ? selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</dd>
              </div>
              <Divider />
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Subtotal (servicio)</dt>
                <dd className="text-slate-800 tabular-nums" aria-live="polite" aria-atomic="true">
                  ${serviceSubtotal.toFixed(2)} MXN
                </dd>
              </div>
              {selectedService && !selectedDate ? (
                <p className="text-[11px] leading-snug text-slate-400">
                  Precio base. Al elegir fecha y hora puede aplicarse ajuste por horario.
                </p>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Complementos</dt>
                <dd className="text-slate-800 tabular-nums" aria-live="polite" aria-atomic="true">
                  ${addonsTotal.toFixed(2)} MXN
                </dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums" aria-live="polite" aria-atomic="true">
                  ${total.toFixed(2)} MXN
                </dd>
              </div>
            </dl>

            <button
              type="submit"
              className="mt-4 w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Creando pago…" : "Confirmar y pagar"}
            </button>

            <p className="text-xs text-slate-500 mt-3">
              Al confirmar, te llevaremos a Stripe para completar el pago. Luego podrás ver el estado en esta página.
            </p>
          </Card>
        </div>
      </form>

      <p className="text-xs text-slate-500 mt-4">
        * Para una experiencia óptima, llega 10 minutos antes de tu cita. Si necesitas reagendar, avísanos con 24h de anticipación.
      </p>
    </div>
  );
}

export default function ReservaPage() {
  return (
    <Suspense
      fallback={
        <div className="relative mx-auto max-w-6xl p-4">
          <LoadingCard message="Cargando reserva…" className="min-h-[240px]" />
        </div>
      }
    >
      <ReservaPageContent />
    </Suspense>
  );
}
