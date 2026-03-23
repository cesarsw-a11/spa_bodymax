"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RetryPaymentButton from "./RetryPaymentButton";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type Booking = {
  id: number;
  status: BookingStatus;
  price: string | number;
  date: string | Date;
  service?: { name?: string | null } | null;
};

type BookingApiResponse = {
  ok: boolean;
  data?: Booking;
  error?: string;
};

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const bookingIdStr = searchParams.get("bookingId") ?? searchParams.get("folio");
  const cancelledFlag = searchParams.get("cancelled");
  const sessionId = searchParams.get("session_id");

  const bookingId = useMemo(() => {
    if (!bookingIdStr) return NaN;
    const n = Number(bookingIdStr);
    return Number.isNaN(n) ? NaN : n;
  }, [bookingIdStr]);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedWithStripe, setSyncedWithStripe] = useState(false);

  const loadBooking = useCallback(async () => {
    if (Number.isNaN(bookingId)) {
      setBooking(null);
      setError("Identificador de reserva inválido (bookingId/folio).");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const json: BookingApiResponse = await res.json();
      if (!res.ok || !json?.ok || !json?.data) {
        throw new Error(json?.error || "Error cargando la reserva");
      }
      setBooking(json.data);
      return json.data?.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando la reserva");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingIdStr) return;
    setLoading(true);
    setBooking(null);
    loadBooking();
  }, [bookingIdStr, loadBooking]);

  useEffect(() => {
    if (bookingIdStr) return;
    setLoading(false);
    setBooking(null);
    setError("No se recibió el identificador de la reserva (bookingId/folio).");
  }, [bookingIdStr]);

  useEffect(() => {
    if (!sessionId) return;
    if (Number.isNaN(bookingId)) return;
    if (syncedWithStripe) return;

    setSyncedWithStripe(true);
    (async () => {
      try {
        await fetch("/api/stripe/sync-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, sessionId }),
        });
      } catch {
        // Si falla la sincronización, el polling de estado (PENDING) seguirá intentando.
      } finally {
        await loadBooking();
      }
    })();
  }, [sessionId, bookingId, syncedWithStripe, loadBooking]);

  useEffect(() => {
    if (Number.isNaN(bookingId)) return;
    if (booking?.status !== "PENDING") return;

    setPolling(true);
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      await loadBooking();
      if (attempts >= 12) window.clearInterval(interval);
    }, 5000);

    return () => {
      window.clearInterval(interval);
      setPolling(false);
    };
  }, [bookingId, booking?.status, loadBooking]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-2 text-slate-900">Confirmación de tu reserva</h1>

      {loading && (
        <p className="text-sm text-slate-600">
          Cargando detalles de la reserva…
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-700">
          {error}
        </p>
      )}

      {!loading && booking && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Reserva #{booking.id}</p>
              <p className="font-medium text-slate-900">{booking.service?.name ?? "Servicio"}</p>
              <p className="text-sm text-slate-600">
                {booking.date ? new Date(booking.date).toLocaleString() : "—"}
              </p>
              <p className="text-sm text-slate-600">
                Total: <span className="font-semibold text-slate-900">${Number(booking.price).toFixed(2)} MXN</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
              <p
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  booking.status === "CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700"
                    : booking.status === "CANCELLED"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {booking.status}
              </p>
            </div>
          </div>

          {booking.status === "CONFIRMED" && (
            <div className="mt-4">
              <p className="text-slate-700">
                ¡Pago confirmado! Ya está registrada tu cita. Te esperamos.
              </p>
              <a
                href="/reserve"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Hacer otra reserva
              </a>
            </div>
          )}

          {booking.status === "CANCELLED" && (
            <div className="mt-4">
              <p className="text-slate-700">
                No se pudo completar el pago. {cancelledFlag ? "Puedes intentar de nuevo." : ""}
              </p>
              <a
                href="/reserve"
                className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Volver a reservar
              </a>
            </div>
          )}

          {booking.status === "PENDING" && (
            <div className="mt-4">
              <p className="text-slate-700">
                Tu pago está pendiente. {polling ? "Verificando en segundos…" : ""}{" "}
                En algunos casos puede tardar unos segundos.
              </p>
              <RetryPaymentButton bookingId={booking.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-4 text-sm text-slate-600">Cargando confirmación…</div>}>
      <ConfirmacionContent />
    </Suspense>
  );
}

