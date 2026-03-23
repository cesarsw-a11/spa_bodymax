export type AddonRow = { id: number; price: number };

/**
 * Suma precios de complementos a partir del catálogo cargado y los ids seleccionados.
 */
export function computeAddonsTotalFromList(
  catalog: AddonRow[],
  selectedIds: number[],
): { total: number; unknown: number[] } {
  const map = new Map(catalog.map((a) => [a.id, a.price]));
  const unknown: number[] = [];
  let total = 0;
  const seen = new Set<number>();

  for (const id of selectedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const p = map.get(id);
    if (p === undefined) unknown.push(id);
    else total += p;
  }

  return { total: Math.round(total * 100) / 100, unknown };
}
