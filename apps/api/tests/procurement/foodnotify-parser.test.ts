import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FoodNotifyParser, parseNumber } from "../../src/modules/procurement/foodnotify-parser.js";
import type { RawEmail } from "../../src/modules/procurement/mail.types.js";

const parser = new FoodNotifyParser();

function email(text: string, overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    messageId: "<msg-1@foodnotify.com>",
    from: "noreply@foodnotify.com",
    subject: "Ihre Bestellung",
    receivedAt: new Date("2026-06-02T08:00:00.000Z"),
    text,
    ...overrides
  };
}

const completeOrder = `Neue Bestellung über FoodNotify

Bestellung Nr.: FN-12345
Lieferant: Metro Cash & Carry
Bestelldatum: 01.06.2026
Lieferdatum: 05.06.2026

Pos  Artikel              Menge  Einheit
1    Coca Cola 0,2l       24     Kiste
2    Mineralwasser still  12     Kiste
3    Rindersteak          5,5    Kg
`;

const fixtureRoot = resolve(process.cwd(), "tests/fixtures/foodnotify");

describe("FoodNotifyParser", () => {
  it("extracts the order number, supplier and dates from a typical email", () => {
    const result = parser.parse(email(completeOrder));

    expect(result.externalOrderNumber).toBe("FN-12345");
    expect(result.supplierName).toBe("Metro Cash & Carry");
    expect(result.orderedAt?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(result.expectedDeliveryAt?.toISOString()).toBe("2026-06-05T00:00:00.000Z");
  });

  it("scores confidence 1.0 for a complete order with items", () => {
    const result = parser.parse(email(completeOrder));

    expect(result.confidence).toBe(1);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      lineNumber: 1,
      productName: "Coca Cola 0,2l",
      qty: 24,
      unit: "Kiste"
    });
    expect(result.items[2]).toMatchObject({ productName: "Rindersteak", qty: 5.5, unit: "Kg" });
  });

  it("parses multi-line item lists in the 'qty unit product' layout", () => {
    const result = parser.parse(
      email(`Bestellung Nr.: FN-9
Lieferant: Getränke Hoffmann

24 Fl Apfelschorle
6 Kiste Spezi`)
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ qty: 24, unit: "Fl", productName: "Apfelschorle" });
    expect(result.items[1]).toMatchObject({ qty: 6, unit: "Kiste", productName: "Spezi" });
  });

  it("handles a missing supplier name gracefully and lowers confidence", () => {
    const result = parser.parse(
      email(`Bestellung Nr.: FN-77

1 Coca Cola 24 Kiste`)
    );

    expect(result.supplierName).toBeUndefined();
    expect(result.errors).toContain("missing supplier name");
    expect(result.confidence).toBeLessThan(0.85);
  });

  it("yields very low confidence for an unrelated email", () => {
    const result = parser.parse(email("Hallo, hier ist ein Newsletter ohne Bestellung."));

    expect(result.confidence).toBeLessThan(0.85);
    expect(result.externalOrderNumber).toBeUndefined();
  });

  it("captures supplier SKU and unit price when present", () => {
    const result = parser.parse(
      email(`Bestellung Nr.: FN-300
Lieferant: Transgourmet

1  ART-9981 Olivenöl 5l   3 Fl   24,90 €`)
    );

    expect(result.items[0]).toMatchObject({
      supplierSku: "ART-9981",
      productName: "Olivenöl 5l",
      qty: 3,
      unit: "Fl",
      unitPrice: 24.9
    });
  });

  it("parses the synthetic text fixture", () => {
    const text = readFileSync(resolve(fixtureRoot, "order-confirmation-text.eml"), "utf8");

    const result = parser.parse(email(text));

    expect(result.confidence).toBe(1);
    expect(result.externalOrderNumber).toBe("FN-SYN-1001");
    expect(result.supplierName).toBe("Metro Test Supplier");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      supplierSku: "ART-1001",
      productName: "Coca Cola 0,2l",
      qty: 24,
      unit: "Kiste"
    });
  });

  it("parses the synthetic html fixture", () => {
    const html = readFileSync(resolve(fixtureRoot, "order-confirmation-html.html"), "utf8");

    const result = parser.parse(email("", { html }));

    expect(result.confidence).toBe(1);
    expect(result.externalOrderNumber).toBe("FN-SYN-2002");
    expect(result.supplierName).toBe("Transgourmet Test Supplier");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      supplierSku: "ART-2001",
      productName: "Olivenöl 5l",
      qty: 3,
      unit: "Fl"
    });
  });
});

describe("parseNumber", () => {
  it("normalizes German decimal and thousand separators", () => {
    expect(parseNumber("24")).toBe(24);
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("")).toBeUndefined();
  });
});
