/** Texto del testimonio según locale (mismo criterio que servicios). */
export function resolveTestimonialQuote(
  row: { quote: string; quoteEn: string | null },
  locale: string,
): string {
  const useEn = locale === "en";
  const qEn = row.quoteEn?.trim();
  return useEn && qEn ? qEn : row.quote;
}
