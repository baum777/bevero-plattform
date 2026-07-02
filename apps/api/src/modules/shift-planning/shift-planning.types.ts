import { z } from "zod";

// ── Error ────────────────────────────────────────────────────────────────────

export class ShiftPlanningError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 409 | 422) {
    super(message);
    this.name = "ShiftPlanningError";
    this.statusCode = statusCode;
  }
}

// ── Import status ────────────────────────────────────────────────────────────

export const IMPORT_STATUSES = [
  "uploaded",
  "parsed",
  "needs_review",
  "confirmed",
  "released",
  "failed"
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const ASSIGNMENT_TYPES = ["primary", "support", "lead"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const TASK_STATUSES = ["open", "done", "issue", "skipped", "verified"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// ── Weekday helpers ──────────────────────────────────────────────────────────
// weekday: 0 = Monday … 6 = Sunday (matches schema convention).

export const WEEKDAY_MATRIX_FIELDS = [
  "mondayActive",
  "tuesdayActive",
  "wednesdayActive",
  "thursdayActive",
  "fridayActive",
  "saturdayActive",
  "sundayActive"
] as const;

export type WeekdayMatrixField = (typeof WEEKDAY_MATRIX_FIELDS)[number];

/** Monday-indexed weekday (0..6) for a JS Date. */
export function weekdayFromDate(date: Date): number {
  // Date.getUTCDay(): 0 = Sunday … 6 = Saturday → remap so Monday = 0.
  const jsDay = date.getUTCDay();
  return (jsDay + 6) % 7;
}

export function matrixFieldForWeekday(weekday: number): WeekdayMatrixField {
  const field = WEEKDAY_MATRIX_FIELDS[weekday];
  if (!field) {
    throw new ShiftPlanningError(`invalid weekday: ${weekday}`, 422);
  }
  return field;
}

// ── Upload / column-mapping schemas ──────────────────────────────────────────

export const uploadImportBodySchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    /** Raw file contents (CSV text). XLSX support is a follow-up. */
    content: z.string().min(1, "file content is required").max(5_000_000),
    workspaceGroupId: z.string().trim().min(1).max(64).optional(),
    weekNumber: z.coerce.number().int().min(1).max(53).optional(),
    yearNumber: z.coerce.number().int().min(2000).max(2100).optional()
  })
  .strict();

export const columnMappingSchema = z
  .object({
    dateColumn: z.number().int().min(0),
    nameColumn: z.number().int().min(0),
    areaColumn: z.number().int().min(0),
    shiftStartColumn: z.number().int().min(0).optional(),
    shiftEndColumn: z.number().int().min(0).optional(),
    /** Row index (0-based) of the header row; rows above are skipped. */
    headerRow: z.number().int().min(0).default(0),
    /** Default shift window applied when no start/end columns are mapped. */
    defaultShiftStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM")
      .optional(),
    defaultShiftEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM")
      .optional()
  })
  .strict();

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const mapColumnsBodySchema = z
  .object({
    columnMapping: columnMappingSchema
  })
  .strict();

// ── Review / confirm schemas ─────────────────────────────────────────────────

export const updateMappingBodySchema = z
  .object({
    /** Manual name → userId overrides keyed by the raw name string from the file. */
    userMatches: z.record(z.string(), z.string().min(1).max(64)).optional(),
    /** Manual area-token → areaId overrides keyed by the raw area string. */
    areaMatches: z.record(z.string(), z.string().min(1).max(64)).optional(),
    workspaceGroupId: z.string().trim().min(1).max(64).nullable().optional()
  })
  .strict();

export const releaseTasksBodySchema = z
  .object({
    /** Optional checklist task ids the shift lead chose to exclude. */
    excludeTaskIds: z.array(z.string().min(1).max(64)).optional()
  })
  .strict();

export const listAssignmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
});

export const userTasksQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const summaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  workspaceGroupId: z.string().trim().min(1).max(64).optional()
});

export const matrixQuerySchema = z.object({
  workspaceGroupId: z.string().trim().min(1).max(64).optional()
});

export const taskStatusUpdateSchema = z.object({
  status: z.enum(["done", "issue", "skipped"]),
  note: z.string().max(500).optional()
}).strict();

export const startShiftBodySchema = z.object({
  clientTimestamp: z.string().datetime().optional(),
  timezone: z.string().trim().min(1).max(64),
  note: z.string().trim().max(1000).optional()
}).strict();

export const endShiftBodySchema = z.object({
  note: z.string().trim().max(1000).optional()
}).strict();

export const correctShiftStartBodySchema = z.object({
  actualStartedAt: z.string().datetime(),
  reason: z.string().trim().min(1).max(1000)
}).strict();

export const markShiftMissedBodySchema = z.object({
  reason: z.string().trim().min(1).max(1000)
}).strict();

// ── Issue (Mängel) schemas ───────────────────────────────────────────────────

export const issuesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  workspaceGroupId: z.string().trim().min(1).max(64).optional()
});

export const resolveIssueBodySchema = z
  .object({
    status: z.enum(["resolved", "accepted"]),
    // Audit requires a non-empty resolution note for both resolve and accept.
    resolutionNotes: z.string().trim().min(1, "resolution note is required").max(1000)
  })
  .strict();

// ── Signoff (Schichtabschluss) schemas ───────────────────────────────────────

export const signoffQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  workspaceGroupId: z.string().trim().min(1).max(64).optional()
});

export const createSignoffBodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
    workspaceGroupId: z.string().trim().min(1).max(64),
    department: z.string().trim().min(1).max(64).default("kitchen"),
    summary: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(2000).optional()
  })
  .strict();

export type ResolveIssueInput = z.infer<typeof resolveIssueBodySchema>;
export type CreateSignoffInput = z.infer<typeof createSignoffBodySchema>;

export type UploadImportInput = z.infer<typeof uploadImportBodySchema>;
export type MapColumnsInput = z.infer<typeof mapColumnsBodySchema>;
export type UpdateMappingInput = z.infer<typeof updateMappingBodySchema>;
export type ReleaseTasksInput = z.infer<typeof releaseTasksBodySchema>;
