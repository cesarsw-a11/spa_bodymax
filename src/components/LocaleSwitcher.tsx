"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("localeSwitcher");

  function set(next: string) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 p-0.5 text-xs font-semibold">
      <span className="sr-only">{t("label")}</span>
      <button
        type="button"
        onClick={() => set("es")}
        className={`cursor-pointer rounded-md px-2 py-1 transition ${
          locale === "es" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {t("es")}
      </button>
      <button
        type="button"
        onClick={() => set("en")}
        className={`cursor-pointer rounded-md px-2 py-1 transition ${
          locale === "en" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {t("en")}
      </button>
    </div>
  );
}
