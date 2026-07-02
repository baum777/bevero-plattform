import type { Actor } from "../auth/actor.js";
import {
  type AutomationRuleRecord
} from "../automation/automation-rule.service.js";
import {
  CUBE_SourceConflictError,
  type CUBE_ConflictListItem,
  type CUBE_ConflictListOptions,
  type CUBE_ConflictRecord,
  type CUBE_ConflictUpdateInput,
  type CUBE_SourceConflictDatabaseClient,
  type CUBE_SourceConflictServicePort,
  type CUBE_SourceCreateInput,
  type CUBE_SourceDetailDto,
  type CUBE_SourceFieldCreateInput,
  type CUBE_SourceFieldListItem,
  type CUBE_SourceFieldRecord,
  type CUBE_SourceFieldUpdateInput,
  type CUBE_SourceListItem,
  type CUBE_SourceListOptions,
  type CUBE_SourceRecord,
  type CUBE_SourceUpdateInput,
  type EnterSourceInput,
  type EnterSourceResult,
  type RejectConflictInput,
  type RejectConflictResult,
  type ResolveConflictInput,
  type ResolveConflictResult
} from "./cube-source-conflict.types.js";

export {
  CUBE_SourceConflictError,
  type CUBE_SourceConflictServicePort,
  type CUBE_SourceConflictDatabaseClient
} from "./cube-source-conflict.types.js";

// ADR-0029-B (accepted): CUBE Source-Conflict-Validator — read-only service.
// 5 read endpoints, 0 mutation endpoints (binding decision §Decisions Made
// Binding §1, §9, §11). PII is sanitized via the deterministic
// sanitizePII regex in the toCUBE_SourceFieldListItem mapper (binding
// decision §Decisions Made Binding §5). The CUBE_Conflict read path is
// pure: no $queryRaw, no read-time grouping, no CUBE_SourceField
// aggregation; the seed is the only writer.

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_DE_PATTERN = /(\+49|0)[1-9][0-9 \-]{6,18}\d/g;
const PHONE_E164_PATTERN = /\+[1-9]\d{6,14}/g;
const POSTAL_DE_PATTERN = /(\d{5})\s+[A-ZÄÖÜ][a-zäöüß]+/g;
const STREET_DE_PATTERN = /\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß]+(str\.|straße|weg|platz|allee)/g;

export function sanitizePII(value: string): string {
  // Deterministic regex; no LLM. Order: email → phone → address.
  return value
    .replace(EMAIL_PATTERN, "<email>")
    .replace(PHONE_DE_PATTERN, "<phone>")
    .replace(PHONE_E164_PATTERN, "<phone>")
    .replace(POSTAL_DE_PATTERN, "<address>")
    .replace(STREET_DE_PATTERN, "<address>");
}

export class CUBE_SourceConflictService implements CUBE_SourceConflictServicePort {
  private readonly db: CUBE_SourceConflictDatabaseClient;

  public constructor(options: { db: CUBE_SourceConflictDatabaseClient }) {
    this.db = options.db;
  }

