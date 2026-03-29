import type { Service } from "@prisma/client";

/** Campos necesarios para elegir texto según idioma de la UI. */
export type ServiceTextSource = Pick<Service, "name" | "description"> & {
  nameEn?: string | null;
  descriptionEn?: string | null;
};

/**
 * Texto mostrado al usuario: en inglés usa nameEn/descriptionEn si vienen rellenos;
 * si no, hace fallback a name/description (español).
 */
export function resolveServiceText(service: ServiceTextSource, locale: string): { name: string; description: string } {
  const useEn = locale === "en";
  const nameEn = service.nameEn?.trim();
  const descEn = service.descriptionEn?.trim();
  return {
    name: useEn && nameEn ? nameEn : service.name,
    description: useEn && descEn ? descEn : service.description,
  };
}
