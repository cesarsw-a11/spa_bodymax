"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandSpinner, LoadingCard, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";

type AddonRow = { id: number; name: string; price: number; active: boolean };

function normalizePriceInput(raw: string): string {
  const s = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  let out = "";
  let dot = false;
  for (const c of s) {
    if (c === ".") {
      if (!dot) {
        out += ".";
        dot = true;
      }
    } else {
      out += c;
    }
  }
  return out;
}

export default function AdminAddons() {
  const t = useTranslations("adminAddons");
  const tApi = useTranslations("apiErrors");
  const [items, setItems] = useState<AddonRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listBusy, setListBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", priceStr: "", active: true });

  const fetchAll = useCallback(async () => {
    const r = await fetch("/api/addons?all=1");
    const j = (await r.json().catch(() => ({}))) as {
      data?: AddonRow[];
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

  async function save() {
    setError(null);
    setSuccessMessage(null);
    const name = form.name.trim();
    if (!name) {
      setError(t("nameRequired"));
      return;
    }
    const priceNorm = form.priceStr.replace(",", ".").trim();
    const price = Number(priceNorm);
    if (priceNorm === "" || !Number.isFinite(price) || price <= 0) {
      setError(t("priceInvalid"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, active: form.active }),
      });
      const json = (await res.json()) as { error?: string; errorCode?: string };
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(json, tApi));
      }
      await refreshAfterMutation();
      setForm({ name: "", priceStr: "", active: true });
      setSuccessMessage(t("createdOk"));
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
      const res = await fetch(`/api/addons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
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

  async function removeAddon(id: number, name: string) {
    const ok = window.confirm(t("deleteConfirm", { name }));
    if (!ok) return;
    setListBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/addons/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("deleteErr"));
        return;
      }
      await refreshAfterMutation();
      setSuccessMessage(t("deleted", { name }));
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

      <section className="grid gap-6 md:grid-cols-2">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {listBusy ? (
            <LoadingOverlay fixed={false} message={t("overlayUpdating")} submessage={t("overlayUpdatingSub")} />
          ) : null}
          <h1 className="mb-3 text-xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mb-4 text-sm text-slate-600">{t("intro")}</p>
          {loadingList ? (
            <LoadingCard message={t("loadingList")} className="border-0 bg-transparent py-10 shadow-none" />
          ) : (
            <ul className="space-y-3">
              {!loadingList && items.length === 0 ? (
                <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
                  {t("emptyList")}
                </li>
              ) : null}
              {items.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{a.name}</div>
                      <div className="mt-1 text-sm text-slate-700">
                        ${Number(a.price).toFixed(2)} {t("mxn")}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.active ? t("active") : t("inactive")}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a.id, !a.active)}
                      disabled={listBusy}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {a.active ? t("deactivate") : t("activate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAddon(a.id, a.name)}
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
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("formTitle")}</h2>
          <p className="mb-3 text-xs text-slate-500">{t("formHint")}</p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelName")} <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder={t("phName")}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelPrice")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder={t("phPrice")}
                value={form.priceStr}
                onChange={(e) => setForm((f) => ({ ...f, priceStr: normalizePriceInput(e.target.value) }))}
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
              ) : (
                t("saveBtn")
              )}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
