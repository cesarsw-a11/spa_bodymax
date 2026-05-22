import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import type { GiftCardOrder } from "@prisma/client";
import {
  decimalToNumber,
  resolveSnapshotServiceName,
  resolveSnapshotVariantLabel,
} from "@/lib/giftCard";
import type { AppLocale } from "@/i18n/routing";

const CARD_W = 1200;
const CARD_H = 750;

type GiftCardCopy = {
  brand: string;
  tagline: string;
  giftLabel: string;
  forLabel: string;
  fromLabel: string;
  serviceLabel: string;
  durationLabel: string;
  amountLabel: string;
  redeemTitle: string;
  redeemHint: string;
  codeLabel: string;
  emittedLabel: string;
  durationUnit: string;
  amountSuffix: string;
};

function getCopy(locale: AppLocale): GiftCardCopy {
  if (locale === "en") {
    return {
      brand: "Body Max Spa",
      tagline: "Calm · Balance · Glow",
      giftLabel: "Gift Card",
      forLabel: "FOR",
      fromLabel: "FROM",
      serviceLabel: "EXPERIENCE",
      durationLabel: "DURATION",
      amountLabel: "VALUE",
      redeemTitle: "How to redeem",
      redeemHint:
        "Show this card or share the code when booking. Valid for the experience above.",
      codeLabel: "REDEEM CODE",
      emittedLabel: "Issued",
      durationUnit: "min",
      amountSuffix: "MXN",
    };
  }
  return {
    brand: "Body Max Spa",
    tagline: "Calm · Balance · Glow",
    giftLabel: "Tarjeta de regalo",
    forLabel: "PARA",
    fromLabel: "DE",
    serviceLabel: "EXPERIENCIA",
    durationLabel: "DURACIÓN",
    amountLabel: "VALOR",
    redeemTitle: "Cómo canjearla",
    redeemHint:
      "Muestra esta tarjeta o comparte el código al reservar. Válida para la experiencia indicada.",
    codeLabel: "CÓDIGO DE CANJE",
    emittedLabel: "Emitida",
    durationUnit: "min",
    amountSuffix: "MXN",
  };
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Trunca dejando un sufijo "…" si excede el largo. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/** Divide un texto en líneas cuyo largo aproximado no exceda `maxChars`. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n+/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (word.length > maxChars) {
          current = word.slice(0, maxChars - 1) + "…";
          lines.push(current);
          current = "";
        } else {
          current = word;
        }
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length >= maxLines) break;
  }

  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxChars) {
      lines[maxLines - 1] = last.slice(0, maxChars - 1) + "…";
    }
  }
  return lines;
}

function formatAmountMxn(amount: number): string {
  return amount.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIssuedDate(date: Date, locale: AppLocale): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function renderGiftCardSvg(order: GiftCardOrder, locale: AppLocale): string {
  const copy = getCopy(locale);
  const serviceName = truncate(resolveSnapshotServiceName(order, locale), 56);
  const variantLabel = resolveSnapshotVariantLabel(order, locale);
  const recipientName = truncate(order.recipientName, 28);
  const senderName = truncate(order.senderName, 28);
  const amount = formatAmountMxn(decimalToNumber(order.amount));
  const issued = formatIssuedDate(new Date(order.createdAt), locale);
  const duration = order.variantDurationSnapshot ?? null;
  const messageLines = wrapText(order.message ?? "", 64, 3);
  const code = order.redeemCode;

  const decorativeRibbon = `
    <g opacity="0.18">
      <circle cx="${CARD_W - 110}" cy="120" r="170" fill="#ffffff" />
      <circle cx="${CARD_W - 60}" cy="60" r="80" fill="#ffffff" />
      <circle cx="120" cy="${CARD_H - 80}" r="140" fill="#ffffff" />
      <circle cx="40" cy="${CARD_H - 30}" r="60" fill="#ffffff" />
    </g>`;

  const messageSvg = messageLines.length
    ? messageLines
        .map(
          (line, i) =>
            `<text x="80" y="${430 + i * 30}" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic" fill="#ffffff" opacity="0.95">${escapeXml(
              line,
            )}</text>`,
        )
        .join("\n")
    : "";

  const variantLine = variantLabel
    ? `<text x="80" y="${360}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.92">${escapeXml(
        truncate(variantLabel, 60),
      )}</text>`
    : "";

  const durationBlock = duration
    ? `
      <g transform="translate(640, 320)">
        <text font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.75">${copy.durationLabel}</text>
        <text y="34" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="600" fill="#ffffff">${duration} ${copy.durationUnit}</text>
      </g>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="55%" stop-color="#d946ef" />
      <stop offset="100%" stop-color="#fb7185" />
    </linearGradient>
    <linearGradient id="codeBg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#fdf4ff" stop-opacity="0.95" />
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feOffset dy="2" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.25" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)" rx="36" ry="36" />
  ${decorativeRibbon}

  <g>
    <rect x="36" y="36" width="${CARD_W - 72}" height="${CARD_H - 72}" rx="28" ry="28"
          fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5" />
    <rect x="48" y="48" width="${CARD_W - 96}" height="${CARD_H - 96}" rx="22" ry="22"
          fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1" />
  </g>

  <g>
    <text x="80" y="120" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" letter-spacing="6" fill="#ffffff" opacity="0.85">${escapeXml(
      copy.brand.toUpperCase(),
    )}</text>
    <text x="80" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="18" font-style="italic" fill="#ffffff" opacity="0.8">${escapeXml(
      copy.tagline,
    )}</text>
    <text x="80" y="232" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" fill="#ffffff">${escapeXml(
      copy.giftLabel,
    )}</text>
  </g>

  <g>
    <text x="80" y="290" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.78">${copy.serviceLabel}</text>
    <text x="80" y="328" font-family="'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="600" fill="#ffffff">${escapeXml(
      serviceName,
    )}</text>
    ${variantLine}
    ${durationBlock}
  </g>

  <g transform="translate(${CARD_W - 80} 232)" text-anchor="end">
    <text font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.78">${copy.amountLabel}</text>
    <text y="46" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="700" fill="#ffffff">$${amount}</text>
    <text y="78" font-family="'Helvetica Neue', Arial, sans-serif" font-size="16" fill="#ffffff" opacity="0.85">${copy.amountSuffix}</text>
  </g>

  <g>
    <text x="80" y="540" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.78">${copy.forLabel}</text>
    <text x="80" y="572" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" fill="#ffffff">${escapeXml(
      recipientName,
    )}</text>
    <text x="80" y="616" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.78">${copy.fromLabel}</text>
    <text x="80" y="648" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-style="italic" fill="#ffffff">${escapeXml(
      senderName,
    )}</text>
    ${messageSvg}
  </g>

  <g filter="url(#softShadow)">
    <rect x="${CARD_W - 480}" y="500" width="400" height="170" rx="22" ry="22" fill="url(#codeBg)" />
    <text x="${CARD_W - 460}" y="540" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" letter-spacing="3" fill="#7c3aed">${copy.codeLabel}</text>
    <text x="${CARD_W - 460}" y="592" font-family="'Courier New', monospace" font-size="38" font-weight="700" fill="#1e1b4b">${escapeXml(
      code,
    )}</text>
    <text x="${CARD_W - 460}" y="624" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" fill="#475569">${escapeXml(
      copy.redeemTitle,
    )}</text>
    <text x="${CARD_W - 460}" y="650" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" fill="#64748b">${escapeXml(
      truncate(copy.redeemHint, 60),
    )}</text>
  </g>

  <text x="${CARD_W - 80}" y="${CARD_H - 36}" text-anchor="end" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" letter-spacing="2" fill="#ffffff" opacity="0.7">${escapeXml(
    `${copy.emittedLabel}: ${issued}`,
  )}</text>
</svg>`;
}

export async function renderGiftCardPng(order: GiftCardOrder, locale: AppLocale): Promise<Uint8Array> {
  const svg = renderGiftCardSvg(order, locale);
  const resvg = new Resvg(svg, {
    background: "#ffffff",
    fitTo: { mode: "width", value: CARD_W * 2 },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "Helvetica",
    },
  });
  const png = resvg.render().asPng();
  return new Uint8Array(png);
}

export async function renderGiftCardPdf(order: GiftCardOrder, locale: AppLocale): Promise<Uint8Array> {
  const png = await renderGiftCardPng(order, locale);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);

  // Página landscape A5-ish para imprimir o compartir.
  const pageWidth = 842;
  const pageHeight = (pageWidth * CARD_H) / CARD_W;
  const page = pdf.addPage([pageWidth, pageHeight + 32]);

  page.drawImage(image, {
    x: 0,
    y: 32,
    width: pageWidth,
    height: pageHeight,
  });

  return new Uint8Array(await pdf.save());
}
