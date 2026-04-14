import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getServerSession } from "next-auth";
import { authOptions, canAccessAdminModuleFromSession } from "@/lib/auth";

export default async function AdminHome() {
  const t = await getTranslations("adminHome");
  const session = await getServerSession(authOptions);
  const shortcuts = [
    { href: "/admin/dashboard" as const, label: t("linkDashboard"), desc: t("linkDashboardDesc"), module: "dashboard" as const },
    { href: "/admin/services" as const, label: t("linkServices"), desc: t("linkServicesDesc"), module: "services" as const },
    { href: "/admin/addons" as const, label: t("linkAddons"), desc: t("linkAddonsDesc"), module: "addons" as const },
    { href: "/admin/bookings" as const, label: t("linkBookings"), desc: t("linkBookingsDesc"), module: "bookings" as const },
    { href: "/admin/blocked" as const, label: t("linkBlocked"), desc: t("linkBlockedDesc"), module: "blocked" as const },
    { href: "/admin/testimonials" as const, label: t("linkTestimonials"), desc: t("linkTestimonialsDesc"), module: "testimonials" as const },
    { href: "/admin/roles" as const, label: t("linkRoles"), desc: t("linkRolesDesc"), module: "users" as const },
    { href: "/admin/users" as const, label: t("linkEmployees"), desc: t("linkEmployeesDesc"), module: "users" as const },
  ];
  const visibleShortcuts = shortcuts.filter((item) => canAccessAdminModuleFromSession(session, item.module));

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-400 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-white/90">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleShortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
