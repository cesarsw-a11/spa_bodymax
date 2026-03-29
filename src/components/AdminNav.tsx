"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LogoutButton from "./LogoutButton";

export default function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("adminNav");
  const links = [
    { href: "/admin", labelKey: "home" as const },
    { href: "/admin/dashboard", labelKey: "dashboard" as const },
    { href: "/admin/services", labelKey: "services" as const },
    { href: "/admin/addons", labelKey: "addons" as const },
    { href: "/admin/bookings", labelKey: "bookings" as const },
    { href: "/admin/blocked", labelKey: "blocked" as const },
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-violet-100/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <div className="mr-2 hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white sm:block">
          {t("badge")}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  active ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}
