import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_CANONICAL = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Acepta JPEG/JPG (incl. MIME raros o vacío con extensión .jpg/.jpeg). */
function effectiveImageMime(file: File): string | null {
  const raw = (file.type || "").toLowerCase().trim();
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (ALLOWED_CANONICAL.has(raw)) return raw;

  const ext = path.extname(file.name || "").toLowerCase();
  if ([".jpg", ".jpeg", ".jpe"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";

  return null;
}

function storedExtension(file: File, mime: string): string {
  const fromName = path.extname(file.name || "").toLowerCase();
  if (mime === "image/jpeg" && [".jpg", ".jpeg", ".jpe"].includes(fromName)) return fromName;
  if (mime === "image/png" && fromName === ".png") return ".png";
  if (mime === "image/webp" && fromName === ".webp") return ".webp";
  if (mime === "image/gif" && fromName === ".gif") return ".gif";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".gif";
}

export async function POST(req: Request) {
  await requireAdmin();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "Archivo no recibido" }, { status: 400 });
  }

  const mime = effectiveImageMime(file);
  if (!mime) {
    return Response.json(
      { ok: false, error: "Formato no permitido. Usa JPEG/JPG, PNG, WEBP o GIF." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      { ok: false, error: "El archivo debe pesar entre 1 byte y 5MB." },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = storedExtension(file, mime);
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;

  /**
   * Vercel Blob solo en el servidor de Vercel (`VERCEL=1` lo inyecta la plataforma).
   * En local nunca usamos Blob: siempre `public/uploads/services` aunque tengas token en `.env`.
   */
  const useVercelBlob = process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  if (useVercelBlob) {
    const blob = await put(`services/${fileName}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return Response.json({
      ok: true,
      url: blob.url,
      storage: "blob",
    });
  }

  const relativeDir = "/uploads/services";
  const absoluteDir = path.join(process.cwd(), "public", "uploads", "services");
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  await writeFile(absolutePath, buffer);

  return Response.json({
    ok: true,
    url: `${relativeDir}/${fileName}`,
    storage: "local",
  });
}
