import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { requireAdminModule } from "@/lib/auth";
import type { TestimonialSource } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

function parseSource(raw: unknown): TestimonialSource | null {
  if (raw === "GOOGLE" || raw === "INSTAGRAM" || raw === "FACEBOOK") {
    return raw;
  }
  return null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("testimonials");
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errJson(400, "INVALID_BODY", "Cuerpo de la petición no válido (JSON esperado).");
  }

  const data: {
    quote?: string;
    quoteEn?: string | null;
    author?: string | null;
    source?: TestimonialSource;
    sourceUrl?: string | null;
    sortOrder?: number;
    active?: boolean;
  } = {};

  if ("quote" in body) {
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    if (!quote) {
      return errJson(400, "TESTIMONIAL_QUOTE_REQUIRED", "El texto del testimonio no puede quedar vacío.");
    }
    data.quote = quote;
  }

  if ("quoteEn" in body) {
    data.quoteEn = typeof body.quoteEn === "string" ? body.quoteEn.trim() || null : null;
  }

  if ("author" in body) {
    data.author = typeof body.author === "string" ? body.author.trim() || null : null;
  }

  if ("source" in body) {
    const source = parseSource(body.source);
    if (!source) {
      return errJson(400, "TESTIMONIAL_SOURCE_INVALID", "Fuente inválida.");
    }
    data.source = source;
  }

  if ("sourceUrl" in body) {
    let u = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null;
    if (u && u.length > 512) u = u.slice(0, 512);
    data.sourceUrl = u;
  }

  if ("sortOrder" in body) {
    const sortOrder = Math.round(Number(body.sortOrder));
    if (Number.isFinite(sortOrder)) data.sortOrder = sortOrder;
  }

  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  if (Object.keys(data).length === 0) {
    return errJson(400, "NO_CHANGES", "No hay cambios que aplicar.");
  }

  try {
    const row = await prisma.testimonial.update({ where: { id }, data });
    return Response.json({ ok: true, data: row });
  } catch {
    return errJson(404, "TESTIMONIAL_NOT_FOUND", "Testimonio no encontrado.");
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const unauthorized = await requireAdminModule("testimonials");
  if (unauthorized) return unauthorized;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return errJson(400, "INVALID_ID", "ID inválido");

  try {
    await prisma.testimonial.delete({ where: { id } });
  } catch {
    return errJson(404, "TESTIMONIAL_NOT_FOUND", "Testimonio no encontrado.");
  }

  return Response.json({ ok: true });
}
