export const ADMIN_MODULES = [
  "dashboard",
  "services",
  "addons",
  "bookings",
  "blocked",
  "testimonials",
  "users",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export type AdminPermissions = Record<AdminModule, boolean>;

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  dashboard: false,
  services: false,
  addons: false,
  bookings: false,
  blocked: false,
  testimonials: false,
  users: false,
};

export function isAdminModule(value: string): value is AdminModule {
  return (ADMIN_MODULES as readonly string[]).includes(value);
}

export function normalizeAdminPermissions(raw: unknown): AdminPermissions {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ADMIN_PERMISSIONS };
  const src = raw as Record<string, unknown>;
  const out: AdminPermissions = { ...DEFAULT_ADMIN_PERMISSIONS };
  for (const mod of ADMIN_MODULES) {
    out[mod] = src[mod] === true;
  }
  return out;
}

export function parsePermissionsJson(raw: string | null | undefined): AdminPermissions {
  if (!raw) return { ...DEFAULT_ADMIN_PERMISSIONS };
  try {
    return normalizeAdminPermissions(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ADMIN_PERMISSIONS };
  }
}

export function stringifyPermissions(perms: AdminPermissions): string {
  return JSON.stringify(normalizeAdminPermissions(perms));
}
