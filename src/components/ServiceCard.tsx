import type { Service } from "@prisma/client";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="font-semibold">{service.name}</div>
      <div className="text-sm text-slate-600">{service.description}</div>
      <div className="mt-2 font-bold">${Number(service.price).toFixed(2)} · {service.durationMin} min</div>
    </div>
  );
}