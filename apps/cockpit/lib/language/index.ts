export const roleLabels = {
  owner: "Inhaber",
  admin: "Admin",
  manager: "Schichtleitung",
  staff: "Mitarbeiter",
  viewer: "Lesender Zugriff",
} as const;

export const roleDescriptions = {
  owner: "Vollzugriff, Organisation verwalten",
  admin: "Team, Stammdaten und Einstellungen",
  manager: "Prüfung, Bestände, Alerts",
  staff: "Operative Buchungen",
  viewer: "Nur Anzeige",
} as const;

export const movementLabels = {
  withdrawal: "Verbrauch buchen",
  goods_receipt: "Wareneingang erfassen",
  correction: "Korrektur beantragen",
  transfer: "Umbuchung buchen",
} as const;

export const movementShortLabels = {
  withdrawal: "Verbrauch",
  goods_receipt: "Wareneingang",
  correction: "Korrektur",
  transfer: "Umbuchung",
} as const;

export const statusLabels: Record<string, string> = {
  open: "Offen",
  pending: "Ausstehend",
  confirmed: "Bestätigt",
  cancelled: "Storniert",
  requires_review: "Prüfung erforderlich",
  posted: "Gebucht",
  draft: "Entwurf",
  submitted: "Eingereicht",
  rejected: "Abgelehnt",
  voided: "Storniert",
  active: "Aktiv",
  inactive: "Inaktiv",
};

export const capabilityLabels: Record<string, string> = {
  team_manage: "Team verwalten",
  roles_manage: "Rollen vergeben",
  inventory_write: "Inventarbewegungen buchen",
  inventory_review: "Bewegungshistorie ansehen",
  inventory_read: "Bestände / Artikel lesen",
  alerts_manage: "Alerts verwalten",
  automation_approve: "Automatisierungen freigeben",
};

export const errorMessages = {
  backendUnavailable:
    "Die Backend-API ist aktuell nicht erreichbar. Bitte Verbindung prüfen oder später erneut versuchen.",
  profileFailed:
    "Dein Konto wurde erstellt, aber dein Profil konnte nicht vollständig eingerichtet werden. Bitte melde dich erneut an oder kontaktiere einen Admin.",
  unknownError: "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.",
  sessionExpired: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
  accessDenied: "Du hast keine Berechtigung für diese Aktion.",
} as const;

export function translateStatus(key: string): string {
  return statusLabels[key] ?? key;
}

export function translateRole(key: string): string {
  return (roleLabels as Record<string, string>)[key] ?? key;
}
