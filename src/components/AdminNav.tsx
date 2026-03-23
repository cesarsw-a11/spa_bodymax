 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function AdminNav() {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Inicio" },
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/services", label: "Servicios" },
    { href: "/admin/bookings", label: "Reservas" },
    { href: "/admin/blocked", label: "Bloqueos" },
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-violet-100/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <div className="mr-2 hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white sm:block">
          Admin SPA
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-violet-100 text-violet-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}