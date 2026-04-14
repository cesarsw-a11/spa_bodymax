import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdmin } from "@/lib/auth";
import type { TestimonialSource } from "@prisma/client";

function parseSource(raw: unknown): TestimonialSource | null {
  if (raw === "GOOGLE" || raw === "INSTAGRAM" || raw === "FACEBOOK") {
    return raw;
  }
  return null;
}

const orderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("all") === "1") {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    const rows = await prisma.testimonial.findMany({ orderBy });
    return Response.json({ ok: true, data: rows });
  }

  const rows = await prisma.testimonial.findMany({
    where: { active: true },
    orderBy,
    select: {
      id: true,
      quote: true,
      quoteEn: true,
      author: true,
      source: true,
      sourceUrl: true,
      sortOrder: true,
    },
  });
  return Response.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const quote = typeof body.quote === "string" ? body.quote.trim() : "";
  if (!quote) {
    return errJson(400, "TESTIMONIAL_QUOTE_REQUIRED", "El texto del testimonio es obligatorio.");
  }

  const quoteEn = typeof body.quoteEn === "string" ? body.quoteEn.trim() || null : null;
  const author = typeof body.author === "string" ? body.author.trim() || null : null;
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null;
  const source = parseSource(body.source);
  if (!source) {
    return errJson(400, "TESTIMONIAL_SOURCE_INVALID", "Indica una fuente válida: GOOGLE, INSTAGRAM o FACEBOOK.");
  }

  let sourceUrlFinal = sourceUrl;
  if (sourceUrlFinal && sourceUrlFinal.length > 512) {
    sourceUrlFinal = sourceUrlFinal.slice(0, 512);
  }

  const sortOrder = Math.round(Number(body.sortOrder));
  const active = body.active !== false;

  const row = await prisma.testimonial.create({
    data: {
      quote,
      quoteEn,
      author,
      source,
      sourceUrl: sourceUrlFinal,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      active,
    },
  });

  return Response.json({ ok: true, data: row });
}
