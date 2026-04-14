"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandSpinner, LoadingCard, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";

type TestimonialRow = {
  id: number;
  quote: string;
  quoteEn: string | null;
  author: string | null;
  source: "GOOGLE" | "INSTAGRAM" | "FACEBOOK";
  sourceUrl: string | null;
  sortOrder: number;
  active: boolean;
};

type FormState = {
  quote: string;
  quoteEn: string;
  author: string;
  source: TestimonialRow["source"];
  sourceUrl: string;
  sortOrderStr: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  quote: "",
  quoteEn: "",
  author: "",
  source: "GOOGLE",
  sourceUrl: "",
  sortOrderStr: "0",
  active: true,
});

function previewText(s: string, max = 100): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export default function AdminTestimonials() {
  const t = useTranslations("adminTestimonials");
  const tApi = useTranslations("apiErrors");
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listBusy, setListBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchAll = useCallback(async () => {
    const r = await fetch("/api/testimonials?all=1", { credentials: "include" });
    const j = (await r.json().catch(() => ({}))) as {
      data?: TestimonialRow[];
      error?: string;
      errorCode?: string;
    };
    if (!r.ok) {
      throw new Error(resolveApiErrorMessage(j, tApi));
    }
    setItems(j.data || []);
  }, [tApi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        await fetchAll();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("loadErrGeneric"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll, t]);

  async function refreshAfterMutation() {
    try {
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadErrGeneric"));
    }
  }

  function sourceLabel(src: TestimonialRow["source"]): string {
    if (src === "GOOGLE") return t("sourceGoogle");
    if (src === "INSTAGRAM") return t("sourceInstagram");
    return t("sourceFacebook");
  }

  function beginEdit(row: TestimonialRow) {
    setEditingId(row.id);
    setError(null);
    setSuccessMessage(null);
    setForm({
      quote: row.quote,
      quoteEn: row.quoteEn ?? "",
      author: row.author ?? "",
      source: row.source,
      sourceUrl: row.sourceUrl ?? "",
      sortOrderStr: String(row.sortOrder),
      active: row.active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function save() {
    setError(null);
    setSuccessMessage(null);
    const quote = form.quote.trim();
    if (!quote) {
      setError(t("quoteRequired"));
      return;
    }
    const sortOrder = Math.round(Number(form.sortOrderStr));
    const payload = {
      quote,
      quoteEn: form.quoteEn.trim() || null,
      author: form.author.trim() || null,
      source: form.source,
      sourceUrl: form.sourceUrl.trim() || null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      active: form.active,
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        const res = await fetch(`/api/testimonials/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; errorCode?: string };
        if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
        setSuccessMessage(t("updatedOk"));
        cancelEdit();
      } else {
        const res = await fetch("/api/testimonials", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; errorCode?: string };
        if (!res.ok) throw new Error(resolveApiErrorMessage(json, tApi));
        setSuccessMessage(t("createdOk"));
        setForm(emptyForm());
      }
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveUnexpected"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, active: boolean) {
    setListBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; errorCode?: string } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("toggleErr"));
        return;
      }
      await refreshAfterMutation();
      setSuccessMessage(active ? t("activated") : t("deactivated"));
    } finally {
      setListBusy(false);
    }
  }

  async function removeRow(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setListBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/testimonials/${id}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json().catch(() => null)) as { error?: string; errorCode?: string } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("deleteErr"));
        return;
      }
      if (editingId === id) cancelEdit();
      await refreshAfterMutation();
      setSuccessMessage(t("deleteDeleted"));
    } finally {
      setListBusy(false);
    }
  }

  return (
    <>
      {successMessage || error ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-3 pt-4 sm:pt-5"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2">
            {successMessage ? (
              <SuccessBanner
                title={t("bannerOk")}
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
                autoHideMs={5500}
                className="shadow-2xl shadow-violet-900/15 ring-1 ring-black/[0.06]"
              />
            ) : null}
            {error ? (
              <ErrorBanner
                title={t("bannerErr")}
                message={error}
                onDismiss={() => setError(null)}
                className="shadow-2xl shadow-rose-900/15 ring-1 ring-black/[0.06]"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {listBusy ? (
            <LoadingOverlay fixed={false} message={t("overlayUpdating")} submessage={t("overlayUpdatingSub")} />
          ) : null}
          <h1 className="mb-2 text-xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mb-4 text-sm text-slate-600">{t("intro")}</p>
          {loadingList ? (
            <LoadingCard message={t("loadingList")} className="border-0 bg-transparent py-10 shadow-none" />
          ) : (
            <ul className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
                  {t("emptyList")}
                </li>
              ) : null}
              {items.map((row) => (
                <li key={row.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{previewText(row.quote)}</p>
                      <p className="mt-1 text-xs text-violet-800">
                        {sourceLabel(row.source)}
                        {row.author ? ` · ${row.author}` : ""}
                        {` · ${t("labelSort")}: ${row.sortOrder}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.active ? t("active") : t("inactive")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => beginEdit(row)}
                      disabled={listBusy || saving}
                      className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(row.id, !row.active)}
                      disabled={listBusy}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.active ? t("deactivate") : t("activate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRow(row.id)}
                      disabled={listBusy}
                      className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {saving ? (
            <LoadingOverlay fixed={false} message={t("savingOverlay")} submessage={t("savingOverlaySub")} />
          ) : null}
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId !== null ? t("formEdit") : t("formNew")}
            </h2>
            {editingId !== null ? (
              <button
                type="button"
                onClick={() => cancelEdit()}
                disabled={saving}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancelEdit")}
              </button>
            ) : null}
          </div>
          {editingId !== null ? (
            <p className="mb-3 text-xs text-violet-800">{t("editingNote", { id: editingId })}</p>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelQuote")} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                placeholder={t("phQuote")}
                value={form.quote}
                onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelQuoteEn")}
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                placeholder={t("phQuoteEn")}
                value={form.quoteEn}
                onChange={(e) => setForm((f) => ({ ...f, quoteEn: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelAuthor")}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                placeholder={t("phAuthor")}
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelSource")} <span className="text-rose-600">*</span>
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    source: e.target.value as TestimonialRow["source"],
                  }))
                }
              >
                <option value="GOOGLE">{t("sourceGoogle")}</option>
                <option value="INSTAGRAM">{t("sourceInstagram")}</option>
                <option value="FACEBOOK">{t("sourceFacebook")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelSourceUrl")}
              </label>
              <input
                type="url"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                placeholder={t("phUrl")}
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelSort")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                value={form.sortOrderStr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrderStr: e.target.value.replace(/[^\d-]/g, "") }))
                }
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              {t("activeCheck")}
            </label>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <BrandSpinner size="sm" />
                  <span>{t("saving")}</span>
                </>
              ) : editingId !== null ? (
                t("saveUpdate")
              ) : (
                t("saveCreate")
              )}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
