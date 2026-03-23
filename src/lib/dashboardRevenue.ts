/** Clave yyyy-MM-dd en hora local del servidor (consistente con el día calendario del dashboard). */
export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DailyRevenuePoint = {
  date: string;
  /** Etiqueta corta para el eje X */
  label: string;
  /** Etiqueta larga para tooltip */
  fullLabel: string;
  ingresos: number;
};

/**
 * Suma ingresos por día calendario (reservas confirmadas) en un rango de días hacia atrás desde hoy.
 */
export function buildDailyRevenueSeries(
  bookings: { date: Date; price: unknown }[],
  daysInclusive: number,
): DailyRevenuePoint[] {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (daysInclusive - 1));
  start.setHours(0, 0, 0, 0);

  const totals = new Map<string, number>();
  for (const b of bookings) {
    const k = dateKeyLocal(new Date(b.date));
    const n = Number(b.price);
    if (!Number.isFinite(n)) continue;
    totals.set(k, (totals.get(k) ?? 0) + n);
  }

  const series: DailyRevenuePoint[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const k = dateKeyLocal(cursor);
    const raw = totals.get(k) ?? 0;
    series.push({
      date: k,
      label: cursor.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      fullLabel: cursor.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      ingresos: Math.round(raw * 100) / 100,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}
