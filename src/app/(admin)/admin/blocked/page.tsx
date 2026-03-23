"use client";
import { useEffect, useState } from "react";

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

  async function load() {
    const r = await fetch("/api/blocks");
    const j = await r.json();
    setItems(j.data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    await fetch("/api/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start, end, reason }) });
    setStart(""); setEnd(""); setReason("");
    await load();
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-3 text-xl font-semibold text-slate-900">Bloquear fechas y horarios</h1>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input type="datetime-local" className="rounded-xl border border-slate-200 p-2.5" value={start} onChange={e => setStart(e.target.value)} />
        <input type="datetime-local" className="rounded-xl border border-slate-200 p-2.5" value={end} onChange={e => setEnd(e.target.value)} />
        <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Motivo" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <button onClick={add} className="mb-4 cursor-pointer rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700">
        Agregar bloqueo
      </button>
      <ul className="space-y-2">
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