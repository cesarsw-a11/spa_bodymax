import { prisma } from "@/lib/prisma";
import { computeEnd, computeDynamicPrice } from "@/lib/utils";
import { computeAddonsTotal } from "@/lib/addons";

export async function GET() {
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
  const addons = Array.isArray(body.addons) ? body.addons : [];
  const { total: addonsTotal, unknown } = computeAddonsTotal(addons.map(String));
  if (unknown.length > 0) return Response.json({ ok: false, error: "Complementos inválidos" }, { status: 400 });

  const servicePrice = computeDynamicPrice(Number(service.price), start);
  const price = Math.round((servicePrice + addonsTotal) * 100) / 100;

  // verificar disponibilidad rápida (servidor)
  const conflict = await prisma.booking.findFirst({ where: { serviceId: service.id, status: { in: ["PENDING", "CONFIRMED"] }, AND: [ { date: { lt: end } }, { endDate: { gt: start } } ] } });
  if (conflict) return Response.json({ ok: false, error: "Horario ocupado" }, { status: 409 });

  const block = await prisma.blockedSlot.findFirst({ where: { AND: [ { start: { lt: end } }, { end: { gt: start } } ] } });
  if (block) return Response.json({ ok: false, error: block.reason || "Bloqueado" }, { status: 409 });

  const data = await prisma.booking.create({ data: {
    customer: body.customer,
    phone: body.phone,
    email: body.email,
    serviceId: service.id,
    date: start,
    endDate: end,
    price,
    status: "PENDING"
  }});
  return Response.json({ ok: true, data });
}