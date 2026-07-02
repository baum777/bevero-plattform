export const AUTH_ERROR_MESSAGES = {
  missing_fields: "Bitte alle Pflichtfelder ausfüllen.",
  invalid_credentials: "E-Mail oder Passwort ist ungültig.",
  callback_failed: "Die Anmeldung konnte nicht abgeschlossen werden.",
  missing_code: "Der Bestätigungslink ist ungültig oder abgelaufen.",
  weak_password: "Passwort: min. 8 Zeichen, 1 Großbuchstabe, 1 Zahl.",
  password_mismatch: "Passwort und Bestätigung stimmen nicht überein.",
  sign_up_failed: "Registrierung fehlgeschlagen.",
  profile_failed:
    "Konto wurde erstellt, aber das Profil konnte nicht angelegt werden. Bitte erneut anmelden.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

export function getAuthErrorMessage(
  code: string | undefined,
  fallback: string
): string | null {
  if (!code) return null;
  return (AUTH_ERROR_MESSAGES as Record<string, string>)[code] ?? fallback;
}
