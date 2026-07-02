import type { CUBE_SourceFieldConfidence } from "@prisma/client";

import type { Actor } from "../auth/actor.js";
import type {
  AutomationDecisionRecord,
  AutomationRuleRecord,
  AutomationSuggestionRecord
} from "../automation/automation-rule.service.js";

// ADR-0029-B (accepted): CUBE Source-Conflict-Validator — typed contract for
// the cube-source-conflict module. 3 new models (CUBE_Source, CUBE_SourceField,
// CUBE_Conflict) + 1 new enum (CUBE_SourceFieldConfidence) shaped per
// 00b-cube-source-conflict-validator.md. Read-only slice: no mutation surface.
// PII-mitigation is the service-layer sanitizePII regex + the DB-level CHECK
// (length <= 500) defense-in-depth cap.
//
// DEVIATION FROM THE IMPLEMENTER BRIEF (logged in MSPR residual-risks):
//   The Prisma-generated delegate names for the new models are
//   `cUBE_Source`, `cUBE_SourceField`, `cUBE_Conflict` (the first letter is
//   lowercased, the rest is preserved verbatim). The Implementer brief asked
//   for `cubeSource` / `cubeSourceField` / `cubeConflict` keys on the
//   database client interface, but the production wiring uses an
//   `as unknown as CUBE_SourceConflictDatabaseClient` cast on the real
//   `prisma` instance (same pattern as OperationalUnit). For the cast to
//   resolve at runtime, the interface keys MUST match Prisma's generated
//   delegate names. The interface below therefore uses `cUBE_Source` /
//   `cUBE_SourceField` / `cUBE_Conflict`. The test stub also uses these
//   names so the production and test code paths are byte-identical at the
//   service boundary.

export { CUBE_SourceFieldConfidence };

export type CUBE_SourceFieldConfidenceValue =
  (typeof CUBE_SourceFieldConfidence)[keyof typeof CUBE_SourceFieldConfidence];

export class CUBE_SourceConflictError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409 | 422;

  public constructor(
    message: string,
    statusCode: 400 | 403 | 404 | 409 | 422
  ) {
    super(message);
    this.name = "CUBE_SourceConflictError";
    this.statusCode = statusCode;
  }
}

