"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import RetryPaymentButton from "./RetryPaymentButton";
import { LoadingCard, LoadingInline } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { buildBookingWhatsAppMessage, mexicoWaMeUrlFromTenDigitPhone } from "@/lib/bookingWhatsApp";
import { isTenDigitPhone, normalizePhoneDigits } from "@/lib/validation";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import type { AppLocale } from "@/i18n/routing";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type Booking = {
  id: number;
  status: BookingStatus;
  price: string | number;
  date: string | Date;
  endDate?: string | Date | null;
  customer?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
  addonNames?: string[];
  service?: { name?: string | null } | null;
};

type BookingApiResponse = {
  ok: boolean;
  data?: Booking;
  error?: string;
  errorCode?: string;
};

function ConfirmacionContent() {
  const t = useTranslations("confirmacion");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const searchParams = useSearchParams();
  const bookingIdStr = searchParams.get("bookingId") ?? searchParams.get("folio");
  const cancelledFlag = searchParams.get("cancelled");
  const sessionId = searchParams.get("session_id");

  const bookingId = useMemo(() => {
    if (!bookingIdStr) return NaN;
    const n = Number(bookingIdStr);
    return Number.isNaN(n) ? NaN : n;
  }, [bookingIdStr]);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedWithStripe, setSyncedWithStripe] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBooking = useCallback(async () => {
    if (Number.isNaN(bookingId)) {
      setBooking(null);
      setError(t("invalidId"));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const json = (await res.json()) as BookingApiResponse;
      if (!res.ok || !json?.ok || !json?.data) {
        throw new Error(resolveApiErrorMessage(json, tApi));
      }
      setBooking(json.data);
      return json.data?.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadErr"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, t, tApi]);

  useEffect(() => {
    if (!bookingIdStr) return;
    setLoading(true);
    setBooking(null);
    loadBooking();
  }, [bookingIdStr, loadBooking]);

  useEffect(() => {
    if (bookingIdStr) return;
    setLoading(false);
    setBooking(null);
    setError(t("noId"));
  }, [bookingIdStr, t]);

  useEffect(() => {
    if (!sessionId) return;
    if (Number.isNaN(bookingId)) return;
    if (syncedWithStripe) return;

    setSyncedWithStripe(true);
    (async () => {
      try {
        const syncRes = await fetch("/api/stripe/sync-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, sessionId }),
        });
        if (syncRes.ok) {
          setSyncNotice({ type: "success", text: t("syncOk") });
        } else {
          const body = (await syncRes.json().catch(() => null)) as {
            error?: string;
            errorCode?: string;
          } | null;
          setSyncNotice({
            type: "error",
            text: body ? resolveApiErrorMessage(body, tApi) : t("syncErrGeneric"),
          });
        }
      } catch {
        setSyncNotice({
          type: "error",
          text: t("syncNetwork"),
        });
      } finally {
        await loadBooking();
      }
    })();
  }, [sessionId, bookingId, syncedWithStripe, loadBooking, t, tApi]);

  useEffect(() => {
    if (Number.isNaN(bookingId)) return;
    if (booking?.status !== "PENDING") return;

    setPolling(true);
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      await loadBooking();
      if (attempts >= 12) window.clearInterval(interval);
    }, 5000);

    return () => {
      window.clearInterval(interval);
      setPolling(false);
    };
  }, [bookingId, booking?.status, loadBooking]);

  const whatsappResumeUrl = useMemo(() => {
    if (!booking) return null;
    const ten = normalizePhoneDigits(String(booking.phone ?? ""));
    if (!isTenDigitPhone(ten)) return null;
    const start = booking.date ? new Date(booking.date) : null;
    if (!start || isNaN(start.getTime())) return null;
    const end = booking.endDate ? new Date(booking.endDate) : null;
    const addonSummary =
      booking.addonNames && booking.addonNames.length > 0 ? booking.addonNames.join(", ") : null;
    const paymentStatusLine =
      booking.status === "CONFIRMED"
        ? t("paymentConfirmed")
        : booking.status === "CANCELLED"
          ? t("paymentCancelled")
          : t("paymentPending");
    const text = buildBookingWhatsAppMessage({
      bookingId: booking.id,
      customerName: (booking.customer ?? t("customer")).trim() || t("customer"),
      email: booking.email ?? undefined,
      phoneTenDigits: ten,
      serviceName: booking.service?.name ?? t("serviceFallback"),
      dateStart: start,
      dateEnd: end && !isNaN(end.getTime()) ? end : null,
      addonSummary,
      totalMxn: Number(booking.price),
      notes: booking.notes,
      paymentStatusLine,
      locale,
    });
    return mexicoWaMeUrlFromTenDigitPhone(ten, text);
  }, [booking, t, locale]);

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

      {!loading && booking && whatsappResumeUrl ? (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-sm font-medium text-emerald-900">{t("waTitle")}</p>
          <p className="mt-1 text-sm text-emerald-800/90">
            {t("waDesc")}{" "}
            <span className="font-mono tabular-nums">+52 {normalizePhoneDigits(String(booking.phone ?? ""))}</span>.
          </p>
          <a
            href={whatsappResumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#20BD5A]"
          >
            {t("waBtn")}
          </a>
        </div>
      ) : null}

      {!loading && booking && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{t("bookingNum", { id: booking.id })}</p>
              <p className="font-medium text-slate-900">{booking.service?.name ?? t("serviceFallback")}</p>
              <p className="text-sm text-slate-600">
                {booking.date ? new Date(booking.date).toLocaleString(dateLocale) : "—"}
              </p>
              <p className="text-sm text-slate-600">
                {t("total")}{" "}
                <span className="font-semibold text-slate-900">
                  ${Number(booking.price).toFixed(2)} {t("mxn")}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t("status")}</p>
              <p
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  booking.status === "CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700"
                    : booking.status === "CANCELLED"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {booking.status === "CONFIRMED"
                  ? t("status_CONFIRMED")
                  : booking.status === "CANCELLED"
                    ? t("status_CANCELLED")
                    : t("status_PENDING")}
              </p>
            </div>
          </div>

          {booking.status === "CONFIRMED" && (
            <div className="mt-4 space-y-4">
              <SuccessBanner title={t("paidTitle")} message={t("paidMsg")} />
              <Link
                href="/reserve"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                {t("anotherBooking")}
              </Link>
            </div>
          )}

          {booking.status === "CANCELLED" && (
            <div className="mt-4 space-y-4">
              <ErrorBanner
                title={t("cancelTitle")}
                message={cancelledFlag ? t("cancelMsgStripe") : t("cancelMsgGeneric")}
              />
              <Link
                href="/reserve"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                {t("backReserve")}
              </Link>
            </div>
          )}

          {booking.status === "PENDING" && (
            <div className="mt-4">
              <div className="space-y-2 text-slate-700">
                <p>{t("pendingMsg")}</p>
                {polling ? <LoadingInline message={t("checkingPay")} /> : null}
              </div>
              <RetryPaymentButton bookingId={booking.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmacionSuspenseFallback() {
  const t = useTranslations("confirmacion");
  return (
    <div className="mx-auto max-w-3xl p-4">
      <LoadingCard message={t("suspense")} />
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={<ConfirmacionSuspenseFallback />}>
      <ConfirmacionContent />
    </Suspense>
  );
}