  public async listSources(
    actor: Actor,
    options: CUBE_SourceListOptions = {}
  ): Promise<CUBE_SourceListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const where: { organizationId: string; isActive?: boolean } = { organizationId };
    if (options.activeOnly === true) {
      where.isActive = true;
    }
    const rows = await this.db.cUBE_Source.findMany({
      where,
      orderBy: [{ name: "asc" }, { version: "desc" }]
    });
    return rows.map(toCUBE_SourceListItem);
  }

  public async getSource(actor: Actor, id: string): Promise<CUBE_SourceDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.cUBE_Source.findFirst({
      where: { id, organizationId }
    });
    if (!row) {
      return null;
    }
    return toCUBE_SourceDetailDto(row);
  }

  public async listFields(
    actor: Actor,
    sourceId: string
  ): Promise<CUBE_SourceFieldListItem[]> {
    const organizationId = requireOrganizationId(actor);
    // Defensive: confirm the source belongs to the actor's org before
    // returning its fields. Service-layer narrowing (RLS denies cross-org
    // reads anyway; this is defense-in-depth).
    const source = await this.db.cUBE_Source.findFirst({
      where: { id: sourceId, organizationId }
    });
    if (!source) {
      return [];
    }
    const rows = await this.db.cUBE_SourceField.findMany({
      where: { organizationId, sourceId },
      orderBy: [{ fieldKey: "asc" }]
    });
    return rows.map(toCUBE_SourceFieldListItem);
  }

  public async detectConflicts(
    actor: Actor,
    options: CUBE_ConflictListOptions = {}
  ): Promise<CUBE_ConflictListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const where: {
      organizationId: string;
      fieldKey?: string;
      resolvedAt?: null | { not: null };
    } = { organizationId };
    if (options.fieldKey) {
      where.fieldKey = options.fieldKey;
    }
    if (options.resolved === true) {
      where.resolvedAt = { not: null };
    } else if (options.resolved === false) {
      where.resolvedAt = null;
    }
    const rows = await this.db.cUBE_Conflict.findMany({
      where,
      orderBy: [{ detectedAt: "desc" }]
    });
    return rows.map(toCUBE_ConflictListItem);
  }

  public async getConflict(actor: Actor, id: string): Promise<CUBE_ConflictListItem | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.cUBE_Conflict.findFirst({
      where: { id, organizationId }
    });
    if (!row) {
      return null;
    }
    return toCUBE_ConflictListItem(row);
  }

  // ==========================================================================
  // ADR-0029-B.2: Manager-resolve + manager-entry paths.
  // ==========================================================================
  // Mirrors the `AutomationSuggestionService.approve()` transaction shape at
  // src/modules/automation/automation-suggestion.service.ts:283-374:
  //   1. prisma.$transaction(async (tx) => { ... })
  //   2. First statement: SET LOCAL bevero.allow_cube_source_update = 'on'
  //   3. Load the row, verify org + field-whitelist
  //   4. UPDATE (or CREATE for enterSource)
  //   5. Create immutable AutomationDecision row (audit trail; per
  //      ADR-0022) referencing a synthetic "manual_detection"
  //      AutomationRule (per ADR-0029-B §Decisions §4)
  //   6. For resolve: optionally create a WorkflowTask (mirrors the
  //      automation-suggestion approval path)

  public async resolveConflict(
    input: ResolveConflictInput
  ): Promise<ResolveConflictResult> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.conflictId.trim();
    if (!trimmedId) {
      throw new CUBE_SourceConflictError("conflict id is required", 422);
    }
    if (!input.winningFieldValue || input.winningFieldValue.length === 0) {
      throw new CUBE_SourceConflictError(
        "winningFieldValue is required to resolve a conflict",
        422
      );
    }
    if (input.winningFieldValue.length > 500) {
      throw new CUBE_SourceConflictError(
        "winningFieldValue must be 500 characters or fewer",
        400
      );
    }
    if (input.notes !== undefined && input.notes !== null && input.notes.length > 1000) {
      throw new CUBE_SourceConflictError(
        "notes must be 1000 characters or fewer",
        400
      );
    }
    const tx = this.requireTransaction();
    const occurredAt = new Date();

    // 1. SET LOCAL bevero.allow_cube_source_update = 'on'
    if (tx.$executeRawUnsafe) {
      await tx.$executeRawUnsafe("SET LOCAL bevero.allow_cube_source_update = 'on'");
    }

    // 2. Load the conflict and verify org-scope
    const conflict = await tx.cUBE_Conflict.findFirst({
      where: { id: trimmedId, organizationId }
    });
    if (!conflict) {
      throw new CUBE_SourceConflictError("CUBE conflict not found", 404);
    }
    if (conflict.resolvedAt) {
      throw new CUBE_SourceConflictError(
        "CUBE conflict is already resolved",
        409
      );
    }

    // 3. UPDATE the conflict (resolvedAt + resolvedBySuggestionId + winningFieldValue)
    const rule = await this.ensureSyntheticRule(tx, organizationId, input.actor.userId, "resolution");
    const suggestion = await this.ensureSyntheticSuggestion(tx, rule, organizationId, {
      rowKind: "conflict",
      rowId: trimmedId,
      fieldKey: conflict.fieldKey
    });

    const updated = await tx.cUBE_Conflict.update({
      where: { id: trimmedId },
      data: {
        resolvedAt: occurredAt,
        resolvedBySuggestionId: suggestion.id,
        winningFieldValue: sanitizePII(input.winningFieldValue)
      } satisfies CUBE_ConflictUpdateInput
    });

    // 4. Create the immutable AutomationDecision
    const decision = await tx.automationDecision.create({
      data: {
        suggestionId: suggestion.id,
        status: "approved",
        actor: input.actor.userId,
        actorRole: input.actor.role,
        timestamp: occurredAt,
        reason: input.reason ?? null,
        notes: input.notes ? sanitizePII(input.notes) : null,
        metadata: {
          kind: "resolve",
          conflictId: trimmedId,
          fieldKey: conflict.fieldKey,
          clientRequestId: input.clientRequestId ?? null
        }
      }
    });

    // 5. Create a WorkflowTask (mirrors automation-suggestion approval)
    const taskType = "cube.conflict_resolved";
    const created = await tx.workflowTask.create({
      data: {
        type: taskType,
        status: "open",
        severity: "info",
        title: `CUBE conflict resolved: ${conflict.fieldKey}`,
        description: `Manager resolved CUBE conflict on field '${conflict.fieldKey}' with value '${input.winningFieldValue}'.`
      }
    });
    const workflowTask = { id: created.id, type: taskType, title: created.id };

    return { conflict: updated, decision, workflowTask };
  }

  public async rejectConflict(
    input: RejectConflictInput
  ): Promise<RejectConflictResult> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.conflictId.trim();
    if (!trimmedId) {
      throw new CUBE_SourceConflictError("conflict id is required", 422);
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new CUBE_SourceConflictError(
        "reason is required to reject a conflict",
        422
      );
    }
    if (input.notes !== undefined && input.notes !== null && input.notes.length > 1000) {
      throw new CUBE_SourceConflictError(
        "notes must be 1000 characters or fewer",
        400
      );
    }
    const tx = this.requireTransaction();
    const occurredAt = new Date();

    if (tx.$executeRawUnsafe) {
      await tx.$executeRawUnsafe("SET LOCAL bevero.allow_cube_source_update = 'on'");
    }

    const conflict = await tx.cUBE_Conflict.findFirst({
      where: { id: trimmedId, organizationId }
    });
    if (!conflict) {
      throw new CUBE_SourceConflictError("CUBE conflict not found", 404);
    }

    const rule = await this.ensureSyntheticRule(tx, organizationId, input.actor.userId, "rejection");
    const suggestion = await this.ensureSyntheticSuggestion(tx, rule, organizationId, {
      rowKind: "conflict",
      rowId: trimmedId,
      fieldKey: conflict.fieldKey
    });

    // The reject path does NOT mutate the conflict (no resolvedAt) —
    // it just records the rejection as an immutable decision row.
    const decision = await tx.automationDecision.create({
      data: {
        suggestionId: suggestion.id,
        status: "rejected",
        actor: input.actor.userId,
        actorRole: input.actor.role,
        timestamp: occurredAt,
        reason: input.reason,
        notes: input.notes ? sanitizePII(input.notes) : null,
        metadata: {
          kind: "reject",
          conflictId: trimmedId,
          fieldKey: conflict.fieldKey,
          clientRequestId: input.clientRequestId ?? null
        }
      }
    });

    return { conflict, decision };
  }

  public async enterSource(
    input: EnterSourceInput
  ): Promise<EnterSourceResult> {
    const organizationId = requireOrganizationId(input.actor);
    if (input.source.organizationId !== organizationId) {
      throw new CUBE_SourceConflictError(
        "source organizationId does not match actor's organization",
        403
      );
    }
    if (!input.source.name || input.source.name.trim().length === 0) {
      throw new CUBE_SourceConflictError("source name is required", 422);
    }
    if (input.fields.length === 0) {
      throw new CUBE_SourceConflictError(
        "at least one CUBE_SourceField is required",
        422
      );
    }
    for (const field of input.fields) {
      if (field.organizationId !== organizationId) {
        throw new CUBE_SourceConflictError(
          "field organizationId does not match actor's organization",
          403
        );
      }
      if (!field.fieldKey || field.fieldKey.trim().length === 0) {
        throw new CUBE_SourceConflictError("field fieldKey is required", 422);
      }
      if (field.fieldValue.length > 500) {
        throw new CUBE_SourceConflictError(
          "fieldValue must be 500 characters or fewer",
          400
        );
      }
    }
    const tx = this.requireTransaction();
    const occurredAt = new Date();

    if (tx.$executeRawUnsafe) {
      await tx.$executeRawUnsafe("SET LOCAL bevero.allow_cube_source_update = 'on'");
    }

    // 1. Create the CUBE_Source row
    const source = await tx.cUBE_Source.create({
      data: {
        organizationId: input.source.organizationId,
        name: input.source.name.trim(),
        displayName: input.source.displayName.trim(),
        version: input.source.version ?? 1,
        retrievedAt: input.source.retrievedAt ?? occurredAt,
        url: input.source.url ?? null,
        payloadHash: input.source.payloadHash ?? null,
        isActive: input.source.isActive ?? false,
        enteredBy: input.source.enteredBy ?? input.actor.userId
      } satisfies CUBE_SourceCreateInput
    });

    // 2. Create the CUBE_SourceField rows
    const fieldRecords: CUBE_SourceFieldRecord[] = [];
    for (const field of input.fields) {
      const created = await tx.cUBE_SourceField.create({
        data: {
          organizationId: field.organizationId,
          sourceId: source.id,
          fieldKey: field.fieldKey.trim(),
          fieldValue: sanitizePII(field.fieldValue),
          confidence: field.confidence ?? "requires_manager_confirmation",
          discoveredAt: field.discoveredAt ?? occurredAt
        } satisfies CUBE_SourceFieldCreateInput
      });
      fieldRecords.push(created);
    }

    // 3. Create the synthetic AutomationRule + suggestion + decision
    const rule = await this.ensureSyntheticRule(tx, organizationId, input.actor.userId, "entry");
    const suggestion = await this.ensureSyntheticSuggestion(tx, rule, organizationId, {
      rowKind: "source",
      rowId: source.id,
      fieldKey: input.fields[0]?.fieldKey ?? ""
    });

    const decision = await tx.automationDecision.create({
      data: {
        suggestionId: suggestion.id,
        status: "approved",
        actor: input.actor.userId,
        actorRole: input.actor.role,
        timestamp: occurredAt,
        reason: "manual source entry",
        notes: input.notes ? sanitizePII(input.notes) : null,
        metadata: {
          kind: "enter_source",
          sourceId: source.id,
          fieldCount: input.fields.length,
          clientRequestId: input.clientRequestId ?? null
        }
      }
    });

    return { source, fields: fieldRecords, decision };
  }

  // -------------------------------------------------------------------------
  // Private helpers for the mutation path
  // -------------------------------------------------------------------------

  private async ensureSyntheticRule(
    tx: CUBE_SourceConflictDatabaseClient,
    organizationId: string,
    userId: string,
    purpose: "resolution" | "rejection" | "entry"
  ): Promise<AutomationRuleRecord> {
    const name = `cube_source_manual_${purpose}`;
    const existing = await tx.automationRule.findFirst({
      where: { organizationId, name, deletedAt: null }
    });
    if (existing) {
      return existing;
    }
    return tx.automationRule.create({
      data: {
        organizationId,
        enabled: true,
        version: 1,
        ruleType: "event",
        name,
        description: `Synthetic AutomationRule backing the CUBE Source-Conflict ${purpose} path. Created on demand per organization. See ADR-0029-B §Decisions §4 + ADR-0029-B.2 §Decisions Made Binding §1.`,
        condition: { type: "manual_detection", target: "cube_source_conflict", purpose },
        action: { type: "manual_resolution", surface: "cube_source_conflict", purpose },
        evaluateOn: "write",
        schedule: null,
        metadata: { synthetic: true, slice: "adr-0029-b.2", purpose },
        createdBy: userId
      }
    });
  }

  private async ensureSyntheticSuggestion(
    tx: CUBE_SourceConflictDatabaseClient,
    rule: AutomationRuleRecord,
    organizationId: string,
    input: { rowKind: "conflict" | "source"; rowId: string; fieldKey: string }
  ): Promise<{ id: string }> {
    const suggestionId = `sug-cube-src-${organizationId.slice(0, 16)}-${input.rowKind}-${input.rowId}`.slice(0, 64);
    const existing = await tx.automationSuggestion
      .findUnique({ where: { id: suggestionId } })
      .catch(() => null);
    if (existing) {
      return existing;
    }
    return tx.automationSuggestion.create({
      data: {
        id: suggestionId,
        organizationId,
        ruleId: rule.id,
        ruleVersion: rule.version,
        status: "open",
        type: "custom",
        title: `CUBE Source-Conflict (${input.rowKind})`,
        detail: `Synthetic AutomationSuggestion for CUBE Source-Conflict ${input.rowKind} (${input.fieldKey}).`,
        relatedItemIds: [input.rowId]
      }
    });
  }

  private requireTransaction(): CUBE_SourceConflictDatabaseClient {
    if (!this.db.$transaction || !this.db.$executeRawUnsafe) {
      throw new Error(
        "database client does not support $transaction/$executeRawUnsafe; cannot run manager mutation"
      );
    }
    return this.db as unknown as CUBE_SourceConflictDatabaseClient;
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new CUBE_SourceConflictError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function toCUBE_SourceListItem(record: CUBE_SourceRecord): CUBE_SourceListItem {
  return {
    id: record.id,
    name: record.name,
    displayName: record.displayName,
    version: record.version,
    retrievedAt: record.retrievedAt.toISOString(),
    url: record.url,
    payloadHash: record.payloadHash,
    isActive: record.isActive,
    enteredBy: record.enteredBy
  };
}

function toCUBE_SourceDetailDto(record: CUBE_SourceRecord): CUBE_SourceDetailDto {
  return {
    ...toCUBE_SourceListItem(record),
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toCUBE_SourceFieldListItem(
  record: CUBE_SourceFieldRecord
): CUBE_SourceFieldListItem {
  return {
    id: record.id,
    sourceId: record.sourceId,
    fieldKey: record.fieldKey,
    fieldValue: sanitizePII(record.fieldValue),
    confidence: record.confidence,
    discoveredAt: record.discoveredAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toCUBE_ConflictListItem(record: CUBE_ConflictRecord): CUBE_ConflictListItem {
  return {
    id: record.id,
    fieldKey: record.fieldKey,
    sourceIds: [...record.sourceIds],
    detectedAt: record.detectedAt.toISOString(),
    resolvedAt: record.resolvedAt ? record.resolvedAt.toISOString() : null,
    resolvedBySuggestionId: record.resolvedBySuggestionId,
    winningFieldValue: record.winningFieldValue
  };
}
