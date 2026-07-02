import { ShiftPlanningError, type ColumnMapping } from "./shift-planning.types.js";

// ── CSV parsing ──────────────────────────────────────────────────────────────
// Dependency-free, quote-aware. Supports comma and semicolon delimiters
// (German shift plans frequently use ";"). XLSX is a follow-up.

export function detectDelimiter(csv: string): "," | ";" {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsvRows(csv: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  rows.push(row);

  // Drop a trailing empty row produced by a file ending in a newline.
  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

// ── Column detection ─────────────────────────────────────────────────────────

const COLUMN_HINTS: Record<keyof DetectedColumns, string[]> = {
  dateColumn: ["datum", "date", "tag", "day"],
  nameColumn: ["mitarbeiter", "name", "employee", "person", "wer"],
  areaColumn: ["bereich", "posten", "station", "area", "rolle"],
  shiftStartColumn: ["beginn", "start", "von", "schichtbeginn", "from"],
  shiftEndColumn: ["ende", "end", "bis", "schichtende", "to"]
};

export type DetectedColumns = {
  dateColumn?: number;
  nameColumn?: number;
  areaColumn?: number;
  shiftStartColumn?: number;
  shiftEndColumn?: number;
};

/** Detect column indices by matching header labels against known hints. */
export function detectColumns(headerRow: string[]): DetectedColumns {
  const detected: DetectedColumns = {};
  const normalized = headerRow.map((value) => value.trim().toLowerCase());

  for (const key of Object.keys(COLUMN_HINTS) as Array<keyof DetectedColumns>) {
    const hints = COLUMN_HINTS[key];
    const index = normalized.findIndex((label) =>
      hints.some((hint) => label.includes(hint))
    );
    if (index >= 0) {
      detected[key] = index;
    }
  }

  return detected;
}

// ── Area mapping (hardcoded standard mappings — hybrid plan) ──────────────────
// Maps free-text shift-plan tokens to a canonical area slug. Admin-editable
// custom mappings are a Phase 2 follow-up.

const AREA_SLUG_BY_TOKEN: Record<string, string> = {
  gardemanger: "gardemanger",
  garde: "gardemanger",
  gm: "gardemanger",
  kalt: "gardemanger",
  "kalte küche": "gardemanger",
  entremetier: "entremetier",
  ent: "entremetier",
  gemüse: "entremetier",
  gemuese: "entremetier",
  beilagen: "entremetier",
  pasta: "entremetier",
  saucier: "saucier",
  sauce: "saucier",
  fleisch: "saucier",
  warm: "saucier",
  "warme küche": "saucier"
};

/** Resolve a raw area token to a canonical slug, or null if unknown. */
export function mapAreaTokenToSlug(rawArea: string): string | null {
  const normalized = rawArea.trim().toLowerCase();
  if (normalized === "") {
    return null;
  }
  if (AREA_SLUG_BY_TOKEN[normalized]) {
    return AREA_SLUG_BY_TOKEN[normalized];
  }
  // Fall back to a contains-match (e.g. "GM Spät" → gardemanger).
  for (const [token, slug] of Object.entries(AREA_SLUG_BY_TOKEN)) {
    if (normalized.includes(token)) {
      return slug;
    }
  }
  return null;
}

// ── Name normalization ───────────────────────────────────────────────────────

/** Lowercased, collapsed-whitespace key for fuzzy name matching. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Date / time parsing ──────────────────────────────────────────────────────

/** Parse "19.06.2026", "2026-06-19" or "19/06/2026" into a UTC date (no time). */
export function parsePlanDate(raw: string): Date {
  const value = raw.trim();

  // ISO yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    return utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd.mm.yyyy or dd/mm/yyyy
  const dmy = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/.exec(value);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    return utcDate(year, Number(dmy[2]), Number(dmy[1]));
  }

  throw new ShiftPlanningError(`unrecognized date format: "${raw}"`, 422);
}

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ShiftPlanningError(`invalid calendar date: ${year}-${month}-${day}`, 422);
  }
  return date;
}

/**
 * Combine a plan date with a "HH:MM" (or "14:00–22:30" range part) into a full
 * UTC timestamp. Accepts "14:00", "14.00", "1400".
 */
