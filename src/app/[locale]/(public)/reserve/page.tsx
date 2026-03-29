"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type Service, type ServiceVariant } from "@prisma/client";
import DateTimePicker from "@/components/DateTimePicker";
import { computeDynamicPrice } from "@/lib/utils";
import { isTenDigitPhone, isValidEmailFormat, normalizePhoneDigits } from "@/lib/validation";
import { computeAddonsTotalFromList } from "@/lib/addons";
import { LoadingCard, LoadingInline, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import { resolveServiceText } from "@/lib/service-locale";
import { resolveVariantLabel } from "@/lib/variant-label";

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
  const t = useTranslations("reserve");
  const steps = [t("stepService"), t("stepDatetime"), t("stepData"), t("stepConfirm")];
  return (
    <nav aria-label={t("ariaProgress")} className="mb-6">
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

type ServiceWithVariants = Service & { variants?: ServiceVariant[] };

function ReservaPageContent() {
  const t = useTranslations("reserve");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const searchParams = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");

  const [serviceId, setServiceId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
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

  const [services, setServices] = useState<ServiceWithVariants[]>([]);
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
        if (!res.ok) throw new Error(t("errServicesLoad"));
        const json: unknown = await res.json();
        const maybeData = typeof json === "object" && json !== null ? (json as { data?: unknown }).data : undefined;
        const list: ServiceWithVariants[] = Array.isArray(json)
          ? (json as ServiceWithVariants[])
          : Array.isArray(maybeData)
            ? (maybeData as ServiceWithVariants[])
            : [];
        if (mounted) setServices(list);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setServices([]);
          setServicesError(e instanceof Error ? e.message : t("errServicesGeneric"));
        }
      } finally {
        if (mounted) setLoadingServices(false);
      }
    })();
    return () => { mounted = false; };
  }, [t]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingAddonsCatalog(true);
        setAddonsCatalogError(null);
        const res = await fetch("/api/addons", { cache: "no-store" });
        if (!res.ok) throw new Error(t("addonsLoadErr"));
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
          setAddonsCatalogError(e instanceof Error ? e.message : t("addonsGenericErr"));
        }
      } finally {
        if (mounted) setLoadingAddonsCatalog(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

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
    [services, serviceId],
  );

  useEffect(() => {
    if (!selectedService) {
      setVariantId("");
      return;
    }
    const active = (selectedService.variants ?? []).filter((v) => v.active);
    active.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const first = active[0];
    if (!first) {
      setVariantId("");
      return;
    }
    setVariantId((prev) => {
      const ok = active.some((v) => String(v.id) === prev);
      return ok ? prev : String(first.id);
    });
  }, [selectedService]);

  const selectedVariant = useMemo(() => {
    if (!selectedService) return null;
    const active = (selectedService.variants ?? []).filter((v) => v.active);
    return active.find((v) => String(v.id) === variantId) ?? null;
  }, [selectedService, variantId]);

  const selectedServiceText = useMemo(
    () => (selectedService ? resolveServiceText(selectedService, locale) : null),
    [selectedService, locale],
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
    if (!selectedService || !selectedVariant) return 0;
    const base = Number(selectedVariant.price);
    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      return computeDynamicPrice(base, selectedDate);
    }
    return Math.round(base * 100) / 100;
  }, [selectedService, selectedVariant, selectedDate]);

  const total = useMemo(
    () => Math.round((serviceSubtotal + addonsTotal) * 100) / 100,
    [serviceSubtotal, addonsTotal],
  );

  const canContinueDate =
    !!selectedService &&
    !!selectedVariant &&
    selectedDate instanceof Date &&
    !isNaN(selectedDate.getTime()) &&
    availabilityStatus === "available";

  const nameOk = name.trim().length > 0;
  const phoneOk = isTenDigitPhone(phone);
  const emailOk = isValidEmailFormat(email);

  const dataStepComplete = nameOk && phoneOk && emailOk;

  const canSubmit = canContinueDate && dataStepComplete;

  const step = useMemo(() => {
    if (!serviceId || !selectedVariant) return 1;
    const hasDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
    if (!hasDate || availabilityStatus !== "available") return 2;
    if (!dataStepComplete) return 3;
    return 4;
  }, [serviceId, selectedVariant, selectedDate, availabilityStatus, dataStepComplete]);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!selectedVariant || !selectedDate) {
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
            serviceVariantId: selectedVariant.id,
            start: selectedDate.toISOString(),
          }),
        });
        const raw = (await res.json().catch(() => null)) as {
          available?: boolean;
          errorCode?: string;
          error?: string;
        } | null;
        if (!res.ok) {
          if (!active) return;
          setAvailabilityCheckError(resolveApiErrorMessage(raw, tApi) || t("errAvailabilityNet"));
          setAvailabilityStatus("idle");
          return;
        }
        if (!active) return;
        setAvailabilityStatus(raw?.available ? "available" : "unavailable");
      } catch (e) {
        console.error(e);
        if (!active) return;
        setAvailabilityCheckError(t("errAvailabilityGeneric"));
        setAvailabilityStatus("idle");
      }
    }
    verify();
    return () => {
      active = false;
    };
  }, [selectedVariant, selectedDate, t, tApi]);

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
        serviceVariantId: selectedVariant!.id,
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
        const errBody = (await res.json().catch(() => null)) as {
          error?: string;
          errorCode?: string;
        } | null;
        throw new Error(resolveApiErrorMessage(errBody, tApi));
      }

      const json = await res.json();
      const bookingId = json?.data?.id ?? json?.data?.folio ?? json?.id;
      if (!bookingId) throw new Error(t("bookingIdMissing"));

      const stripeRes = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, locale }),
      });

      const stripeJson = (await stripeRes.json()) as {
        url?: string;
        error?: string;
        errorCode?: string;
      };
      if (!stripeRes.ok || !stripeJson?.url) {
        throw new Error(resolveApiErrorMessage(stripeJson, tApi));
      }

      window.location.href = stripeJson.url;
    } catch (err) {
      console.error(err);
      setSubmitError(err instanceof Error ? err.message : t("errSubmitGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl p-4">
      {isSubmitting ? (
        <LoadingOverlay message={t("loadingPayment")} submessage={t("loadingPaymentSub")} />
      ) : null}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-white/90 md:text-base">{t("subtitle")}</p>
        </div>
      </div>

      <Stepper step={step} />

      {selectedService && selectedServiceText ? (
        <section
          className="mb-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-5 shadow-sm ring-1 ring-violet-100/60"
          aria-label={t("selectedDetailAria")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{t("selectedDetailEyebrow")}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">{selectedServiceText.name}</h2>
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-y-auto text-sm leading-relaxed text-slate-700 [scrollbar-gutter:stable]">
            <p className="whitespace-pre-wrap">{selectedServiceText.description}</p>
          </div>
        </section>
      ) : null}

      <div className="mb-4 space-y-3">
        {servicesError ? (
          <ErrorBanner
            title={t("errServicesTitle")}
            message={servicesError}
            onDismiss={() => setServicesError(null)}
          />
        ) : null}
        {availabilityCheckError ? (
          <ErrorBanner
            title={t("errAvailabilityTitle")}
            message={availabilityCheckError}
            onDismiss={() => setAvailabilityCheckError(null)}
          />
        ) : null}
        {submitError ? (
          <ErrorBanner
            title={t("errSubmitTitle")}
            message={submitError}
            onDismiss={() => setSubmitError(null)}
          />
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <SectionHeader title={t("sectionService")} subtitle={t("sectionServiceSub")} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {loadingServices ? (
                <LoadingCard message={t("loadingTreatments")} className="min-h-[200px] md:col-span-2" />
              ) : Array.isArray(services) && services.length > 0 ? (
                services.map((s) => {
                  const st = resolveServiceText(s, locale);
                  const vars = (s.variants ?? []).filter((v) => v.active);
                  const priceNums = vars.length ? vars.map((v) => Number(v.price)) : [Number(s.price)];
                  const baseMin = Math.min(...priceNums);
                  const baseMax = Math.max(...priceNums);
                  const hasDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
                  const pLo = hasDate
                    ? vars.length > 0
                      ? Math.min(...vars.map((v) => computeDynamicPrice(Number(v.price), selectedDate)))
                      : computeDynamicPrice(Number(s.price), selectedDate)
                    : baseMin;
                  const pHi = hasDate
                    ? vars.length > 0
                      ? Math.max(...vars.map((v) => computeDynamicPrice(Number(v.price), selectedDate)))
                      : pLo
                    : baseMax;
                  const durs = vars.length ? vars.map((v) => v.durationMin) : [s.durationMin];
                  const dLo = Math.min(...durs);
                  const dHi = Math.max(...durs);
                  return (
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
                        <h3 className="font-medium text-slate-800">{st.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {dLo === dHi ? `${dLo} ${t("min")}` : t("durationRange", { min: dLo, max: dHi })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          {pLo === pHi ? `$${pLo.toFixed(2)}` : `$${pLo.toFixed(2)} – $${pHi.toFixed(2)}`}
                        </p>
                        <p className="text-xs text-slate-500">{t("mxn")}</p>
                      </div>
                    </div>
                  </button>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 md:col-span-2">{t("noServices")}</p>
              )}
            </div>
            {selectedService ? (
              (() => {
                const activeVariants = (selectedService.variants ?? [])
                  .filter((v) => v.active)
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
                if (activeVariants.length <= 1) return null;
                return (
                  <>
                    <Divider />
                    <SectionHeader title={t("variantTitle")} subtitle={t("variantSub")} />
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("variantTitle")}>
                      {activeVariants.map((v) => {
                        const lab =
                          resolveVariantLabel(v, locale) ?? t("variantMinutes", { n: v.durationMin });
                        const selected = variantId === String(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setVariantId(String(v.id))}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                              selected
                                ? "border-violet-600 bg-violet-50 font-medium text-violet-900 ring-2 ring-violet-600"
                                : "border-slate-200 bg-white hover:border-violet-300"
                            }`}
                          >
                            <span className="block">{lab}</span>
                            <span className="block text-xs text-slate-600">
                              ${Number(v.price).toFixed(2)} {t("mxn")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()
            ) : null}
          </Card>

          <Card className="p-4">
            <SectionHeader title={t("sectionDatetime")} subtitle={t("sectionDatetimeSub")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <DateTimePicker value={selectedDate} onChange={setSelectedDate} minDate={new Date()} />
                <p className="mt-2 flex min-h-[1.5rem] flex-wrap items-center gap-2 text-sm">
                  {availabilityStatus === "idle" && !availabilityCheckError && (
                    <span className="text-slate-500">{t("pickServiceTime")}</span>
                  )}
                  {availabilityStatus === "checking" && <LoadingInline message={t("checkingSlot")} />}
                  {availabilityStatus === "available" && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                      {t("slotOk")}
                    </span>
                  )}
                  {availabilityStatus === "unavailable" && (
                    <span className="font-medium text-rose-700">{t("slotBad")}</span>
                  )}
                </p>
              </div>
            </div>

            <Divider />
            <SectionHeader title={t("addonsTitle")} subtitle={t("addonsSub")} />
            {addonsCatalogError ? (
              <p className="mb-3 text-sm text-amber-800">{addonsCatalogError}</p>
            ) : null}
            {loadingAddonsCatalog ? (
              <LoadingInline message={t("loadingAddons")} />
            ) : addonCatalog.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noAddons")}</p>
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
                      <p className="text-xs text-slate-500">
                        + ${Number(a.price).toFixed(2)} {t("mxn")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionHeader title={t("dataTitle")} subtitle={t("dataSub")} />
            <p className="mb-4 text-xs text-slate-500">
              <span className="font-semibold text-rose-600">*</span> {t("requiredHint")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("fullName")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && !nameOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder={t("namePh")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {canContinueDate && !nameOk ? (
                  <p className="mt-1 text-xs text-rose-600">{t("nameErr")}</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("phone")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 font-mono tabular-nums tracking-wide focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && phone.length > 0 && !phoneOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder={t("phonePh")}
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="mt-1 text-xs text-slate-500">
                  {t("phoneDigits", { n: phone.length })}
                </p>
                {canContinueDate && phone.length > 0 && !phoneOk ? (
                  <p className="mt-0.5 text-xs text-rose-600">{t("phoneErr")}</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("email")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    canContinueDate && email.trim() !== "" && !emailOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder={t("emailPh")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {canContinueDate && email.trim() !== "" && !emailOk ? (
                  <p className="mt-1 text-xs text-rose-600">{t("emailFmtErr")}</p>
                ) : null}
                {canContinueDate && email.trim() === "" ? (
                  <p className="mt-1 text-xs text-amber-700/90">{t("emailRequired")}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("notes")} <span className="font-normal text-slate-400">{t("notesOptional")}</span>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500"
                  rows={3}
                  placeholder={t("notesPh")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-4 lg:sticky lg:top-4">
            <SectionHeader title={t("summaryTitle")} subtitle={t("summarySub")} />
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumService")}</dt>
                <dd className="font-medium text-slate-800">
                  {selectedServiceText ? selectedServiceText.name : t("dash")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumDuration")}</dt>
                <dd className="text-slate-800">
                  {selectedVariant ? `${selectedVariant.durationMin} ${t("min")}` : t("dash")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumDate")}</dt>
                <dd className="text-slate-800">
                  {selectedDate ? selectedDate.toLocaleDateString(dateLocale) : t("dash")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumTime")}</dt>
                <dd className="text-slate-800">
                  {selectedDate
                    ? selectedDate.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })
                    : t("dash")}
                </dd>
              </div>
              <Divider />
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumSubtotal")}</dt>
                <dd className="tabular-nums text-slate-800" aria-live="polite" aria-atomic="true">
                  ${serviceSubtotal.toFixed(2)} {t("mxn")}
                </dd>
              </div>
              {selectedService && !selectedDate ? (
                <p className="text-[11px] leading-snug text-slate-400">{t("sumBaseHint")}</p>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t("sumAddons")}</dt>
                <dd className="tabular-nums text-slate-800" aria-live="polite" aria-atomic="true">
                  ${addonsTotal.toFixed(2)} {t("mxn")}
                </dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <dt>{t("sumTotal")}</dt>
                <dd className="tabular-nums" aria-live="polite" aria-atomic="true">
                  ${total.toFixed(2)} {t("mxn")}
                </dd>
              </div>
            </dl>

            <button
              type="submit"
              className="mt-4 w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? t("creatingPayment") : t("confirmPay")}
            </button>

            <p className="mt-3 text-xs text-slate-500">{t("stripeNote")}</p>
          </Card>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-500">{t("footerNote")}</p>
    </div>
  );
}

function ReserveSuspenseFallback() {
  const t = useTranslations("reserve");
  return (
    <div className="relative mx-auto max-w-6xl p-4">
      <LoadingCard message={t("suspenseLoading")} className="min-h-[240px]" />
    </div>
  );
}

export default function ReservaPage() {
  return (
    <Suspense fallback={<ReserveSuspenseFallback />}>
      <ReservaPageContent />
    </Suspense>
  );
}
