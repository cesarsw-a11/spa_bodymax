import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FooterContactActions from "@/components/FooterContactActions";

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

const linkClass =
  "text-sm text-violet-100/85 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-sm";

export default async function Footer() {
  const year = new Date().getFullYear();
  const t = await getTranslations("footer");

  return (
    <footer
      className="relative mt-16 overflow-hidden border-t border-violet-400/20 bg-gradient-to-b from-slate-950 via-violet-950 to-slate-950 text-violet-50"
      role="contentinfo"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-20 h-[22rem] w-[22rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-[min(90%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/5 blur-2xl" />
      </div>

      <div className="relative h-px w-full bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="space-y-5 md:col-span-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-violet-100 backdrop-blur-sm">
                <IconSparkle className="h-3.5 w-3.5 text-violet-300" />
                {t("tagline")}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">{t("brand")}</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-violet-100/75">{t("blurb")}</p>
            </div>
          </div>

          <nav className="md:col-span-3" aria-label={t("siteNav")}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">{t("explore")}</h3>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <Link href="/" className={linkClass}>
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/#servicios" className={linkClass}>
                  {t("services")}
                </Link>
              </li>
              <li>
                <Link href="/reserve" className={linkClass}>
                  {t("book")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="space-y-8 md:col-span-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">{t("contact")}</h3>
              <FooterContactActions />
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">{t("hours")}</h3>
              <div className="mt-4 flex gap-3 rounded-2xl border border-violet-400/15 bg-white/[0.04] p-4 backdrop-blur-sm">
                <IconClock className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                <div className="text-sm leading-relaxed text-violet-100/80">
                  <p className="font-medium text-white">{t("hoursDays")}</p>
                  <p className="mt-1 text-violet-100/70">{t("hoursTime")}</p>
                  <p className="mt-2 text-xs text-violet-200/55">{t("hoursNote")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-center text-xs text-violet-200/55 md:flex-row md:text-left md:px-10">
          <p>{t("copyright", { year })}</p>
          <p className="max-w-md md:text-right">{t("taglineBottom")}</p>
        </div>
      </div>
    </footer>
  );
}
