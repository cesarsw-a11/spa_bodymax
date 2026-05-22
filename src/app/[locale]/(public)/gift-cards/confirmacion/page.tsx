"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LoadingCard, LoadingInline } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import RetryGiftCardPaymentButton from "./RetryGiftCardPaymentButton";

type GiftCardStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type GiftCardOrder = {
  id: number;
  status: GiftCardStatus;
  amount: number;
  currency: string;
  serviceNameSnapshot: string;
  serviceNameEnSnapshot: string | null;
  variantLabelSnapshot: string | null;
  variantLabelEnSnapshot: string | null;
  variantDurationSnapshot: number | null;
  recipientName: string;
  senderName: string;
  senderEmail: string | null;
  message: string | null;
  redeemCode: string | null;
  createdAt: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
};

function ConfirmacionContent() {
  const t = useTranslations("giftCardsConfirmacion");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const giftCardOrderIdStr =
    searchParams.get("giftCardOrderId") ?? searchParams.get("orderId") ?? null;
  const cancelledFlag = searchParams.get("cancelled");
  const sessionId = searchParams.get("session_id");

  const giftCardOrderId = useMemo(() => {
    if (!giftCardOrderIdStr) return NaN;
    const n = Number(giftCardOrderIdStr);
    return Number.isNaN(n) ? NaN : n;
  }, [giftCardOrderIdStr]);

  const [order, setOrder] = useState<GiftCardOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadOrder = useCallback(async () => {
    if (Number.isNaN(giftCardOrderId)) {
      setOrder(null);
      setError(t("invalidId"));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/gift-cards/orders/${giftCardOrderId}`);
      const json = (await res.json()) as ApiResponse<GiftCardOrder>;
      if (!res.ok || !json?.ok || !json?.data) {
        throw new Error(resolveApiErrorMessage(json, tApi));
      }
      setOrder(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadErr"));
    } finally {
      setLoading(false);
    }
  }, [giftCardOrderId, t, tApi]);

  useEffect(() => {
    if (!giftCardOrderIdStr) {
      setLoading(false);
      setOrder(null);
      setError(t("noId"));
      return;
    }
    setLoading(true);
    setOrder(null);
    void loadOrder();
  }, [giftCardOrderIdStr, loadOrder, t]);

  useEffect(() => {
    if (!sessionId) return;
    if (Number.isNaN(giftCardOrderId)) return;
    if (synced) return;
    setSynced(true);
    (async () => {
      try {
        const syncRes = await fetch("/api/gift-cards/stripe/sync-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftCardOrderId, sessionId }),
        });
        if (syncRes.ok) {
          setSyncNotice({ type: "success", text: t("syncOk") });
        } else {
          const body = (await syncRes.json().catch(() => null)) as
            | { error?: string; errorCode?: string }
            | null;
          setSyncNotice({
            type: "error",
            text: body ? resolveApiErrorMessage(body, tApi) : t("syncErrGeneric"),
          });
        }
      } catch {
        setSyncNotice({ type: "error", text: t("syncNetwork") });
      } finally {
        await loadOrder();
      }
    })();
  }, [sessionId, giftCardOrderId, synced, loadOrder, t, tApi]);

  useEffect(() => {
    if (Number.isNaN(giftCardOrderId)) return;
    if (order?.status !== "PENDING") return;
    setPolling(true);
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      await loadOrder();
      if (attempts >= 12) window.clearInterval(interval);
    }, 5000);
    return () => {
      window.clearInterval(interval);
      setPolling(false);
    };
  }, [giftCardOrderId, order?.status, loadOrder]);

  const serviceName = order
    ? locale === "en" && order.serviceNameEnSnapshot?.trim()
      ? order.serviceNameEnSnapshot
      : order.serviceNameSnapshot
    : null;
  const variantLabel = order
    ? (locale === "en"
        ? order.variantLabelEnSnapshot?.trim() || order.variantLabelSnapshot?.trim()
        : order.variantLabelSnapshot?.trim() || order.variantLabelEnSnapshot?.trim()) ?? null
    : null;

  const downloadPng = `/api/gift-cards/orders/${giftCardOrderId}/assets?format=png&locale=${locale}`;
  const downloadPdf = `/api/gift-cards/orders/${giftCardOrderId}/assets?format=pdf&locale=${locale}`;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <Link
          href="/"
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 hover:text-violet-800"
        >
          {t("backHome")}
        </Link>
      </div>

      {loading && <LoadingCard message={t("loading")} className="mt-4" />}

      {error ? (
        <ErrorBanner
          className="mt-4"
          title={t("errTitle")}
          message={error}
          onDismiss={() => setError(null)}
        />
      ) : null}

      {syncNotice?.type === "success" ? (
        <SuccessBanner
          className="mt-4"
          title={t("readyTitle")}
          message={syncNotice.text}
          onDismiss={() => setSyncNotice(null)}
          autoHideMs={6000}
        />
      ) : null}
      {syncNotice?.type === "error" ? (
        <ErrorBanner
          className="mt-4"
          title={t("syncBannerTitle")}
          message={syncNotice.text}
          onDismiss={() => setSyncNotice(null)}
        />
      ) : null}

      {!loading && order && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{t("orderNum", { id: order.id })}</p>
                <p className="font-medium text-slate-900">{serviceName ?? "—"}</p>
                {variantLabel ? (
                  <p className="text-sm text-slate-600">{variantLabel}</p>
                ) : null}
                <p className="mt-2 text-sm text-slate-600">
                  {t("for")} <span className="font-semibold text-slate-900">{order.recipientName}</span>
                </p>
                <p className="text-sm text-slate-600">
                  {t("from")} <span className="font-medium text-slate-900">{order.senderName}</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {t("total")}{" "}
                  <span className="font-semibold text-slate-900">
                    ${Number(order.amount).toFixed(2)} {t("mxn")}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t("status")}</p>
                <p
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    order.status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-700"
                      : order.status === "CANCELLED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {order.status === "CONFIRMED"
                    ? t("status_CONFIRMED")
                    : order.status === "CANCELLED"
                      ? t("status_CANCELLED")
                      : t("status_PENDING")}
                </p>
              </div>
            </div>
          </div>

          {order.status === "CONFIRMED" && (
            <div className="space-y-4">
              <SuccessBanner title={t("paidTitle")} message={t("paidMsg")} />

              {order.redeemCode ? (
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-700">
                    {t("redeemCodeLabel")}
                  </p>
                  <p className="mt-1 select-all font-mono text-2xl font-bold text-violet-900">
                    {order.redeemCode}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">{t("redeemCodeHint")}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">{t("downloadTitle")}</p>
                <p className="mt-1 text-sm text-slate-600">{t("downloadHint")}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href={downloadPng}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-700"
                  >
                    {t("downloadPng")}
                  </a>
                  <a
                    href={downloadPdf}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                  >
                    {t("downloadPdf")}
                  </a>
                </div>
              </div>

              <Link
                href="/gift-cards"
                className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                {t("anotherGift")}
              </Link>
            </div>
          )}

          {order.status === "CANCELLED" && (
            <div className="space-y-4">
              <ErrorBanner
                title={t("cancelTitle")}
                message={cancelledFlag ? t("cancelMsgStripe") : t("cancelMsgGeneric")}
              />
              <Link
                href="/gift-cards"
                className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                {t("backGiftCards")}
              </Link>
            </div>
          )}

          {order.status === "PENDING" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">{t("pendingMsg")}</p>
              {polling ? <LoadingInline message={t("checkingPay")} /> : null}
              <RetryGiftCardPaymentButton giftCardOrderId={order.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmacionSuspense() {
  const t = useTranslations("giftCardsConfirmacion");
  return (
    <div className="mx-auto max-w-3xl p-4">
      <LoadingCard message={t("suspense")} />
    </div>
  );
}

export default function GiftCardsConfirmacionPage() {
  return (
    <Suspense fallback={<ConfirmacionSuspense />}>
      <ConfirmacionContent />
    </Suspense>
  );
}
