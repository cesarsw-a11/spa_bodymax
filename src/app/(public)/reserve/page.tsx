"use client";

import { useMemo, useState, useEffect } from "react";
import { type Service } from "@prisma/client";
import DateTimePicker from "@/components/DateTimePicker";
import { computeDynamicPrice } from "@/lib/utils";
import { ADDONS, computeAddonsTotal } from "@/lib/addons";

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

export default function ReservaPage() {
  const [serviceId, setServiceId] = useState<string>("");
  const [addons, setAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [availabilityStatus, setAvailabilityStatus] =
    useState<"idle" | "checking" | "available" | "unavailable">("idle");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingServices(true);
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error("Error al cargar servicios");
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
        if (mounted) setServices([]);
      } finally {
        if (mounted) setLoadingServices(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectedService = useMemo(
    () =>
      Array.isArray(services)
        ? services.find((s) => String(s.id) === String(serviceId)) || null
        : null,
    [services, serviceId]
  );

  const addonsTotal = useMemo(
    () => computeAddonsTotal(addons).total,
    [addons]
  );

  const total = useMemo(() => {
  if (!selectedService || !selectedDate) return 0;
  const base = computeDynamicPrice(Number(selectedService.price), selectedDate);
  return base + addonsTotal;
}, [selectedService, selectedDate, addonsTotal]);

  const canContinueDate =
    !!selectedService &&
    selectedDate instanceof Date &&
    !isNaN(selectedDate.getTime()) &&
    availabilityStatus === "available";

  const canSubmit = canContinueDate && !!name.trim() && !!phone.trim();

  const step = useMemo(() => {
    if (!serviceId) return 1;
    const hasDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
    if (!hasDate || availabilityStatus !== "available") return 2;
    if (!(name.trim() && phone.trim())) return 3;
    return 4;
  }, [serviceId, selectedDate, availabilityStatus, name, phone]);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!selectedService || !selectedDate) {
        setAvailabilityStatus("idle");
        return;
      }
      setAvailabilityStatus("checking");
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: selectedService.id,
            start: selectedDate.toISOString(),
          }),
        });
        if (!res.ok) throw new Error("Error al verificar disponibilidad");
        const data = (await res.json()) as { available: boolean };
        if (!active) return;
        setAvailabilityStatus(data.available ? "available" : "unavailable");
      } catch (e) {
        console.error(e);
        if (!active) return;
        setAvailabilityStatus("unavailable");
      }
    }
    verify();
    return () => { active = false; };
  }, [selectedService, selectedDate]);

  function toggleAddon(id: string) {
    setAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!canSubmit) return;
  setIsSubmitting(true);

  try {
    const payload = {
      serviceId,
      date: selectedDate!.toISOString(),
      customer: name,
      phone, email, notes,
      addons,
      total,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al crear la reserva");

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
    alert("Ocurrió un error al crear tu reserva. Intenta de nuevo.");
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 p-6 text-white shadow-sm mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-semibold">Reserva en línea</h1>
          <p className="text-white/90 mt-1 text-sm md:text-base">Elige tu servicio, fecha y horario. Te tomará menos de 2 minutos ✨</p>
        </div>
      </div>

      <Stepper step={step} />

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Servicio" subtitle="Selecciona el tratamiento que deseas reservar" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.isArray(services) && services.length > 0 ? (
                services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(String(s.id))}
                    className={`group text-left rounded-2xl ring-1 ring-slate-200 p-4 hover:ring-violet-300 hover:shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
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
                <p className="text-sm text-slate-500">Cargando servicios…</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Fecha y hora" subtitle="Selecciona el día y horario disponible" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <DateTimePicker value={selectedDate} onChange={setSelectedDate} minDate={new Date()} />
                <p className="mt-2 text-sm">
                  {availabilityStatus === "idle" && <span className="text-slate-500">Selecciona servicio y horario.</span>}
                  {availabilityStatus === "checking" && <span className="text-violet-700">Verificando disponibilidad…</span>}
                  {availabilityStatus === "available" && <span className="text-emerald-700">Horario disponible.</span>}
                  {availabilityStatus === "unavailable" && <span className="text-rose-700">Horario no disponible, intenta otro.</span>}
                </p>
              </div>
            </div>

            <Divider />
            <SectionHeader title="Complementos (opcional)" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ADDONS.map((a) => (
                <label key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-violet-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={addons.includes(a.id)}
                    onChange={() => toggleAddon(a.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-500">+ ${a.price} MXN</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Tus datos" subtitle="Necesitamos esta información para confirmar tu cita" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nombre completo</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  type="tel"
                  className="mt-1 w-full rounded-xl border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="55 0000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Correo (opcional)</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="tucorreo@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notas</label>
                <textarea
                  className="mt-1 w-full rounded-xl border-slate-200 focus:border-violet-500 focus:ring-violet-500"
                  rows={3}
                  placeholder="¿Algo que debamos saber? (alergias, preferencia de terapeuta, etc.)"
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
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="text-slate-800">${selectedService && selectedDate ? computeDynamicPrice(Number(selectedService.price), selectedDate) : 0} MXN</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Complementos</dt>
                <dd className="text-slate-800">${addonsTotal} MXN</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd aria-live="polite">${total} MXN</dd>
              </div>
            </dl>

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
