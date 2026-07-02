import { z } from "zod";

import type { Actor } from "../auth/actor.js";
import {
  type AutomationRuleDatabaseClient,
  type AutomationRuleRecord,
  type AutomationRuleWriteTransactionClient
} from "./automation-rule.service.js";

const idString = z.string().trim().min(1).max(64);

const automationRuleTypes = ["threshold", "time", "event", "anomaly"] as const;
const automationRuleEvaluationModes = ["write", "schedule", "both"] as const;

const stockBelowThresholdConditionSchema = z
  .object({
    type: z.literal("stock_below_threshold"),
    itemId: z.string().trim().min(1).optional(),
    threshold: z.union([z.literal("minStock"), z.number().nonnegative()]),
    location: z.string().trim().min(1).default("all")
  })
  .strict();

const conditionSchema = stockBelowThresholdConditionSchema;

const createSuggestionActionSchema = z
  .object({
    type: z.literal("create_suggestion"),
    suggestionType: z.enum([
      "refill",
      "receipt_alert",
      "consumption_anomaly",
      "alert_consolidation",
      "custom"
    ]),
    suggestedTaskType: z.string().trim().min(1).max(64).optional(),
    assignRole: z.enum(["staff", "manager", "admin", "owner"]).optional(),
    titleTemplate: z.string().trim().min(1).max(200).optional(),
    detailTemplate: z.string().trim().min(1).max(2000).optional()
  })
  .strict();

const actionSchema = createSuggestionActionSchema;

const cronPattern = /^[0-9*,\-/]+(\s+[0-9*,\-/]+){4,6}$/;

export const createAutomationRuleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    enabled: z.boolean().default(true),
    ruleType: z.enum(automationRuleTypes),
    condition: conditionSchema,
    action: actionSchema,
    evaluateOn: z.enum(automationRuleEvaluationModes),
    schedule: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .refine((value) => value === null || value === undefined || cronPattern.test(value), {
        message: "schedule must be a 5- or 6-field cron expression"
      }),
    metadata: z.unknown().optional()
  })
  .strict();

export const updateAutomationRuleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    enabled: z.boolean().optional(),
    ruleType: z.enum(automationRuleTypes).optional(),
    condition: conditionSchema.optional(),
    action: actionSchema.optional(),
    evaluateOn: z.enum(automationRuleEvaluationModes).optional(),
    schedule: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .refine((value) => value === null || value === undefined || cronPattern.test(value), {
        message: "schedule must be a 5- or 6-field cron expression"
      }),
    metadata: z.unknown().optional(),
    expectedVersion: z.number().int().positive()
  })
  .strict()
  .refine(
    (value) => {
      const mutableKeys = [
        "name",
        "description",
        "enabled",
        "ruleType",
        "condition",
        "action",
        "evaluateOn",
        "schedule",
        "metadata"
      ] as const;
      return mutableKeys.some((key) => value[key] !== undefined);
    },
    { message: "at least one mutable field is required" }
  );

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleBodySchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleBodySchema>;

export class AutomationRuleWriteError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 409 | 422) {
    super(message);
    this.name = "AutomationRuleWriteError";
    this.statusCode = statusCode;
  }
}

export type AutomationRuleWriteServicePort = {
  createRule(input: { actor: Actor; body: CreateAutomationRuleInput }): Promise<AutomationRuleRecord>;
  updateRule(input: {
    actor: Actor;
    ruleId: string;
    body: UpdateAutomationRuleInput;
  }): Promise<AutomationRuleRecord>;
};

export class AutomationRuleWriteService implements AutomationRuleWriteServicePort {
  private readonly db: AutomationRuleDatabaseClient;
  private readonly now: () => Date;

  public constructor(options: { db: AutomationRuleDatabaseClient; now?: () => Date }) {
    this.db = options.db;
    this.now = options.now ?? (() => new Date());
  }

  public async createRule(input: {
    actor: Actor;
    body: CreateAutomationRuleInput;
  }): Promise<AutomationRuleRecord> {
    const organizationId = requireOrganizationId(input.actor);
    const tx = this.requireTransaction();

    const duplicate = await tx.automationRule.findFirst({
      where: {
        organizationId,
        name: input.body.name,
        deletedAt: null
      }
    });

    if (duplicate) {
      throw new AutomationRuleWriteError(
        "automation rule with this name already exists in the organization",
        409
      );
    }

    const created = await tx.automationRule.create({
      data: {
        organizationId,
        enabled: input.body.enabled,
        version: 1,
        ruleType: input.body.ruleType,
        name: input.body.name,
        description: input.body.description ?? null,
        condition: input.body.condition,
        action: input.body.action,
        evaluateOn: input.body.evaluateOn,
        schedule: input.body.schedule ?? null,
        metadata: input.body.metadata ?? null,
        createdBy: input.actor.userId
      }
    });

    return created;
  }

  public async updateRule(input: {
    actor: Actor;
    ruleId: string;
    body: UpdateAutomationRuleInput;
  }): Promise<AutomationRuleRecord> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.ruleId.trim();
    if (!trimmedId) {
      throw new AutomationRuleWriteError("rule id is required", 422);
    }
    const tx = this.requireTransaction();
    const now = this.now();

    const existing = await tx.automationRule.findFirst({
      where: {
        id: trimmedId,
        organizationId,
        deletedAt: null
      }
    });

    if (!existing) {
      throw new AutomationRuleWriteError("automation rule not found", 404);
    }

    if (existing.version !== input.body.expectedVersion) {
      throw new AutomationRuleWriteError(
        "automation rule version is stale; reload before updating",
        409
      );
    }

    if (input.body.name && input.body.name !== existing.name) {
      const duplicate = await tx.automationRule.findFirst({
        where: {
          organizationId,
          name: input.body.name,
          deletedAt: null,
          NOT: { id: trimmedId }
        }
      });

      if (duplicate) {
        throw new AutomationRuleWriteError(
          "automation rule with this name already exists in the organization",
          409
        );
      }
    }

    try {
      const updated = await tx.automationRule.update({
        where: { id: trimmedId, version: input.body.expectedVersion },
        data: {
          name: input.body.name,
          description: input.body.description,
          enabled: input.body.enabled,
          ruleType: input.body.ruleType,
          condition: input.body.condition,
          action: input.body.action,
          evaluateOn: input.body.evaluateOn,
          schedule: input.body.schedule,
          metadata: input.body.metadata,
          version: { increment: 1 },
          updatedAt: now
        }
      });
      return updated;
    } catch (error) {
      if (isPrismaVersionConflict(error)) {
        throw new AutomationRuleWriteError(
          "automation rule version is stale; reload before updating",
          409
        );
      }
      throw error;
    }
  }

  private requireTransaction(): AutomationRuleWriteTransactionClient {
    if (!this.db.$transaction) {
      throw new Error(
        "database client does not support $transaction; cannot write automation rule"
      );
    }

    return this.db as unknown as AutomationRuleWriteTransactionClient;
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new AutomationRuleWriteError("actor has no active organization", 403);
  }

  return actor.organizationId;
}

function isPrismaVersionConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: string; meta?: { target?: string[] } };
  return candidate.code === "P2025";
}
