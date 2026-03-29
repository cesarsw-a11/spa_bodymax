"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import type { DailyRevenuePoint } from "@/lib/dashboardRevenue";

type Props = {
  data: DailyRevenuePoint[];
  subtitle?: string;
};

export default function RevenueChart({ data, subtitle }: Props) {
  const t = useTranslations("revenueChart");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const totalPeriod = data.reduce((s, d) => s + d.ingresos, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t("chartTitle")}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {t("chartSubtitle")}{" "}
            <span className="font-medium text-emerald-700">{t("confirmed")}</span>
            {subtitle ? ` · ${subtitle}` : null}
          </p>
        </div>
        <div className="mt-2 text-right sm:mt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("totalPeriod")}</p>
          <p className="text-xl font-bold tabular-nums text-violet-700">${totalPeriod.toFixed(2)} MXN</p>
        </div>
      </div>

      <div className="h-[min(360px,55vh)] w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${Number(v).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}`}
              width={56}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 40px -12px rgba(15, 23, 42, 0.2)",
              }}
              labelStyle={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}
              formatter={(value: number | string) => [`$${Number(value).toFixed(2)} MXN`, t("tooltipSeries")]}
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as DailyRevenuePoint | undefined;
                return row?.fullLabel ?? "";
              }}
            />
            <Area
              type="monotone"
              dataKey="ingresos"
              name={t("tooltipSeries")}
              stroke="#6d28d9"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 5, stroke: "#5b21b6", strokeWidth: 2, fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
