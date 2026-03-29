import type { ServiceVariant } from "@prisma/client";

/** Etiqueta corta opcional; fallback null si no hay texto en ningún idioma. */
export function resolveVariantLabel(
  v: Pick<ServiceVariant, "label" | "labelEn">,
  locale: string,
): string | null {
  const es = v.label?.trim();
  const en = v.labelEn?.trim();
  if (locale === "en") {
    if (en) return en;
    if (es) return es;
    return null;
  }
  if (es) return es;
  if (en) return en;
  return null;
}
