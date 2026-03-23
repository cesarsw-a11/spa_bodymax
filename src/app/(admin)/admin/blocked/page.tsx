"use client";
import { useEffect, useState } from "react";

export default function AdminBlocked() {
  const [items, setItems] = useState<any[]>([]);
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
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-3">Bloquear fechas/horarios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <input type="datetime-local" className="border rounded-xl p-2" value={start} onChange={e => setStart(e.target.value)} />
        <input type="datetime-local" className="border rounded-xl p-2" value={end} onChange={e => setEnd(e.target.value)} />
        <input className="border rounded-xl p-2" placeholder="Motivo" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <button onClick={add} className="px-4 py-2 rounded-xl bg-slate-900 text-white mb-4">Agregar bloqueo</button>
      <ul className="space-y-2">
        {items.map(b => (
          <li key={b.id} className="border rounded-xl p-3">
            <div className="font-medium">{new Date(b.start).toLocaleString()} → {new Date(b.end).toLocaleString()}</div>
            <div className="text-sm text-slate-600">{b.reason || "(sin motivo)"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}