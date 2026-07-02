import type { Actor } from "../auth/actor.js";
import {
  type AutomationDecisionRecord,
  type AutomationRuleRecord
} from "../automation/automation-rule.service.js";

import {
  CUBE_EconomicError,
  type AfterMidnightStaffRateListItem,
  type AfterMidnightStaffRateRecord,
  type AfterMidnightStaffRateUpdateInput,
  type CUBE_EconomicDatabaseClient,
  type CUBE_EconomicServicePort,
  type CUBE_EconomicRowKind,
  type ExclusiveRentalPolicyListItem,
  type ExclusiveRentalPolicyRecord,
  type ExclusiveRentalPolicyUpdateInput,
  type FurniturePolicyListItem,
  type FurniturePolicyRecord,
  type FurniturePolicyUpdateInput,
  type FurniturePolicySourceValue,
  type NonFoodComponentListItem,
  type NonFoodComponentListOptions,
  type NonFoodComponentRecord,
  type NonFoodComponentUpdateInput,
  type VerifyManagerConfirmationInput,
  type VerifyManagerConfirmationResult
} from "./cube-economic.types.js";

// Re-export the DatabaseClient type for the app.ts wiring (mirrors
// CUBE_SourceConflictDatabaseClient re-export from the 0029-B service).
export type { CUBE_EconomicDatabaseClient };

// ADR-0029-C (accepted): CUBE Event-Economic-Rules read service. Mirrors the
// OperationalUnit + CUBE_SourceConflict service patterns. No mutation methods
// in this slice (read-only, ADR-0021 §3).
//
// PII mitigation: notes fields are passed through the same `sanitizePII`
// regex as the CUBE_SourceConflict service (mirror
// src/modules/cube-source-conflict/cube-source-conflict.service.ts).
// Defense-in-depth: DB length cap on `notes` (CHECK length <= 1000).

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_DE_RE = /(\+49|0)[1-9][0-9 \-]{6,18}\d/g;
const PHONE_E164_RE = /\+[1-9]\d{6,14}/g;
const POSTAL_PLZ_RE = /(\d{5})\s+[A-ZÄÖÜ][a-zäöüß]+/g;
const POSTAL_STREET_RE =
  /\d+[a-z]?\s+[A-ZÄÖÜ][a-zäöüß]+(str\.|straße|weg|platz|allee)/g;

function sanitizePII(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value
    .replace(EMAIL_RE, "<email>")
    .replace(PHONE_DE_RE, "<phone>")
    .replace(PHONE_E164_RE, "<phone>")
    .replace(POSTAL_PLZ_RE, "<address>")
    .replace(POSTAL_STREET_RE, "<address>");
}

function inferFurniturePolicySource(
  sourceUrl: string | null
): FurniturePolicySourceValue {
  if (sourceUrl === null) return "CUBE_BANKETTMAPPE_PDF";
  if (sourceUrl.startsWith("https://www.cube-restaurant.de")) {
    return "CUBE_WEBSITE";
  }
  return "OTHER";
}

function toExclusiveRentalPolicyListItem(
  r: ExclusiveRentalPolicyRecord
): ExclusiveRentalPolicyListItem {
  return {
    id: r.id,
    name: r.name,
    validFrom: r.validFrom?.toISOString() ?? null,
    validUntil: r.validUntil?.toISOString() ?? null,
    isActive: r.isActive,
    requiresManagerConfirmation: r.requiresManagerConfirmation,
    minimumGuestCount: r.minimumGuestCount,
    dayRentalUntilHourLocal: r.dayRentalUntilHourLocal,
    dayRentalRoomNetCents: r.dayRentalRoomNetCents,
    dayRentalMinConsumptionNetCents: r.dayRentalMinConsumptionNetCents,
    eveningRentalFromHourLocal: r.eveningRentalFromHourLocal,
    eveningRentalRoomNetCents: r.eveningRentalRoomNetCents,
    eveningRentalMinConsumptionNetCents:
      r.eveningRentalMinConsumptionNetCents,
    seatedMenuMaxGuests: r.seatedMenuMaxGuests,
    standingReceptionMaxGuests: r.standingReceptionMaxGuests,
    notes: sanitizePII(r.notes),
  };
}

