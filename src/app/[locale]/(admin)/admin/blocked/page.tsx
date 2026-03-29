"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandSpinner, LoadingCard, LoadingInline } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { BrandPagination } from "@/components/ui/BrandPagination";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import type { AppLocale } from "@/i18n/routing";

type BlockedItem = {
  id: number;
  start: string;
  end: string;
  reason?: string | null;
};

const PAGE_SIZE = 8;

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

export default function AdminBlocked() {
  const t = useTranslations("adminBlocked");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const [items, setItems] = useState<BlockedItem[]>([]);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBlocksPage = useCallback(
    async (targetPage: number) => {
      const r = await fetch(`/api/blocks?page=${targetPage}&limit=${PAGE_SIZE}`);
      const j = (await r.json().catch(() => ({}))) as {
        data?: unknown;
        meta?: ListMeta;
        error?: string;
        errorCode?: string;
      };
      if (!r.ok) {
        throw new Error(resolveApiErrorMessage(j, tApi));
      }
      const data = (j.data || []) as BlockedItem[];
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
        const { data, meta } = await fetchBlocksPage(page);
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
  }, [page, fetchBlocksPage, t]);

  async function refreshListAfterMutation() {
    try {
      const { data, meta } = await fetchBlocksPage(page);
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

  async function add() {
    setAdding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, reason }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("createErr"));
        return;
      }
      setStart("");
      setEnd("");
      setReason("");
      await refreshListAfterMutation();
      setSuccessMessage(t("addedOk"));
    } finally {
      setAdding(false);
    }
  }

  async function removeBlock(id: number) {
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }
    setDeletingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/blocks/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("deleteErr"));
        return;
      }
      await refreshListAfterMutation();
      setSuccessMessage(t("deletedOk"));
    } finally {
      setDeletingId(null);
    }
  }

  const busy = adding || deletingId !== null;

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-semibold text-slate-900">{t("title")}</h1>

      <div className="mb-4 space-y-3">
        {successMessage ? (
          <SuccessBanner
            title={t("bannerOk")}
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            autoHideMs={5000}
          />
        ) : null}
        {error ? (
          <ErrorBanner title={t("bannerErrTitle")} message={error} onDismiss={() => setError(null)} />
        ) : null}
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="datetime-local"
          className="rounded-xl border border-slate-200 p-2.5"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="datetime-local"
          className="rounded-xl border border-slate-200 p-2.5"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <input
          className="rounded-xl border border-slate-200 p-2.5"
          placeholder={t("reasonPh")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={() => void add()}
        disabled={busy}
        className="mb-4 flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {adding ? (
          <>
            <BrandSpinner size="sm" />
            <span>{t("saving")}</span>
          </>
        ) : (
          t("addBtn")
        )}
      </button>
      {loadingList ? (
        <LoadingCard message={t("loadingList")} className="mb-4 border-0 bg-transparent py-8 shadow-none" />
      ) : null}
      <ul className="space-y-2">
        {!loadingList && items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
            {t("emptyList")}
          </li>
        ) : null}
        {!loadingList &&
          items.map((b) => (
            <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">
                  {new Date(b.start).toLocaleString(dateLocale)} → {new Date(b.end).toLocaleString(dateLocale)}
                </div>
                <div className="text-sm text-slate-600">{b.reason?.trim() ? b.reason : t("noReason")}</div>
              </div>
              <div className="shrink-0">
                {deletingId === b.id ? (
                  <LoadingInline message={t("deleting")} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void removeBlock(b.id)}
                    disabled={busy}
                    className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("deleteBtn")}
                  </button>
                )}
              </div>
            </li>
          ))}
      </ul>
      {listMeta && listMeta.total > 0 ? (
        <BrandPagination
          page={listMeta.page}
          totalPages={listMeta.totalPages}
          totalItems={listMeta.total}
          pageSize={listMeta.limit}
          onPageChange={setPage}
          disabled={loadingList || busy}
          itemLabel={t("paginationLabel")}
          className="mt-6"
        />
      ) : null}
    </section>
  );
}
