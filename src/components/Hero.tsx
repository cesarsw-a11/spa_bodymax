import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden" aria-label={t("aria")}>
      <div className="relative h-[520px] md:h-[640px]">
        <Image
          src="/spa_2.png"
          alt={t("imageAlt")}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/30 to-black/10 md:bg-gradient-to-r md:from-black/60 md:via-black/30 md:to-transparent" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-end md:items-center">
        <div className="pointer-events-auto mx-auto w-full max-w-6xl px-6 py-8 md:px-10 md:py-0">
          <div className="max-w-2xl md:max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/20 px-3 py-1 text-xs font-semibold text-violet-50 backdrop-blur">
              {t("tagline")}
            </span>

            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">{t("title")}</h1>

            <p className="mt-3 text-base leading-relaxed text-violet-50/90 md:text-lg">{t("subtitle")}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/reserve"
                aria-label={t("bookNowAria")}
                className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {t("bookNow")}
              </Link>

              <a
                href="#servicios"
                aria-label={t("viewServicesAria")}
                className="rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {t("viewServices")}
              </a>
            </div>

            <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-violet-50/90 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> {t("benefit1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> {t("benefit2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> {t("benefit3")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