function toAfterMidnightStaffRateListItem(
  r: AfterMidnightStaffRateRecord
): AfterMidnightStaffRateListItem {
  return {
    id: r.id,
    role: r.role,
    hourlyRateNetCents: r.hourlyRateNetCents,
    fromHourLocal: r.fromHourLocal,
    toHourLocal: r.toHourLocal,
    validFrom: r.validFrom?.toISOString() ?? null,
    validUntil: r.validUntil?.toISOString() ?? null,
    isActive: r.isActive,
    requiresManagerConfirmation: r.requiresManagerConfirmation,
    notes: sanitizePII(r.notes),
  };
}

function toNonFoodComponentListItem(
  r: NonFoodComponentRecord
): NonFoodComponentListItem {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    description: sanitizePII(r.description),
    defaultIncluded: r.defaultIncluded,
    extraCostNetCents: r.extraCostNetCents,
    notes: sanitizePII(r.notes),
    isActive: r.isActive,
  };
}

function toFurniturePolicyListItem(
  r: FurniturePolicyRecord,
  orgAllPolicies: FurniturePolicyRecord[]
): FurniturePolicyListItem {
  // Conflict detection (ADR-0029-C §4 + §Risk Register ID-007): a policy
  // is "in conflict" if its additionalFromGuestCount differs from at
  // least one other active policy in the same org. The conflict is
  // surfaced at the `additionalFromGuestCount` level (not the
  // `includedUntilGuestCount` level, which may legitimately be the
  // same across sources). Future ADR-0029-C.2 will route this into a
  // synthetic `AutomationSuggestion` via the existing
  // /admin/automation/suggestions/:id/approve path (ADR-0023).
  const hasConflict = orgAllPolicies.some(
    (other) =>
      other.id !== r.id &&
      other.isActive === r.isActive &&
      other.additionalFromGuestCount !== r.additionalFromGuestCount
  );

  return {
    id: r.id,
    name: r.name,
    includedUntilGuestCount: r.includedUntilGuestCount,
    additionalFromGuestCount: r.additionalFromGuestCount,
    effectiveFrom: r.effectiveFrom?.toISOString() ?? null,
    effectiveUntil: r.effectiveUntil?.toISOString() ?? null,
    isActive: r.isActive,
    sourceUrl: r.sourceUrl,
    sourceEnum: inferFurniturePolicySource(r.sourceUrl),
    requiresManagerConfirmation: r.requiresManagerConfirmation,
    notes: sanitizePII(r.notes),
    hasConflict,
  };
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new CUBE_EconomicError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

export class CUBE_EconomicService implements CUBE_EconomicServicePort {
  public constructor(options: { db: CUBE_EconomicDatabaseClient }) {
    this.db = options.db;
  }

  private readonly db: CUBE_EconomicDatabaseClient;

  public async getActiveExclusiveRentalPolicy(
    actor: Actor
  ): Promise<ExclusiveRentalPolicyListItem | null> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.exclusiveRentalPolicy.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }],
    });
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      // Per ADR-0029-C §Risk ID-001, the v1 unique key is
      // (organizationId, name); partial unique on isActive=true is
      // service-layer enforced. If multiple active policies exist, the
      // service returns the first by name; the Cockpit-Display shows
      // the first one. A future ADR-0029-C.2 may add the partial
      // unique index.
    }
    return toExclusiveRentalPolicyListItem(rows[0]!);
  }

  public async listAfterMidnightStaffRates(
    actor: Actor
  ): Promise<AfterMidnightStaffRateListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.afterMidnightStaffRate.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ role: "asc" }],
    });
    return rows.map(toAfterMidnightStaffRateListItem);
  }

  public async listNonFoodComponents(
    actor: Actor,
    options?: NonFoodComponentListOptions
  ): Promise<NonFoodComponentListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.nonFoodComponent.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(options?.category ? { category: options.category } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return rows.map(toNonFoodComponentListItem);
  }

  public async listFurniturePolicies(
    actor: Actor
  ): Promise<FurniturePolicyListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const all = await this.db.furniturePolicy.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }],
    });
    return all.map((r) => toFurniturePolicyListItem(r, all));
  }

  // ==========================================================================
  // ADR-0029-C.2: Manager-verification mutation path.
  // ==========================================================================
  // Mirrors the `AutomationSuggestionService.approve()` transaction shape at
  // src/modules/automation/automation-suggestion.service.ts:283-374:
  //   1. prisma.$transaction(async (tx) => { ... })
  //   2. First statement: SET LOCAL bevero.allow_cube_economic_update = 'on'
  //   3. Load the row, verify org + field-whitelist
  //   4. UPDATE
  //   5. Create immutable AutomationDecision row (audit trail; per
  //      ADR-0022) referencing a synthetic "manual_detection"
  //      AutomationRule (per ADR-0029-B §Decisions §4)
  //
  // PII mitigation: `notes` is sanitized through the same `sanitizePII`
  // regex as the read slice. The service-layer rejects any `notes` value
  // > 1000 chars with a 400 (the DB CHECK enforces this as a backstop).

  public async verifyManagerConfirmation(
    input: VerifyManagerConfirmationInput
  ): Promise<VerifyManagerConfirmationResult> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.rowId.trim();
    if (!trimmedId) {
      throw new CUBE_EconomicError("row id is required", 422);
    }
    if (input.notes !== undefined && input.notes !== null) {
      if (input.notes.length > 1000) {
        throw new CUBE_EconomicError("notes must be 1000 characters or fewer", 400);
      }
    }
    // Defense-in-depth: any 'notes' inside the changes body must also be
    // <= 1000 chars (the DB CHECK enforces this as a backstop). The
    // service-layer check is the user-facing error.
    const changesNotes = readChangesNotes(input.changes);
    if (changesNotes !== undefined && changesNotes !== null && changesNotes.length > 1000) {
      throw new CUBE_EconomicError("notes must be 1000 characters or fewer", 400);
    }
    const tx = this.requireTransaction();
    const occurredAt = this.now();

    // 1. SET LOCAL bevero.allow_cube_economic_update = 'on'
    if (tx.$executeRawUnsafe) {
      await tx.$executeRawUnsafe("SET LOCAL bevero.allow_cube_economic_update = 'on'");
    }

    // 2. Load the row and verify org-scope + field-whitelist
    const loaded = await this.loadAndCheckRow(tx, input.rowKind, trimmedId, organizationId, input.changes);

    // 3. UPDATE
    const updated = await this.applyUpdate(tx, input.rowKind, trimmedId, loaded, input.changes);

    // 4. Synthetic AutomationRule lookup (create on demand)
    const rule = await this.ensureSyntheticRule(tx, organizationId, input.actor.userId);

    // 5. Create the AutomationSuggestion (synthetic, status='approved' on
    //    creation — the manager is the approver) + immutable AutomationDecision
    const suggestion = await this.ensureSyntheticSuggestion(tx, rule, organizationId, input);

    const decision = await tx.automationDecision.create({
      data: {
        suggestionId: suggestion.id,
        status: "approved",
        actor: input.actor.userId,
        actorRole: input.actor.role,
        timestamp: occurredAt,
        reason: input.reason ?? null,
        // Build the decision `notes` from the top-level input.notes
        // (the audit narrative) or fall back to the row.notes from
        // `changes.notes` (the field the manager is updating). Both
        // are sanitized via sanitizePII.
        notes:
          input.notes !== undefined && input.notes !== null
            ? sanitizePII(input.notes)
            : changesNotes !== undefined && changesNotes !== null
              ? sanitizePII(changesNotes)
              : null,
        metadata: {
          rowKind: input.rowKind,
          rowId: trimmedId,
          clientRequestId: input.clientRequestId ?? null
        }
      }
    });

    return { row: updated, decision };
  }

  // -------------------------------------------------------------------------
  // Private helpers for the mutation path
  // -------------------------------------------------------------------------

  private async loadAndCheckRow(
    tx: CUBE_EconomicDatabaseClient,
    rowKind: CUBE_EconomicRowKind,
    rowId: string,
    organizationId: string,
    changes: VerifyManagerConfirmationInput["changes"]
  ): Promise<
    | ExclusiveRentalPolicyRecord
    | AfterMidnightStaffRateRecord
    | NonFoodComponentRecord
    | FurniturePolicyRecord
  > {
    if (rowKind === "exclusive_rental") {
      const row = await tx.exclusiveRentalPolicy.findFirst({ where: { id: rowId, organizationId } });
      if (!row) {
        throw new CUBE_EconomicError("CUBE economic row not found", 404);
      }
      assertWhitelistKeys("exclusive_rental", changes, EXCLUSIVE_RENTAL_ALLOWED_KEYS);
      return row;
    }
    if (rowKind === "staff_rate") {
      const row = await tx.afterMidnightStaffRate.findFirst({ where: { id: rowId, organizationId } });
      if (!row) {
        throw new CUBE_EconomicError("CUBE economic row not found", 404);
      }
      assertWhitelistKeys("staff_rate", changes, STAFF_RATE_ALLOWED_KEYS);
      return row;
    }
    if (rowKind === "non_food") {
      const row = await tx.nonFoodComponent.findFirst({ where: { id: rowId, organizationId } });
      if (!row) {
        throw new CUBE_EconomicError("CUBE economic row not found", 404);
      }
      assertWhitelistKeys("non_food", changes, NON_FOOD_ALLOWED_KEYS);
      return row;
    }
    if (rowKind === "furniture") {
      const row = await tx.furniturePolicy.findFirst({ where: { id: rowId, organizationId } });
      if (!row) {
        throw new CUBE_EconomicError("CUBE economic row not found", 404);
      }
      assertWhitelistKeys("furniture", changes, FURNITURE_ALLOWED_KEYS);
      return row;
    }
    throw new CUBE_EconomicError(`unknown rowKind: ${rowKind}`, 422);
  }

  private async applyUpdate(
    tx: CUBE_EconomicDatabaseClient,
    rowKind: CUBE_EconomicRowKind,
    rowId: string,
    loaded:
      | ExclusiveRentalPolicyRecord
      | AfterMidnightStaffRateRecord
      | NonFoodComponentRecord
      | FurniturePolicyRecord,
    changes: VerifyManagerConfirmationInput["changes"]
  ): Promise<
    | ExclusiveRentalPolicyRecord
    | AfterMidnightStaffRateRecord
    | NonFoodComponentRecord
    | FurniturePolicyRecord
  > {
    const sanitized = sanitizeChanges(rowKind, changes);
    if (rowKind === "exclusive_rental") {
      return tx.exclusiveRentalPolicy.update({
        where: { id: rowId },
        data: sanitized as ExclusiveRentalPolicyUpdateInput
      });
    }
    if (rowKind === "staff_rate") {
      return tx.afterMidnightStaffRate.update({
        where: { id: rowId },
        data: sanitized as AfterMidnightStaffRateUpdateInput
      });
    }
    if (rowKind === "non_food") {
      return tx.nonFoodComponent.update({
        where: { id: rowId },
        data: sanitized as NonFoodComponentUpdateInput
      });
    }
    if (rowKind === "furniture") {
      return tx.furniturePolicy.update({
        where: { id: rowId },
        data: sanitized as FurniturePolicyUpdateInput
      });
    }
    return loaded;
  }

  private async ensureSyntheticRule(
    tx: CUBE_EconomicDatabaseClient,
    organizationId: string,
    userId: string
  ): Promise<AutomationRuleRecord> {
    const existing = await tx.automationRule.findFirst({
      where: {
        organizationId,
        name: CUBE_ECONOMIC_SYNTHETIC_RULE_NAME,
        deletedAt: null
      }
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
        name: CUBE_ECONOMIC_SYNTHETIC_RULE_NAME,
        description:
          "Synthetic AutomationRule backing the CUBE Event-Economic manager-verification path. Created on demand per organization. See ADR-0029-B §Decisions §4 + ADR-0029-C.2 §Decisions Made Binding §1.",
        condition: { type: "manual_detection", target: "cube_economic" },
        action: { type: "manual_verification", surface: "cube_economic" },
        evaluateOn: "write",
        schedule: null,
        metadata: { synthetic: true, slice: "adr-0029-c.2" },
        createdBy: userId
      }
    });
  }

  private async ensureSyntheticSuggestion(
    tx: CUBE_EconomicDatabaseClient,
    rule: AutomationRuleRecord,
    organizationId: string,
    input: VerifyManagerConfirmationInput
  ): Promise<{ id: string }> {
    // Use a deterministic suggestion id keyed on (organizationId, rowKind, rowId)
    // so the same (org, rowKind, rowId) tuple always reuses the same suggestion.
    // This keeps the AutomationDecision audit trail clean: one suggestion
    // per (org, row, slice), and the per-event decision rows are append-only.
    const suggestionId = CUBE_ECONOMIC_SYNTHETIC_SUGGESTION_ID(organizationId, input.rowKind, input.rowId);

    // Check if it exists; if not, create. We do a findFirst + create to
    // avoid race conditions; the unique id ensures no duplicates.
    const existing = await tx.automationSuggestion
      .findUnique({ where: { id: suggestionId } })
      .catch(() => null);
    if (existing) {
      return existing;
    }
    const created = await tx.automationSuggestion.create({
      data: {
        id: suggestionId,
        organizationId,
        ruleId: rule.id,
        ruleVersion: rule.version,
        status: "approved",
        type: "custom",
        title: `CUBE Economic manager-verification (${input.rowKind})`,
        detail: `Synthetic AutomationSuggestion backing the CUBE Event-Economic manager-verification path for ${input.rowKind}:${input.rowId}.`,
        relatedItemIds: [input.rowId]
      }
    });
    return created;
  }

  private now(): Date {
    return new Date();
  }

  private requireTransaction(): CUBE_EconomicDatabaseClient {
    if (!this.db.$transaction || !this.db.$executeRawUnsafe) {
      throw new Error(
        "database client does not support $transaction/$executeRawUnsafe; cannot run manager verification"
      );
    }
    return this.db as unknown as CUBE_EconomicDatabaseClient;
  }
}

