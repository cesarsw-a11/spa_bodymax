"use client";

import { useState } from "react";

export default function RetryPaymentButton({ bookingId }: { bookingId: number }) {
  const [loading, setLoading] = useState(false);

  async function onRetry() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Error creando la sesión de pago");
      }

      window.location.href = json.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar el pago.";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onRetry}
      disabled={loading}
      className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 disabled:opacity-50"
    >
      {loading ? "Preparando pago…" : "Pagar con Stripe"}
    </button>
  );
}

