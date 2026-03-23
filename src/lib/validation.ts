/** Solo dígitos, máximo 10 (teléfono México sin lada país). */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function isTenDigitPhone(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}

/** Validación de correo suficiente para formularios (no RFC completo). */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmailFormat(email: string): boolean {
  const t = email.trim();
  if (!t || t.length > 254) return false;
  return EMAIL_RE.test(t);
}
