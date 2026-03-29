/**
 * Enlaces wa.me para México (52 + 10 dígitos nacionales).
 */

export function mexicoWaMeUrlFromTenDigitPhone(phoneDigits: string, text: string): string | null {
  const d = phoneDigits.replace(/\D/g, "");
  if (!/^\d{10}$/.test(d)) return null;
  return `https://wa.me/52${d}?text=${encodeURIComponent(text)}`;
}

type WaLocale = "es" | "en";

const WA_LABELS: Record<
  WaLocale,
  {
    title: string;
    folio: string;
    name: string;
    email: string;
    tel: string;
    service: string;
    start: string;
    endApprox: string;
    duration: string;
    addons: string;
    none: string;
    total: string;
    notes: string;
    thanks: string;
  }
> = {
  es: {
    title: "*Body Max Spa — Detalle de reserva*",
    folio: "*Folio:*",
    name: "*Nombre:*",
    email: "*Correo:*",
    tel: "*Tel:*",
    service: "*Servicio:*",
    start: "*Inicio:*",
    endApprox: "*Fin aprox:*",
    duration: "*Duración:*",
    addons: "*Complementos:*",
    none: "Ninguno",
    total: "*Total:*",
    notes: "*Notas:*",
    thanks: "Gracias por elegir Body Max Spa.",
  },
  en: {
    title: "*Body Max Spa — Booking details*",
    folio: "*Reference:*",
    name: "*Name:*",
    email: "*Email:*",
    tel: "*Phone:*",
    service: "*Service:*",
    start: "*Start:*",
    endApprox: "*Approx. end:*",
    duration: "*Duration:*",
    addons: "*Add-ons:*",
    none: "None",
    total: "*Total:*",
    notes: "*Notes:*",
    thanks: "Thank you for choosing Body Max Spa.",
  },
};

export function buildBookingWhatsAppMessage(input: {
  bookingId: number;
  customerName: string;
  email?: string;
  phoneTenDigits?: string;
  serviceName: string;
  dateStart: Date;
  dateEnd?: Date | null;
  durationMin?: number;
  addonSummary?: string | null;
  totalMxn: number;
  notes?: string | null;
  paymentStatusLine: string;
  locale?: WaLocale;
}): string {
  const loc = input.locale === "en" ? "en" : "es";
  const L = WA_LABELS[loc];
  const intlLocale = loc === "en" ? "en-US" : "es-MX";
  const fmt = (d: Date) =>
    d.toLocaleString(intlLocale, { dateStyle: "medium", timeStyle: "short" });

  const lines: string[] = [L.title, "", `${L.folio} #${input.bookingId}`, `${L.name} ${input.customerName}`];
  if (input.email?.trim()) lines.push(`${L.email} ${input.email.trim()}`);
  if (input.phoneTenDigits && /^\d{10}$/.test(input.phoneTenDigits)) {
    lines.push(`${L.tel} +52 ${input.phoneTenDigits}`);
  }
  lines.push("", `${L.service} ${input.serviceName}`, `${L.start} ${fmt(input.dateStart)}`);
  if (input.dateEnd instanceof Date && !isNaN(input.dateEnd.getTime())) {
    lines.push(`${L.endApprox} ${fmt(input.dateEnd)}`);
  } else if (input.durationMin != null && input.durationMin > 0) {
    lines.push(`${L.duration} ${input.durationMin} min`);
  }
  lines.push(`${L.addons} ${input.addonSummary?.trim() ? input.addonSummary.trim() : L.none}`);
  lines.push(`${L.total} $${input.totalMxn.toFixed(2)} MXN`);
  lines.push("", `_${input.paymentStatusLine}_`);
  if (input.notes?.trim()) {
    lines.push("", L.notes, input.notes.trim());
  }
  lines.push("", "---", L.thanks);
  return lines.join("\n");
}
