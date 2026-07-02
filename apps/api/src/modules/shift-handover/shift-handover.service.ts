import type { Actor } from "../auth/actor.js";
import {
  shiftHandoverDraftConfirmSchema,
  shiftHandoverDraftPatchSchema,
  shiftHandoverDraftQuerySchema,
  toPublicDraft,
  type ShiftHandoverDraftPatchInput,
  type ShiftHandoverDraftPublicDTO,
  type ShiftHandoverDraftRecord
} from "./shift-handover.types.js";

export class ShiftHandoverError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409 | 422 | 429;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 409 | 422 | 429) {
    super(message);
    this.name = "ShiftHandoverError";
    this.statusCode = statusCode;
  }
}

export type ShiftHandoverOpenItemRecord = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string | null;
};

export type ShiftHandoverAlertRecord = {
  id: string;
  type: string;
  title: string;
  detail: string;
};

export type ShiftHandoverDatabaseClient = {
  shiftHandoverDraft: {
    findFirst(args: {
      where: {
        organizationId: string;
        shiftLeadId: string;
        date: Date;
        workspaceId: string | null;
      };
    }): Promise<ShiftHandoverDraftRecord | null>;
    create(args: {
      data: {
        organizationId: string;
        shiftLeadId: string;
        workspaceId: string | null;
        date: Date;
        summary: string | null;
        openItems: unknown;
        alerts: unknown;
        notes: string | null;
      };
    }): Promise<ShiftHandoverDraftRecord>;
    update(args: {
      where: { id: string };
      data: Partial<Omit<ShiftHandoverDraftRecord, "id" | "organizationId" | "shiftLeadId" | "date" | "createdAt" | "updatedAt">>;
    }): Promise<ShiftHandoverDraftRecord>;
  };
  // Auto-populate sources. ADR-0025 §Phase E E-4 + OQ §4.
  // Per the plan-doc §6 OQ §4 recommendation, the natural test of an auto-populate
  // is "open tasks the caller owns + open suggestions the caller can act on". The
  // current on-disk WorkflowTask model has no `assignee` column (it has
  // `assignedRole` instead), and AutomationSuggestion has no `assignee` column
  // (it has `relatedItemIds`). The simplified, schema-respecting filter is
  // "open rows for the org"; a future ADR-0025.4 may add an `assignee` column to
  // narrow this further. Until then, the auto-populate is org-wide.
  workflowTask: {
    findMany(args: {
      where: { status: "open"; assignedRole: string | null };
      orderBy: Array<Record<string, "asc" | "desc">>;
      take: number;
      select: {
        id: true;
        type: true;
        severity: true;
        title: true;
        description: true;
      };
    }): Promise<ShiftHandoverOpenItemRecord[]>;
  };
  automationSuggestion: {
    findMany(args: {
      where: { status: "open"; organizationId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
      take: number;
      select: {
        id: true;
        type: true;
        title: true;
        detail: true;
      };
    }): Promise<ShiftHandoverAlertRecord[]>;
  };
};

export type ShiftHandoverServicePort = {
  getOrCreateDraft(input: { actor: Actor; rawQuery: unknown }): Promise<ShiftHandoverDraftPublicDTO>;
  patchDraft(input: { actor: Actor; rawBody: unknown }): Promise<ShiftHandoverDraftPublicDTO>;
  confirmDraft(input: { actor: Actor; rawBody: unknown; id: string }): Promise<{
    draft: ShiftHandoverDraftPublicDTO;
    archiveId: string;
  }>;
  // Test-only: resets the in-memory autosave throttle state between vitest cases.
  __resetAutosaveThrottleForTest?(): void;
};

const AUTOSAVE_THROTTLE_MS = 2_000;
const AUTOSAVE_THROTTLE_MAX_KEYS = 5_000;
const AUTOPOPULATE_OPEN_ITEMS_LIMIT = 50;
const AUTOPOPULATE_ALERTS_LIMIT = 50;

type ThrottleEntry = { firstRequestAt: number; lastRequestAt: number };
const throttleState = new Map<string, ThrottleEntry>();

function pruneThrottleIfNeeded(): void {
  if (throttleState.size <= AUTOSAVE_THROTTLE_MAX_KEYS) {
    return;
  }
  const now = Date.now();
  for (const [key, entry] of throttleState.entries()) {
    if (now - entry.lastRequestAt > AUTOSAVE_THROTTLE_MS * 10) {
      throttleState.delete(key);
    }
  }
}

function recordAutosave(actorId: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = throttleState.get(actorId);
  if (existing && now - existing.lastRequestAt < AUTOSAVE_THROTTLE_MS) {
    return {
      allowed: false,
      retryAfterMs: AUTOSAVE_THROTTLE_MS - (now - existing.lastRequestAt)
    };
  }
  throttleState.set(actorId, {
    firstRequestAt: existing?.firstRequestAt ?? now,
    lastRequestAt: now
  });
  pruneThrottleIfNeeded();
  return { allowed: true, retryAfterMs: 0 };
}

function clearAutosaveThrottle(actorId: string): void {
  throttleState.delete(actorId);
}

export class ShiftHandoverService implements ShiftHandoverServicePort {
  private readonly db: ShiftHandoverDatabaseClient;
  private readonly now: () => Date;

  public constructor(options: { db: ShiftHandoverDatabaseClient; now?: () => Date }) {
    this.db = options.db;
    this.now = options.now ?? (() => new Date());
  }

  public async getOrCreateDraft(input: { actor: Actor; rawQuery: unknown }): Promise<ShiftHandoverDraftPublicDTO> {
    const organizationId = requireOrganizationId(input.actor);
    if (input.actor.role === "viewer" || input.actor.role === "system") {
      throw new ShiftHandoverError("actor is not allowed to read or create shift handover drafts", 403);
    }

    const parsedQuery = shiftHandoverDraftQuerySchema.safeParse(input.rawQuery ?? {});
    if (!parsedQuery.success) {
      throw new ShiftHandoverError("invalid shift-handover query", 400);
    }
    const date = parseDateOrToday(parsedQuery.data.date);
    const workspaceId = parsedQuery.data.workspaceId ?? null;

    const existing = await this.db.shiftHandoverDraft.findFirst({
      where: { organizationId, shiftLeadId: input.actor.userId, date, workspaceId }
    });
    if (existing) {
      return toPublicDraft(existing);
    }

    const created = await this.db.shiftHandoverDraft.create({
      data: {
        organizationId,
        shiftLeadId: input.actor.userId,
        workspaceId,
        date,
        summary: null,
        openItems: [],
        alerts: [],
        notes: null
      }
    });

    // Auto-populate (ADR-0025 §Phase E E-4 + OQ §4): only on first-create.
    // Idempotent: a 2nd GET for the same (org, shiftLead, date, workspaceId) hits
    // the `existing` branch above and does not re-populate.
    const populated = await this.populateFromOpenItems(created, input.actor);
    return toPublicDraft(populated);
  }

  private async populateFromOpenItems(
    created: ShiftHandoverDraftRecord,
    actor: Actor
  ): Promise<ShiftHandoverDraftRecord> {
    const assignedRole = (actor.organizationRole ?? actor.role) || null;
    const [openTasks, openSuggestions] = await Promise.all([
      this.db.workflowTask.findMany({
        where: { status: "open", assignedRole },
        orderBy: [{ createdAt: "desc" }],
        take: AUTOPOPULATE_OPEN_ITEMS_LIMIT,
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          description: true
        }
      }),
      this.db.automationSuggestion.findMany({
        where: { status: "open", organizationId: created.organizationId },
        orderBy: [{ createdAt: "desc" }],
        take: AUTOPOPULATE_ALERTS_LIMIT,
        select: {
          id: true,
          type: true,
          title: true,
          detail: true
        }
      })
    ]);

    const openItems = openTasks.map((task) => ({
      type: task.type,
      itemId: task.id,
      description: task.description ?? task.title
    }));
    const alerts = openSuggestions.map((suggestion) => ({
      type: suggestion.type,
      id: suggestion.id
    }));

    return this.db.shiftHandoverDraft.update({
      where: { id: created.id },
      data: { openItems, alerts }
    });
  }

  public async patchDraft(input: { actor: Actor; rawBody: unknown }): Promise<ShiftHandoverDraftPublicDTO> {
    const organizationId = requireOrganizationId(input.actor);
    if (input.actor.role === "viewer" || input.actor.role === "system") {
      throw new ShiftHandoverError("actor is not allowed to edit shift handover drafts", 403);
    }

    const parsed = shiftHandoverDraftPatchSchema.safeParse(input.rawBody ?? {});
    if (!parsed.success) {
      throw new ShiftHandoverError("invalid shift-handover patch body", 422);
    }
    const body: ShiftHandoverDraftPatchInput = parsed.data;

    const throttle = recordAutosave(input.actor.userId);
    if (!throttle.allowed) {
      throw new ShiftHandoverError(
        `autosave throttled; retry after ${throttle.retryAfterMs}ms`,
        429
      );
    }

    const today = startOfUtcDay(this.now());
    const existing = await this.db.shiftHandoverDraft.findFirst({
      where: {
        organizationId,
        shiftLeadId: input.actor.userId,
        date: today,
        workspaceId: null
      }
    });
    if (!existing) {
      throw new ShiftHandoverError("no open shift handover draft to patch", 404);
    }
    if (existing.confirmedAt) {
      throw new ShiftHandoverError("shift handover draft is already confirmed", 409);
    }

    const updated = await this.db.shiftHandoverDraft.update({
      where: { id: existing.id },
      data: {
        summary: body.summary === undefined ? existing.summary : body.summary,
        openItems: body.openItems === undefined ? existing.openItems : body.openItems,
        alerts: body.alerts === undefined ? existing.alerts : body.alerts,
        notes: body.notes === undefined ? existing.notes : body.notes,
        startTime: body.startTime === undefined ? existing.startTime : body.startTime,
        endTime: body.endTime === undefined ? existing.endTime : body.endTime
      }
    });
    return toPublicDraft(updated);
  }

  public __resetAutosaveThrottleForTest(): void {
    throttleState.clear();
  }

  public async confirmDraft(input: {
    actor: Actor;
    rawBody: unknown;
    id: string;
  }): Promise<{ draft: ShiftHandoverDraftPublicDTO; archiveId: string }> {
    const organizationId = requireOrganizationId(input.actor);
    const managerRoles = new Set(["manager", "admin", "owner", "shift_lead"]);
    if (!managerRoles.has(input.actor.role)) {
      throw new ShiftHandoverError("actor is not allowed to confirm shift handover drafts", 403);
    }

    const parsed = shiftHandoverDraftConfirmSchema.safeParse(input.rawBody ?? {});
    if (!parsed.success) {
      throw new ShiftHandoverError("invalid shift-handover confirm body", 422);
    }
    // archiveNote is accepted by Zod and dropped server-side per ADR-0025 OQ §1 verdict.
    void parsed.data.archiveNote;

    const id = input.id?.trim();
    if (!id) {
      throw new ShiftHandoverError("draft id is required", 400);
    }

    const existing = await this.db.shiftHandoverDraft.findFirst({
      where: { organizationId, shiftLeadId: input.actor.userId, date: startOfUtcDay(this.now()), workspaceId: null }
    });
    if (!existing || existing.id !== id) {
      throw new ShiftHandoverError("shift handover draft not found", 404);
    }

    const confirmed = await this.db.shiftHandoverDraft.update({
      where: { id },
      data: { confirmedAt: this.now() }
    });

    clearAutosaveThrottle(input.actor.userId);

    return {
      draft: toPublicDraft(confirmed),
      archiveId: confirmed.id
    };
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new ShiftHandoverError("actor has no organization context", 403);
  }
  return actor.organizationId;
}

function startOfUtcDay(value: Date): Date {
  const copy = new Date(value.getTime());
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function parseDateOrToday(input: string | undefined): Date {
  if (!input) {
    return startOfUtcDay(new Date());
  }
  const [year, month, day] = input.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    throw new ShiftHandoverError("invalid date; expected YYYY-MM-DD", 400);
  }
  return new Date(Date.UTC(year, month - 1, day));
}
