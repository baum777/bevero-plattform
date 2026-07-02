import { z } from "zod";

import type { Actor } from "../auth/actor.js";
import {
  type AutomationDecisionRecord,
  type AutomationRuleDatabaseClient,
  type AutomationSuggestionRecord,
  type AutomationSuggestionStatus,
  type AutomationSuggestionTransactionClient
} from "./automation-rule.service.js";

export class AutomationSuggestionError extends Error {
  public readonly statusCode: 403 | 404 | 409 | 422;

  public constructor(message: string, statusCode: 403 | 404 | 409 | 422) {
    super(message);
    this.name = "AutomationSuggestionError";
    this.statusCode = statusCode;
  }
}

export const approveSuggestionBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(2000).optional(),
    notes: z.string().trim().max(2000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

export const rejectSuggestionBodySchema = z
  .object({
    reason: z.string().trim().min(1, "reason is required").max(2000),
    notes: z.string().trim().max(2000).optional(),
    clientRequestId: z.string().trim().min(1).max(128).optional()
  })
  .strict();

export type ApproveSuggestionInput = z.infer<typeof approveSuggestionBodySchema>;
export type RejectSuggestionInput = z.infer<typeof rejectSuggestionBodySchema>;

export type AutomationSuggestionDecisionDto = {
  id: string;
  suggestionId: string;
  status: "approved" | "rejected";
  actor: string;
  actorRole: string;
  timestamp: string;
  reason: string | null;
  notes: string | null;
};

export type AutomationSuggestionWorkflowTaskDto = {
  id: string;
  type: string;
  title: string;
};

export type ApproveSuggestionResult = {
  suggestion: AutomationSuggestionRecord;
  decision: AutomationSuggestionDecisionDto;
  workflowTask: AutomationSuggestionWorkflowTaskDto | null;
};

export type RejectSuggestionResult = {
  suggestion: AutomationSuggestionRecord;
  decision: AutomationSuggestionDecisionDto;
};

export const AUTOMATION_SUGGESTION_STATUSES = [
  "open",
  "approved",
  "rejected",
  "expired"
] as const;

export const AUTOMATION_SUGGESTION_TYPES = [
  "refill",
  "receipt_alert",
  "consumption_anomaly",
  "alert_consolidation",
  "custom"
] as const;

export const listAutomationSuggestionsQuerySchema = z
  .object({
    status: z
      .union([
        z.enum(AUTOMATION_SUGGESTION_STATUSES),
        z.array(z.enum(AUTOMATION_SUGGESTION_STATUSES)).min(1).max(4)
      ])
      .optional()
      .default("open"),
    type: z
      .union([
        z.enum(AUTOMATION_SUGGESTION_TYPES),
        z.array(z.enum(AUTOMATION_SUGGESTION_TYPES)).min(1).max(5)
      ])
      .optional(),
    ruleId: z.string().trim().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(10_000).default(0)
  })
  .strict();

export type ListAutomationSuggestionsQuery = z.infer<typeof listAutomationSuggestionsQuerySchema>;

export type AutomationSuggestionListItem = {
  id: string;
  ruleId: string;
  ruleVersion: number;
  status: AutomationSuggestionStatus;
  type: string;
  title: string;
  detail: string;
  relatedItemIds: string[];
  createdAt: string;
  expiresAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
};

export type ListAutomationSuggestionsResult = {
  suggestions: AutomationSuggestionListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AutomationSuggestionServicePort = {
  listSuggestions(input: {
    actor: Actor;
    query: ListAutomationSuggestionsQuery;
  }): Promise<ListAutomationSuggestionsResult>;
  getSuggestion(input: {
    actor: Actor;
    suggestionId: string;
  }): Promise<AutomationSuggestionRecord>;
  approve(input: {
    actor: Actor;
    suggestionId: string;
    body: ApproveSuggestionInput;
  }): Promise<ApproveSuggestionResult>;
  reject(input: {
    actor: Actor;
    suggestionId: string;
    body: RejectSuggestionInput;
  }): Promise<RejectSuggestionResult>;
};

const AUTOMATION_DECISION_SUGGESTION_TYPE_TO_TASK_TYPE: Record<string, string> = {
  refill: "automation.refill_task",
  receipt_alert: "automation.receipt_alert",
  consumption_anomaly: "automation.consumption_anomaly",
  alert_consolidation: "automation.alert_consolidation",
  custom: "automation.custom"
};

type ActionShape = {
  type?: string;
  suggestedTaskType?: string;
  assignRole?: string;
  titleTemplate?: string;
  detailTemplate?: string;
};

export class AutomationSuggestionService implements AutomationSuggestionServicePort {
  private readonly db: AutomationRuleDatabaseClient;
  private readonly now: () => Date;

  public constructor(options: { db: AutomationRuleDatabaseClient; now?: () => Date }) {
    this.db = options.db;
    this.now = options.now ?? (() => new Date());
  }

  public async listSuggestions(input: {
    actor: Actor;
    query: ListAutomationSuggestionsQuery;
  }): Promise<ListAutomationSuggestionsResult> {
    const organizationId = requireOrganizationId(input.actor);
    const query = input.query;
    const statusFilter = buildStatusFilter(query.status);
    const typeFilter = buildTypeFilter(query.type);

    const where = {
      organizationId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(query.ruleId ? { ruleId: query.ruleId } : {})
    };

    const [rows, total] = await Promise.all([
      this.db.automationSuggestion.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: query.offset,
        take: query.limit
      }),
      this.db.automationSuggestion.count({ where })
    ]);

    return {
      suggestions: rows.map(toListItem),
      total,
      limit: query.limit,
      offset: query.offset
    };
  }

  public async getSuggestion(input: {
    actor: Actor;
    suggestionId: string;
  }): Promise<AutomationSuggestionRecord> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.suggestionId.trim();

    if (!trimmedId) {
      throw new AutomationSuggestionError("suggestion id is required", 422);
    }

    const suggestion = await this.db.automationSuggestion.findUnique({ where: { id: trimmedId } });

    if (!suggestion || suggestion.organizationId !== organizationId) {
      throw new AutomationSuggestionError("automation suggestion not found", 404);
    }

    return suggestion;
  }

  public async approve(input: {
    actor: Actor;
    suggestionId: string;
    body: ApproveSuggestionInput;
  }): Promise<ApproveSuggestionResult> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.suggestionId.trim();

    if (!trimmedId) {
      throw new AutomationSuggestionError("suggestion id is required", 422);
    }

    return this.runTransactionalDecision({
      actor: input.actor,
      organizationId,
      suggestionId: trimmedId,
      status: "approved",
      body: input.body
    }).then((result) => ({
      suggestion: result.suggestion,
      decision: result.decision,
      workflowTask: result.workflowTask
    }));
  }

  public async reject(input: {
    actor: Actor;
    suggestionId: string;
    body: RejectSuggestionInput;
  }): Promise<RejectSuggestionResult> {
    const organizationId = requireOrganizationId(input.actor);
    const trimmedId = input.suggestionId.trim();

    if (!trimmedId) {
      throw new AutomationSuggestionError("suggestion id is required", 422);
    }

    const result = await this.runTransactionalDecision({
      actor: input.actor,
      organizationId,
      suggestionId: trimmedId,
      status: "rejected",
      body: input.body
    });

    return {
      suggestion: result.suggestion,
      decision: result.decision
    };
  }

  private async runTransactionalDecision(input: {
    actor: Actor;
    organizationId: string;
    suggestionId: string;
    status: "approved" | "rejected";
    body: { reason?: string; notes?: string; clientRequestId?: string };
  }): Promise<{
    suggestion: AutomationSuggestionRecord;
    decision: AutomationSuggestionDecisionDto;
    workflowTask: AutomationSuggestionWorkflowTaskDto | null;
  }> {
    const tx = this.requireTransaction();
    const occurredAt = this.now();

    const existing = await this.lockAndLoadSuggestion(tx, input.suggestionId, input.organizationId);

    if (input.body.clientRequestId) {
      const prior = await tx.automationDecision.findFirst({
        where: {
          suggestionId: existing.id,
          metadata: { path: ["clientRequestId"], equals: input.body.clientRequestId }
        }
      });

      if (prior) {
        if (prior.status !== input.status) {
          throw new AutomationSuggestionError(
            "clientRequestId was already used for a different decision",
            422
          );
        }
        if (normalize(prior.reason) !== normalize(input.body.reason ?? null)) {
          throw new AutomationSuggestionError(
            "clientRequestId was already used with a different reason",
            422
          );
        }
        return {
          suggestion: existing,
          decision: toDecisionDto(prior),
          workflowTask: null
        };
      }
    }

    const decision = await tx.automationDecision.create({
      data: {
        suggestionId: existing.id,
        status: input.status,
        actor: input.actor.userId,
        actorRole: input.actor.role,
        timestamp: occurredAt,
        reason: input.body.reason ?? null,
        notes: input.body.notes ?? null,
        metadata: input.body.clientRequestId
          ? { clientRequestId: input.body.clientRequestId }
          : undefined
      }
    });

    const updatedSuggestion = await tx.automationSuggestion.update({
      where: { id: existing.id },
      data:
        input.status === "approved"
          ? {
              status: "approved",
              approvedBy: input.actor.userId,
              approvedAt: occurredAt,
              rejectedBy: null,
              rejectedAt: null,
              rejectionReason: null
            }
          : {
              status: "rejected",
              rejectedBy: input.actor.userId,
              rejectedAt: occurredAt,
              rejectionReason: input.body.reason ?? null,
              approvedBy: null,
              approvedAt: null
            }
    });

    let workflowTask: AutomationSuggestionWorkflowTaskDto | null = null;
    if (input.status === "approved") {
      workflowTask = await this.maybeCreateWorkflowTask(tx, updatedSuggestion, occurredAt);
    }

    return {
      suggestion: updatedSuggestion,
      decision: toDecisionDto(decision),
      workflowTask
    };
  }

  private async lockAndLoadSuggestion(
    tx: AutomationSuggestionTransactionClient,
    suggestionId: string,
    organizationId: string
  ): Promise<AutomationSuggestionRecord> {
    const suggestion = await tx.automationSuggestion.findUnique({ where: { id: suggestionId } });

    if (!suggestion) {
      throw new AutomationSuggestionError("automation suggestion not found", 404);
    }

    if (suggestion.organizationId !== organizationId) {
      throw new AutomationSuggestionError("automation suggestion not found", 404);
    }

    if (suggestion.status !== "open") {
      throw new AutomationSuggestionError(
        `automation suggestion is already ${suggestion.status}`,
        409
      );
    }

    return suggestion;
  }

  private async maybeCreateWorkflowTask(
    tx: AutomationSuggestionTransactionClient,
    suggestion: AutomationSuggestionRecord,
    occurredAt: Date
  ): Promise<AutomationSuggestionWorkflowTaskDto | null> {
    const rule = await tx.automationRule.findUnique({
      where: { id: suggestion.ruleId },
      select: { organizationId: true, action: true, id: true, name: true }
    });

    if (!rule) {
      return null;
    }

    if (rule.organizationId !== suggestion.organizationId) {
      return null;
    }

    const action = parseAction(rule.action);
    if (!action || !action.suggestedTaskType) {
      return null;
    }

    const taskType =
      AUTOMATION_DECISION_SUGGESTION_TYPE_TO_TASK_TYPE[suggestion.type] ?? "automation.custom";

    const created = await tx.workflowTask.create({
      data: {
        type: taskType,
        status: "open",
        severity: "warning",
        title: suggestion.title,
        description: suggestion.detail
      }
    });

    return {
      id: created.id,
      type: taskType,
      title: suggestion.title
    };
  }

  private requireTransaction(): AutomationSuggestionTransactionClient {
    if (!this.db.$transaction) {
      throw new Error(
        "database client does not support $transaction; cannot run automation decision"
      );
    }

    return this.db as unknown as AutomationSuggestionTransactionClient;
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new AutomationSuggestionError("actor has no active organization", 403);
  }

  return actor.organizationId;
}