export type CUBE_SourceRecord = {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  version: number;
  retrievedAt: Date;
  url: string | null;
  payloadHash: string | null;
  isActive: boolean;
  enteredBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CUBE_SourceFieldRecord = {
  id: string;
  organizationId: string;
  sourceId: string;
  fieldKey: string;
  fieldValue: string;
  confidence: CUBE_SourceFieldConfidenceValue;
  discoveredAt: Date;
  updatedAt: Date;
};

export type CUBE_ConflictRecord = {
  id: string;
  organizationId: string;
  fieldKey: string;
  sourceIds: string[];
  detectedAt: Date;
  resolvedAt: Date | null;
  resolvedBySuggestionId: string | null;
  winningFieldValue: string | null;
};

export type CUBE_SourceListItem = {
  id: string;
  name: string;
  displayName: string;
  version: number;
  retrievedAt: string;
  url: string | null;
  payloadHash: string | null;
  isActive: boolean;
  enteredBy: string | null;
};

export type CUBE_SourceDetailDto = CUBE_SourceListItem & {
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type CUBE_SourceFieldListItem = {
  id: string;
  sourceId: string;
  fieldKey: string;
  fieldValue: string;
  confidence: CUBE_SourceFieldConfidenceValue;
  discoveredAt: string;
  updatedAt: string;
};

export type CUBE_ConflictListItem = {
  id: string;
  fieldKey: string;
  sourceIds: string[];
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBySuggestionId: string | null;
  winningFieldValue: string | null;
};

export type CUBE_SourceListOptions = {
  activeOnly?: boolean;
};

export type CUBE_ConflictListOptions = {
  fieldKey?: string;
  /**
   * `true`  → only resolved conflicts (resolvedAt IS NOT NULL)
   * `false` → only open conflicts (resolvedAt IS NULL) — the default for
   *           the Cockpit list view.
   * omitted → no resolvedAt filter (returns both open and resolved).
   */
  resolved?: boolean;
};

export type CUBE_SourceConflictServicePort = {
  listSources(
    actor: Actor,
    options?: CUBE_SourceListOptions
  ): Promise<CUBE_SourceListItem[]>;
  getSource(actor: Actor, id: string): Promise<CUBE_SourceDetailDto | null>;
  listFields(actor: Actor, sourceId: string): Promise<CUBE_SourceFieldListItem[]>;
  detectConflicts(
    actor: Actor,
    options?: CUBE_ConflictListOptions
  ): Promise<CUBE_ConflictListItem[]>;
  getConflict(actor: Actor, id: string): Promise<CUBE_ConflictListItem | null>;
  // ADR-0029-B.2: manager-resolve + manager-entry paths
  resolveConflict(input: ResolveConflictInput): Promise<ResolveConflictResult>;
  rejectConflict(input: RejectConflictInput): Promise<RejectConflictResult>;
  enterSource(input: EnterSourceInput): Promise<EnterSourceResult>;
};

export type CUBE_SourceConflictDatabaseClient = {
  cUBE_Source: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<CUBE_SourceRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<CUBE_SourceRecord | null>;
    update(args: {
      where: { id: string };
      data: CUBE_SourceUpdateInput;
    }): Promise<CUBE_SourceRecord>;
    create(args: {
      data: CUBE_SourceCreateInput;
    }): Promise<CUBE_SourceRecord>;
  };
  cUBE_SourceField: {
    findMany(args: {
      where: { organizationId: string; sourceId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<CUBE_SourceFieldRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<CUBE_SourceFieldRecord | null>;
    update(args: {
      where: { id: string };
      data: CUBE_SourceFieldUpdateInput;
    }): Promise<CUBE_SourceFieldRecord>;
    create(args: {
      data: CUBE_SourceFieldCreateInput;
    }): Promise<CUBE_SourceFieldRecord>;
  };
  cUBE_Conflict: {
    findMany(args: {
      where: {
        organizationId: string;
        fieldKey?: string;
        resolvedAt?: null | { not: null };
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<CUBE_ConflictRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<CUBE_ConflictRecord | null>;
    update(args: {
      where: { id: string };
      data: CUBE_ConflictUpdateInput;
    }): Promise<CUBE_ConflictRecord>;
  };
  automationDecision: {
    create(args: {
      data: {
        suggestionId: string;
        status: "approved" | "rejected";
        actor: string;
        actorRole: string;
        timestamp: Date;
        reason?: string | null;
        notes?: string | null;
        metadata?: unknown;
      };
    }): Promise<AutomationDecisionRecord>;
  };
  automationRule: {
    findFirst(args: {
      where: { organizationId: string; name: string; deletedAt: null };
    }): Promise<AutomationRuleRecord | null>;
    create(args: {
      data: {
        organizationId: string;
        enabled?: boolean;
        version?: number;
        ruleType: string;
        name: string;
        description?: string | null;
        condition: unknown;
        action: unknown;
        evaluateOn: string;
        schedule?: string | null;
        metadata?: unknown;
        createdBy?: string | null;
      };
    }): Promise<AutomationRuleRecord>;
  };
  automationSuggestion: {
    findUnique(args: { where: { id: string } }): Promise<AutomationSuggestionRecord | null>;
    create(args: {
      data: {
        id: string;
        organizationId: string;
        ruleId: string;
        ruleVersion: number;
        status: "open" | "approved" | "rejected" | "expired";
        type: string;
        title: string;
        detail: string;
        relatedItemIds: string[];
      };
    }): Promise<AutomationSuggestionRecord>;
  };
  workflowTask: {
    create(args: {
      data: {
        type: string;
        status: "open";
        severity: string;
        title: string;
        description?: string;
      };
    }): Promise<{ id: string }>;
  };
  $transaction?<T>(callback: (tx: CUBE_SourceConflictDatabaseClient) => Promise<T>): Promise<T>;
  $executeRawUnsafe?(query: string, ...values: unknown[]): Promise<unknown>;
};

// ============================================================================
// ADR-0029-B.2: Mutation surface (manager-resolve + manager-entry paths).
// ============================================================================
// Per-table whitelists. The manager-resolve path mutates CUBE_Conflict
// (resolvedAt, resolvedBySuggestionId, winningFieldValue). The
// manager-entry path mutates CUBE_Source (isActive, enteredBy) and
// CUBE_SourceField (fieldValue, confidence), and ALSO creates new
// CUBE_Source + CUBE_SourceField rows.

export type CUBE_SourceUpdateInput = {
  isActive?: boolean;
  enteredBy?: string | null;
};

export type CUBE_SourceFieldUpdateInput = {
  fieldValue?: string;
  confidence?: CUBE_SourceFieldConfidenceValue;
};

export type CUBE_ConflictUpdateInput = {
  resolvedAt?: Date | null;
  resolvedBySuggestionId?: string | null;
  winningFieldValue?: string | null;
};

export type CUBE_SourceCreateInput = {
  organizationId: string;
  name: string;
  displayName: string;
  version?: number;
  retrievedAt?: Date;
  url?: string | null;
  payloadHash?: string | null;
  isActive?: boolean;
  enteredBy?: string | null;
};

export type CUBE_SourceFieldCreateInput = {
  organizationId: string;
  sourceId: string;
  fieldKey: string;
  fieldValue: string;
  confidence?: CUBE_SourceFieldConfidenceValue;
  discoveredAt?: Date;
};

// ----------------------------------------------------------------------------
// Resolve / Reject / Enter inputs
// ----------------------------------------------------------------------------

export type ResolveConflictInput = {
  actor: Actor;
  conflictId: string;
  winningFieldValue: string;
  reason?: string;
  notes?: string;
  clientRequestId?: string;
};

export type ResolveConflictResult = {
  conflict: CUBE_ConflictRecord;
  decision: AutomationDecisionRecord;
  workflowTask: { id: string; type: string; title: string } | null;
};

export type RejectConflictInput = {
  actor: Actor;
  conflictId: string;
  reason: string;
  notes?: string;
  clientRequestId?: string;
};

export type RejectConflictResult = {
  conflict: CUBE_ConflictRecord;
  decision: AutomationDecisionRecord;
};

export type EnterSourceInput = {
  actor: Actor;
  source: CUBE_SourceCreateInput;
  fields: CUBE_SourceFieldCreateInput[];
  notes?: string;
  clientRequestId?: string;
};

export type EnterSourceResult = {
  source: CUBE_SourceRecord;
  fields: CUBE_SourceFieldRecord[];
  decision: AutomationDecisionRecord;
};
