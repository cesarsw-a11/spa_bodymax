export const ADDONS = [
  { id: "aromaterapia", name: "Aromaterapia", price: 120 },
  { id: "piedras_calientes", name: "Piedras Calientes", price: 180 },
  { id: "exfoliacion_manos", name: "Exfoliación de Manos", price: 90 },
] as const;

export type AddonId = (typeof ADDONS)[number]["id"];

export function computeAddonsTotal(addonIds: string[]) {
  const unknown: string[] = [];
  let total = 0;

  for (const id of addonIds) {
    const addon = ADDONS.find((a) => a.id === id);
    if (!addon) {
      unknown.push(id);
      continue;
    }
    total += addon.price;
  }

  return { total, unknown };
}

