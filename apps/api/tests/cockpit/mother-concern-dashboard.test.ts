import { describe, expect, it } from "vitest";

import { BUSINESS_UNIT_LABELS } from "../../../cockpit/lib/business-unit-constants.js";

describe("Mother-Concern Dashboard (ADR-0058) — contract", () => {
  it("exposes 5 BU labels with German display names", () => {
    expect(BUSINESS_UNIT_LABELS).toEqual({
      CORPORATE_EVENTS: "Corporate Events",
      PRIVATE_EVENTS: "Private Events",
      RESTAURANTS: "Restaurants",
      BOOK_THE_CONCEPT: "Buchbare Konzepte",
      LOCATIONS: "Standorte"
    });
  });

  it("every BusinessUnitNameValue key is present", () => {
    const expected: Array<keyof typeof BUSINESS_UNIT_LABELS> = [
      "CORPORATE_EVENTS",
      "PRIVATE_EVENTS",
      "RESTAURANTS",
      "BOOK_THE_CONCEPT",
      "LOCATIONS"
    ];
    for (const key of expected) {
      expect(typeof BUSINESS_UNIT_LABELS[key]).toBe("string");
      expect(BUSINESS_UNIT_LABELS[key].length).toBeGreaterThan(0);
    }
  });
});
