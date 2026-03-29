export type ApiErrorPayload = { ok: false; errorCode: string; error: string };

export function errJson(status: number, errorCode: string, error: string): Response {
  return Response.json({ ok: false, errorCode, error } satisfies ApiErrorPayload, { status });
}
