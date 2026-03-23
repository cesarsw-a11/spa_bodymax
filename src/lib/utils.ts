import { addMinutes, isBefore, isAfter } from "date-fns";

export function computeEnd(start: Date, durationMin: number) {
  return addMinutes(start, durationMin);
}

// Multiplicador simple por horario pico (ej. 18-21 hrs +10%)
export function computeDynamicPrice(base: number, start: Date) {
  if (!(start instanceof Date) || isNaN(start.getTime())) return base;
  const h = start.getHours();
  const multiplier = h >= 18 && h <= 21 ? 1.1 : 1.0;
  return Math.round(base * multiplier * 100) / 100;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}