"use client";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const t = useTranslations("protected");
  if (status === "loading") return <div className="p-6">{t("loading")}</div>;
  if (status !== "authenticated") return <div className="p-6">{t("unauthorized")}</div>;
  return <>{children}</>;
}
