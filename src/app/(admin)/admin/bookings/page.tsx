"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const r = await fetch("/api/bookings");
    const j = await r.json();
    setItems(j.data || []);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Reservas</h1>
      <div className="space-y-2">
        {items.map(b => (
          <div key={b.id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">#{b.id} — {b.customer} ({b.phone})</div>
              <div className="text-sm text-slate-600">{new Date(b.date).toLocaleString()} · {b.service?.name} · ${Number(b.price).toFixed(2)}</div>
              <div className="text-xs uppercase tracking-wide">{b.status}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateStatus(b.id, "CONFIRMED")} className="px-3 py-1 rounded-lg border">Confirmar</button>
              <button onClick={() => updateStatus(b.id, "CANCELLED")} className="px-3 py-1 rounded-lg border">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}