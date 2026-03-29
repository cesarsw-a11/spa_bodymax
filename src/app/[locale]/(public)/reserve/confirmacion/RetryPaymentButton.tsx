"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandSpinner } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";
import { resolveApiErrorMessage } from "@/lib/resolve-api-message";
import type { AppLocale } from "@/i18n/routing";

export default function RetryPaymentButton({ bookingId }: { bookingId: number }) {
  const t = useTranslations("retryPayment");
  const tApi = useTranslations("apiErrors");
  const locale = useLocale() as AppLocale;
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onRetry() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, locale }),
      });

      const json = (await res.json()) as {
        url?: string;
        error?: string;
        errorCode?: string;
      };
      if (!res.ok || !json?.url) {
        throw new Error(resolveApiErrorMessage(json, tApi));
      }

      window.location.href = json.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("generic");
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {errorMessage ? (
        <ErrorBanner
          title={t("errTitle")}
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
            <span>{t("loading")}</span>
          </>
        ) : (
          t("btn")
        )}
      </button>
    </div>
  );
}
