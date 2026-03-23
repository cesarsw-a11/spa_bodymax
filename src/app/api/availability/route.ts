import { prisma } from "@/lib/prisma";
import { computeEnd } from "@/lib/utils";

export async function POST(req: Request) {
  const { serviceId, start } = await req.json();
  const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
  if (!service || !service.active) return Response.json({ ok: false, error: "Servicio no disponible" }, { status: 400 });
  const begin = new Date(start);
  const end = computeEnd(begin, service.durationMin);

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ where: { serviceId: service.id, status: { in: ["PENDING", "CONFIRMED"] }, OR: [
      { AND: [{ date: { lt: end } }, { endDate: { gt: begin } }] }
    ] } }),
    prisma.blockedSlot.findMany({ where: { AND: [ { start: { lt: end } }, { end: { gt: begin } } ] } })
  ]);

  if (bookings.length > 0) return Response.json({ ok: true, available: false, reason: "Horario ocupado" });
  if (blocks.length > 0) return Response.json({ ok: true, available: false, reason: blocks[0].reason || "Bloqueado" });
  return Response.json({ ok: true, available: true });
}