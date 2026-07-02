import type { RawEmail } from "./mail.types.js";

export type ParsedItem = {
  lineNumber: number;
  productName: string;
  supplierSku?: string;
  unit: string;
  qty: number;
  unitPrice?: number;
  taxRate?: number;
};

export type ParseResult = {
  confidence: number;
  externalOrderNumber?: string;
  supplierName?: string;
  orderedAt?: Date;
  expectedDeliveryAt?: Date;
  items: ParsedItem[];
  errors: string[];
};

const KNOWN_UNITS = [
  "Stk",
  "Stück",
  "Fl",
  "Flasche",
  "Kg",
  "kg",
  "g",
  "l",
  "L",
  "Liter",
  "Kiste",
  "Karton",
  "Pkg",
  "Paket",
  "VPE",
  "Dose",
  "Sack",
  "Beutel"
];

const UNIT_ALTERNATION = KNOWN_UNITS.map(escapeRegExp).join("|");

const ORDER_NUMBER_PATTERNS = [
  /Bestell(?:ung)?\s*[-]?\s*Nr\.?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i,
  /Bestellnummer\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i,
  /Auftrags?\s*[-]?\s*Nr\.?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i,
  /Order\s*(?:No\.?|Number|#)\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i
];

const SUPPLIER_PATTERNS = [
  /Lieferant(?:in)?\s*[:]\s*(.+)/i,
  /Supplier\s*[:]\s*(.+)/i,
  /Großhändler\s*[:]\s*(.+)/i
];

const ORDERED_AT_PATTERNS = [
  /Bestelldatum\s*[:]\s*(.+)/i,
  /Bestellt\s+am\s*[:]?\s*(.+)/i,
  /Order\s*date\s*[:]\s*(.+)/i
];

const DELIVERY_PATTERNS = [
  /Liefer(?:datum|termin)\s*[:]\s*(.+)/i,
  /Gewünschtes?\s+Lieferdatum\s*[:]\s*(.+)/i,
  /Delivery\s*date\s*[:]\s*(.+)/i
];

export class FoodNotifyParser {
  public parse(rawEmail: RawEmail): ParseResult {
    const errors: string[] = [];
    const body = normalizeBody(rawEmail.text || stripHtml(rawEmail.html ?? ""));
    const lines = body.split("\n");

    const externalOrderNumber = matchFirst(body, ORDER_NUMBER_PATTERNS);
    const supplierName = cleanField(matchFirst(body, SUPPLIER_PATTERNS));
    const orderedAt = parseDate(cleanField(matchFirst(body, ORDERED_AT_PATTERNS)));
    const expectedDeliveryAt = parseDate(cleanField(matchFirst(body, DELIVERY_PATTERNS)));
    const items = parseItems(lines);

    if (!externalOrderNumber) {
      errors.push("missing order number");
    }
    if (!supplierName) {
      errors.push("missing supplier name");
    }
    if (items.length === 0) {
      errors.push("no order items detected");
    }

    const confidence = scoreConfidence({
      hasOrderNumber: Boolean(externalOrderNumber),
      hasSupplier: Boolean(supplierName),
      itemCount: items.length,
      hasQuantitySignal: new RegExp(
        `\\b\\d+(?:[.,]\\d+)?\\s*(?:${UNIT_ALTERNATION})\\b`,
        "i"
      ).test(body)
    });

    return {
      confidence,
      externalOrderNumber,
      supplierName,
      orderedAt,
      expectedDeliveryAt,
      items,
      errors
    };
  }
}

function scoreConfidence(signals: {
  hasOrderNumber: boolean;
  hasSupplier: boolean;
  itemCount: number;
  hasQuantitySignal: boolean;
}): number {
  if (signals.hasOrderNumber && signals.hasSupplier && signals.itemCount >= 1) {
    return 1;
  }
  if (signals.hasOrderNumber && signals.hasSupplier && signals.hasQuantitySignal) {
    return 0.9;
  }
  if (signals.hasOrderNumber && (signals.hasSupplier || signals.hasQuantitySignal)) {
    return 0.7;
  }
  if (signals.hasOrderNumber) {
    return 0.5;
  }
  return 0.2;
}

function parseItems(lines: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    const parsed = parseItemLine(line);
    if (parsed) {
      items.push({ ...parsed, lineNumber: items.length + 1 });
    }
  }

  return items;
}

