import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  AutomationSuggestionService,
  type AutomationSuggestionError
} from "../src/modules/automation/automation-suggestion.service.js";
import type {
  AutomationDecisionRecord,
  AutomationRuleDatabaseClient,
  AutomationRuleWriteTransactionClient,
  AutomationSuggestionRecord,
  AutomationSuggestionTransactionClient
} from "../src/modules/automation/automation-rule.service.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";
const otherOrganizationId = "org-other";

type TestRouteRole = "admin" | "shift_lead" | "staff" | "viewer" | "owner";

function authHeaders(userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${createTestToken(userId)}`
  };
}

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 60 * 60 }))
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", testJwtSecret).update(body).digest();
  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function organizationRoleForUser(
  userId: string
): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("viewer-")) return "viewer";
  return null;
}

type SuggestionFixture = AutomationSuggestionRecord;
type DecisionFixture = AutomationDecisionRecord;
type RuleFixture = {
  id: string;
  organizationId: string;
  action: unknown;
  name: string;
};

type TaskFixture = { id: string; type: string; title: string };

type FakeDbOptions = {
  suggestions: SuggestionFixture[];
  decisions?: DecisionFixture[];
  rules?: RuleFixture[];
  tasks?: TaskFixture[];
};

function buildSuggestion(overrides: Partial<SuggestionFixture> = {}): SuggestionFixture {
  return {
    id: "sug-1",
    organizationId: testOrganizationId,
    ruleId: "rule-1",
    ruleVersion: 1,
    status: "open",
    type: "refill",
    title: "Refill Vodka",
    detail: "Vodka below min stock",
    relatedItemIds: ["item-vodka"],
    createdAt: new Date("2026-06-08T10:00:00.000Z"),
    expiresAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    automaticActionOnApproval: null,
    ...overrides
  };
}

function buildRule(overrides: Partial<RuleFixture> = {}): RuleFixture {
  return {
    id: "rule-1",
    organizationId: testOrganizationId,
    name: "Low Stock Alert",
    action: { type: "create_suggestion", suggestedTaskType: "refill" },
    ...overrides
  };
}

function buildDecision(overrides: Partial<DecisionFixture> = {}): DecisionFixture {
  return {
    id: "dec-1",
    suggestionId: "sug-1",
    status: "approved",
    actor: "admin-1",
    actorRole: "admin",
    timestamp: new Date("2026-06-08T10:05:00.000Z"),
    reason: null,
    notes: null,
    metadata: null,
    ...overrides
  };
}

function createFakeDb(options: FakeDbOptions): AutomationRuleDatabaseClient {
  const state = {
    suggestions: options.suggestions.map((s) => ({ ...s })),
    decisions: (options.decisions ?? []).map((d) => ({ ...d })),
    rules: (options.rules ?? []).map((r) => ({ ...r })),
    tasks: (options.tasks ?? []).map((t) => ({ ...t }))
  };

  const tx: AutomationSuggestionTransactionClient = {
    automationSuggestion: {
      async findUnique(args) {
        return state.suggestions.find((s) => s.id === args.where.id) ?? null;
      },
      async update(args) {
        const idx = state.suggestions.findIndex((s) => s.id === args.where.id);
        if (idx === -1) {
          throw new Error(`suggestion ${args.where.id} not found`);
        }
        state.suggestions[idx] = { ...state.suggestions[idx], ...args.data };
        return state.suggestions[idx];
      }
    },
    automationDecision: {
      async findFirst(args) {
        const target = state.suggestions.find((s) => s.id === args.where.suggestionId);
        if (!target) {
          return null;
        }
        return (
          state.decisions.find((d) => {
            if (d.suggestionId !== target.id) {
              return false;
            }
            if (!d.metadata || typeof d.metadata !== "object") {
              return false;
            }
            const metadata = d.metadata as Record<string, unknown>;
            const filterPath = args.where.metadata.path;
            const filterEquals = args.where.metadata.equals;
            const valueAtPath = filterPath.reduce<unknown>((acc, segment) => {
              if (acc && typeof acc === "object") {
                return (acc as Record<string, unknown>)[segment];
              }
              return undefined;
            }, metadata);
            return valueAtPath === filterEquals;
          }) ?? null
        );
      },
      async create(args) {
        const created: DecisionFixture = {
          id: `dec-${state.decisions.length + 1}`,
          suggestionId: args.data.suggestionId,
          status: args.data.status,
          actor: args.data.actor,
          actorRole: args.data.actorRole,
          timestamp: args.data.timestamp,
          reason: args.data.reason ?? null,
          notes: args.data.notes ?? null,
          metadata: args.data.metadata ?? null
        };
        state.decisions.push(created);
        return created;
      }
    },
    automationRule: {
      async findUnique(args) {
        const rule = state.rules.find((r) => r.id === args.where.id);
        if (!rule) {
          return null;
        }
        return {
          organizationId: rule.organizationId,
          action: rule.action,
          id: rule.id,
          name: rule.name
        };
      }
    },
    workflowTask: {
      async create(args) {
        const created: TaskFixture = {
          id: `task-${state.tasks.length + 1}`,
          type: args.data.type,
          title: args.data.title
        };
        state.tasks.push(created);
        return { id: created.id };
      }
    }
  };

  // The transaction client IS the same object as the top-level client. The
  // suggestion service does `this.db as unknown as Tx` after asserting
  // `$transaction` is defined, so the db surface must include the tx surface.
  const db = {
    ...tx,
    automationSuggestion: {
      ...tx.automationSuggestion,
      async findMany(args: {
        where: {
          organizationId: string;
          status?: string | { in: string[] };
          type?: string | { in: string[] };
          ruleId?: string;
        };
        orderBy?: Array<Record<string, "asc" | "desc">>;
        skip?: number;
        take?: number;
      }) {
        const where = args.where;
        const matches = state.suggestions
          .filter((s) => s.organizationId === where.organizationId)
          .filter((s) => (where.ruleId ? s.ruleId === where.ruleId : true))
          .filter((s) => {
            if (!where.status) return true;
            if (typeof where.status === "string") return s.status === where.status;
            if ("in" in where.status) return where.status.in.includes(s.status);
            return true;
          })
          .filter((s) => {
            if (!where.type) return true;
            if (typeof where.type === "string") return s.type === where.type;
            if ("in" in where.type) return where.type.in.includes(s.type);
            return true;
          });
        const orderBy = args.orderBy ?? [];
        matches.sort((a, b) => {
          for (const clause of orderBy) {
            const key = Object.keys(clause)[0]!;
            const direction = clause[key];
            if (key === "createdAt") {
              const cmp = a.createdAt.getTime() - b.createdAt.getTime();
              if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
            }
          }
          return 0;
        });
        const start = args.skip ?? 0;
        const end = start + (args.take ?? matches.length);
        return matches.slice(start, end);
      },
      async count(args: {
        where: {
          organizationId: string;
          status?: string | { in: string[] };
          type?: string | { in: string[] };
          ruleId?: string;
        };
      }) {
        const where = args.where;
        return state.suggestions
          .filter((s) => s.organizationId === where.organizationId)
          .filter((s) => (where.ruleId ? s.ruleId === where.ruleId : true))
          .filter((s) => {
            if (!where.status) return true;
            if (typeof where.status === "string") return s.status === where.status;
            if ("in" in where.status) return where.status.in.includes(s.status);
            return true;
          })
          .filter((s) => {
            if (!where.type) return true;
            if (typeof where.type === "string") return s.type === where.type;
            if ("in" in where.type) return where.type.in.includes(s.type);
            return true;
          }).length;
      }
    }
  } as unknown as AutomationRuleDatabaseClient;

  return {
    ...db,
    $transaction: async <T>(
      callback: (
        transaction: AutomationSuggestionTransactionClient & AutomationRuleWriteTransactionClient
      ) => Promise<T>
    ) => callback(tx as AutomationSuggestionTransactionClient & AutomationRuleWriteTransactionClient)
  };
}

function buildTestApp(input: {
  suggestions?: SuggestionFixture[];
  decisions?: DecisionFixture[];
  rules?: RuleFixture[];
  tasks?: TaskFixture[];
  debug?: boolean;
}) {
  const db = createFakeDb({
    suggestions: input.suggestions ?? [],
    decisions: input.decisions,
    rules: input.rules,
    tasks: input.tasks
  });

  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    logger: input.debug
      ? { level: "error" }
      : false,
    automation: {
      automationRuleService: {
        async listRules() {
          return [];
        },
        async dryRunRule() {
          throw new Error("not used in this test");
        }
      },
      automationSuggestionService: new AutomationSuggestionService({
        db,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }),
      automationRuleWriteService: {
        async createRule() {
          throw new Error("automationRuleWriteService.createRule is not wired in this test");
        },
        async updateRule() {
          throw new Error("automationRuleWriteService.updateRule is not wired in this test");
        }
      },
      auth: {
        jwtSecret: testJwtSecret,
        db: {
          organizationMember: {
            async findMany(args: { where: { userId: string } }) {
              const role = organizationRoleForUser(args.where.userId);
              if (!role) {
                return [];
              }
              return [
                {
                  organizationId: testOrganizationId,
                  role,
                  createdAt: new Date("2026-05-30T10:00:00.000Z")
                }
              ];
            }
          }
        } as never
      }
    } as never
  });
}

describe("automation suggestion API routes", () => {
  describe("POST /admin/automation/suggestions/:id/approve", () => {
    it("approves an open suggestion for a manager and creates one workflow task", async () => {
      const app = buildTestApp({
        suggestions: [buildSuggestion()],
        rules: [buildRule()]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/suggestions/sug-1/approve",
          headers: authHeaders("shift-1"),
          payload: { reason: "stock confirmed" }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          suggestion: { id: string; status: string; approvedBy: string };
          decision: { status: string; actorRole: string; reason: string };
          workflowTask: { id: string; type: string } | null;
        };
        expect(body.suggestion.id).toBe("sug-1");
        expect(body.suggestion.status).toBe("approved");
        expect(body.suggestion.approvedBy).toBe("shift-1");
        expect(body.decision.status).toBe("approved");
        expect(body.decision.actorRole).toBe("shift_lead");
        expect(body.decision.reason).toBe("stock confirmed");
        expect(body.workflowTask).not.toBeNull();
        expect(body.workflowTask?.type).toBe("automation.refill_task");
      } finally {
        await app.close();
      }
    });

    it("returns 409 when the suggestion is already decided", async () => {
      const app = buildTestApp({
        suggestions: [buildSuggestion({ status: "approved", approvedBy: "admin-1" })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/suggestions/sug-1/approve",
          headers: authHeaders("admin-1"),
          payload: { reason: "trying again" }
        });

        expect(response.statusCode).toBe(409);
        const body = response.json() as { error: string; message: string };
        expect(body.error).toBe("Conflict");
        expect(body.message).toContain("approved");
      } finally {
        await app.close();
      }
    });

    it("rejects a non-manager staff user with 403", async () => {
      const app = buildTestApp({
        suggestions: [buildSuggestion()]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/suggestions/sug-1/approve",
          headers: authHeaders("staff-1"),
          payload: { reason: "should not reach service" }
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });
  });

  describe("POST /admin/automation/suggestions/:id/reject", () => {
    it("returns 422 when the reason is empty", async () => {
      const app = buildTestApp({
        suggestions: [buildSuggestion()]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/suggestions/sug-1/reject",
          headers: authHeaders("admin-1"),
          payload: { reason: "   " }
        });

        expect(response.statusCode).toBe(422);
        const body = response.json() as { error: string; message: string };
        expect(body.error).toBe("Unprocessable Entity");
        expect(body.message).toBe("body validation failed");
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/automation/suggestions", () => {
    it("lists open suggestions for the actor's organization with default pagination", async () => {
      const app = buildTestApp({
        suggestions: [
          buildSuggestion({ id: "sug-1" }),
          buildSuggestion({ id: "sug-2", status: "approved" }),
          buildSuggestion({ id: "sug-3", organizationId: otherOrganizationId })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          suggestions: Array<{ id: string; status: string }>;
          total: number;
          limit: number;
          offset: number;
        };
        expect(body.suggestions.map((s) => s.id)).toEqual(["sug-1"]);
        expect(body.suggestions.map((s) => s.status)).toEqual(["open"]);
        expect(body.total).toBe(1);
        expect(body.limit).toBe(25);
        expect(body.offset).toBe(0);
      } finally {
        await app.close();
      }
    });

    it("filters by status, type, and ruleId via query string", async () => {
      const app = buildTestApp({
        suggestions: [
          buildSuggestion({ id: "sug-r-1", type: "refill" }),
          buildSuggestion({ id: "sug-r-2", type: "refill", status: "approved" }),
          buildSuggestion({ id: "sug-a-1", type: "consumption_anomaly" }),
          buildSuggestion({ id: "sug-x-1", ruleId: "rule-other" })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions?status=open&type=refill&ruleId=rule-1",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { suggestions: Array<{ id: string }>; total: number };
        expect(body.suggestions.map((s) => s.id)).toEqual(["sug-r-1"]);
        expect(body.total).toBe(1);
      } finally {
        await app.close();
      }
    });

    it("returns 400 on a malformed query", async () => {
      const app = buildTestApp({ suggestions: [buildSuggestion()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions?status=not-a-status",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(400);
        const body = response.json() as { error: string };
        expect(body.error).toBe("Bad Request");
      } finally {
        await app.close();
      }
    });

    it("rejects a viewer with 403 (read gate is staff+)", async () => {
      const app = buildTestApp({ suggestions: [buildSuggestion()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions",
          headers: authHeaders("viewer-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/automation/suggestions/:id", () => {
    it("returns the suggestion when it belongs to the actor's organization", async () => {
      const app = buildTestApp({ suggestions: [buildSuggestion()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions/sug-1",
          headers: authHeaders("shift-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { suggestion: { id: string; status: string } };
        expect(body.suggestion.id).toBe("sug-1");
        expect(body.suggestion.status).toBe("open");
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a suggestion in a foreign organization", async () => {
      const app = buildTestApp({
        suggestions: [buildSuggestion({ organizationId: otherOrganizationId })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/suggestions/sug-1",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });
});

describe("AutomationSuggestionService error semantics", () => {
  it("exposes 404 for cross-org suggestions without leaking the org id", async () => {
    const service = new AutomationSuggestionService({
      db: createFakeDb({
        suggestions: [buildSuggestion({ organizationId: otherOrganizationId })]
      }),
      now: () => new Date("2026-06-08T12:00:00.000Z")
    });

    let caught: AutomationSuggestionError | null = null;
    try {
      await service.approve({
        actor: { userId: "admin-1", role: "admin", organizationId: testOrganizationId },
        suggestionId: "sug-1",
        body: { reason: "x" }
      });
    } catch (error) {
      caught = error as AutomationSuggestionError;
    }

    expect(caught).not.toBeNull();
    expect(caught?.statusCode).toBe(404);
  });
});
