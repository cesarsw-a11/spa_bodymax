"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoadingCard } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";
import { BrandPagination } from "@/components/ui/BrandPagination";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import type { AppLocale } from "@/i18n/routing";

type GiftCardStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
type RedeemedFilter = "" | "only" | "none";

type AdminGiftCard = {
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
  redeemCode: string;
  redeemedAt: string | null;
  redeemedBooking: {
    id: number;
    date: string;
    customer: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
  } | null;
  createdAt: string;
};

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

const PAGE_SIZE = 10;

export default function AdminGiftCards() {
  const t = useTranslations("adminGiftCards");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "en" ? "en-US" : "es-MX";

  const [items, setItems] = useState<AdminGiftCard[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"" | GiftCardStatus>("");
  const [redeemedFilter, setRedeemedFilter] = useState<RedeemedFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const buildQuery = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", String(PAGE_SIZE));
      if (statusFilter) params.set("status", statusFilter);
      if (redeemedFilter) params.set("redeemed", redeemedFilter);
      if (query.trim()) params.set("q", query.trim());
      return params.toString();
    },
    [statusFilter, redeemedFilter, query],
  );

  const fetchPage = useCallback(
    async (targetPage: number) => {
      const res = await fetch(`/api/admin/gift-cards?${buildQuery(targetPage)}`);
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: AdminGiftCard[];
        meta?: ListMeta;
        error?: string;
        errorCode?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(resolveApiErrorMessage(json, tApi));
      }
      return { data: json.data ?? [], meta: json.meta ?? null };
    },
    [buildQuery, tApi],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, meta: m } = await fetchPage(page);
        if (cancelled) return;
        if (m && data.length === 0 && m.page > 1) {
          setPage(m.page - 1);
          return;
        }
        setItems(data);
        setMeta(m);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("loadErrGeneric"));
          setItems([]);
          setMeta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, fetchPage, t]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, redeemedFilter, query]);

  const statusLabel = useCallback(
    (s: GiftCardStatus) => {
      if (s === "CONFIRMED") return t("status_CONFIRMED");
      if (s === "CANCELLED") return t("status_CANCELLED");
      return t("status_PENDING");
    },
    [t],
  );

  const resolveServiceName = useCallback(
    (g: AdminGiftCard) => {
      if (locale === "en" && g.serviceNameEnSnapshot) return g.serviceNameEnSnapshot;
      return g.serviceNameSnapshot;
    },
    [locale],
  );
  const resolveVariantLabel = useCallback(
    (g: AdminGiftCard) => {
      if (locale === "en" && g.variantLabelEnSnapshot) return g.variantLabelEnSnapshot;
      return g.variantLabelSnapshot;
    },
    [locale],
  );

  const totalItems = useMemo(() => meta?.total ?? 0, [meta]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        <p className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
          {t("totalCount", { count: totalItems })}
        </p>
      </header>

      <form
        onSubmit={onSearchSubmit}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
      >
        <label className="flex flex-col text-xs font-medium text-slate-600">
          {t("filterStatus")}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | GiftCardStatus)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          >
            <option value="">{t("filterAny")}</option>
            <option value="PENDING">{t("status_PENDING")}</option>
            <option value="CONFIRMED">{t("status_CONFIRMED")}</option>
            <option value="CANCELLED">{t("status_CANCELLED")}</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          {t("filterRedeemed")}
          <select
            value={redeemedFilter}
            onChange={(e) => setRedeemedFilter(e.target.value as RedeemedFilter)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800"
          >
            <option value="">{t("filterAny")}</option>
            <option value="none">{t("redeemedNone")}</option>
            <option value="only">{t("redeemedOnly")}</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col text-xs font-medium text-slate-600 min-w-[220px]">
          {t("filterSearch")}
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
          />
        </label>
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {t("applyFilters")}
        </button>
        {statusFilter || redeemedFilter || query ? (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setRedeemedFilter("");
              setSearchInput("");
              setQuery("");
            }}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </form>

      {error ? (
        <ErrorBanner
          className="mb-4"
          title={t("errBannerTitle")}
          message={error}
          onDismiss={() => setError(null)}
        />
      ) : null}

      {loading ? (
        <LoadingCard message={t("loading")} className="border-0 bg-transparent py-10 shadow-none" />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((g) => {
            const isRedeemed = !!g.redeemedAt;
            return (
              <li key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      #{g.id} · {new Date(g.createdAt).toLocaleDateString(dateLocale)}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold tracking-widest text-slate-900">
                      {g.redeemCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {resolveServiceName(g)}
                      {resolveVariantLabel(g) ? ` · ${resolveVariantLabel(g)}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {t("lineRecipient", { recipient: g.recipientName, sender: g.senderName })}
                    </p>
                    {g.senderEmail ? (
                      <p className="text-xs text-slate-500">{g.senderEmail}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right text-sm">
                    <span className="font-semibold text-slate-900">
                      ${Number(g.amount).toFixed(2)} {g.currency.toUpperCase()}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        g.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700"
                          : g.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {statusLabel(g.status)}
                    </span>
                    {isRedeemed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
                        {t("redeemedBadge")}
                      </span>
                    ) : g.status === "CONFIRMED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {t("redeemablePending")}
                      </span>
                    ) : null}
                  </div>
                </div>
                {g.redeemedBooking ? (
                  <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/40 p-3 text-xs text-violet-900">
                    <p className="font-semibold">
                      {t("redeemedOn", {
                        when: g.redeemedAt
                          ? new Date(g.redeemedAt).toLocaleString(dateLocale)
                          : "—",
                      })}
                    </p>
                    <p className="mt-0.5">
                      {t("redeemedBookingLine", {
                        id: g.redeemedBooking.id,
                        customer: g.redeemedBooking.customer,
                        when: new Date(g.redeemedBooking.date).toLocaleString(dateLocale),
                      })}
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {meta && meta.total > 0 ? (
        <BrandPagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={meta.limit}
          onPageChange={setPage}
          disabled={loading}
          itemLabel={t("paginationLabel")}
        />
      ) : null}
    </section>
  );
}
