"use client";
import { useEffect, useState } from "react";

type BookingItem = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: string | number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  service?: { name?: string | null } | null;
};

export default function AdminBookings() {
  const [items, setItems] = useState<BookingItem[]>([]);

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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Reservas</h1>
      <div className="space-y-3">
        {items.map((b) => (
          <div key={b.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">#{b.id} — {b.customer} ({b.phone})</div>
                <div className="mt-1 text-sm text-slate-600">
                  {new Date(b.date).toLocaleString()} · {b.service?.name} · ${Number(b.price).toFixed(2)}
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    b.status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-700"
                      : b.status === "CANCELLED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(b.id, "CONFIRMED")}
                  className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => updateStatus(b.id, "CANCELLED")}
                  className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}