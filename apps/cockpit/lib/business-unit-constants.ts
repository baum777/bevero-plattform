/**
 * Pure constants for Business Unit names and labels.
 * No React dependency — safe to import from backend tests and server code.
 */

export const BUSINESS_UNIT_NAMES = [
  "CORPORATE_EVENTS",
  "PRIVATE_EVENTS",
  "RESTAURANTS",
  "BOOK_THE_CONCEPT",
  "LOCATIONS"
] as const;

export type BusinessUnitNameValue = (typeof BUSINESS_UNIT_NAMES)[number];

export const BUSINESS_UNIT_LABELS: Record<BusinessUnitNameValue, string> = {
  CORPORATE_EVENTS: "Corporate Events",
  PRIVATE_EVENTS: "Private Events",
  RESTAURANTS: "Restaurants",
  BOOK_THE_CONCEPT: "Buchbare Konzepte",
  LOCATIONS: "Standorte"
};