export function combineDateAndTime(date: Date, rawTime: string): Date {
  const value = rawTime.trim();
  let hours: number;
  let minutes: number;

  const colon = /^(\d{1,2})[:.](\d{2})$/.exec(value);
  const compact = /^(\d{1,2})(\d{2})$/.exec(value);
  if (colon) {
    hours = Number(colon[1]);
    minutes = Number(colon[2]);
  } else if (compact) {
    hours = Number(compact[1]);
    minutes = Number(compact[2]);
  } else {
    throw new ShiftPlanningError(`unrecognized time format: "${rawTime}"`, 422);
  }

  if (hours > 23 || minutes > 59) {
    throw new ShiftPlanningError(`invalid time: "${rawTime}"`, 422);
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes
    )
  );
}

/** Split a "14:00 - 22:30" / "14:00–22:30" range into [start, end] strings. */
export function splitShiftRange(raw: string): [string, string] | null {
  const parts = raw.split(/[-–—]/).map((part) => part.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    return [parts[0], parts[1]];
  }
  return null;
}

// ── Row mapping ──────────────────────────────────────────────────────────────

export type ParsedShiftRow = {
  sourceRow: number;
  rawName: string;
  rawArea: string;
  date: Date;
  shiftStartAt: Date;
  shiftEndAt: Date;
};

export type ParseError = {
  sourceRow: number;
  message: string;
};

export type MapRowsResult = {
  rows: ParsedShiftRow[];
  errors: ParseError[];
};

/** Apply a confirmed column mapping to the raw CSV rows. */
export function mapRows(rawRows: string[][], mapping: ColumnMapping): MapRowsResult {
  const rows: ParsedShiftRow[] = [];
  const errors: ParseError[] = [];

  for (let index = mapping.headerRow + 1; index < rawRows.length; index += 1) {
    const cells = rawRows[index];
    const sourceRow = index + 1; // 1-based for humans
    const rawName = (cells[mapping.nameColumn] ?? "").trim();
    const rawArea = (cells[mapping.areaColumn] ?? "").trim();
    const rawDate = (cells[mapping.dateColumn] ?? "").trim();

    if (rawName === "" && rawArea === "" && rawDate === "") {
      continue; // blank row
    }

    try {
      if (rawName === "") {
        throw new ShiftPlanningError("missing employee name", 422);
      }
      if (rawArea === "") {
        throw new ShiftPlanningError("missing area", 422);
      }
      const date = parsePlanDate(rawDate);
      const { startAt, endAt } = resolveShiftWindow(cells, mapping, date);
      rows.push({ sourceRow, rawName, rawArea, date, shiftStartAt: startAt, shiftEndAt: endAt });
    } catch (error) {
      errors.push({
        sourceRow,
        message: error instanceof Error ? error.message : "unparseable row"
      });
    }
  }

  return { rows, errors };
}

function resolveShiftWindow(
  cells: string[],
  mapping: ColumnMapping,
  date: Date
): { startAt: Date; endAt: Date } {
  // Explicit start/end columns take precedence.
  if (mapping.shiftStartColumn !== undefined && mapping.shiftEndColumn !== undefined) {
    const start = (cells[mapping.shiftStartColumn] ?? "").trim();
    const end = (cells[mapping.shiftEndColumn] ?? "").trim();
    return finalizeWindow(date, start, end);
  }

  // A single start column may hold a "14:00–22:30" range or a bare start time.
  if (mapping.shiftStartColumn !== undefined) {
    const value = (cells[mapping.shiftStartColumn] ?? "").trim();
    if (value !== "") {
      const range = splitShiftRange(value);
      if (range) {
        return finalizeWindow(date, range[0], range[1]);
      }
      if (mapping.defaultShiftEnd) {
        return finalizeWindow(date, value, mapping.defaultShiftEnd);
      }
    }
    // Empty cell → fall through to the configured default window below.
  }

  // Fall back to the configured default window.
  if (mapping.defaultShiftStart && mapping.defaultShiftEnd) {
    return finalizeWindow(date, mapping.defaultShiftStart, mapping.defaultShiftEnd);
  }

  throw new ShiftPlanningError(
    "no shift time available (map a start/end column or set a default window)",
    422
  );
}

function finalizeWindow(date: Date, start: string, end: string): { startAt: Date; endAt: Date } {
  const startAt = combineDateAndTime(date, start);
  let endAt = combineDateAndTime(date, end);
  // Shift crossing midnight → roll end into the next day.
  if (endAt.getTime() <= startAt.getTime()) {
    endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
  }
  return { startAt, endAt };
}
