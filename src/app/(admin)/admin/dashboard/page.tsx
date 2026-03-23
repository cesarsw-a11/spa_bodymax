import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const [countBookings, revenue, upcoming] = await Promise.all([
    prisma.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.booking.aggregate({ _sum: { price: true }, where: { status: "CONFIRMED" } }),
    prisma.booking.findMany({ where: { date: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } }, include: { service: true }, orderBy: { date: "asc" }, take: 5 })
  ]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="border rounded-2xl p-4">
        <div className="text-sm text-slate-500">Reservas activas</div>
        <div className="text-3xl font-bold">{countBookings}</div>
      </div>
      <div className="border rounded-2xl p-4">
        <div className="text-sm text-slate-500">Ingresos confirmados</div>
        <div className="text-3xl font-bold">${Number(revenue._sum.price || 0).toFixed(2)}</div>
      </div>
      <div className="border rounded-2xl p-4 md:col-span-1">
        <div className="text-sm text-slate-500 mb-2">Próximas citas</div>
        <ul className="space-y-2 max-h-60 overflow-auto">
          {upcoming.map(b => (
            <li key={b.id} className="border rounded-xl p-2">
              <div className="font-medium">{b.service.name}</div>
              <div className="text-sm text-slate-600">{new Date(b.date).toLocaleString()} — {b.customer}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}