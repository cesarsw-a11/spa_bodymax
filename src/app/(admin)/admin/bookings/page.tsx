"use client";
import { useCallback, useEffect, useState } from "react";
import { LoadingCard, LoadingInline } from "@/components/ui/BrandLoading";
import { ErrorBanner, SuccessBanner } from "@/components/ui/BrandFeedback";
import { BrandPagination } from "@/components/ui/BrandPagination";

type BookingItem = {
  id: number;
  customer: string;
  phone: string;
  date: string;
  price: string | number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  service?: { name?: string | null } | null;
};

const PAGE_SIZE = 8;

type ListMeta = { page: number; limit: number; total: number; totalPages: number };

export default function AdminBookings() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [page, setPage] = useState(1);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBookingsPage = useCallback(async (targetPage: number) => {
    const r = await fetch(`/api/bookings?page=${targetPage}&limit=${PAGE_SIZE}`);
    if (!r.ok) throw new Error("No se pudieron cargar las reservas.");
    const j = await r.json();
    const data = (j.data || []) as BookingItem[];
    const meta = j.meta as ListMeta | undefined;
    return { data, meta: meta ?? null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingList(true);
        setError(null);
        const { data, meta } = await fetchBookingsPage(page);
        if (cancelled) return;
        if (meta && data.length === 0 && meta.page > 1) {
          setPage(meta.page - 1);
          return;
        }
        setItems(data);
        setListMeta(meta);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar reservas.");
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
  }, [page, fetchBookingsPage]);

  async function refreshListAfterMutation() {
    try {
      const { data, meta } = await fetchBookingsPage(page);
      if (meta && data.length === 0 && meta.page > 1) {
        setPage(meta.page - 1);
        return;
      }
      setItems(data);
      setListMeta(meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar reservas.");
    }
  }

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "No se pudo actualizar el estado de la reserva.");
        return;
      }
      await refreshListAfterMutation();
      setSuccessMessage(status === "CONFIRMED" ? "Reserva confirmada." : "Reserva cancelada.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Reservas</h1>

      <div className="mb-4 space-y-3">
        {successMessage ? (
          <SuccessBanner
            title="Actualizado"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            autoHideMs={5000}
          />
        ) : null}
        {error ? <ErrorBanner title="Error" message={error} onDismiss={() => setError(null)} /> : null}
      </div>

      {loadingList ? (
        <LoadingCard message="Cargando reservas…" className="border-0 bg-transparent py-10 shadow-none" />
      ) : null}
      {!loadingList && items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-slate-600">
          No hay reservas registradas todavía.
        </p>
      ) : null}
      <div className="space-y-3">
        {!loadingList &&
          items.map((b) => (
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
              <div className="flex flex-wrap items-center gap-2">
                {updatingId === b.id ? (
                  <LoadingInline message="Actualizando estado…" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void updateStatus(b.id, "CONFIRMED")}
                      disabled={updatingId !== null}
                      className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStatus(b.id, "CANCELLED")}
                      disabled={updatingId !== null}
                      className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {listMeta && listMeta.total > 0 ? (
        <BrandPagination
          page={listMeta.page}
          totalPages={listMeta.totalPages}
          totalItems={listMeta.total}
          pageSize={listMeta.limit}
          onPageChange={setPage}
          disabled={loadingList || updatingId !== null}
          itemLabel="reservas"
        />
      ) : null}
    </section>
  );
}