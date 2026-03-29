"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoadingCard, LoadingInline } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { BrandPagination } from "@/components/ui/BrandPagination";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import { resolveServiceText, type ServiceTextSource } from "@/lib/service-locale";
import type { AppLocale } from "@/i18n/routing";

type BookingItem = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: string | number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  service?: ServiceTextSource | null;
};

const PAGE_SIZE = 8;

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

export default function AdminBookings() {
  const t = useTranslations("adminBookings");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const [items, setItems] = useState<BookingItem[]>([]);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBookingsPage = useCallback(
    async (targetPage: number) => {
      const r = await fetch(`/api/bookings?page=${targetPage}&limit=${PAGE_SIZE}`);
      const j = (await r.json().catch(() => ({}))) as {
        data?: unknown;
        meta?: ListMeta;
        error?: string;
        errorCode?: string;
      };
      if (!r.ok) {
        throw new Error(resolveApiErrorMessage(j, tApi));
      }
      const data = (j.data || []) as BookingItem[];
      const meta = j.meta as ListMeta | undefined;
      return { data, meta: meta ?? null };
    },
    [tApi],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        const { data, meta } = await fetchBookingsPage(page);
        if (cancelled) return;
        if (meta && data.length === 0 && meta.page > 1) {
          setPage(meta.page - 1);
          return;
        }
        setItems(data);
        setListMeta(meta);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("loadErrGeneric"));
          setItems([]);
          setListMeta(null);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, fetchBookingsPage, t]);

  async function refreshListAfterMutation() {
    try {
      const { data, meta } = await fetchBookingsPage(page);
      if (meta && data.length === 0 && meta.page > 1) {
        setPage(meta.page - 1);
        return;
      }
      setItems(data);
      setListMeta(meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadErrGeneric"));
    }
  }

  async function confirmBooking(id: number) {
    setUpdatingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("confirmErr"));
        return;
      }
      await refreshListAfterMutation();
      setSuccessMessage(t("successConfirmed"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function cancelBooking(id: number) {
    setUpdatingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        errorCode?: string;
        refund?: { processed?: boolean; reason?: string; refundId?: string };
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("cancelErr"));
        return;
      }
      await refreshListAfterMutation();
      const r = json?.refund;
      if (r?.processed) {
        setSuccessMessage(t("cancelWithRefund"));
      } else if (r?.reason) {
        setSuccessMessage(t("cancelWithReason", { reason: r.reason }));
      } else {
        setSuccessMessage(t("cancelSimple"));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function statusLabel(s: BookingItem["status"]) {
    if (s === "CONFIRMED") return t("status_CONFIRMED");
    if (s === "CANCELLED") return t("status_CANCELLED");
    return t("status_PENDING");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{t("title")}</h1>

      <div className="mb-4 space-y-3">
        {successMessage ? (
          <SuccessBanner
            title={t("bannerUpdated")}
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            autoHideMs={5000}
          />
        ) : null}
        {error ? (
          <ErrorBanner title={t("bannerError")} message={error} onDismiss={() => setError(null)} />
        ) : null}
      </div>

      {loadingList ? (
        <LoadingCard message={t("loadingList")} className="border-0 bg-transparent py-10 shadow-none" />
      ) : null}
      {!loadingList && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
          {t("emptyList")}
        </p>
      ) : null}
      <div className="space-y-3">
        {!loadingList &&
          items.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">
                    #{b.id} — {b.customer} ({b.phone})
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {t("lineMeta", {
                      datetime: new Date(b.date).toLocaleString(dateLocale),
                      service: b.service ? resolveServiceText(b.service, locale).name : "—",
                      price: Number(b.price).toFixed(2),
                    })}
                  </div>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      b.status === "CONFIRMED"
                        ? "bg-emerald-50 text-emerald-700"
                        : b.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {statusLabel(b.status)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {updatingId === b.id ? (
                    <LoadingInline message={t("updating")} />
                  ) : (
                    <>
                      {b.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => void confirmBooking(b.id)}
                          disabled={updatingId !== null}
                          className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("confirmBtn")}
                        </button>
                      ) : null}
                      {b.status === "PENDING" || b.status === "CONFIRMED" ? (
                        <button
                          type="button"
                          onClick={() => void cancelBooking(b.id)}
                          disabled={updatingId !== null}
                          className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            b.status === "CONFIRMED" ? t("titleCancelConfirmed") : t("titleCancelPending")
                          }
                        >
                          {b.status === "CONFIRMED" ? t("cancelRefundBtn") : t("cancelBtn")}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
      {listMeta && listMeta.total > 0 ? (
        <BrandPagination
          page={listMeta.page}
          totalPages={listMeta.totalPages}
          totalItems={listMeta.total}
          pageSize={listMeta.limit}
          onPageChange={setPage}
          disabled={loadingList || updatingId !== null}
          itemLabel={t("paginationLabel")}
        />
      ) : null}
    </section>
  );
}
