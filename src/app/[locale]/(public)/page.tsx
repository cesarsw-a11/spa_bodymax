import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Hero from "@/components/Hero";
import { resolveServiceText } from "@/lib/service-locale";
import type { Service, ServiceVariant } from "@prisma/client";
import { resolveTestimonialQuote } from "@/lib/testimonial-text";

export const dynamic = "force-dynamic";

const variantOrderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

type ServiceHome = Pick<
  Service,
  "id" | "name" | "description" | "nameEn" | "descriptionEn" | "price" | "durationMin" | "imageUrl"
> & {
  variants: ServiceVariant[];
};

type ServiceZone = "masajes" | "faciales" | "pestanas" | "otros";

const zoneOrder: ServiceZone[] = ["masajes", "faciales", "pestanas", "otros"];

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveServiceZone(name: string): ServiceZone {
  const n = normalizeForMatch(name);
  if (
    n.includes("masaje") ||
    n.includes("massage") ||
    n.includes("descontracturante") ||
    n.includes("relajante") ||
    n.includes("tejido profundo")
  ) {
    return "masajes";
  }
  if (
    n.includes("facial") ||
    n.includes("limpieza") ||
    n.includes("skin") ||
    n.includes("hidratacion")
  ) {
    return "faciales";
  }
  if (
    n.includes("pesta") ||
    n.includes("lash") ||
    n.includes("lifting") ||
    n.includes("extension")
  ) {
    return "pestanas";
  }
  return "otros";
}

function SourceIcon({ source }: { source: "GOOGLE" | "INSTAGRAM" | "FACEBOOK" }) {
  if (source === "GOOGLE") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
        <path
          d="M12 10.2v3.95h5.48c-.23 1.27-.92 2.34-1.95 3.05v2.53h3.15c1.85-1.7 2.92-4.2 2.92-7.16 0-.69-.06-1.35-.18-1.99H12Z"
          fill="currentColor"
        />
        <path
          d="M12 22c2.64 0 4.85-.87 6.46-2.35l-3.15-2.53c-.87.58-1.99.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.6A9.98 9.98 0 0 0 12 22Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M6.54 14.01A5.99 5.99 0 0 1 6.2 12c0-.69.12-1.35.34-2l-3.24-2.6A9.96 9.96 0 0 0 2 12c0 1.62.39 3.16 1.08 4.41l3.46-2.4Z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M12 5.96c1.44 0 2.73.5 3.74 1.47l2.8-2.8C16.84 2.98 14.63 2 12 2a9.98 9.98 0 0 0-8.7 4.99L6.54 10c.77-2.3 2.92-4.04 5.46-4.04Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }
  if (source === "INSTAGRAM") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        d="M14 8h3V4h-3c-3.31 0-6 2.69-6 6v2H5v4h3v4h4v-4h3.2l.8-4H12v-2c0-1.1.9-2 2-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default async function Home() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const dbTestimonials = await prisma.testimonial.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      quote: true,
      quoteEn: true,
      author: true,
      source: true,
      sourceUrl: true,
    },
  });

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

  const fallbackQuotes = ["quote1", "quote2", "quote3"] as const;
  const useDbTestimonials = dbTestimonials.length > 0;
  const servicesByZone = services.reduce<Record<ServiceZone, ServiceHome[]>>(
    (acc, service) => {
      const zone = resolveServiceZone(service.name);
      acc[zone].push(service);
      return acc;
    },
    { masajes: [], faciales: [], pestanas: [], otros: [] },
  );

  const zoneTitleByKey: Record<ServiceZone, string> = {
    masajes: t("zoneTitleMasajes"),
    faciales: t("zoneTitleFaciales"),
    pestanas: t("zoneTitlePestanas"),
    otros: t("zoneTitleOtros"),
  };

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

        <div className="space-y-9">
          {zoneOrder.map((zoneKey) => {
            const zoneItems = servicesByZone[zoneKey];
            if (zoneItems.length === 0) return null;
            return (
              <section key={zoneKey}>
                <h3 className="mb-4 text-xl font-semibold text-stone-900">{zoneTitleByKey[zoneKey]}</h3>
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {zoneItems.map((s) => {
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
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="rounded-[2rem] border border-violet-200/60 bg-white p-8 shadow-sm md:p-12">
          <h3 className="text-2xl font-semibold text-stone-900">{t("testimonialsTitle")}</h3>
          {useDbTestimonials ? (
            <p className="mt-2 text-sm text-stone-600">{t("testimonialsHint")}</p>
          ) : null}
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {useDbTestimonials
              ? dbTestimonials.map((row) => {
                  const body = resolveTestimonialQuote(row, locale);
                  const sourceName =
                    row.source === "GOOGLE"
                      ? t("testimonialSources.GOOGLE")
                      : row.source === "INSTAGRAM"
                        ? t("testimonialSources.INSTAGRAM")
                        : t("testimonialSources.FACEBOOK");
                  const attribution = row.author
                    ? `— ${row.author} · ${sourceName}`
                    : `— ${sourceName}`;
                  return (
                    <blockquote
                      key={row.id}
                      className="flex h-full flex-col rounded-2xl border border-violet-200/60 bg-white/80 p-5 text-stone-700"
                    >
                      <p className="flex-1 whitespace-pre-wrap leading-relaxed">“{body}”</p>
                      <footer className="mt-4 text-xs font-medium text-violet-800">
                        <div className="inline-flex items-center gap-1.5 text-violet-800">
                          <SourceIcon source={row.source} />
                          <span>{attribution}</span>
                        </div>
                        {row.sourceUrl ? (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-violet-600 underline hover:text-violet-800"
                          >
                            {t("testimonialViewOriginal")}
                          </a>
                        ) : null}
                      </footer>
                    </blockquote>
                  );
                })
              : fallbackQuotes.map((q) => (
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
