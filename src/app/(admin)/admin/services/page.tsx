"use client";
import { useEffect, useState } from "react";
import type { Service } from "@prisma/client";

type ServiceWithImage = Service & { imageUrl?: string | null };

type ServiceForm = {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  durationMin: number;
  active: boolean;
};

export default function AdminServices() {
  const [items, setItems] = useState<ServiceWithImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>({
    name: "",
    description: "",
    imageUrl: "",
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
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let imageUrl = form.imageUrl;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadRes = await fetch("/api/uploads", { method: "POST", body: fd });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson?.url) {
          throw new Error(uploadJson?.error || "No se pudo subir la imagen");
        }
        imageUrl = uploadJson.url;
      }

      const payload = { ...form, imageUrl };
      const createRes = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson?.error || "No se pudo crear el servicio");

      await load();
      setImageFile(null);
      setImagePreviewUrl(null);
      setForm({ name: "", description: "", imageUrl: "", price: 0, durationMin: 60, active: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    await load();
  }

  async function removeService(id: number, name: string) {
    const ok = window.confirm(`¿Seguro que deseas eliminar "${name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "No se pudo eliminar el servicio");
      return;
    }
    await load();
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="mb-3 text-xl font-semibold text-slate-900">Servicios</h1>
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{s.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{s.description}</div>
                  <div className="mt-2 text-sm text-slate-700">${Number(s.price).toFixed(2)} · Tiempo: {s.durationMin} minutos</div>
                  {s.imageUrl ? (
                    <a href={s.imageUrl} target="_blank" className="mt-2 inline-block text-xs font-medium text-violet-700 underline">
                      Ver imagen
                    </a>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {s.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => toggleActive(s.id, !s.active)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {s.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => removeService(s.id, s.name)}
                  className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Nuevo servicio</h2>
        <div className="space-y-3">
          <input className="w-full rounded-xl border border-slate-200 p-2.5" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <textarea className="w-full rounded-xl border border-slate-200 p-2.5" placeholder="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Imagen del servicio</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
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
            <p className="text-xs text-slate-500">Formatos permitidos: JPG, PNG, WEBP, GIF. Tamaño máximo: 5MB.</p>
            {imagePreviewUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreviewUrl} alt="Vista previa" className="h-36 w-full object-cover" />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Precio</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 p-2.5"
                placeholder="Precio"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tiempo (minutos)</label>
              <input type="number" className="w-full rounded-xl border border-slate-200 p-2.5" placeholder="60" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: Number(e.target.value) }))} />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            Activo
          </label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button onClick={save} disabled={saving} className="w-full cursor-pointer rounded-xl bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar servicio"}
          </button>
        </div>
      </div>
    </section>
  );
}