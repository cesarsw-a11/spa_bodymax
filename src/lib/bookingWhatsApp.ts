/**
 * Enlaces wa.me para México (52 + 10 dígitos nacionales).
 */

export function mexicoWaMeUrlFromTenDigitPhone(phoneDigits: string, text: string): string | null {
  const d = phoneDigits.replace(/\D/g, "");
  if (!/^\d{10}$/.test(d)) return null;
  return `https://wa.me/52${d}?text=${encodeURIComponent(text)}`;
}

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
}): string {
  const fmt = (d: Date) =>
    d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  const lines: string[] = [
    "*Body Max Spa — Detalle de reserva*",
    "",
    `*Folio:* #${input.bookingId}`,
    `*Nombre:* ${input.customerName}`,
  ];
  if (input.email?.trim()) lines.push(`*Correo:* ${input.email.trim()}`);
  if (input.phoneTenDigits && /^\d{10}$/.test(input.phoneTenDigits)) {
    lines.push(`*Tel:* +52 ${input.phoneTenDigits}`);
  }
  lines.push("", `*Servicio:* ${input.serviceName}`, `*Inicio:* ${fmt(input.dateStart)}`);
  if (input.dateEnd instanceof Date && !isNaN(input.dateEnd.getTime())) {
    lines.push(`*Fin aprox:* ${fmt(input.dateEnd)}`);
  } else if (input.durationMin != null && input.durationMin > 0) {
    lines.push(`*Duración:* ${input.durationMin} min`);
  }
  lines.push(`*Complementos:* ${input.addonSummary?.trim() ? input.addonSummary.trim() : "Ninguno"}`);
  lines.push(`*Total:* $${input.totalMxn.toFixed(2)} MXN`);
  lines.push("", `_${input.paymentStatusLine}_`);
  if (input.notes?.trim()) {
    lines.push("", "*Notas:*", input.notes.trim());
  }
  lines.push("", "---", "Gracias por elegir Body Max Spa.");
  return lines.join("\n");
}
