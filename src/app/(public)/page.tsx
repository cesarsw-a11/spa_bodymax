import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Hero from "@/components/Hero";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-28">
      <Hero /> 
      {/* HERO PURPLE */}
      {/* <section className="relative overflow-hidden rounded-[2.25rem] border border-violet-200/60 bg-white shadow-sm"> */}
        {/* auroras suaves */}
        {/* <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-[36rem] w-[36rem] rounded-full bg-violet-200/35 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 h-[40rem] w-[40rem] rounded-full bg-fuchsia-200/30 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-40 w-[60%] -translate-x-1/2 rounded-full bg-white/60 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 backdrop-blur-sm">
              Calm · Balance · Glow
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-900 md:text-6xl md:leading-[1.1]">
              Spa BodyMax
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
              Un refugio sereno en tonos lavanda. Reserva tu masaje o facial con confirmación rápida y vive una experiencia inolvidable.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/reserve"
                className="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99]"
              >
                Reservar ahora
              </Link>
              <a
                href="#servicios"
                className="rounded-full border border-stone-300 bg-white px-7 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 active:scale-[0.99]"
              >
                Ver servicios
              </a>
            </div> */}

            {/* beneficios */}
            {/* <ul className="mt-10 grid grid-cols-1 gap-3 text-sm text-stone-500 sm:grid-cols-3">
              <li className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Terapeutas certificados
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Agenda 24/7
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Ritual personalizado
              </li>
            </ul>
          </div>
        </div>
      </section> */}

      {/* DESTACADOS */}
      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Ambiente sensorial", d: "Aromas florales, música a 432 Hz y luz cálida para desconectar." },
            { t: "Productos premium", d: "Extractos botánicos y activos suaves para tu piel." },
            { t: "Puntualidad real", d: "Confirmación inmediata y recordatorios automáticos." },
          ].map(({ t, d }) => (
            <article
              key={t}
              className="relative overflow-hidden rounded-3xl border border-violet-200/60 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-300/0 blur-2xl transition group-hover:bg-fuchsia-300/20" />
              <h3 className="text-lg font-semibold text-stone-900">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-stone-900">Nuestros servicios</h2>
            <p className="mt-1 text-stone-600">Selecciona tu experiencia. Te cuidamos en cada detalle.</p>
          </div>
          <Link
            href="/reserve"
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
          >
            Agendar
          </Link>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.id}
              className="group relative overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl cursor-pointer"
            >
              {/* header visual púrpura */}
              <div className="relative h-40 w-full bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white">
                <div className="absolute inset-0">
                  <div className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-violet-200/40 blur-2xl" />
                  <div className="absolute right-6 -bottom-6 h-24 w-24 rounded-full bg-fuchsia-200/40 blur-2xl" />
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-900">{s.name}</h3>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-stone-600">{s.description}</p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-semibold text-stone-900">${Number(s.price).toFixed(2)}</span>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {s.durationMin} min
                  </span>
                </div>

                <div className="mt-5">
                  <Link
                    href="/reserve"
                    className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99]"
                  >
                    Reservar
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="rounded-[2rem] border border-violet-200/60 bg-white p-8 shadow-sm md:p-12">
          <h3 className="text-2xl font-semibold text-stone-900">Lo que dicen nuestros clientes</h3>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              "La atmósfera lavanda me encantó; salí renovada.",
              "El masaje descontracturante me salvó la semana.",
              "Reservar fue facilísimo y son súper puntuales.",
            ].map((q, i) => (
              <blockquote
                key={i}
                className="rounded-2xl border border-violet-200/60 bg-white/80 p-5 text-stone-700"
              >
                “{q}”
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-200/60 bg-gradient-to-br from-white to-violet-50 p-10 text-center shadow-sm md:p-14">
          <div className="pointer-events-none absolute -left-12 -top-10 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-fuchsia-200/30 blur-3xl" />
          <h3 className="text-3xl font-semibold text-stone-900">¿Listo para reconectar?</h3>
          <p className="mx-auto mt-2 max-w-2xl text-stone-600">
            Agenda tu momento de calma. Te esperamos con una experiencia hecha a tu medida.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reserve"
              className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99]"
            >
              Reservar ahora
            </Link>
            <a
              href="https://wa.me/5215555555555"
              target="_blank"
              className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 active:scale-[0.99]"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