// Tries the common FoodNotify table layouts, most specific first.
function parseItemLine(line: string): Omit<ParsedItem, "lineNumber"> | undefined {
  // "<pos>  <sku>  <product>  <qty> <unit>  <price>" / "<pos> <product> <qty> <unit>".
  // The product group is greedy so embedded measurements (e.g. "0,2l" in a name)
  // are kept in the name and the trailing table column is read as the quantity.
  const leadingPos = line.match(
    new RegExp(`^(\\d{1,3})[.)]?\\s+(.*\\S)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_ALTERNATION})\\b(.*)$`, "i")
  );
  if (leadingPos) {
    return buildItem(leadingPos[2], leadingPos[3], leadingPos[4], leadingPos[5]);
  }

  // "<product>  <qty> <unit>  [price]"
  const trailingQty = line.match(
    new RegExp(`^(.*\\S)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_ALTERNATION})\\b(.*)$`, "i")
  );
  if (trailingQty) {
    return buildItem(trailingQty[1], trailingQty[2], trailingQty[3], trailingQty[4]);
  }

  // "<qty> <unit>  <product>"
  const leadingQty = line.match(
    new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_ALTERNATION})\\b\\s+(.*\\S)$`, "i")
  );
  if (leadingQty) {
    return buildItem(leadingQty[3], leadingQty[1], leadingQty[2], "");
  }

  return undefined;
}

function buildItem(
  productRaw: string,
  qtyRaw: string,
  unitRaw: string,
  rest: string
): Omit<ParsedItem, "lineNumber"> | undefined {
  const productName = productRaw.replace(/\s{2,}/g, " ").trim();
  if (!productName || isHeaderLabel(productName)) {
    return undefined;
  }

  const qty = parseNumber(qtyRaw);
  if (qty === undefined) {
    return undefined;
  }

  const { supplierSku, cleanedProduct } = extractSku(productName);
  const unitPrice = extractPrice(rest);
  const taxRate = extractTaxRate(rest);

  return {
    productName: cleanedProduct,
    supplierSku,
    unit: normalizeUnit(unitRaw),
    qty,
    unitPrice,
    taxRate
  };
}

function isHeaderLabel(value: string): boolean {
  return /^(pos\.?|position|artikel|menge|einheit|preis|bezeichnung|product|qty|quantity|unit|price)\b/i.test(
    value
  );
}

function extractSku(product: string): { supplierSku?: string; cleanedProduct: string } {
  const leading = product.match(/^(?:Art\.?-?Nr\.?\s*[:#]?\s*)?([A-Z0-9][A-Z0-9\-\/]{3,})\s+(.*\S)$/);
  if (leading && /\d/.test(leading[1]) && /[A-Z]/.test(leading[1])) {
    return { supplierSku: leading[1], cleanedProduct: leading[2].trim() };
  }
  return { cleanedProduct: product };
}

function extractTaxRate(rest: string): number | undefined {
  const match = rest.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) {
    return undefined;
  }
  const value = parseNumber(match[1]);
  return value !== undefined && value >= 0 && value <= 100 ? value : undefined;
}

function extractPrice(rest: string): number | undefined {
  const match = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:€|EUR)?/);
  if (!match) {
    return undefined;
  }
  const value = parseNumber(match[1]);
  return value !== undefined && /[€]|EUR|\d+,\d{2}/.test(rest) ? value : undefined;
}

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = {
    stück: "Stk",
    stk: "Stk",
    flasche: "Fl",
    fl: "Fl",
    liter: "l",
    paket: "Pkg",
    pkg: "Pkg"
  };
  const normalized = unit.trim();
  return map[normalized.toLowerCase()] ?? normalized;
}

export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  // German style: "1.234,56" -> "1234.56"; "1,5" -> "1.5"; "24" -> "24"
  let normalized = trimmed;
  if (/,\d+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const german = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (german) {
    const day = Number(german[1]);
    const month = Number(german[2]);
    const year = german[3].length === 2 ? 2000 + Number(german[3]) : Number(german[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[0]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function matchFirst(body: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function cleanField(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const cleaned = value.replace(/\s{2,}.*$/, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeBody(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/ /g, " ");
}

function stripHtml(html: string): string {
  return html
    .replace(/<\s*(br|\/tr|\/p|\/div)\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/td\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
