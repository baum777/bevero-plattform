import type {
  StaffRole,
  NonFoodCategory,
  FurniturePolicySource,
} from "@prisma/client";

import type { Actor } from "../auth/actor.js";
import type {
  AutomationDecisionRecord,
  AutomationRuleRecord,
  AutomationSuggestionRecord
} from "../automation/automation-rule.service.js";

// ADR-0029-C (accepted): CUBE Event-Economic-Rules — typed contract for
// the cube-economic module. 4 new models (ExclusiveRentalPolicy,
// AfterMidnightStaffRate, NonFoodComponent, FurniturePolicy) + 3 new
// enums (StaffRole, NonFoodCategory, FurniturePolicySource) shaped per
// 00c-cube-event-economic-rules.md. Read-only slice: no mutation surface.
// All monetary fields use the *NetCents suffix (ADR-0029-C §5).
//
// DEVIATION FROM THE IMPLEMENTER BRIEF (mirrors ADR-0029-B convention):
//   The Prisma-generated delegate names for the new models are
//   `exclusiveRentalPolicy`, `afterMidnightStaffRate`, `nonFoodComponent`,
//   `furniturePolicy` (the leading underscore-bridge case becomes
//   camelCase in the delegate; e.g. `ExclusiveRentalPolicy` →
//   `prisma.exclusiveRentalPolicy`). For the cast at src/app.ts to
//   resolve at runtime (same `as unknown as` pattern as ADR-0029-B),
//   the interface keys MUST match Prisma's generated delegate names.
//   The interface below therefore uses the camelCase keys. The test
//   stub also uses these names so the production and test code paths
//   are byte-identical at the service boundary.

export { StaffRole, NonFoodCategory, FurniturePolicySource };

export type StaffRoleValue = (typeof StaffRole)[keyof typeof StaffRole];
export type NonFoodCategoryValue =
  (typeof NonFoodCategory)[keyof typeof NonFoodCategory];
export type FurniturePolicySourceValue =
  (typeof FurniturePolicySource)[keyof typeof FurniturePolicySource];

