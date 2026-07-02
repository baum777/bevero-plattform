import { randomUUID } from "node:crypto";
import type { Actor } from "../auth/actor.js";
import {
  ShiftPlanningError,
  type ColumnMapping,
  type UpdateMappingInput,
  type UploadImportInput
} from "./shift-planning.types.js";
import {
  detectColumns,
  detectDelimiter,
  mapAreaTokenToSlug,
  mapRows,
  normalizeName,
  parseCsvRows,
  type DetectedColumns,
  type ParseError,
  type ParsedShiftRow
} from "./shift-plan-parser.js";

// ── DB port ──────────────────────────────────────────────────────────────────

export type ShiftPlanImportRecord = {
  id: string;
  organizationId: string;
  workspaceGroupId: string | null;
  fileName: string;
  fileSize: number;
  weekNumber: number | null;
  yearNumber: number | null;
  uploadedByUserId: string;
  status: string;
  parseErrors: unknown;
  importedRowCount: number;
  matchedUserCount: number;
  unmatchedUserNames: unknown;
  areaDetectionIssues: unknown;
  parsedData: unknown;
  confirmedAt: Date | null;
  confirmedByUserId: string | null;
  releasedAt: Date | null;
  releasedByUserId: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfileRow = {
  id: string;
  authUserId: string;
  displayName: string | null;
  email: string;
};

export type KitchenAreaRow = {
  id: string;
  slug: string;
  name: string;
};

export type ShiftAssignmentCreateData = {
  id: string;
  organizationId: string;
  importId: string;
  date: Date;
  weekday: number;
  userId: string;
  workspaceGroupId: string | null;
  areaId: string;
  shiftStartAt: Date;
  shiftEndAt: Date;
  locationId: string | null;
  department: string;
  assignmentType: string;
  sourceRow: number | null;
  status: string;
};

export type ShiftPlanImportDatabaseClient = {
  shiftPlanImport: {
    create(args: { data: Record<string, unknown> }): Promise<ShiftPlanImportRecord>;
    findUnique(args: { where: { id: string } }): Promise<ShiftPlanImportRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ShiftPlanImportRecord>;
  };
  organizationMember: {
    findMany(args: {
      where: { organizationId: string };
      select: { userId: true };
    }): Promise<Array<{ userId: string }>>;
  };
  userProfile: {
    findMany(args: {
      where: { authUserId: { in: string[] } };
      select: { id: true; authUserId: true; displayName: true; email: true };
    }): Promise<UserProfileRow[]>;
  };
  kitchenArea: {
    findMany(args: {
      where: { organizationId: string; active: boolean };
      select: { id: true; slug: true; name: true };
    }): Promise<KitchenAreaRow[]>;
  };
  shiftAssignment: {
    deleteMany(args: { where: { importId: string } }): Promise<{ count: number }>;
    create(args: { data: ShiftAssignmentCreateData }): Promise<{ id: string }>;
  };
  $transaction<T>(fn: (tx: ShiftPlanImportDatabaseClient) => Promise<T>): Promise<T>;
};

// ── Stored parse state (shift_plan_imports.parsedData) ───────────────────────

type StoredParseState = {
  delimiter: "," | ";";
  rawRows: string[][];
  detectedColumns: DetectedColumns;
  columnMapping?: ColumnMapping;
  /** ISO-serialized mapped rows from the last column mapping. */
  mappedRows?: Array<{
    sourceRow: number;
    rawName: string;
    rawArea: string;
    date: string;
    shiftStartAt: string;
    shiftEndAt: string;
  }>;
  parseRowErrors?: ParseError[];
  /** Manual overrides: normalized raw name → userId. */
  userMatches?: Record<string, string>;
  /** Manual overrides: raw area token → areaId. */
  areaMatches?: Record<string, string>;
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type ImportPreviewDto = {
  id: string;
  status: string;
  fileName: string;
  detectedColumns: DetectedColumns;
  previewRows: string[][];
  totalRows: number;
};

export type MappingReviewDto = {
  id: string;
  status: string;
  importedRowCount: number;
  matchedUserCount: number;
  unmatchedUserNames: string[];
  unmatchedAreas: string[];
  rowErrors: ParseError[];
};

export type ConfirmResultDto = {
  id: string;
  status: string;
  assignmentCount: number;
};

const PREVIEW_ROW_LIMIT = 10;

// ── Service ──────────────────────────────────────────────────────────────────

export type ShiftPlanImportServicePort = {
  createImport(input: UploadImportInput, actor: Actor): Promise<ImportPreviewDto>;
  getImport(id: string, actor: Actor): Promise<ShiftPlanImportRecord>;
  mapColumns(id: string, mapping: ColumnMapping, actor: Actor): Promise<MappingReviewDto>;
  updateMapping(id: string, input: UpdateMappingInput, actor: Actor): Promise<MappingReviewDto>;
  confirm(id: string, actor: Actor): Promise<ConfirmResultDto>;
};

export class ShiftPlanImportService implements ShiftPlanImportServicePort {
  public constructor(
    private readonly options: {
      db: ShiftPlanImportDatabaseClient;
      now?: () => Date;
    }
  ) {}

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  public async createImport(
    input: UploadImportInput,
    actor: Actor
  ): Promise<ImportPreviewDto> {
    const organizationId = this.requireOrg(actor);
    const delimiter = detectDelimiter(input.content);
    const rawRows = parseCsvRows(input.content, delimiter);

    if (rawRows.length === 0) {
      throw new ShiftPlanningError("file contains no rows", 422);
    }

    const detectedColumns = detectColumns(rawRows[0] ?? []);
    const state: StoredParseState = { delimiter, rawRows, detectedColumns };

    const id = randomUUID();
    const record = await this.options.db.shiftPlanImport.create({
      data: {
        id,
        organizationId,
        workspaceGroupId: input.workspaceGroupId ?? null,
        fileName: input.fileName,
        fileSize: input.content.length,
        weekNumber: input.weekNumber ?? null,
        yearNumber: input.yearNumber ?? null,
        uploadedByUserId: actor.userId,
        status: "uploaded",
        importedRowCount: 0,
        matchedUserCount: 0,
        parsedData: state as unknown as Record<string, unknown>
      }
    });

    return {
      id: record.id,
      status: record.status,
      fileName: record.fileName,
      detectedColumns,
      previewRows: rawRows.slice(0, PREVIEW_ROW_LIMIT),
      totalRows: rawRows.length
    };
  }

  public async getImport(id: string, actor: Actor): Promise<ShiftPlanImportRecord> {
    return this.findAndGuard(id, actor);
  }

  public async mapColumns(
    id: string,
    mapping: ColumnMapping,
    actor: Actor
  ): Promise<MappingReviewDto> {
    const record = await this.findAndGuard(id, actor);
    const state = this.readState(record);

    const { rows, errors } = mapRows(state.rawRows, mapping);

    const nextState: StoredParseState = {
      ...state,
      columnMapping: mapping,
      mappedRows: rows.map((row) => ({
        sourceRow: row.sourceRow,
        rawName: row.rawName,
        rawArea: row.rawArea,
        date: row.date.toISOString(),
        shiftStartAt: row.shiftStartAt.toISOString(),
        shiftEndAt: row.shiftEndAt.toISOString()
      })),
      parseRowErrors: errors
    };

    return this.persistReview(record, nextState, rows, errors, actor);
  }

  public async updateMapping(
    id: string,
    input: UpdateMappingInput,
    actor: Actor
  ): Promise<MappingReviewDto> {
    const record = await this.findAndGuard(id, actor);
    const state = this.readState(record);

    if (!state.mappedRows) {
      throw new ShiftPlanningError("columns must be mapped before review overrides", 409);
    }

    const nextState: StoredParseState = {
      ...state,
      userMatches: { ...(state.userMatches ?? {}), ...(input.userMatches ?? {}) },
      areaMatches: { ...(state.areaMatches ?? {}), ...(input.areaMatches ?? {}) }
    };

    const rows = this.deserializeRows(nextState);
    const errors = nextState.parseRowErrors ?? [];
    const workspaceGroupId =
      input.workspaceGroupId !== undefined
        ? input.workspaceGroupId
        : record.workspaceGroupId;

    return this.persistReview(record, nextState, rows, errors, actor, workspaceGroupId);
  }

  public async confirm(id: string, actor: Actor): Promise<ConfirmResultDto> {
    const record = await this.findAndGuard(id, actor);
    const organizationId = record.organizationId;
    const state = this.readState(record);

    if (!state.mappedRows || !state.columnMapping) {
      throw new ShiftPlanningError("columns must be mapped before confirm", 409);
    }

    const rows = this.deserializeRows(state);
    const { userMap, areaMap } = await this.resolveLookups(organizationId, state);

    const resolved = rows.map((row) => {
      const userId = userMap.get(normalizeName(row.rawName));
      const areaId = this.resolveArea(row.rawArea, areaMap, state);
      return { row, userId, areaId };
    });

    const unresolved = resolved.filter((entry) => !entry.userId || !entry.areaId);
    if (unresolved.length > 0) {
      throw new ShiftPlanningError(
        `${unresolved.length} row(s) still have unmatched users or areas — resolve them before confirming`,
        409
      );
    }

    const now = this.now();
    const created = await this.options.db.$transaction(async (tx) => {
      // Re-confirm is idempotent at the assignment level: drop prior rows for
      // this import, then re-create. (Already-released task_instances survive
      // via ON DELETE SET NULL on shiftAssignmentId.)
      await tx.shiftAssignment.deleteMany({ where: { importId: record.id } });

      let count = 0;
      for (const entry of resolved) {
        await tx.shiftAssignment.create({
          data: {
            id: randomUUID(),
            organizationId,
            importId: record.id,
            date: entry.row.date,
            weekday: weekdayFromIso(entry.row.date),
            userId: entry.userId!,
            workspaceGroupId: record.workspaceGroupId,
            areaId: entry.areaId!,
            shiftStartAt: entry.row.shiftStartAt,
            shiftEndAt: entry.row.shiftEndAt,
            locationId: null,
            department: "kitchen",
            assignmentType: "primary",
            sourceRow: entry.row.sourceRow,
            status: "active"
          }
        });
        count += 1;
      }

      await tx.shiftPlanImport.update({
        where: { id: record.id },
        data: {
          status: "confirmed",
          confirmedAt: now,
          confirmedByUserId: actor.userId,
          importedRowCount: count,
          updatedAt: now
        }
      });

      return count;
    });

    return { id: record.id, status: "confirmed", assignmentCount: created };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async persistReview(
    record: ShiftPlanImportRecord,
    nextState: StoredParseState,
    rows: ParsedShiftRow[],
    errors: ParseError[],
    actor: Actor,
    workspaceGroupId?: string | null
  ): Promise<MappingReviewDto> {
    const { userMap, areaMap } = await this.resolveLookups(record.organizationId, nextState);

    const unmatchedUserNames = uniqueStrings(
      rows
        .filter((row) => !userMap.has(normalizeName(row.rawName)))
        .map((row) => row.rawName)
    );
    const unmatchedAreas = uniqueStrings(
      rows
        .filter((row) => !this.resolveArea(row.rawArea, areaMap, nextState))
        .map((row) => row.rawArea)
    );

    const matchedUserCount = rows.length - unmatchedUserNames.length;
    const hasIssues =
      unmatchedUserNames.length > 0 || unmatchedAreas.length > 0 || errors.length > 0;
    const now = this.now();

    await this.options.db.shiftPlanImport.update({
      where: { id: record.id },
      data: {
        status: hasIssues ? "needs_review" : "parsed",
        parsedData: nextState as unknown as Record<string, unknown>,
        parseErrors: errors,
        importedRowCount: rows.length,
        matchedUserCount,
        unmatchedUserNames,
        areaDetectionIssues: unmatchedAreas,
        ...(workspaceGroupId !== undefined ? { workspaceGroupId } : {}),
        updatedAt: now
      }
    });

    return {
      id: record.id,
      status: hasIssues ? "needs_review" : "parsed",
      importedRowCount: rows.length,
      matchedUserCount,
      unmatchedUserNames,
      unmatchedAreas,
      rowErrors: errors
    };
  }

  private resolveArea(
    rawArea: string,
    areaMapBySlug: Map<string, string>,
    state: StoredParseState
  ): string | undefined {
    // Manual override (raw token → areaId) wins.
    const override = state.areaMatches?.[rawArea.trim().toLowerCase()];
    if (override) {
      return override;
    }
    const slug = mapAreaTokenToSlug(rawArea);
    if (slug && areaMapBySlug.has(slug)) {
      return areaMapBySlug.get(slug);
    }
    return undefined;
  }

  private async resolveLookups(
    organizationId: string,
    state: StoredParseState
  ): Promise<{ userMap: Map<string, string>; areaMap: Map<string, string> }> {
    const members = await this.options.db.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true }
    });
    const authUserIds = members.map((member) => member.userId);

    const profiles =
      authUserIds.length > 0
        ? await this.options.db.userProfile.findMany({
            where: { authUserId: { in: authUserIds } },
            select: { id: true, authUserId: true, displayName: true, email: true }
          })
        : [];

    const userMap = new Map<string, string>();
    for (const profile of profiles) {
      if (profile.displayName) {
        userMap.set(normalizeName(profile.displayName), profile.id);
      }
      userMap.set(normalizeName(profile.email), profile.id);
      const localPart = profile.email.split("@")[0];
      if (localPart) {
        userMap.set(normalizeName(localPart), profile.id);
      }
    }
    // Manual name overrides (normalized raw name → userId).
    for (const [rawName, userId] of Object.entries(state.userMatches ?? {})) {
      userMap.set(normalizeName(rawName), userId);
    }

    const areas = await this.options.db.kitchenArea.findMany({
      where: { organizationId, active: true },
      select: { id: true, slug: true, name: true }
    });
    const areaMap = new Map<string, string>();
    for (const area of areas) {
      areaMap.set(area.slug, area.id);
    }

    return { userMap, areaMap };
  }

  private deserializeRows(state: StoredParseState): ParsedShiftRow[] {
    return (state.mappedRows ?? []).map((row) => ({
      sourceRow: row.sourceRow,
      rawName: row.rawName,
      rawArea: row.rawArea,
      date: new Date(row.date),
      shiftStartAt: new Date(row.shiftStartAt),
      shiftEndAt: new Date(row.shiftEndAt)
    }));
  }

  private readState(record: ShiftPlanImportRecord): StoredParseState {
    if (!record.parsedData || typeof record.parsedData !== "object") {
      throw new ShiftPlanningError("import has no parsed data", 409);
    }
    return record.parsedData as StoredParseState;
  }

  private async findAndGuard(id: string, actor: Actor): Promise<ShiftPlanImportRecord> {
    const organizationId = this.requireOrg(actor);
    const record = await this.options.db.shiftPlanImport.findUnique({ where: { id } });
    if (!record || record.organizationId !== organizationId) {
      throw new ShiftPlanningError("import not found", 404);
    }
    return record;
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}

// ── module-local utils ───────────────────────────────────────────────────────

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function weekdayFromIso(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}
