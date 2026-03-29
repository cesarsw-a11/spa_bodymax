"use client";

import type { Service } from "@prisma/client";
import { useTranslations } from "next-intl";

export default function ServiceCard({ service }: { service: Service }) {
  const t = useTranslations("home");
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold">{service.name}</div>
      <div className="text-sm text-slate-600">{service.description}</div>
      <div className="mt-2 font-bold">
        ${Number(service.price).toFixed(2)} · {service.durationMin} {t("min")}
      </div>
    </div>
  );
}
