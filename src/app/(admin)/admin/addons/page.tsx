"use client";
import { useCallback, useEffect, useState } from "react";
import { BrandSpinner, LoadingCard, LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";

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
  const [items, setItems] = useState<AddonRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listBusy, setListBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", priceStr: "", active: true });

  const fetchAll = useCallback(async () => {
    const r = await fetch("/api/addons?all=1");
    if (!r.ok) throw new Error("No se pudieron cargar los complementos.");
    const j = await r.json();
    setItems(j.data || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        await fetchAll();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar complementos.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  async function refreshAfterMutation() {
    try {
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar complementos.");
    }
  }

  async function save() {
    setError(null);
    setSuccessMessage(null);
    const name = form.name.trim();
    if (!name) {
      setError("El nombre del complemento es obligatorio.");
      return;
    }
    const priceNorm = form.priceStr.replace(",", ".").trim();
    const price = Number(priceNorm);
    if (priceNorm === "" || !Number.isFinite(price) || price <= 0) {
      setError("Indica un precio válido mayor que 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, active: form.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear el complemento.");
      await refreshAfterMutation();
      setForm({ name: "", priceStr: "", active: true });
      setSuccessMessage("Complemento creado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
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
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "No se pudo actualizar el complemento.");
        return;
      }
      await refreshAfterMutation();
      setSuccessMessage(active ? "Complemento activado." : "Complemento desactivado.");
    } finally {
      setListBusy(false);
    }
  }

  async function removeAddon(id: number, name: string) {
    const ok = window.confirm(`¿Eliminar el complemento «${name}»?`);
    if (!ok) return;
    setListBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/addons/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "No se pudo eliminar.");
        return;
      }
      await refreshAfterMutation();
      setSuccessMessage(`Se eliminó «${name}».`);
    } finally {
      setListBusy(false);
    }
  }

  return (
    <>
      {(successMessage || error) ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[110] flex justify-center px-3 pt-4 sm:pt-5"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2">
            {successMessage ? (
              <SuccessBanner
                title="Listo"
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
                autoHideMs={5500}
                className="shadow-2xl shadow-violet-900/15 ring-1 ring-black/[0.06]"
              />
            ) : null}
            {error ? (
              <ErrorBanner
                title="Acción no completada"
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
            <LoadingOverlay
              fixed={false}
              message="Actualizando complementos"
              submessage="Aplicando cambios…"
            />
          ) : null}
          <h1 className="mb-3 text-xl font-semibold text-slate-900">Complementos</h1>
          <p className="mb-4 text-sm text-slate-600">
            Los complementos activos aparecen en la reserva pública. El precio se suma al total de la cita.
          </p>
          {loadingList ? (
            <LoadingCard message="Cargando complementos…" className="border-0 bg-transparent py-10 shadow-none" />
          ) : (
            <ul className="space-y-3">
              {!loadingList && items.length === 0 ? (
                <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
                  No hay complementos. Crea el primero con el formulario de la derecha.
                </li>
              ) : null}
              {items.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{a.name}</div>
                      <div className="mt-1 text-sm text-slate-700">${Number(a.price).toFixed(2)} MXN</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a.id, !a.active)}
                      disabled={listBusy}
                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {a.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAddon(a.id, a.name)}
                      disabled={listBusy}
                      className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {saving ? (
            <LoadingOverlay fixed={false} message="Guardando complemento" submessage="Registrando en la base de datos…" />
          ) : null}
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Nuevo complemento</h2>
          <p className="mb-3 text-xs text-slate-500">
            <span className="font-semibold text-rose-600">*</span> obligatorio · Precio mayor a 0.
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
                Nombre <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder="Ej. Aromaterapia"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Precio (MXN) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder="Ej. 120"
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
              Activo (visible en reservas)
            </label>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <BrandSpinner size="sm" />
                  <span>Guardando…</span>
                </>
              ) : (
                "Guardar complemento"
              )}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
