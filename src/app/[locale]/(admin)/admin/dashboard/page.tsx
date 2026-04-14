import { prisma } from "@/lib/prisma";
import { buildDailyRevenueSeries } from "@/lib/dashboardRevenue";
import RevenueChart from "@/components/admin/RevenueChart";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveServiceText } from "@/lib/service-locale";
import { getServerSession } from "next-auth";
import { authOptions, canAccessAdminModuleFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const REVENUE_CHART_DAYS = 60;

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  if (!canAccessAdminModuleFromSession(session, "dashboard")) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        {t("noModuleAccess")}
      </section>
    );
  }

  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - (REVENUE_CHART_DAYS - 1));
  chartStart.setHours(0, 0, 0, 0);

  const [countBookings, revenue, upcoming, confirmedForChart] = await Promise.all([
    prisma.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.booking.aggregate({ _sum: { price: true }, where: { status: "CONFIRMED" } }),
    prisma.booking.findMany({
      where: { date: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } },
      include: { service: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED", date: { gte: chartStart } },
      select: { date: true, price: true },
    }),
  ]);

  const revenueByDay = buildDailyRevenueSeries(
    confirmedForChart,
    REVENUE_CHART_DAYS,
    dateLocale,
  );
  const chartSubtitle = t("chartLastDays", { days: REVENUE_CHART_DAYS });

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{t("activeBookings")}</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{countBookings}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{t("revenue")}</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">${Number(revenue._sum.price || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border border-fuchsia-100 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">{t("upcoming")}</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{upcoming.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("upcomingTitle")}</h2>
        <ul className="space-y-2">
          {upcoming.length === 0 && (
            <li className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t("noUpcoming")}</li>
          )}
          {upcoming.map((b: (typeof upcoming)[number]) => (
            <li key={b.id} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">
                {b.service ? resolveServiceText(b.service, locale).name : t("serviceFallback")}
              </div>
              <div className="text-sm text-slate-600">
                {new Date(b.date).toLocaleString(dateLocale)} — {b.customer}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <RevenueChart data={revenueByDay} subtitle={chartSubtitle} />
    </section>
  );
}
