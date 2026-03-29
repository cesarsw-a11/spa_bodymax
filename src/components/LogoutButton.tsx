"use client";

import { useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function LogoutButton() {
  const locale = useLocale();
  const t = useTranslations("logout");

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: `/${locale}/auth/login` })}
      className="ml-auto cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
    >
      {t("label")}
    </button>
  );
}
