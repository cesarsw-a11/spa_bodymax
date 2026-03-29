import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Hero from "@/components/Hero";
import { resolveServiceText } from "@/lib/service-locale";
import type { Service, ServiceVariant } from "@prisma/client";

export const dynamic = "force-dynamic";

const variantOrderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

type ServiceHome = Pick<
  Service,
  "id" | "name" | "description" | "nameEn" | "descriptionEn" | "price" | "durationMin" | "imageUrl"
> & {
  variants: ServiceVariant[];
};

export default async function Home() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const services = (await prisma.service.findMany({
    where: {
      active: true,
      variants: { some: { active: true } },
    },
    orderBy: { id: "asc" },
    include: {
      variants: {
        where: { active: true },
        orderBy: variantOrderBy,
      },
    },
  })) as ServiceHome[];

  const highlights = [
    { titleKey: "highlight1Title" as const, descKey: "highlight1Desc" as const },
    { titleKey: "highlight2Title" as const, descKey: "highlight2Desc" as const },
    { titleKey: "highlight3Title" as const, descKey: "highlight3Desc" as const },
  ];

  const quotes = ["quote1", "quote2", "quote3"] as const;

  return (
    <div className="space-y-28">
      <Hero />

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map(({ titleKey, descKey }) => (
            <article
              key={titleKey}
              className="relative overflow-hidden rounded-3xl border border-violet-200/60 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-300/0 blur-2xl transition group-hover:bg-fuchsia-300/20" />
              <h3 className="text-lg font-semibold text-stone-900">{t(titleKey)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{t(descKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="servicios" className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-stone-900">{t("servicesTitle")}</h2>
            <p className="mt-1 text-stone-600">{t("servicesSubtitle")}</p>
          </div>
          <Link
            href="/reserve"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
          >
            {t("schedule")}
          </Link>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const { name, description } = resolveServiceText(s, locale);
            const vars = s.variants;
            const prices = vars.map((v) => Number(v.price));
            const pLo = Math.min(...prices);
            const pHi = Math.max(...prices);
            const durs = vars.map((v) => v.durationMin);
            const dLo = Math.min(...durs);
            const dHi = Math.max(...durs);
            return (
              <Link
                key={s.id}
                href={`/reserve?serviceId=${s.id}`}
                aria-label={t("bookServiceAria", { name })}
                className="group block rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                <article className="relative h-full overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-white shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-xl">
                  {s.imageUrl ? (
                    <div
                      className="h-40 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${s.imageUrl}")` }}
                      aria-hidden
                    />
                  ) : (
                    <div className="relative h-40 w-full bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white">
                      <div className="absolute inset-0">
                        <div className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-violet-200/40 blur-2xl" />
                        <div className="absolute right-6 -bottom-6 h-24 w-24 rounded-full bg-fuchsia-200/40 blur-2xl" />
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-stone-900">{name}</h3>
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-stone-600">{description}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-semibold text-stone-900">
                        {pLo === pHi ? `$${pLo.toFixed(2)}` : `$${pLo.toFixed(2)} – $${pHi.toFixed(2)}`}
                      </span>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        {dLo === dHi ? `${dLo} ${t("min")}` : t("durationRange", { min: dLo, max: dHi })}
                      </span>
                    </div>

                    <div className="mt-5">
                      <span className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition group-hover:bg-violet-700 group-active:scale-[0.99]">
                        {t("book")}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="rounded-[2rem] border border-violet-200/60 bg-white p-8 shadow-sm md:p-12">
          <h3 className="text-2xl font-semibold text-stone-900">{t("testimonialsTitle")}</h3>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {quotes.map((q) => (
              <blockquote
                key={q}
                className="rounded-2xl border border-violet-200/60 bg-white/80 p-5 text-stone-700"
              >
                “{t(q)}”
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-200/60 bg-gradient-to-br from-white to-violet-50 p-10 text-center shadow-sm md:p-14">
          <div className="pointer-events-none absolute -left-12 -top-10 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-fuchsia-200/30 blur-3xl" />
          <h3 className="text-3xl font-semibold text-stone-900">{t("ctaTitle")}</h3>
          <p className="mx-auto mt-2 max-w-2xl text-stone-600">{t("ctaSubtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reserve"
              className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99]"
            >
              {t("ctaButton")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
