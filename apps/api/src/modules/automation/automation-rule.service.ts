import { z } from "zod";

import type { Actor } from "../auth/actor.js";

export class AutomationRuleError extends Error {
  public readonly statusCode: 400 | 403 | 404;

  public constructor(message: string, statusCode: 400 | 403 | 404) {
    super(message);
    this.name = "AutomationRuleError";
    this.statusCode = statusCode;
  }
}

export type AutomationRuleRecord = {
  id: string;
  organizationId: string;
  version: number;
  enabled: boolean;
  ruleType: string;
  name: string;
  description: string | null;
  condition: unknown;
  action: unknown;
  evaluateOn: string;
  schedule: string | null;
  metadata: unknown;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AutomationRuleListItem = {
  id: string;
  version: number;
  enabled: boolean;
  ruleType: string;
  name: string;
  description: string | null;
  condition: unknown;
  action: unknown;
  evaluateOn: string;
  schedule: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AutomationDryRunResult = {
  ruleId: string;
  ruleVersion: number;
  enabled: boolean;
  evaluable: boolean;
  reason?: string;
  wouldTrigger: boolean;
  matchedItemIds: string[];
  evaluatedItemCount: number;
  conditionSnapshot: unknown;
  evaluatedAt: string;
};

type InventoryStockSnapshotRecord = {
  quantity: number;
  storageLocation: { name: string } | null;
};

type InventoryItemRecord = {
  id: string;
  minStock: number | null;
  stockSnapshots: InventoryStockSnapshotRecord[];
};

export type AutomationSuggestionStatus = "open" | "approved" | "rejected" | "expired";
export type AutomationDecisionStatus = "approved" | "rejected";

export type AutomationSuggestionRecord = {
  id: string;
  organizationId: string;
  ruleId: string;
  ruleVersion: number;
  status: AutomationSuggestionStatus;
  type: string;
  title: string;
  detail: string;
  relatedItemIds: string[];
  createdAt: Date;
  expiresAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  automaticActionOnApproval: unknown;
};

export type AutomationDecisionRecord = {
  id: string;
  suggestionId: string;
  status: AutomationDecisionStatus;
  actor: string;
  actorRole: string;
  timestamp: Date;
  reason: string | null;
  notes: string | null;
  metadata: unknown;
};

export type WorkflowTaskCreateInput = {
  type: string;
  status: "open";
  severity: string;
  title: string;
  description?: string;
  assignedRole?: string;
  workflowEventId?: string;
};

export type AutomationSuggestionTransactionClient = {
  automationSuggestion: {
    findUnique(args: {
      where: { id: string };
      select?: Record<string, true>;
    }): Promise<AutomationSuggestionRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        status: AutomationSuggestionStatus;
        approvedBy?: string | null;
        approvedAt?: Date | null;
        rejectedBy?: string | null;
        rejectedAt?: Date | null;
        rejectionReason?: string | null;
      };
    }): Promise<AutomationSuggestionRecord>;
  };
  automationDecision: {
    findFirst(args: {
      where: {
        suggestionId: string;
        metadata: { path: string[]; equals: string };
      };
    }): Promise<AutomationDecisionRecord | null>;
    create(args: {
      data: {
        suggestionId: string;
        status: AutomationDecisionStatus;
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
    findUnique(args: {
      where: { id: string };
      select: {
        organizationId: true;
        action: true;
        id: true;
        name: true;
      };
    }): Promise<{
      organizationId: string;
      action: unknown;
      id: string;
      name: string;
    } | null>;
  };
  workflowTask: {
    create(args: { data: WorkflowTaskCreateInput }): Promise<{ id: string }>;
  };
};

export type AutomationRuleDatabaseClient = {
  $transaction?<T>(callback: (tx: AutomationSuggestionTransactionClient & AutomationRuleWriteTransactionClient) => Promise<T>): Promise<T>;
  automationRule: {
    findMany(args: {
      where: { organizationId: string; deletedAt: null };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<AutomationRuleRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string; deletedAt: null };
    }): Promise<AutomationRuleRecord | null>;
  };
  automationSuggestion: {
    findMany(args: {
      where: {
        organizationId: string;
        status?: AutomationSuggestionStatus | { in: AutomationSuggestionStatus[] };
        type?: string | { in: string[] };
        ruleId?: string;
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
      skip?: number;
      take?: number;
    }): Promise<AutomationSuggestionRecord[]>;
    count(args: {
      where: {
        organizationId: string;
        status?: AutomationSuggestionStatus | { in: AutomationSuggestionStatus[] };
        type?: string | { in: string[] };
        ruleId?: string;
      };
    }): Promise<number>;
    findUnique(args: { where: { id: string } }): Promise<AutomationSuggestionRecord | null>;
  };
  inventoryItem: {
    findMany(args: {
      where: { organizationId: string; isActive: true; id?: string };
      select: {
        id: true;
        minStock: true;
        stockSnapshots: {
          select: {
            quantity: true;
            storageLocation: { select: { name: true } };
          };
        };
      };
    }): Promise<InventoryItemRecord[]>;
  };
};

export type AutomationRuleWriteTransactionClient = {
  automationRule: {
    findFirst(args: {
      where: Record<string, unknown>;
    }): Promise<AutomationRuleRecord | null>;
    findUnique(args: {
      where: { id: string };
      select?: Record<string, true>;
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
    update(args: {
      where: { id: string; version: number };
      data: {
        enabled?: boolean;
        version?: { increment: number };
        ruleType?: string;
        name?: string;
        description?: string | null;
        condition?: unknown;
        action?: unknown;
        evaluateOn?: string;
        schedule?: string | null;
        metadata?: unknown;
        updatedAt?: Date;
      };
    }): Promise<AutomationRuleRecord>;
  };
};

const stockBelowThresholdConditionSchema = z.object({
  type: z.literal("stock_below_threshold"),
  itemId: z.string().trim().min(1).optional(),
  threshold: z.union([z.literal("minStock"), z.number()]),
  location: z.string().trim().min(1).default("all")
});

export type AutomationRuleServicePort = {
  listRules(input: { actor: Actor }): Promise<AutomationRuleListItem[]>;
  dryRunRule(input: { actor: Actor; ruleId: string }): Promise<AutomationDryRunResult>;
};

export class AutomationRuleService implements AutomationRuleServicePort {
  private readonly db: AutomationRuleDatabaseClient;
  private readonly now: () => Date;

  public constructor(options: { db: AutomationRuleDatabaseClient; now?: () => Date }) {
    this.db = options.db;
    this.now = options.now ?? (() => new Date());
  }

  public async listRules(input: { actor: Actor }): Promise<AutomationRuleListItem[]> {
    const organizationId = requireOrganizationId(input.actor);

    const rules = await this.db.automationRule.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ createdAt: "desc" }]
    });

    return rules.map(toListItem);
  }

  public async dryRunRule(input: {
    actor: Actor;
    ruleId: string;
  }): Promise<AutomationDryRunResult> {
    const organizationId = requireOrganizationId(input.actor);

    const rule = await this.db.automationRule.findFirst({
      where: { id: input.ruleId, organizationId, deletedAt: null }
    });

    if (!rule) {
      throw new AutomationRuleError("automation rule not found", 404);
    }

    const evaluatedAt = this.now().toISOString();
    const parsedCondition = stockBelowThresholdConditionSchema.safeParse(rule.condition);

    if (!parsedCondition.success) {
      return {
        ruleId: rule.id,
        ruleVersion: rule.version,
        enabled: rule.enabled,
        evaluable: false,
        reason: "condition type is not supported by the dry-run evaluator",
        wouldTrigger: false,
        matchedItemIds: [],
        evaluatedItemCount: 0,
        conditionSnapshot: rule.condition,
        evaluatedAt
      };
    }

    const condition = parsedCondition.data;
    const items = await this.db.inventoryItem.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(condition.itemId ? { id: condition.itemId } : {})
      },
      select: {
        id: true,
        minStock: true,
        stockSnapshots: {
          select: {
            quantity: true,
            storageLocation: { select: { name: true } }
          }
        }
      }
    });

    const locationFilter = condition.location.toLowerCase();
    const matchedItemIds: string[] = [];

    for (const item of items) {
      const threshold =
        condition.threshold === "minStock" ? item.minStock : condition.threshold;

      if (threshold === null || threshold === undefined) {
        continue;
      }

      const relevantSnapshots =
        locationFilter === "all"
          ? item.stockSnapshots
          : item.stockSnapshots.filter(
              (snapshot) =>
                snapshot.storageLocation?.name.toLowerCase() === locationFilter
            );

      if (relevantSnapshots.some((snapshot) => snapshot.quantity < threshold)) {
        matchedItemIds.push(item.id);
      }
    }

    return {
      ruleId: rule.id,
      ruleVersion: rule.version,
      enabled: rule.enabled,
      evaluable: true,
      wouldTrigger: matchedItemIds.length > 0,
      matchedItemIds,
      evaluatedItemCount: items.length,
      conditionSnapshot: rule.condition,
      evaluatedAt
    };
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new AutomationRuleError("actor has no active organization", 403);
  }

  return actor.organizationId;
}

function toListItem(rule: AutomationRuleRecord): AutomationRuleListItem {
  return {
    id: rule.id,
    version: rule.version,
    enabled: rule.enabled,
    ruleType: rule.ruleType,
    name: rule.name,
    description: rule.description,
    condition: rule.condition,
    action: rule.action,
    evaluateOn: rule.evaluateOn,
    schedule: rule.schedule,
    metadata: rule.metadata,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString()
  };
}
