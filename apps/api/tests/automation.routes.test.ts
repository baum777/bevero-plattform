import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import {
  AutomationRuleService,
  type AutomationRuleDatabaseClient,
  type AutomationRuleRecord
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

type InventoryItemFixture = {
  id: string;
  organizationId: string;
  isActive: boolean;
  minStock: number | null;
  stockSnapshots: Array<{ quantity: number; storageLocation: { name: string } | null }>;
};

function buildRule(overrides: Partial<AutomationRuleRecord> = {}): AutomationRuleRecord {
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
    createdBy: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T11:00:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

function createFakeDb(input: {
  rules: AutomationRuleRecord[];
  items: InventoryItemFixture[];
}): AutomationRuleDatabaseClient {
  return {
    automationRule: {
      async findMany(args) {
        return input.rules
          .filter((rule) => rule.organizationId === args.where.organizationId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findFirst(args) {
        return (
          input.rules.find(
            (rule) =>
              rule.id === args.where.id &&
              rule.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    },
    automationSuggestion: {
      async findMany() {
        return [];
      },
      async count() {
        return 0;
      },
      async findUnique() {
        return null;
      }
    },
    inventoryItem: {
      async findMany(args) {
        return input.items
          .filter(
            (item) =>
              item.organizationId === args.where.organizationId &&
              item.isActive === args.where.isActive &&
              (args.where.id === undefined || item.id === args.where.id)
          )
          .map((item) => ({
            id: item.id,
            minStock: item.minStock,
            stockSnapshots: item.stockSnapshots
          }));
      }
    }
  };
}

function buildTestApp(input: {
  rules?: AutomationRuleRecord[];
  items?: InventoryItemFixture[];
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    automation: {
      automationRuleService: new AutomationRuleService({
        db: createFakeDb({ rules: input.rules ?? [], items: input.items ?? [] }),
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }),
      automationSuggestionService: {
        async listSuggestions() {
          throw new Error("automationSuggestionService.listSuggestions is not wired in this test");
        },
        async getSuggestion() {
          throw new Error("automationSuggestionService.getSuggestion is not wired in this test");
        },
        async approve() {
          throw new Error("automationSuggestionService.approve is not wired in this test");
        },
        async reject() {
          throw new Error("automationSuggestionService.reject is not wired in this test");
        }
      },
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
    }
  });
}

describe("automation API routes", () => {
  describe("GET /admin/automation/rules", () => {
    it("returns only the actor's organization rules for an admin", async () => {
      const app = buildTestApp({
        rules: [
          buildRule({ id: "rule-own", organizationId: testOrganizationId }),
          buildRule({ id: "rule-foreign", organizationId: otherOrganizationId })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/rules",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { rules: Array<{ id: string }> };
        expect(body.rules.map((rule) => rule.id)).toEqual(["rule-own"]);
      } finally {
        await app.close();
      }
    });

    it("rejects a non-admin staff user with 403", async () => {
      const app = buildTestApp({ rules: [buildRule()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/rules",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("rejects a viewer with 403", async () => {
      const app = buildTestApp({ rules: [buildRule()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/rules",
          headers: authHeaders("viewer-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("rejects an unauthenticated request with 401", async () => {
      const app = buildTestApp({ rules: [buildRule()] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/automation/rules"
        });

        expect(response.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });
  });

  describe("POST /admin/automation/rules/:id/dry-run", () => {
    it("reports wouldTrigger when stock is below threshold without mutating", async () => {
      const app = buildTestApp({
        rules: [buildRule({ id: "rule-1" })],
        items: [
          {
            id: "item-low",
            organizationId: testOrganizationId,
            isActive: true,
            minStock: 5,
            stockSnapshots: [{ quantity: 2, storageLocation: { name: "Bar" } }]
          },
          {
            id: "item-ok",
            organizationId: testOrganizationId,
            isActive: true,
            minStock: 5,
            stockSnapshots: [{ quantity: 9, storageLocation: { name: "Bar" } }]
          }
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules/rule-1/dry-run",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          evaluable: boolean;
          wouldTrigger: boolean;
          matchedItemIds: string[];
          evaluatedItemCount: number;
        };
        expect(body.evaluable).toBe(true);
        expect(body.wouldTrigger).toBe(true);
        expect(body.matchedItemIds).toEqual(["item-low"]);
        expect(body.evaluatedItemCount).toBe(2);
      } finally {
        await app.close();
      }
    });

    it("marks unsupported condition types as not evaluable", async () => {
      const app = buildTestApp({
        rules: [
          buildRule({
            id: "rule-time",
            condition: { type: "time_window", at: "00:05" }
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules/rule-time/dry-run",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { evaluable: boolean; wouldTrigger: boolean };
        expect(body.evaluable).toBe(false);
        expect(body.wouldTrigger).toBe(false);
      } finally {
        await app.close();
      }
    });

    it("rejects a non-admin staff user with 403", async () => {
      const app = buildTestApp({ rules: [buildRule({ id: "rule-1" })] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules/rule-1/dry-run",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a rule outside the actor's organization", async () => {
      const app = buildTestApp({
        rules: [buildRule({ id: "rule-foreign", organizationId: otherOrganizationId })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "POST",
          url: "/admin/automation/rules/rule-foreign/dry-run",
          headers: authHeaders("admin-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });
});