function toDecisionDto(decision: AutomationDecisionRecord): AutomationSuggestionDecisionDto {
  return {
    id: decision.id,
    suggestionId: decision.suggestionId,
    status: decision.status,
    actor: decision.actor,
    actorRole: decision.actorRole,
    timestamp: decision.timestamp.toISOString(),
    reason: decision.reason,
    notes: decision.notes
  };
}

function parseAction(value: unknown): ActionShape | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  return {
    type: typeof candidate.type === "string" ? candidate.type : undefined,
    suggestedTaskType:
      typeof candidate.suggestedTaskType === "string" ? candidate.suggestedTaskType : undefined,
    assignRole: typeof candidate.assignRole === "string" ? candidate.assignRole : undefined,
    titleTemplate:
      typeof candidate.titleTemplate === "string" ? candidate.titleTemplate : undefined,
    detailTemplate:
      typeof candidate.detailTemplate === "string" ? candidate.detailTemplate : undefined
  };
}

function normalize(value: string | null): string {
  return value === null ? "" : value.trim();
}

function toListItem(suggestion: AutomationSuggestionRecord): AutomationSuggestionListItem {
  return {
    id: suggestion.id,
    ruleId: suggestion.ruleId,
    ruleVersion: suggestion.ruleVersion,
    status: suggestion.status,
    type: suggestion.type,
    title: suggestion.title,
    detail: suggestion.detail,
    relatedItemIds: suggestion.relatedItemIds,
    createdAt: suggestion.createdAt.toISOString(),
    expiresAt: suggestion.expiresAt ? suggestion.expiresAt.toISOString() : null,
    approvedBy: suggestion.approvedBy,
    approvedAt: suggestion.approvedAt ? suggestion.approvedAt.toISOString() : null,
    rejectedBy: suggestion.rejectedBy,
    rejectedAt: suggestion.rejectedAt ? suggestion.rejectedAt.toISOString() : null,
    rejectionReason: suggestion.rejectionReason
  };
}

function buildStatusFilter(
  status: ListAutomationSuggestionsQuery["status"]
): AutomationSuggestionStatus | { in: AutomationSuggestionStatus[] } | undefined {
  if (status === undefined) {
    return undefined;
  }
  if (Array.isArray(status)) {
    return { in: [...status] };
  }
  return status;
}

function buildTypeFilter(
  type: ListAutomationSuggestionsQuery["type"]
): string | { in: string[] } | undefined {
  if (type === undefined) {
    return undefined;
  }
  if (Array.isArray(type)) {
    return { in: [...type] };
  }
  return type;
}
