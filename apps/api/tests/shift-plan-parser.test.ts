import { describe, expect, it } from "vitest";

import {
  combineDateAndTime,
  detectColumns,
  detectDelimiter,
  mapAreaTokenToSlug,
  mapRows,
  normalizeName,
  parseCsvRows,
  parsePlanDate,
  splitShiftRange
} from "../src/modules/shift-planning/shift-plan-parser.js";
import { columnMappingSchema } from "../src/modules/shift-planning/shift-planning.types.js";

describe("shift-plan-parser", () => {
  describe("detectDelimiter", () => {
    it("prefers semicolon for German exports", () => {
      expect(detectDelimiter("Datum;Mitarbeiter;Bereich")).toBe(";");
    });
    it("falls back to comma", () => {
      expect(detectDelimiter("Datum,Mitarbeiter,Bereich")).toBe(",");
    });
  });

  describe("parseCsvRows", () => {
    it("parses quoted cells and drops blank lines", () => {
      const csv = 'a,b\n"c,d",e\n\n';
      expect(parseCsvRows(csv, ",")).toEqual([
        ["a", "b"],
        ["c,d", "e"]
      ]);
    });
  });

  describe("detectColumns", () => {
    it("maps header labels to indices by hint", () => {
      const header = ["Datum", "Tag", "Mitarbeiter", "Schichtbeginn", "Schichtende", "Bereich"];
      expect(detectColumns(header)).toMatchObject({
        dateColumn: 0,
        nameColumn: 2,
        shiftStartColumn: 3,
        shiftEndColumn: 4,
        areaColumn: 5
      });
    });
  });

  describe("mapAreaTokenToSlug", () => {
    it("maps known aliases to canonical slugs", () => {
      expect(mapAreaTokenToSlug("GM")).toBe("gardemanger");
      expect(mapAreaTokenToSlug("Kalt")).toBe("gardemanger");
      expect(mapAreaTokenToSlug("Gemüse")).toBe("entremetier");
      expect(mapAreaTokenToSlug("Fleisch")).toBe("saucier");
    });
    it("falls back to a contains match", () => {
      expect(mapAreaTokenToSlug("GM Spät")).toBe("gardemanger");
    });
    it("returns null for unknown tokens", () => {
      expect(mapAreaTokenToSlug("Patissier")).toBeNull();
      expect(mapAreaTokenToSlug("")).toBeNull();
    });
  });

  describe("parsePlanDate", () => {
    it("parses dd.mm.yyyy and ISO", () => {
      expect(parsePlanDate("19.06.2026").toISOString()).toBe("2026-06-19T00:00:00.000Z");
      expect(parsePlanDate("2026-06-19").toISOString()).toBe("2026-06-19T00:00:00.000Z");
    });
    it("rejects garbage", () => {
      expect(() => parsePlanDate("Freitag")).toThrow();
    });
  });

  describe("combineDateAndTime", () => {
    it("combines a date with HH:MM", () => {
      const date = parsePlanDate("2026-06-19");
      expect(combineDateAndTime(date, "14:00").toISOString()).toBe("2026-06-19T14:00:00.000Z");
    });
  });

  describe("splitShiftRange", () => {
    it("splits an en-dash range", () => {
      expect(splitShiftRange("14:00–22:30")).toEqual(["14:00", "22:30"]);
    });
    it("returns null without a separator", () => {
      expect(splitShiftRange("14:00")).toBeNull();
    });
  });

  describe("normalizeName", () => {
    it("lowercases and collapses whitespace", () => {
      expect(normalizeName("  Anna   Schneider ")).toBe("anna schneider");
    });
  });

  describe("mapRows", () => {
    const rawRows = [
      ["Datum", "Mitarbeiter", "Schicht", "Bereich"],
      ["19.06.2026", "Anna", "14:00–22:30", "Gardemanger"],
      ["19.06.2026", "Max", "", "Saucier"], // missing time → default window
      ["", "", "", ""] // blank
    ];

    it("maps rows with a single start column holding a range", () => {
      const mapping = columnMappingSchema.parse({
        dateColumn: 0,
        nameColumn: 1,
        areaColumn: 3,
        shiftStartColumn: 2,
        headerRow: 0,
        defaultShiftStart: "14:00",
        defaultShiftEnd: "22:30"
      });

      const { rows, errors } = mapRows(rawRows, mapping);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ rawName: "Anna", rawArea: "Gardemanger" });
      expect(rows[0].shiftStartAt.toISOString()).toBe("2026-06-19T14:00:00.000Z");
      expect(rows[0].shiftEndAt.toISOString()).toBe("2026-06-19T22:30:00.000Z");
      // Max had no time → default window applied.
      expect(rows[1].shiftEndAt.toISOString()).toBe("2026-06-19T22:30:00.000Z");
    });

    it("rolls a midnight-crossing shift end into the next day", () => {
      const mapping = columnMappingSchema.parse({
        dateColumn: 0,
        nameColumn: 1,
        areaColumn: 3,
        shiftStartColumn: 2,
        headerRow: 0
      });
      const rows = mapRows(
        [
          ["Datum", "Mitarbeiter", "Schicht", "Bereich"],
          ["19.06.2026", "Nina", "18:00–02:00", "Saucier"]
        ],
        mapping
      ).rows;
      expect(rows[0].shiftStartAt.toISOString()).toBe("2026-06-19T18:00:00.000Z");
      expect(rows[0].shiftEndAt.toISOString()).toBe("2026-06-20T02:00:00.000Z");
    });

    it("collects per-row errors without aborting", () => {
      const mapping = columnMappingSchema.parse({
        dateColumn: 0,
        nameColumn: 1,
        areaColumn: 3,
        shiftStartColumn: 2,
        headerRow: 0,
        defaultShiftStart: "14:00",
        defaultShiftEnd: "22:30"
      });
      const { rows, errors } = mapRows(
        [
          ["Datum", "Mitarbeiter", "Schicht", "Bereich"],
          ["not-a-date", "Anna", "14:00–22:30", "Gardemanger"]
        ],
        mapping
      );
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].sourceRow).toBe(2);
    });
  });
});