export class CUBE_EconomicError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 422) {
    super(message);
    this.name = "CUBE_EconomicError";
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Record types (Prisma get-shape row types)
// ============================================================================

export type ExclusiveRentalPolicyRecord = {
  id: string;
  organizationId: string;
  name: string;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  requiresManagerConfirmation: boolean;
  minimumGuestCount: number;
  dayRentalUntilHourLocal: string;
  dayRentalRoomNetCents: number;
  dayRentalMinConsumptionNetCents: number;
  eveningRentalFromHourLocal: string;
  eveningRentalRoomNetCents: number;
  eveningRentalMinConsumptionNetCents: number;
  seatedMenuMaxGuests: number;
  standingReceptionMaxGuests: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AfterMidnightStaffRateRecord = {
  id: string;
  organizationId: string;
  role: StaffRoleValue;
  hourlyRateNetCents: number;
  fromHourLocal: string;
  toHourLocal: string;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NonFoodComponentRecord = {
  id: string;
  organizationId: string;
  category: NonFoodCategoryValue;
  name: string;
  description: string | null;
  defaultIncluded: boolean;
  extraCostNetCents: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FurniturePolicyRecord = {
  id: string;
  organizationId: string;
  name: string;
  includedUntilGuestCount: number;
  additionalFromGuestCount: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
  sourceUrl: string | null;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// DTOs (list items; ISO-string dates; sanitized notes via service layer)
// ============================================================================

export type ExclusiveRentalPolicyListItem = {
  id: string;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  requiresManagerConfirmation: boolean;
  minimumGuestCount: number;
  dayRentalUntilHourLocal: string;
  dayRentalRoomNetCents: number;
  dayRentalMinConsumptionNetCents: number;
  eveningRentalFromHourLocal: string;
  eveningRentalRoomNetCents: number;
  eveningRentalMinConsumptionNetCents: number;
  seatedMenuMaxGuests: number;
  standingReceptionMaxGuests: number;
  notes: string | null;
};

export type AfterMidnightStaffRateListItem = {
  id: string;
  role: StaffRoleValue;
  hourlyRateNetCents: number;
  fromHourLocal: string;
  toHourLocal: string;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  requiresManagerConfirmation: boolean;
  notes: string | null;
};

export type NonFoodComponentListItem = {
  id: string;
  category: NonFoodCategoryValue;
  name: string;
  description: string | null;
  defaultIncluded: boolean;
  extraCostNetCents: number | null;
  notes: string | null;
  isActive: boolean;
};

export type FurniturePolicyListItem = {
  id: string;
  name: string;
  includedUntilGuestCount: number;
  additionalFromGuestCount: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
  sourceUrl: string | null;
  sourceEnum: FurniturePolicySourceValue;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  /**
   * Set by the service layer when the policy has a `conflict` indicator
   * (e.g. the `additionalFromGuestCount` semantics differ from another
   * policy in the same org). The Cockpit-Display layer renders a
   * "Konflikt erkannt" badge when true.
   */
  hasConflict: boolean;
};

// ============================================================================
// Service port + database client
// ============================================================================

export type NonFoodComponentListOptions = {
  category?: NonFoodCategoryValue;
};

export type CUBE_EconomicDatabaseClient = {
  exclusiveRentalPolicy: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<ExclusiveRentalPolicyRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<ExclusiveRentalPolicyRecord | null>;
    update(args: {
      where: { id: string };
      data: ExclusiveRentalPolicyUpdateInput;
    }): Promise<ExclusiveRentalPolicyRecord>;
  };
  afterMidnightStaffRate: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<AfterMidnightStaffRateRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<AfterMidnightStaffRateRecord | null>;
    update(args: {
      where: { id: string };
      data: AfterMidnightStaffRateUpdateInput;
    }): Promise<AfterMidnightStaffRateRecord>;
  };
  nonFoodComponent: {
    findMany(args: {
      where: {
        organizationId: string;
        category?: NonFoodCategoryValue;
        isActive?: boolean;
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<NonFoodComponentRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<NonFoodComponentRecord | null>;
    update(args: {
      where: { id: string };
      data: NonFoodComponentUpdateInput;
    }): Promise<NonFoodComponentRecord>;
  };
  furniturePolicy: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<FurniturePolicyRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<FurniturePolicyRecord | null>;
    update(args: {
      where: { id: string };
      data: FurniturePolicyUpdateInput;
    }): Promise<FurniturePolicyRecord>;
  };
  // ADR-0029-C.2 mutation path: AutomationDecision (append-only audit row)
  // + AutomationRule (synthetic "manual_detection" rule; per-org lookup)
  // + AutomationSuggestion (synthetic, one per org+rowKind+rowId; reused
  //   on every verify, the per-event decision is append-only).
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
  $transaction?<T>(callback: (tx: CUBE_EconomicDatabaseClient) => Promise<T>): Promise<T>;
  $executeRawUnsafe?(query: string, ...values: unknown[]): Promise<unknown>;
};

// ============================================================================
// ADR-0029-C.2: Mutation surface (manager-verification path).
// ============================================================================
// The manager-verification path is constrained to a strict per-table
// whitelist of fields (mirrors ADR-0029-C §13 + Risk ID-001: no
// monetary field may be set by the manager via this path; the
// Brutto/Netto-Disziplin stays enforced at the DB layer). Each
// whitelist excludes the primary key, foreign keys, denormalized
// `createdAt`/`updatedAt`, and any field the manager is not allowed
// to flip (the row's monetary `*NetCents` fields, the role enum
// on staff rates, etc.).

export type CUBE_EconomicRowKind =
  | "exclusive_rental"
  | "staff_rate"
  | "non_food"
  | "furniture";

export type ExclusiveRentalPolicyUpdateInput = {
  isActive?: boolean;
  requiresManagerConfirmation?: boolean;
  notes?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
};

export type AfterMidnightStaffRateUpdateInput = {
  isActive?: boolean;
  requiresManagerConfirmation?: boolean;
  notes?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
};

export type NonFoodComponentUpdateInput = {
  isActive?: boolean;
  notes?: string | null;
};

export type FurniturePolicyUpdateInput = {
  isActive?: boolean;
  requiresManagerConfirmation?: boolean;
  notes?: string | null;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
};

export type VerifyManagerConfirmationInput = {
  actor: Actor;
  rowKind: CUBE_EconomicRowKind;
  rowId: string;
  // Union of all per-table whitelists. The service layer narrows
  // by `rowKind`. The route layer accepts a partial from any of the
  // 4 tables and the service layer rejects unknown combinations.
  changes:
    | Partial<ExclusiveRentalPolicyUpdateInput>
    | Partial<AfterMidnightStaffRateUpdateInput>
    | Partial<NonFoodComponentUpdateInput>
    | Partial<FurniturePolicyUpdateInput>;
  reason?: string;
  notes?: string;
  clientRequestId?: string;
};

export type VerifyManagerConfirmationResult = {
  row:
    | ExclusiveRentalPolicyRecord
    | AfterMidnightStaffRateRecord
    | NonFoodComponentRecord
    | FurniturePolicyRecord;
  decision: AutomationDecisionRecord;
};

export type CUBE_EconomicServicePort = {
  getActiveExclusiveRentalPolicy(
    actor: Actor
  ): Promise<ExclusiveRentalPolicyListItem | null>;
  listAfterMidnightStaffRates(
    actor: Actor
  ): Promise<AfterMidnightStaffRateListItem[]>;
  listNonFoodComponents(
    actor: Actor,
    options?: NonFoodComponentListOptions
  ): Promise<NonFoodComponentListItem[]>;
  listFurniturePolicies(actor: Actor): Promise<FurniturePolicyListItem[]>;
  verifyManagerConfirmation(
    input: VerifyManagerConfirmationInput
  ): Promise<VerifyManagerConfirmationResult>;
};
