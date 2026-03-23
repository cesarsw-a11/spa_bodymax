"use client";
import { useEffect, useState } from "react";
import { BrandSpinner, LoadingCard } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";

type BlockedItem = {
  id: number;
  start: string;
  end: string;
  reason?: string | null;
};

export default function AdminBlocked() {
  const [items, setItems] = useState<BlockedItem[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/blocks");
      if (!r.ok) throw new Error("No se pudieron cargar los bloqueos.");
      const j = await r.json();
      setItems(j.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar bloqueos.");
      setItems([]);
    } finally {
      setLoadingInitial(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function add() {
    setAdding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start, end, reason }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "No se pudo crear el bloqueo. Revisa las fechas.");
        return;
      }
      setStart(""); setEnd(""); setReason("");
      await load();
      setSuccessMessage("Bloqueo agregado correctamente.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-semibold text-slate-900">Bloquear fechas y horarios</h1>

      <div className="mb-4 space-y-3">
        {successMessage ? (
          <SuccessBanner
            title="Guardado"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            autoHideMs={5000}
          />
        ) : null}
        {error ? <ErrorBanner title="No se pudo completar" message={error} onDismiss={() => setError(null)} /> : null}
      </div>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input type="datetime-local" className="rounded-xl border border-slate-200 p-2.5" value={start} onChange={e => setStart(e.target.value)} />
        <input type="datetime-local" className="rounded-xl border border-slate-200 p-2.5" value={end} onChange={e => setEnd(e.target.value)} />
        <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Motivo" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <button
        type="button"
        onClick={() => void add()}
        disabled={adding}
        className="mb-4 flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {adding ? (
          <>
            <BrandSpinner size="sm" />
            <span>Guardando…</span>
          </>
        ) : (
          "Agregar bloqueo"
        )}
      </button>
      {loadingInitial ? (
        <LoadingCard message="Cargando bloqueos…" className="mb-4 border-0 bg-transparent py-8 shadow-none" />
      ) : null}
      <ul className="space-y-2">
        {!loadingInitial && items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
            No hay horarios bloqueados. Agrega uno arriba cuando lo necesites.
          </li>
        ) : null}
        {items.map((b) => (
          <li key={b.id} className="rounded-xl border border-slate-200 p-3">
            <div className="font-medium text-slate-900">{new Date(b.start).toLocaleString()} → {new Date(b.end).toLocaleString()}</div>
            <div className="text-sm text-slate-600">{b.reason || "(sin motivo)"}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}