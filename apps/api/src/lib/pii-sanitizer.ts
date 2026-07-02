/**
 * PII-Sanitization Helpers (ADR-0021 §5, ADR-0057, ADR-0058)
 *
 * Read-only API surface must NEVER expose raw contact data. This module
 * provides deterministic, side-effect-free helpers that turn DB rows
 * containing PII into safe, list/detail DTOs for the Cockpit and other
 * read consumers.
 *
 * Stripped fields (per ADR-0021 §5):
 *   - rawMessage (long free-form text from the customer)
 *   - contactEmail
 *   - contactPhone
 *   - contactAddress
 *   - contactName (kept as initials only)
 *
 * Exposed in their place (PII indicators):
 *   - hasRawMessage
 *   - hasContactEmail
 *   - hasContactPhone
 *   - hasContactAddress
 *   - contactNameInitials
 */

export type PiiInquiryRow = {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactAddress: string | null;
  rawMessage: string | null;
};

export type PiiIndicators = {
  hasRawMessage: boolean;
  hasContactEmail: boolean;
  hasContactPhone: boolean;
  hasContactAddress: boolean;
  contactNameInitials: string;
};

export function derivePiiIndicators(row: PiiInquiryRow): PiiIndicators {
  return {
    hasRawMessage: row.rawMessage !== null && row.rawMessage.length > 0,
    hasContactEmail: row.contactEmail.length > 0,
    hasContactPhone: row.contactPhone !== null && row.contactPhone.length > 0,
    hasContactAddress: row.contactAddress !== null && row.contactAddress.length > 0,
    contactNameInitials: toNameInitials(row.contactName)
  };
}

export function toNameInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + ".")
    .join(" ");
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) {
    return `${local[0] ?? "*"}***${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export const PII_STRIPPED_FIELDS = [
  "rawMessage",
  "contactEmail",
  "contactPhone",
  "contactAddress",
  "contactName"
] as const;
