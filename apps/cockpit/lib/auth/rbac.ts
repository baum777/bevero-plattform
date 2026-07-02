export const ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  staff: 2,
  viewer: 1,
};

export const CAPABILITIES = {
  team_manage: ["owner", "admin"],
  roles_manage: ["owner", "admin"],
  inventory_write: ["owner", "admin", "manager", "staff"],
  inventory_review: ["owner", "admin", "manager"],
  inventory_read: ["owner", "admin", "manager", "staff", "viewer"],
  alerts_manage: ["owner", "admin", "manager"],
  automation_approve: ["owner", "admin", "manager"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export const CAPABILITY_LABELS: Record<Capability, string> = {
  team_manage: "Team verwalten",
  roles_manage: "Rollen vergeben",
  inventory_write: "Inventarbewegungen buchen",
  inventory_review: "Bewegungshistorie ansehen",
  inventory_read: "Bestände / Artikel lesen",
  alerts_manage: "Alerts verwalten",
  automation_approve: "Automatisierungen freigeben",
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Inhaber",
  admin: "Admin",
  manager: "Schichtleitung",
  staff: "Mitarbeiter",
  viewer: "Lesender Zugriff",
};

export function can(role: Role | null, capability: Capability): boolean {
  return Boolean(role && (CAPABILITIES[capability] as readonly string[]).includes(role));
}
