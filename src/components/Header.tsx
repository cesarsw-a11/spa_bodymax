import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function Header() {
  const t = await getTranslations("header");

  return (
    <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-bold text-slate-900 transition hover:opacity-90">
          <Image
            src="/logo_fondo_blanco.png"
            alt={t("brandAlt")}
            width={300}
            height={100}
            className="h-20 w-auto object-contain sm:h-20"
            priority
          />
          <span className="hidden sm:inline">{t("brandAlt")}</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <LocaleSwitcher />
          <Link href="/auth/login" className="underline">
            {t("admin")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
