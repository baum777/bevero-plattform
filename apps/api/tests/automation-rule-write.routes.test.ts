import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  AutomationRuleWriteError,
  AutomationRuleWriteService
} from "../src/modules/automation/automation-rule-write.service.js";
import type {
  AutomationRuleDatabaseClient,
  AutomationRuleRecord,
  AutomationRuleWriteTransactionClient,
  AutomationSuggestionTransactionClient
} from "../src/modules/automation/automation-rule.service.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";
const otherOrganizationId = "org-other";

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

type RuleFixture = AutomationRuleRecord;

function buildRule(overrides: Partial<RuleFixture> = {}): RuleFixture {
  return {
    id: "rule-1",
    organizationId: testOrganizationId,
    version: 1,
    enabled: true,
    ruleType: "threshold",
    name: "Low Stock Alert",
    description: null,
    condition: { type: "stock_below_threshold", threshold: "minStock", location: "all" },
    action: { type: "create_suggestion", suggestionType: "refill" },
    evaluateOn: "schedule",
    schedule: "0 5 * * *",
    metadata: null,
    createdBy: "admin-1",
    createdAt: new Date("2026-06-08T09:00:00.000Z"),
    updatedAt: new Date("2026-06-08T09:00:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

type FakeDbOptions = {
  rules?: RuleFixture[];
};

function createFakeDb(options: FakeDbOptions = {}): AutomationRuleDatabaseClient {
  const state = {
    rules: (options.rules ?? []).map((r) => ({ ...r }))
  };

  const tx: AutomationSuggestionTransactionClient & AutomationRuleWriteTransactionClient = {
    automationSuggestion: {
      async findUnique() {
        return null;
      },
      async update() {
        throw new Error("not used in this test");
      }
    },
    automationDecision: {
      async findFirst() {
        return null;
      },
      async create() {
        throw new Error("not used in this test");
      }
    },
    automationRule: {
      async findUnique() {
        return null;
      },
      async findFirst(args) {
        const where = (args.where ?? {}) as {
          id?: string;
          organizationId?: string;
          name?: string;
          deletedAt?: null;
          NOT?: { id?: string };
        };
        return (
          state.rules.find((rule) => {
            if (where.id && rule.id !== where.id) return false;
            if (where.organizationId && rule.organizationId !== where.organizationId) return false;
            if (where.deletedAt === null && rule.deletedAt !== null) return false;
            if (where.name && rule.name !== where.name) return false;
            if (where.NOT?.id && rule.id === where.NOT.id) return false;
            return true;
          }) ?? null
        );
      },
      async create(args) {
        const created: RuleFixture = {
          id: `rule-${state.rules.length + 1}`,
          organizationId: args.data.organizationId,
          version: args.data.version ?? 1,
          enabled: args.data.enabled ?? true,
          ruleType: args.data.ruleType,
          name: args.data.name,
          description: args.data.description ?? null,
          condition: args.data.condition,
          action: args.data.action,
          evaluateOn: args.data.evaluateOn,
          schedule: args.data.schedule ?? null,
          metadata: args.data.metadata ?? null,
          createdBy: args.data.createdBy ?? null,
          createdAt: new Date("2026-06-08T09:30:00.000Z"),
          updatedAt: new Date("2026-06-08T09:30:00.000Z"),
          deletedAt: null
        };
        state.rules.push(created);
        return created;
      },
      async update(args) {
        const idx = state.rules.findIndex(
          (rule) => rule.id === args.where.id && rule.version === args.where.version
        );
        if (idx === -1) {
          const error = new Error("Record not found") as Error & { code?: string };
          error.code = "P2025";
          throw error;
        }
        const current = state.rules[idx];
        const nextVersion =
          typeof args.data.version === "object" && args.data.version && "increment" in args.data.version
            ? current.version + (args.data.version.increment ?? 0)
            : current.version;
        const updated: RuleFixture = {
          ...current,
          ...Object.fromEntries(
            Object.entries(args.data).filter(([, value]) => typeof value !== "object" || value === null)
          ),
          condition: args.data.condition ?? current.condition,
          action: args.data.action ?? current.action,
          schedule: args.data.schedule ?? current.schedule,
          metadata: args.data.metadata ?? current.metadata,
          version: nextVersion,
          updatedAt: args.data.updatedAt ?? new Date("2026-06-08T10:00:00.000Z")
        };
        state.rules[idx] = updated;
        return updated;
      }
    },
    workflowTask: {
      async create() {
        throw new Error("not used in this test");
      }
    }
  };

  const db = tx as unknown as AutomationRuleDatabaseClient;
  return {
    ...db,
    $transaction: async <T>(
      callback: (
        transaction: AutomationSuggestionTransactionClient & AutomationRuleWriteTransactionClient
      ) => Promise<T>
    ) => callback(tx)
  };
}

function buildTestApp(input: { rules?: RuleFixture[] }) {
  const db = createFakeDb({ rules: input.rules });

  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    automation: {
      automationRuleService: {
        async listRules() {
          return [];
        },
        async dryRunRule() {
          throw new Error("not used in this test");
        }
      },
      automationSuggestionService: {
        async listSuggestions() {
          throw new Error("not used in this test");
        },
        async getSuggestion() {
          throw new Error("not used in this test");
        },
        async approve() {
          throw new Error("not used in this test");
        },
        async reject() {
          throw new Error("not used in this test");
        }
      },
      automationRuleWriteService: new AutomationRuleWriteService({
        db,
        now: () => new Date("2026-06-08T10:00:00.000Z")
      }),
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

describe("automation rule write API routes", () => {
  describe("POST /admin/automation/rules", () => {
    it("creates a rule for an admin and returns 201 with the persisted record", async () => {
      const app = buildTestApp({ rules: [] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules",
          headers: authHeaders("admin-1"),
          payload: {
            name: "Bar Refill Reminder",
            description: "Trigger a refill task when bar items are low",
            ruleType: "threshold",
            condition: {
              type: "stock_below_threshold",
              threshold: "minStock",
              location: "bar"
            },
            action: {
              type: "create_suggestion",
              suggestionType: "refill"
            },
            evaluateOn: "schedule",
            schedule: "0 5 * * *"
          }
        });

        expect(response.statusCode).toBe(201);
        const body = response.json() as {
          rule: { id: string; name: string; version: number; enabled: boolean; createdBy: string };
        };
        expect(body.rule.id).toMatch(/^rule-/);
        expect(body.rule.name).toBe("Bar Refill Reminder");
        expect(body.rule.version).toBe(1);
        expect(body.rule.enabled).toBe(true);
        expect(body.rule.createdBy).toBe("admin-1");
      } finally {
        await app.close();
      }
    });

    it("rejects a non-admin staff user with 403", async () => {
      const app = buildTestApp({ rules: [] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules",
          headers: authHeaders("staff-1"),
          payload: {
            name: "Should Not Persist",
            ruleType: "threshold",
            condition: { type: "stock_below_threshold", threshold: "minStock" },
            action: { type: "create_suggestion", suggestionType: "refill" },
            evaluateOn: "schedule"
          }
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 409 when an active rule with the same name already exists", async () => {
      const app = buildTestApp({
        rules: [buildRule({ name: "Bar Refill Reminder" })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules",
          headers: authHeaders("admin-1"),
          payload: {
            name: "Bar Refill Reminder",
            ruleType: "threshold",
            condition: { type: "stock_below_threshold", threshold: "minStock" },
            action: { type: "create_suggestion", suggestionType: "refill" },
            evaluateOn: "schedule"
          }
        });

        expect(response.statusCode).toBe(409);
        const body = response.json() as { error: string; message: string };
        expect(body.error).toBe("Conflict");
        expect(body.message).toContain("already exists");
      } finally {
        await app.close();
      }
    });

    it("returns 400 when the body fails Zod validation", async () => {
      const app = buildTestApp({ rules: [] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules",
          headers: authHeaders("admin-1"),
          payload: {
            name: "",
            ruleType: "invalid-type",
            condition: { type: "unknown" },
            action: { type: "create_suggestion" },
            evaluateOn: "schedule"
          }
        });

        expect(response.statusCode).toBe(400);
        const body = response.json() as { error: string; message: string };
        expect(body.error).toBe("Bad Request");
        expect(body.message).toBe("body validation failed");
      } finally {
        await app.close();
      }
    });
  });

  describe("PATCH /admin/automation/rules/:id", () => {
    it("bumps the version on a successful update", async () => {
      const app = buildTestApp({ rules: [buildRule({ id: "rule-1", version: 1 })] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "PATCH",
          url: "/admin/automation/rules/rule-1",
          headers: authHeaders("admin-1"),
          payload: { enabled: false, expectedVersion: 1 }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { rule: { id: string; version: number; enabled: boolean } };
        expect(body.rule.id).toBe("rule-1");
        expect(body.rule.version).toBe(2);
        expect(body.rule.enabled).toBe(false);
      } finally {
        await app.close();
      }
    });
  });
});

describe("AutomationRuleWriteService error semantics", () => {
  it("exposes 404 for cross-org rules without leaking the org id", async () => {
    const service = new AutomationRuleWriteService({
      db: createFakeDb({ rules: [buildRule({ organizationId: otherOrganizationId })] }),
      now: () => new Date("2026-06-08T10:00:00.000Z")
    });

    let caught: AutomationRuleWriteError | null = null;
    try {
      await service.updateRule({
        actor: { userId: "admin-1", role: "admin", organizationId: testOrganizationId },
        ruleId: "rule-1",
        body: { enabled: false, expectedVersion: 1 }
      });
    } catch (error) {
      caught = error as AutomationRuleWriteError;
    }

    expect(caught).not.toBeNull();
    expect(caught?.statusCode).toBe(404);
  });
});
