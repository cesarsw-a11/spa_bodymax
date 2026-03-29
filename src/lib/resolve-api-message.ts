/** Resuelve mensaje de API: prioriza traducción de `errorCode`; si no hay o la clave falta, usa `error` o UNKNOWN. */
export function resolveApiErrorMessage(
  payload: { errorCode?: string; error?: string } | null | undefined,
  t: (key: string) => string,
): string {
  const code = payload?.errorCode;
  if (code) {
    const msg = t(code);
    if (msg !== code) return msg;
  }
  return payload?.error ?? t("UNKNOWN");
}