// ============================================================================
// Whitelist + sanitization helpers for the mutation path
// ============================================================================

const CUBE_ECONOMIC_SYNTHETIC_RULE_NAME = "cube_economic_manual_verification";

function CUBE_ECONOMIC_SYNTHETIC_SUGGESTION_ID(
  organizationId: string,
  rowKind: string,
  rowId: string
): string {
  // Deterministic, kebab-cased id. Prisma's `cuid()` is generated server-
  // side; we use a stable string id here to enable the findUnique-or-create
  // pattern. Max length 64 (the CUBE id convention) — orgId+rowKind+rowId
  // for typical ids is well under 64 chars.
  return `sug-cube-eco-${organizationId.slice(0, 16)}-${rowKind}-${rowId}`.slice(0, 64);
}

const EXCLUSIVE_RENTAL_ALLOWED_KEYS = new Set<keyof ExclusiveRentalPolicyUpdateInput>([
  "isActive",
  "requiresManagerConfirmation",
  "notes",
  "validFrom",
  "validUntil"
]);

const STAFF_RATE_ALLOWED_KEYS = new Set<keyof AfterMidnightStaffRateUpdateInput>([
  "isActive",
  "requiresManagerConfirmation",
  "notes",
  "validFrom",
  "validUntil"
]);

