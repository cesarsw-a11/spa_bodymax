"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { type Service, type ServiceVariant } from "@prisma/client";
import { LoadingCard, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import { resolveServiceText } from "@/lib/service-locale";
import { resolveVariantLabel } from "@/lib/variant-label";
import {
  isValidEmailFormat,
  isValidPersonName,
  normalizeGiftMessage,
  normalizePersonName,
} from "@/lib/validation";

type ServiceWithVariants = Service & { variants?: ServiceVariant[] };

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

function GiftPreview({
  serviceName,
  variantLabel,
  amount,
  recipientName,
  senderName,
  message,
  brandLine,
  amountSuffix,
  forLabel,
  fromLabel,
  giftLabel,
  defaultRecipient,
  defaultSender,
}: {
  serviceName: string | null;
  variantLabel: string | null;
  amount: number;
  recipientName: string;
  senderName: string;
  message: string;
  brandLine: string;
  amountSuffix: string;
  forLabel: string;
  fromLabel: string;
  giftLabel: string;
  defaultRecipient: string;
  defaultSender: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 p-6 text-white shadow-lg ring-1 ring-white/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            {brandLine}
          </p>
          <h3 className="mt-1 font-serif text-3xl font-bold leading-tight">{giftLabel}</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
            {amountSuffix}
          </p>
          <p className="text-3xl font-bold tabular-nums">${amount.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/30 backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
          {forLabel}
        </p>
        <p className="mt-1 truncate font-serif text-xl font-semibold">
          {recipientName.trim() || defaultRecipient}
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
          {fromLabel}
        </p>
        <p className="truncate font-serif text-base italic">
          {senderName.trim() || defaultSender}
        </p>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/75">
          {serviceName ?? "—"}
        </p>
        {variantLabel ? (
          <p className="text-xs text-white/80">{variantLabel}</p>
        ) : null}
      </div>

      {message.trim() ? (
        <p className="mt-4 line-clamp-3 whitespace-pre-wrap font-serif text-sm italic text-white/95">
          “{message.trim()}”
        </p>
      ) : null}
    </div>
  );
}

function GiftCardsContent() {
  const t = useTranslations("giftCards");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const preselectServiceId = searchParams.get("serviceId");

  const [services, setServices] = useState<ServiceWithVariants[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");

  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingServices(true);
        setServicesError(null);
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error(t("errServicesGeneric"));
        const json: unknown = await res.json();
        const data =
          typeof json === "object" && json !== null && Array.isArray((json as { data?: unknown }).data)
            ? ((json as { data: ServiceWithVariants[] }).data)
            : Array.isArray(json)
              ? (json as ServiceWithVariants[])
              : [];
        if (mounted) setServices(data);
      } catch (e) {
        if (mounted) {
          setServices([]);
          setServicesError(e instanceof Error ? e.message : t("errServicesGeneric"));
        }
      } finally {
        if (mounted) setLoadingServices(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (loadingServices || !preselectServiceId || services.length === 0) return;
    if (!services.some((s) => String(s.id) === String(preselectServiceId))) return;
    setServiceId(String(preselectServiceId));
  }, [services, loadingServices, preselectServiceId]);

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(serviceId)) ?? null,
    [services, serviceId],
  );

  const activeVariants = useMemo(() => {
    if (!selectedService) return [];
    return (selectedService.variants ?? [])
      .filter((v) => v.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }, [selectedService]);

  useEffect(() => {
    if (!selectedService) {
      setVariantId("");
      return;
    }
    const first = activeVariants[0];
    if (!first) {
      setVariantId("");
      return;
    }
    setVariantId((prev) => (activeVariants.some((v) => String(v.id) === prev) ? prev : String(first.id)));
  }, [selectedService, activeVariants]);

  const selectedVariant = useMemo(
    () => activeVariants.find((v) => String(v.id) === variantId) ?? null,
    [activeVariants, variantId],
  );

  const selectedServiceText = useMemo(
    () => (selectedService ? resolveServiceText(selectedService, locale) : null),
    [selectedService, locale],
  );

  const selectedVariantLabel = useMemo(
    () => (selectedVariant ? resolveVariantLabel(selectedVariant, locale) : null),
    [selectedVariant, locale],
  );

  const amount = selectedVariant
    ? Number(selectedVariant.price)
    : selectedService
      ? Number(selectedService.price)
      : 0;

  const recipientOk = isValidPersonName(recipientName);
  const senderOk = isValidPersonName(senderName);
  const emailOk = senderEmail.trim() === "" || isValidEmailFormat(senderEmail);
  const variantOk = activeVariants.length === 0 || !!selectedVariant;
  const canSubmit = !!selectedService && variantOk && recipientOk && senderOk && emailOk && amount > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedService) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const orderRes = await fetch("/api/gift-cards/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceVariantId: selectedVariant?.id ?? null,
          recipientName: normalizePersonName(recipientName),
          senderName: normalizePersonName(senderName),
          senderEmail: senderEmail.trim() || undefined,
          message: normalizeGiftMessage(message) || undefined,
        }),
      });
      const orderJson = (await orderRes.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: { id: number };
            error?: string;
            errorCode?: string;
          }
        | null;
      if (!orderRes.ok || !orderJson?.data?.id) {
        throw new Error(resolveApiErrorMessage(orderJson, tApi));
      }

      const giftCardOrderId = orderJson.data.id;

      const stripeRes = await fetch("/api/gift-cards/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftCardOrderId, locale }),
      });
      const stripeJson = (await stripeRes.json().catch(() => null)) as
        | { url?: string; error?: string; errorCode?: string }
        | null;
      if (!stripeRes.ok || !stripeJson?.url) {
        throw new Error(resolveApiErrorMessage(stripeJson, tApi));
      }

      window.location.href = stripeJson.url;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("errSubmitGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl p-4">
      {submitting ? (
        <LoadingOverlay message={t("loadingPayment")} submessage={t("loadingPaymentSub")} />
      ) : null}

      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-400 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_85%_0,rgba(255,255,255,0.14),transparent_40%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 md:text-base">{t("subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {servicesError ? (
          <ErrorBanner
            title={t("errServicesTitle")}
            message={servicesError}
            onDismiss={() => setServicesError(null)}
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

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <SectionHeader title={t("sectionService")} subtitle={t("sectionServiceSub")} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {loadingServices ? (
                <LoadingCard message={t("loadingTreatments")} className="min-h-[200px] md:col-span-2" />
              ) : services.length === 0 ? (
                <p className="text-sm text-slate-500 md:col-span-2">{t("noServices")}</p>
              ) : (
                services.map((s) => {
                  const st = resolveServiceText(s, locale);
                  const variants = (s.variants ?? []).filter((v) => v.active);
                  const prices = variants.length ? variants.map((v) => Number(v.price)) : [Number(s.price)];
                  const minP = Math.min(...prices);
                  const maxP = Math.max(...prices);
                  const isSelected = String(s.id) === String(serviceId);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(String(s.id))}
                      className={`group cursor-pointer rounded-2xl p-4 text-left ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        isSelected
                          ? "bg-violet-50/60 ring-2 ring-violet-600 shadow"
                          : "ring-slate-200 hover:ring-violet-300 hover:shadow"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-slate-800">{st.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {variants.length > 1 ? t("variantsCount", { n: variants.length }) : t("singleOption")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">
                            {minP === maxP ? `$${minP.toFixed(2)}` : `$${minP.toFixed(2)} – $${maxP.toFixed(2)}`}
                          </p>
                          <p className="text-xs text-slate-500">{t("mxn")}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedService && activeVariants.length > 1 ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <SectionHeader title={t("variantTitle")} subtitle={t("variantSub")} />
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("variantTitle")}>
                  {activeVariants.map((v) => {
                    const lab = resolveVariantLabel(v, locale) ?? t("variantMinutes", { n: v.durationMin });
                    const isSelected = String(v.id) === variantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setVariantId(String(v.id))}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                          isSelected
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
              </div>
            ) : null}
          </Card>

          <Card className="p-4">
            <SectionHeader title={t("dataTitle")} subtitle={t("dataSub")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("recipientName")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    recipientName && !recipientOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder={t("recipientPh")}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  maxLength={120}
                />
                {recipientName && !recipientOk ? (
                  <p className="mt-1 text-xs text-rose-600">{t("recipientErr")}</p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t("senderName")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    senderName && !senderOk ? "border-rose-300 ring-1 ring-rose-100" : "border-slate-200"
                  }`}
                  placeholder={t("senderPh")}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  maxLength={120}
                />
                {senderName && !senderOk ? (
                  <p className="mt-1 text-xs text-rose-600">{t("senderErr")}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("senderEmail")} <span className="font-normal text-slate-400">{t("optional")}</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className={`mt-1 w-full rounded-xl border bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500 ${
                    senderEmail.trim() !== "" && !emailOk
                      ? "border-rose-300 ring-1 ring-rose-100"
                      : "border-slate-200"
                  }`}
                  placeholder={t("senderEmailPh")}
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
                {senderEmail.trim() !== "" && !emailOk ? (
                  <p className="mt-1 text-xs text-rose-600">{t("emailErr")}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">{t("senderEmailHelp")}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  {t("messageLabel")} <span className="font-normal text-slate-400">{t("optional")}</span>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 focus:border-violet-500 focus:ring-violet-500"
                  rows={3}
                  placeholder={t("messagePh")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-slate-500">{t("messageHelp", { n: message.length })}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-4">
            <GiftPreview
              serviceName={selectedServiceText?.name ?? null}
              variantLabel={selectedVariantLabel}
              amount={amount}
              recipientName={recipientName}
              senderName={senderName}
              message={message}
              brandLine={t("previewBrand")}
              amountSuffix={t("mxn")}
              forLabel={t("previewFor")}
              fromLabel={t("previewFrom")}
              giftLabel={t("previewGift")}
              defaultRecipient={t("previewRecipientDefault")}
              defaultSender={t("previewSenderDefault")}
            />

            <Card className="p-4">
              <SectionHeader title={t("summaryTitle")} subtitle={t("summarySub")} />
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">{t("sumService")}</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {selectedServiceText ? selectedServiceText.name : t("dash")}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">{t("sumVariant")}</dt>
                  <dd className="text-right text-slate-800">
                    {selectedVariantLabel ?? (selectedVariant ? `${selectedVariant.durationMin} ${t("min")}` : t("dash"))}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <dt>{t("sumTotal")}</dt>
                  <dd className="tabular-nums">
                    ${amount.toFixed(2)} {t("mxn")}
                  </dd>
                </div>
              </dl>

              <button
                type="submit"
                className="mt-4 w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit || submitting}
              >
                {submitting ? t("creatingPayment") : t("confirmPay")}
              </button>
              <p className="mt-3 text-xs text-slate-500">{t("stripeNote")}</p>
            </Card>
          </div>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-500">{t("footerNote")}</p>
    </div>
  );
}

function GiftCardsSuspense() {
  const t = useTranslations("giftCards");
  return (
    <div className="relative mx-auto max-w-6xl p-4">
      <LoadingCard message={t("suspenseLoading")} className="min-h-[240px]" />
    </div>
  );
}

export default function GiftCardsPage() {
  return (
    <Suspense fallback={<GiftCardsSuspense />}>
      <GiftCardsContent />
    </Suspense>
  );
}
