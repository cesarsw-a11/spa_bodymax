import "../../../globals.css";
import AdminNav from "@/components/AdminNav";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const t = await getTranslations("adminLayout");

  if (!session || role !== "ADMIN") {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{t("restricted")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("needLogin")}</p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {t("goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-violet-50/40 to-fuchsia-50/40">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
