"use client";
import { useEffect, useState } from "react";
import type { Service } from "@prisma/client";

type ServiceForm = {
  name: string;
  description: string;
  price: number;
  durationMin: number;
  active: boolean;
};

export default function AdminServices() {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>({
    name: "",
    description: "",
    price: 0,
    durationMin: 60,
    active: true,
  });

  async function load() {
    const r = await fetch("/api/services");
    const j = await r.json();
    setItems(j.data || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load();
    setForm({ name: "", description: "", price: 0, durationMin: 60, active: true });
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    await load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-semibold mb-2">Servicios</h1>
        <ul className="space-y-2">
          {items.map(s => (
            <li key={s.id} className="border rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name} {s.active ? "" : "(inactivo)"}</div>
                <div className="text-sm text-slate-500">{s.description}</div>
                <div className="text-sm">${Number(s.price).toFixed(2)} · {s.durationMin} min</div>
              </div>
              <button onClick={() => toggleActive(s.id, !s.active)} className="px-3 py-1 rounded-lg border">
                {s.active ? "Desactivar" : "Activar"}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Nuevo servicio</h2>
        <div className="space-y-2">
          <input className="w-full border rounded-xl p-2" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <textarea className="w-full border rounded-xl p-2" placeholder="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <input type="number" className="w-full border rounded-xl p-2" placeholder="Precio" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
          <input type="number" className="w-full border rounded-xl p-2" placeholder="Duración (min)" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))} />
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Activo</label>
          <button onClick={save} className="w-full py-2 rounded-xl bg-slate-900 text-white">Guardar</button>
        </div>
      </div>
    </div>
  );
}