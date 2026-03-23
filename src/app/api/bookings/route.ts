import { prisma } from "@/lib/prisma";
import { computeEnd, computeDynamicPrice } from "@/lib/utils";
import { isTenDigitPhone, isValidEmailFormat, normalizePhoneDigits } from "@/lib/validation";

function parsePagination(searchParams: URLSearchParams) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  if (pageRaw === null && limitRaw === null) return null;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitRaw || "10", 10) || 10));
  return { page, limit };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pagination = parsePagination(searchParams);

  if (pagination) {
    const { page, limit } = pagination;
    const [total, data] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.findMany({
        include: { service: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return Response.json({
      ok: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  const data = await prisma.booking.findMany({ include: { service: true }, orderBy: { date: "desc" } });
  return Response.json({ ok: true, data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const service = await prisma.service.findUnique({ where: { id: Number(body.serviceId) } });
  if (!service || !service.active) return Response.json({ ok: false, error: "Servicio no disponible" }, { status: 400 });
  const start = new Date(body.date);
  if (isNaN(start.getTime())) return Response.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
  const end = computeEnd(start, service.durationMin);
  const rawAddonIds = Array.isArray(body.addons)
    ? [...new Set(body.addons.map((x: unknown) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
    : [];

  let addonsTotal = 0;
  let addonsJsonStored: string | null = null;

  if (rawAddonIds.length > 0) {
    const addonRows = await prisma.addon.findMany({
      where: { id: { in: rawAddonIds }, active: true },
    });
    if (addonRows.length !== rawAddonIds.length) {
      return Response.json(
        { ok: false, error: "Uno o más complementos no existen o no están disponibles." },
        { status: 400 },
      );
    }
    addonsTotal = Math.round(addonRows.reduce((s, r) => s + Number(r.price), 0) * 100) / 100;
    addonsJsonStored = JSON.stringify(rawAddonIds);
  }

  const servicePrice = computeDynamicPrice(Number(service.price), start);
  const price = Math.round((servicePrice + addonsTotal) * 100) / 100;

  // verificar disponibilidad rápida (servidor)
  const conflict = await prisma.booking.findFirst({ where: { serviceId: service.id, status: { in: ["PENDING", "CONFIRMED"] }, AND: [ { date: { lt: end } }, { endDate: { gt: start } } ] } });
  if (conflict) return Response.json({ ok: false, error: "Horario ocupado" }, { status: 409 });

  const block = await prisma.blockedSlot.findFirst({ where: { AND: [ { start: { lt: end } }, { end: { gt: start } } ] } });
  if (block) return Response.json({ ok: false, error: block.reason || "Bloqueado" }, { status: 409 });

  const customer = typeof body.customer === "string" ? body.customer.trim() : "";
  if (!customer) {
    return Response.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  }

  const phoneDigits = normalizePhoneDigits(String(body.phone ?? ""));
  if (!isTenDigitPhone(phoneDigits)) {
    return Response.json({ ok: false, error: "El teléfono debe tener exactamente 10 dígitos." }, { status: 400 });
  }

  const emailTrim = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmailFormat(emailTrim)) {
    return Response.json({ ok: false, error: "Indica un correo electrónico válido." }, { status: 400 });
  }

  const notes =
    typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  const data = await prisma.booking.create({ data: {
    customer,
    phone: phoneDigits,
    email: emailTrim,
    notes,
    serviceId: service.id,
    date: start,
    endDate: end,
    price,
    status: "PENDING",
    addonsJson: addonsJsonStored,
  }});
  return Response.json({ ok: true, data });
}