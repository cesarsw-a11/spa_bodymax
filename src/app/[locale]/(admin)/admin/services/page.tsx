"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Service } from "@prisma/client";
import { BrandSpinner, LoadingCard, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { BrandPagination } from "@/components/ui/BrandPagination";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";

type ServiceWithImage = Service & { imageUrl?: string | null };

type ServiceForm = {
  name: string;
  description: string;
  imageUrl: string;
  /** Texto del input; se parsea al guardar (evita el 0 pegado y leading zeros). */
  priceStr: string;
  durationStr: string;
  active: boolean;
};

const PAGE_SIZE = 8;

/** Solo dígitos y un punto decimal (coma se convierte en punto). No letras ni símbolos. */
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

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

export default function AdminServices() {
  const t = useTranslations("adminServices");
  const tApi = useTranslations("apiErrors");
  const [items, setItems] = useState<ServiceWithImage[]>([]);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  /** Si no es null, el formulario edita ese servicio (PATCH); si no, crea uno nuevo (POST). */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>({
    name: "",
    description: "",
    imageUrl: "",
    priceStr: "",
    durationStr: "60",
    active: true,
  });

  const fetchServicesPage = useCallback(
    async (targetPage: number) => {
      const r = await fetch(`/api/services?page=${targetPage}&limit=${PAGE_SIZE}`);
      const j = (await r.json().catch(() => ({}))) as {
        data?: unknown;
        meta?: ListMeta;
        error?: string;
        errorCode?: string;
      };
      if (!r.ok) {
        throw new Error(resolveApiErrorMessage(j, tApi));
      }
      const data = (j.data || []) as ServiceWithImage[];
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
        const { data, meta } = await fetchServicesPage(page);
        if (cancelled) return;
        if (meta && data.length === 0 && meta.page > 1) {
          setPage(meta.page - 1);
          return;
        }
        setItems(data);
        setListMeta(meta);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("loadListError"));
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
  }, [page, fetchServicesPage, t]);

  async function refreshListAfterMutation() {
    try {
      const { data, meta } = await fetchServicesPage(page);
      if (meta && data.length === 0 && meta.page > 1) {
        setPage(meta.page - 1);
        return;
      }
      setItems(data);
      setListMeta(meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadListError"));
    }
  }
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function beginEdit(s: ServiceWithImage) {
    setEditingId(s.id);
    setError(null);
    setSuccessMessage(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setForm({
      name: s.name,
      description: s.description,
      imageUrl: (s.imageUrl && String(s.imageUrl).trim()) || "",
      priceStr: Number(s.price).toString(),
      durationStr: String(s.durationMin),
      active: s.active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setForm({ name: "", description: "", imageUrl: "", priceStr: "", durationStr: "60", active: true });
  }

  async function save() {
    setError(null);
    setSuccessMessage(null);

    const name = form.name.trim();
    const description = form.description.trim();
    if (!name) {
      setError(t("nameRequired"));
      return;
    }
    if (!description) {
      setError(t("descRequired"));
      return;
    }

    const priceNorm = form.priceStr.replace(",", ".").trim();
    const durationNorm = form.durationStr.trim();
    const price = Number(priceNorm);
    const durationMin = Math.round(Number(durationNorm));
    if (priceNorm === "" || !Number.isFinite(price) || price <= 0) {
      setError(t("priceRequired"));
      return;
    }
    if (durationNorm === "" || !Number.isFinite(durationMin) || durationMin < 1) {
      setError(t("durationRequired"));
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.imageUrl;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadRes = await fetch("/api/uploads", { method: "POST", credentials: "include", body: fd });
        const uploadText = await uploadRes.text();
        let uploadJson: { url?: string; error?: string; errorCode?: string } = {};
        if (uploadText.trim()) {
          try {
            uploadJson = JSON.parse(uploadText) as { url?: string; error?: string; errorCode?: string };
          } catch {
            throw new Error(t("uploadInvalid"));
          }
        }
        if (!uploadRes.ok || !uploadJson?.url) {
          throw new Error(resolveApiErrorMessage(uploadJson, tApi));
        }
        imageUrl = uploadJson.url;
      }

      const payload = {
        name,
        description,
        imageUrl,
        price,
        durationMin,
        active: form.active,
      };

      if (editingId !== null) {
        const patchRes = await fetch(`/api/services/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const patchText = await patchRes.text();
        let patchJson: { error?: string; errorCode?: string } = {};
        if (patchText.trim()) {
          try {
            patchJson = JSON.parse(patchText) as { error?: string; errorCode?: string };
          } catch {
            throw new Error(t("serverNotJson"));
          }
        } else if (!patchRes.ok) {
          throw new Error(t("serverEmpty"));
        }
        if (!patchRes.ok) throw new Error(resolveApiErrorMessage(patchJson, tApi));

        await refreshListAfterMutation();
        cancelEdit();
        setSuccessMessage(t("updatedOk"));
      } else {
        const createRes = await fetch("/api/services", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const createText = await createRes.text();
        let createJson: { error?: string; errorCode?: string } = {};
        if (createText.trim()) {
          try {
            createJson = JSON.parse(createText) as { error?: string; errorCode?: string };
          } catch {
            throw new Error(t("serverNotJson"));
          }
        } else if (!createRes.ok) {
          throw new Error(t("serverEmpty"));
        }
        if (!createRes.ok) throw new Error(resolveApiErrorMessage(createJson, tApi));

        await refreshListAfterMutation();
        setImageFile(null);
        setImagePreviewUrl(null);
        setForm({ name: "", description: "", imageUrl: "", priceStr: "", durationStr: "60", active: true });
        setSuccessMessage(t("createdOk"));
      }
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
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("toggleFailed"));
        return;
      }
      await refreshListAfterMutation();
      setSuccessMessage(active ? t("activated") : t("deactivated"));
    } finally {
      setListBusy(false);
    }
  }

  async function removeService(id: number, name: string) {
    const ok = window.confirm(t("deleteConfirm", { name }));
    if (!ok) return;
    setError(null);
    setSuccessMessage(null);
    setListBusy(true);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
      } | null;
      if (!res.ok) {
        setError(json ? resolveApiErrorMessage(json, tApi) : t("deleteFailed"));
        return;
      }
      await refreshListAfterMutation();
      setSuccessMessage(t("deleted", { name }));
    } finally {
      setListBusy(false);
    }
  }

  return (
    <>
      {/* Por encima de overlays de carga (z-50) y del resto del admin (nav z-30) */}
      {(successMessage || error) ? (
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
        {loadingList ? (
          <LoadingCard message={t("loadingCatalog")} className="border-0 bg-transparent py-10 shadow-none" />
        ) : (
        <>
        <ul className="space-y-3">
          {!loadingList && items.length === 0 ? (
            <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
              {t("emptyList")}
            </li>
          ) : null}
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{s.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{s.description}</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {t("durationLine", { price: `$${Number(s.price).toFixed(2)}`, minutes: s.durationMin })}
                  </div>
                  {s.imageUrl ? (
                    <a href={s.imageUrl} target="_blank" className="mt-2 inline-block text-xs font-medium text-violet-700 underline">
                      {t("viewImage")}
                    </a>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.active ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => beginEdit(s)}
                  disabled={listBusy || saving}
                  className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(s.id, !s.active)}
                  disabled={listBusy}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s.active ? t("deactivate") : t("activate")}
                </button>
                <button
                  type="button"
                  onClick={() => void removeService(s.id, s.name)}
                  disabled={listBusy}
                  className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("delete")}
                </button>
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
            disabled={listBusy || loadingList}
            itemLabel={t("paginationLabel")}
          />
        ) : null}
        </>
        )}
      </div>

      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {saving ? (
          <LoadingOverlay
            fixed={false}
            message={editingId !== null ? t("savingUpdate") : t("savingCreate")}
            submessage={editingId !== null ? t("savingUpdateSub") : t("savingCreateSub")}
          />
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
        <p className="mb-3 text-xs text-slate-500">
          {t("formHint")}
          {editingId !== null ? (
            <span className="mt-1 block text-violet-700">{t("editingNote", { id: editingId })}</span>
          ) : null}
        </p>
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
              {t("labelDesc")} <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 p-2.5"
              placeholder={t("phDesc")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("labelImage")} <span className="font-normal text-slate-400">{t("imageOptional")}</span>
            </label>
            <input
              key={editingId ?? "new"}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/pjpeg,image/webp,image/gif,.jpg,.jpeg,.jpe,.png,.webp,.gif"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                if (!file) {
                  setImagePreviewUrl(null);
                  return;
                }
                const preview = URL.createObjectURL(file);
                setImagePreviewUrl(preview);
              }}
            />
            <p className="text-xs text-slate-500">{t("imageFormats")}</p>
            {form.imageUrl && !imageFile ? (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                className="text-xs font-medium text-rose-600 underline hover:text-rose-700"
              >
                {t("removeImage")}
              </button>
            ) : null}
            {imagePreviewUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreviewUrl} alt={t("previewAlt")} className="h-36 w-full object-cover" />
              </div>
            ) : form.imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={form.imageUrl} alt={t("imageAlt")} className="h-36 w-full object-cover" />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelPrice")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder={t("phPrice")}
                value={form.priceStr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceStr: normalizePriceInput(e.target.value) }))
                }
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("labelDuration")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder="60"
                value={form.durationStr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, durationStr: e.target.value.replace(/\D/g, "") }))
                }
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("hintPrice")}</p>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
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
              t("saveChanges")
            ) : (
              t("saveService")
            )}
          </button>
        </form>
      </div>
    </section>
    </>
  );
}