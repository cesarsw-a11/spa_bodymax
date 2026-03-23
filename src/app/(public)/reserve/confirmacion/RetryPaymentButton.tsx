"use client";

import { useState } from "react";
import { BrandSpinner } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";

export default function RetryPaymentButton({ bookingId }: { bookingId: number }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onRetry() {
    setLoading(true);
    setErrorMessage(null);
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
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {errorMessage ? (
        <ErrorBanner
          title="No se pudo abrir el pago"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}
      <button
        type="button"
        onClick={() => void onRetry()}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white shadow hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <BrandSpinner size="sm" />
            <span>Preparando pago…</span>
          </>
        ) : (
          "Pagar con Stripe"
        )}
      </button>
    </div>
  );
}

