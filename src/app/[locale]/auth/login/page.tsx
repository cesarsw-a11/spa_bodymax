"use client";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { LoadingOverlay } from "@/components/ui/BrandLoading";
import { ErrorBanner } from "@/components/ui/BrandFeedback";

export default function Login() {
  const router = useRouter();
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(t("invalidCreds"));
      return;
    }
    router.push("/admin");
  }

  return (
    <div className="relative grid min-h-dvh place-items-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 p-4">
      {loading ? (
        <LoadingOverlay message={t("loadingTitle")} submessage={t("loadingSub")} />
      ) : null}
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-200 p-2.5"
            placeholder={t("emailPh")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 p-2.5"
            placeholder={t("passwordPh")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <ErrorBanner className="mt-3" title={t("errorTitle")} message={error} onDismiss={() => setError(null)} />
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full cursor-pointer rounded-xl bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
        <Link
          href="/"
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 hover:text-violet-800"
        >
          {t("backHome")}
        </Link>
      </form>
    </div>
  );
}
