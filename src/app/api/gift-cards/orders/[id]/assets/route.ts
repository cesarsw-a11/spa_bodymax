import { prisma } from "@/lib/prisma";
import { errJson } from "@/lib/err-json";
import { getTenantId } from "@/lib/tenant";
import { renderGiftCardPdf, renderGiftCardPng } from "@/lib/giftCardRender";
import type { AppLocale } from "@/i18n/routing";

export const runtime = "nodejs";

function parseLocale(raw: string | null): AppLocale {
  return raw === "en" ? "en" : "es";
}

function parseFormat(raw: string | null): "pdf" | "png" {
  return raw === "pdf" ? "pdf" : "png";
}

function buildFileName(id: number, format: "pdf" | "png"): string {
  return `body-max-spa-gift-card-${id}.${format}`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return errJson(400, "INVALID_ID", "Identificador no válido.");
  }

  const tenantId = await getTenantId();
  const url = new URL(req.url);
  const format = parseFormat(url.searchParams.get("format"));
  const locale = parseLocale(url.searchParams.get("locale"));

  const order = await prisma.giftCardOrder.findFirst({ where: { id, tenantId } });
  if (!order) return errJson(404, "GIFT_CARD_NOT_FOUND", "Tarjeta de regalo no encontrada.");
  if (order.status !== "CONFIRMED") {
    return errJson(
      403,
      "GIFT_CARD_NOT_PAID",
      "La tarjeta aún no está pagada. Completa el pago para poder descargarla.",
    );
  }

  try {
    const fileName = buildFileName(order.id, format);
    if (format === "png") {
      const png = await renderGiftCardPng(order, locale);
      return new Response(new Uint8Array(png), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, max-age=0, no-store",
        },
      });
    }

    const pdf = await renderGiftCardPdf(order, locale);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (e) {
    console.error("gift-card asset render failed", e);
    return errJson(500, "GIFT_CARD_RENDER_FAILED", "No se pudo generar el archivo de la tarjeta.");
  }
}