const NON_FOOD_ALLOWED_KEYS = new Set<keyof NonFoodComponentUpdateInput>([
  "isActive",
  "notes"
]);

const FURNITURE_ALLOWED_KEYS = new Set<keyof FurniturePolicyUpdateInput>([
  "isActive",
  "requiresManagerConfirmation",
  "notes",
  "effectiveFrom",
  "effectiveUntil"
]);

function assertWhitelistKeys(
  rowKind: CUBE_EconomicRowKind,
  changes: VerifyManagerConfirmationInput["changes"],
  allowedKeys: Set<string>
): void {
  const incoming = Object.keys(changes);
  if (incoming.length === 0) {
    throw new CUBE_EconomicError(
      `at least one mutable field is required for ${rowKind}`,
      422
    );
  }
  for (const key of incoming) {
    if (!allowedKeys.has(key)) {
      throw new CUBE_EconomicError(
        `field '${key}' is not mutable for rowKind '${rowKind}'`,
        422
      );
    }
  }
}

function sanitizeChanges(
  rowKind: CUBE_EconomicRowKind,
  changes: VerifyManagerConfirmationInput["changes"]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes)) {
    if (k === "notes" && typeof v === "string") {
      result[k] = sanitizePII(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function readChangesNotes(
  changes: VerifyManagerConfirmationInput["changes"]
): string | undefined {
  const candidate = (changes as Record<string, unknown>).notes;
  if (typeof candidate === "string") return candidate;
  if (candidate === null) return null as unknown as string;
  return undefined;
}

// Re-export the error class for the route layer
export { CUBE_EconomicError };
