"use client";

import type { Service } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { resolveServiceText } from "@/lib/service-locale";

export default function ServiceCard({ service }: { service: Service }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const { name, description } = resolveServiceText(service, locale);
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold">{name}</div>
      <div className="text-sm text-slate-600">{description}</div>
      <div className="mt-2 font-bold">
        ${Number(service.price).toFixed(2)} · {service.durationMin} {t("min")}
      </div>
    </div>
  );
}
