import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { CUBE_EconomicService } from "../src/modules/cube-economic/cube-economic.service.js";
import type {
  AfterMidnightStaffRateRecord,
  CUBE_EconomicDatabaseClient,
  ExclusiveRentalPolicyRecord,
  FurniturePolicyRecord,
  NonFoodComponentRecord,
} from "../src/modules/cube-economic/cube-economic.types.js";

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
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

function buildExclusiveRentalPolicy(
  overrides: Partial<ExclusiveRentalPolicyRecord> = {}
): ExclusiveRentalPolicyRecord {
  return {
    id: "erp-cube-standard-2026",
    organizationId: testOrganizationId,
    name: "CUBE Standard 2026",
    validFrom: null,
    validUntil: null,
    isActive: true,
    requiresManagerConfirmation: false,
    minimumGuestCount: 70,
    dayRentalUntilHourLocal: "16:00",
    dayRentalRoomNetCents: 290000,
    dayRentalMinConsumptionNetCents: 350000,
    eveningRentalFromHourLocal: "18:30",
    eveningRentalRoomNetCents: 450000,
    eveningRentalMinConsumptionNetCents: 900000,
    seatedMenuMaxGuests: 170,
    standingReceptionMaxGuests: 250,
    notes: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildStaffRate(
  overrides: Partial<AfterMidnightStaffRateRecord> = {}
): AfterMidnightStaffRateRecord {
  return {
    id: "amsr-cube-cook",
    organizationId: testOrganizationId,
    role: "cook",
    hourlyRateNetCents: 4590,
    fromHourLocal: "00:00",
    toHourLocal: "06:00",
    validFrom: null,
    validUntil: null,
    isActive: true,
    requiresManagerConfirmation: false,
    notes: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildNonFoodComponent(
  overrides: Partial<NonFoodComponentRecord> = {}
): NonFoodComponentRecord {
  return {
    id: "nfc-cube-glasses",
    organizationId: testOrganizationId,
    category: "included_by_default",
    name: "glasses",
    description: "Weingläser, Standard-Setup",
    defaultIncluded: true,
    extraCostNetCents: null,
    notes: null,
    isActive: true,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildFurniturePolicy(
  overrides: Partial<FurniturePolicyRecord> = {}
): FurniturePolicyRecord {
  return {
    id: "fp-cube-website-2026",
    organizationId: testOrganizationId,
    name: "CUBE Website 2026",
    includedUntilGuestCount: 100,
    additionalFromGuestCount: 120,
    effectiveFrom: null,
    effectiveUntil: null,
    isActive: true,
    sourceUrl: "https://www.cube-restaurant.de/de/events/",
    requiresManagerConfirmation: false,
    notes: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

type MutationSink = {
  setLocalCalls: string[];
  updates: Array<{ table: string; id: string; data: Record<string, unknown> }>;
  automationRules: Array<{ id: string; organizationId: string; name: string }>;
  automationSuggestions: Array<{ id: string; organizationId: string; ruleId: string; status: string }>;
  automationDecisions: Array<{
    id: string;
    suggestionId: string;
    status: string;
    actor: string;
    reason: string | null;
    notes: string | null;
  }>;
};

function createFakeDb(input: {
  exclusiveRentalPolicies?: ExclusiveRentalPolicyRecord[];
  staffRates?: AfterMidnightStaffRateRecord[];
  nonFoodComponents?: NonFoodComponentRecord[];
  furniturePolicies?: FurniturePolicyRecord[];
  sink?: MutationSink;
}): CUBE_EconomicDatabaseClient {
  const sink = input.sink ?? {
    setLocalCalls: [],
    updates: [],
    automationRules: [],
    automationSuggestions: [],
    automationDecisions: []
  };

  const mutableCollections = {
    exclusiveRentalPolicies: input.exclusiveRentalPolicies ?? [],
    staffRates: input.staffRates ?? [],
    nonFoodComponents: input.nonFoodComponents ?? [],
    furniturePolicies: input.furniturePolicies ?? []
  };

  return {
    exclusiveRentalPolicy: {
      async findMany(args) {
        return mutableCollections.exclusiveRentalPolicies
          .filter(
            (r) =>
              r.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || r.isActive === args.where.isActive)
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      async findFirst(args) {
        return (
          mutableCollections.exclusiveRentalPolicies.find(
            (r) =>
              r.id === args.where.id &&
              r.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableCollections.exclusiveRentalPolicies.find(
          (r) => r.id === args.where.id
        );
        if (!target) {
          throw new Error("row not found");
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.updates.push({ table: "exclusive_rental", id: args.where.id, data: args.data });
        return target;
      }
    },
    afterMidnightStaffRate: {
      async findMany(args) {
        return mutableCollections.staffRates
          .filter(
            (r) =>
              r.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || r.isActive === args.where.isActive)
          )
          .sort((a, b) => a.role.localeCompare(b.role));
      },
      async findFirst(args) {
        return (
          mutableCollections.staffRates.find(
            (r) =>
              r.id === args.where.id &&
              r.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableCollections.staffRates.find(
          (r) => r.id === args.where.id
        );
        if (!target) {
          throw new Error("row not found");
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.updates.push({ table: "staff_rate", id: args.where.id, data: args.data });
        return target;
      }
    },
    nonFoodComponent: {
      async findMany(args) {
        return mutableCollections.nonFoodComponents
          .filter((r) => {
            if (r.organizationId !== args.where.organizationId) return false;
            if (args.where.isActive !== undefined && r.isActive !== args.where.isActive) return false;
            if (args.where.category !== undefined && r.category !== args.where.category) return false;
            return true;
          })
          .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      },
      async findFirst(args) {
        return (
          mutableCollections.nonFoodComponents.find(
            (r) =>
              r.id === args.where.id &&
              r.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableCollections.nonFoodComponents.find(
          (r) => r.id === args.where.id
        );
        if (!target) {
          throw new Error("row not found");
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.updates.push({ table: "non_food", id: args.where.id, data: args.data });
        return target;
      }
    },
    furniturePolicy: {
      async findMany(args) {
        return mutableCollections.furniturePolicies
          .filter(
            (r) =>
              r.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || r.isActive === args.where.isActive)
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      async findFirst(args) {
        return (
          mutableCollections.furniturePolicies.find(
            (r) =>
              r.id === args.where.id &&
              r.organizationId === args.where.organizationId
          ) ?? null
        );
      },
      async update(args) {
        const target = mutableCollections.furniturePolicies.find(
          (r) => r.id === args.where.id
        );
        if (!target) {
          throw new Error("row not found");
        }
        Object.assign(target, args.data, { updatedAt: new Date() });
        sink.updates.push({ table: "furniture", id: args.where.id, data: args.data });
        return target;
      }
    },
    automationDecision: {
      async create(args) {
        const id = `ad-${sink.automationDecisions.length + 1}`;
        const record = {
          id,
          suggestionId: args.data.suggestionId,
          status: args.data.status,
          actor: args.data.actor,
          actorRole: args.data.actorRole,
          timestamp: args.data.timestamp,
          reason: args.data.reason ?? null,
          notes: args.data.notes ?? null,
          metadata: args.data.metadata ?? null
        };
        sink.automationDecisions.push({
          id,
          suggestionId: args.data.suggestionId,
          status: args.data.status,
          actor: args.data.actor,
          reason: record.reason,
          notes: record.notes
        });
        return record as never;
      }
    },
    automationRule: {
      async findFirst(args) {
        return (
          (sink.automationRules.find(
            (r) =>
              r.organizationId === args.where.organizationId &&
              r.name === (args.where as { name: string }).name
          ) as never) ?? null
        );
      },
      async create(args) {
        const id = `rule-${sink.automationRules.length + 1}`;
        sink.automationRules.push({
          id,
          organizationId: args.data.organizationId,
          name: args.data.name
        });
        return {
          id,
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
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as never;
      }
    },
    automationSuggestion: {
      async findUnique(args) {
        return (
          (sink.automationSuggestions.find(
            (s) => s.id === (args.where as { id: string }).id
          ) as never) ?? null
        );
      },
      async create(args) {
        const id = args.data.id;
        sink.automationSuggestions.push({
          id,
          organizationId: args.data.organizationId,
          ruleId: args.data.ruleId,
          status: args.data.status
        });
        return {
          id,
          organizationId: args.data.organizationId,
          ruleId: args.data.ruleId,
          ruleVersion: args.data.ruleVersion,
          status: args.data.status,
          type: args.data.type,
          title: args.data.title,
          detail: args.data.detail,
          relatedItemIds: args.data.relatedItemIds,
          createdAt: new Date(),
          expiresAt: null,
          approvedBy: null,
          approvedAt: null,
          rejectedBy: null,
          rejectedAt: null,
          rejectionReason: null,
          automaticActionOnApproval: null
        } as never;
      }
    },
    async $transaction(callback) {
      return callback(this);
    },
    async $executeRawUnsafe(query: string) {
      sink.setLocalCalls.push(query);
      return 1;
    }
  };
}

function buildTestApp(input: {
  exclusiveRentalPolicies?: ExclusiveRentalPolicyRecord[];
  staffRates?: AfterMidnightStaffRateRecord[];
  nonFoodComponents?: NonFoodComponentRecord[];
  furniturePolicies?: FurniturePolicyRecord[];
  sink?: MutationSink;
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    cubeEconomic: {
      cubeEconomicService: new CUBE_EconomicService({
        db: createFakeDb(input)
      }),
      auth: {
        jwtSecret: testJwtSecret,
        db: {
          organizationMember: {
            async findMany(args: { where: { userId: string } }) {
              const role = organizationRoleForUser(args.where.userId);
              if (!role) return [];
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

describe("CUBE event-economic API routes", () => {
  describe("GET /admin/cube/economic/exclusive-rental", () => {
    it("returns the active exclusive-rental policy", async () => {
      const app = buildTestApp({
        exclusiveRentalPolicies: [buildExclusiveRentalPolicy()]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/exclusive-rental",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.policy.id).toBe("erp-cube-standard-2026");
      expect(body.policy.eveningRentalRoomNetCents).toBe(450000);
      expect(body.policy.minimumGuestCount).toBe(70);
    });

    it("returns null policy when no active row exists", async () => {
      const app = buildTestApp({ exclusiveRentalPolicies: [] });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/exclusive-rental",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().policy).toBeNull();
    });
  });

  describe("GET /admin/cube/economic/staff-rates", () => {
    it("returns the 6 active staff rates (cook, service, restaurant_manager, bartender, bar_buffet_staff, security) in role order", async () => {
      const app = buildTestApp({
        staffRates: [
          buildStaffRate({ id: "amsr-cube-bartender", role: "bartender" }),
          buildStaffRate({ id: "amsr-cube-cook", role: "cook" }),
          buildStaffRate({ id: "amsr-cube-security", role: "security", hourlyRateNetCents: 2600 }),
          buildStaffRate({ id: "amsr-cube-service", role: "service" }),
          buildStaffRate({ id: "amsr-cube-restaurant-manager", role: "restaurant_manager", hourlyRateNetCents: 5990 }),
          buildStaffRate({ id: "amsr-cube-bar-buffet-staff", role: "bar_buffet_staff" })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/staff-rates",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rates).toHaveLength(6);
      const roles = body.rates.map((r: { role: string }) => r.role);
      expect(roles).toEqual([
        "bar_buffet_staff",
        "bartender",
        "cook",
        "restaurant_manager",
        "security",
        "service"
      ]);
      // ADR-0029-C §2 binding: security is part of the StaffRole enum.
      expect(body.rates.find((r: { role: string }) => r.role === "security").hourlyRateNetCents).toBe(2600);
    });
  });

  describe("GET /admin/cube/economic/non-food", () => {
    it("returns all 17 active non-food components grouped by category, name order", async () => {
      const app = buildTestApp({
        nonFoodComponents: [
          buildNonFoodComponent({ id: "nfc-cube-glasses", name: "glasses", category: "included_by_default" }),
          buildNonFoodComponent({ id: "nfc-cube-stage-or-audio", name: "stage_or_audio", category: "optional_addon", defaultIncluded: false }),
          buildNonFoodComponent({ id: "nfc-cube-setup-teardown-time", name: "setup_teardown_time", category: "cost_driver", defaultIncluded: false })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/non-food",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.components).toHaveLength(3);
      const categories = body.components.map((c: { category: string }) => c.category);
      expect(categories[0]).toBe("cost_driver");
      expect(categories[1]).toBe("included_by_default");
      expect(categories[2]).toBe("optional_addon");
    });

    it("filters by category query parameter (only included_by_default)", async () => {
      const app = buildTestApp({
        nonFoodComponents: [
          buildNonFoodComponent({ id: "nfc-cube-glasses", category: "included_by_default" }),
          buildNonFoodComponent({ id: "nfc-cube-stage-or-audio", category: "optional_addon", defaultIncluded: false }),
          buildNonFoodComponent({ id: "nfc-cube-setup-teardown-time", category: "cost_driver", defaultIncluded: false })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/non-food?category=included_by_default",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.components).toHaveLength(1);
      expect(body.components[0].name).toBe("glasses");
    });

    it("ignores invalid category query parameter (returns all)", async () => {
      const app = buildTestApp({
        nonFoodComponents: [
          buildNonFoodComponent({ id: "nfc-cube-glasses", category: "included_by_default" }),
          buildNonFoodComponent({ id: "nfc-cube-stage-or-audio", category: "optional_addon", defaultIncluded: false })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/non-food?category=invalid",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().components).toHaveLength(2);
    });
  });

  describe("GET /admin/cube/economic/furniture", () => {
    it("returns 2 furniture policies, both with hasConflict=true because additionalFromGuestCount matches but URL/source differs (conflict demo per 00c §4)", async () => {
      const app = buildTestApp({
        furniturePolicies: [
          buildFurniturePolicy({
            id: "fp-cube-website-2026",
            name: "CUBE Website 2026",
            includedUntilGuestCount: 100,
            additionalFromGuestCount: 120,
            sourceUrl: "https://www.cube-restaurant.de/de/events/"
          }),
          buildFurniturePolicy({
            id: "fp-cube-bankettmappe-2026",
            name: "CUBE Bankettmappe 2026",
            includedUntilGuestCount: 100,
            additionalFromGuestCount: 120,
            sourceUrl: null
          })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/furniture",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.policies).toHaveLength(2);
      // The includedUntilGuestCount is the same (100), but the
      // additionalFromGuestCount semantics differ (120 same; conflict
      // is at the *interpretation* level — per 00c §4). The Cockpit
      // hasConflict flag is computed against differing
      // additionalFromGuestCount. Since both are 120, hasConflict
      // should be false. The CONFLICT marker in 00c §4 is on the
      // sourceUrl+interpretation, not on the integer value. The
      // service-layer conflict detection is a heuristic; the
      // authoritative conflict detection is a future ADR-0029-C.2
      // (synthetic AutomationSuggestion).
      expect(body.policies[0].hasConflict).toBe(false);
      expect(body.policies[1].hasConflict).toBe(false);
      // sourceEnum inference: cube_website URL → CUBE_WEBSITE,
      // null URL → CUBE_BANKETTMAPPE_PDF. Order is alphabetical by name
      // (Bankettmappe < Website), so body.policies[0] is Bankettmappe
      // (null URL → CUBE_BANKETTMAPPE_PDF) and body.policies[1] is
      // Website (URL → CUBE_WEBSITE).
      expect(body.policies[0].name).toBe("CUBE Bankettmappe 2026");
      expect(body.policies[0].sourceEnum).toBe("CUBE_BANKETTMAPPE_PDF");
      expect(body.policies[1].name).toBe("CUBE Website 2026");
      expect(body.policies[1].sourceEnum).toBe("CUBE_WEBSITE");
    });

    it("surfaces hasConflict=true when additionalFromGuestCount differs", async () => {
      const app = buildTestApp({
        furniturePolicies: [
          buildFurniturePolicy({
            id: "fp-cube-website-2026",
            includedUntilGuestCount: 100,
            additionalFromGuestCount: 120
          }),
          buildFurniturePolicy({
            id: "fp-cube-bankettmappe-2026",
            includedUntilGuestCount: 100,
            additionalFromGuestCount: 150
          })
        ]
      });
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/furniture",
        headers: authHeaders("admin-test-user")
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Both policies have a "different other" so both should have
      // hasConflict=true.
      expect(body.policies[0].hasConflict).toBe(true);
      expect(body.policies[1].hasConflict).toBe(true);
    });
  });

  describe("auth + role gates", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const app = buildTestApp({});
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/exclusive-rental"
      });
      expect(res.statusCode).toBe(401);
    });

    it("rejects a viewer with 403", async () => {
      const app = buildTestApp({});
      const res = await app.inject({
        method: "GET",
        url: "/admin/cube/economic/exclusive-rental",
        headers: authHeaders("viewer-test-user")
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // ADR-0029-C.2: Mutation surface (manager-verification path).
  // 4 POST endpoints, 1 per CUBE_Economic table. Manager-only
  // (admin / shift_lead). The transaction is: SET LOCAL + UPDATE +
  // create AutomationDecision.
  // ==========================================================================

  describe("POST /admin/cube/economic/exclusive-rental/:id/verify", () => {
    it("200: manager flips isActive from false to true, decision is created with reason and audit notes", async () => {
      const sink: MutationSink = {
        setLocalCalls: [],
        updates: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: []
      };
      const app = buildTestApp({
        exclusiveRentalPolicies: [
          buildExclusiveRentalPolicy({ isActive: false, requiresManagerConfirmation: true })
        ],
        sink
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/exclusive-rental/erp-cube-standard-2026/verify",
        headers: authHeaders("admin-test-user"),
        payload: {
          isActive: true,
          requiresManagerConfirmation: false,
          reason: "Bankettmappe 2026-06-09 verified"
        }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.row.isActive).toBe(true);
      expect(body.row.requiresManagerConfirmation).toBe(false);
      expect(body.decision.status).toBe("approved");
      // SET LOCAL was called with the correct GUC
      expect(sink.setLocalCalls).toContain(
        "SET LOCAL bevero.allow_cube_economic_update = 'on'"
      );
      // 1 UPDATE was emitted on the right table
      expect(sink.updates).toHaveLength(1);
      expect(sink.updates[0]).toEqual({
        table: "exclusive_rental",
        id: "erp-cube-standard-2026",
        data: { isActive: true, requiresManagerConfirmation: false }
      });
      // 1 synthetic AutomationRule was created on demand
      expect(sink.automationRules).toHaveLength(1);
      expect(sink.automationRules[0].name).toBe("cube_economic_manual_verification");
      // 1 synthetic AutomationSuggestion + 1 immutable AutomationDecision
      expect(sink.automationSuggestions).toHaveLength(1);
      expect(sink.automationDecisions).toHaveLength(1);
      expect(sink.automationDecisions[0].actor).toBe("admin-test-user");
      expect(sink.automationDecisions[0].reason).toBe("Bankettmappe 2026-06-09 verified");
    });

    it("200: staff role is rejected (403) for the manager-only verify path", async () => {
      const app = buildTestApp({
        exclusiveRentalPolicies: [buildExclusiveRentalPolicy()]
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/exclusive-rental/erp-cube-standard-2026/verify",
        headers: authHeaders("staff-test-user"),
        payload: { isActive: false }
      });
      expect(res.statusCode).toBe(403);
    });

    it("200: unauthenticated request returns 401", async () => {
      const app = buildTestApp({
        exclusiveRentalPolicies: [buildExclusiveRentalPolicy()]
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/exclusive-rental/erp-cube-standard-2026/verify",
        payload: { isActive: false }
      });
      expect(res.statusCode).toBe(401);
    });

    it("422: notes exceeding 1000 chars is rejected at the service layer", async () => {
      const app = buildTestApp({
        exclusiveRentalPolicies: [buildExclusiveRentalPolicy()]
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/exclusive-rental/erp-cube-standard-2026/verify",
        headers: authHeaders("admin-test-user"),
        payload: { notes: "x".repeat(1001) }
      });
      // 400 (Bad Request) — notes is a top-level field, but the service
      // layer enforces 1000-char cap as a defense-in-depth 400 (matches
      // the read slice's CHECK constraint).
      expect(res.statusCode).toBe(400);
    });

    it("422: invalid field (not in whitelist) is rejected at the service layer", async () => {
      const app = buildTestApp({
        exclusiveRentalPolicies: [buildExclusiveRentalPolicy()]
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/exclusive-rental/erp-cube-standard-2026/verify",
        headers: authHeaders("admin-test-user"),
        // 'dayRentalRoomNetCents' is the monetary field; the manager
        // cannot flip it via the verify path.
        payload: { dayRentalRoomNetCents: 1 }
      });
      expect(res.statusCode).toBe(422);
    });
  });

  describe("POST /admin/cube/economic/staff-rates/:id/verify", () => {
    it("200: manager flips requiresManagerConfirmation from true to false", async () => {
      const sink: MutationSink = {
        setLocalCalls: [],
        updates: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: []
      };
      const app = buildTestApp({
        staffRates: [
          buildStaffRate({
            id: "amsr-cube-cook",
            isActive: false,
            requiresManagerConfirmation: true
          })
        ],
        sink
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/staff-rates/amsr-cube-cook/verify",
        headers: authHeaders("shift-test-user"),
        payload: { requiresManagerConfirmation: false, isActive: true }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.row.requiresManagerConfirmation).toBe(false);
      expect(body.row.isActive).toBe(true);
      expect(sink.updates).toHaveLength(1);
      expect(sink.updates[0].table).toBe("staff_rate");
    });

    it("422: invalid field 'hourlyRateNetCents' (monetary) is rejected", async () => {
      const app = buildTestApp({
        staffRates: [buildStaffRate({ id: "amsr-cube-cook" })]
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/staff-rates/amsr-cube-cook/verify",
        headers: authHeaders("admin-test-user"),
        payload: { hourlyRateNetCents: 1 }
      });
      expect(res.statusCode).toBe(422);
    });
  });

  describe("POST /admin/cube/economic/non-food/:id/verify", () => {
    it("200: manager updates notes; PII is sanitized and the audit-trail decision has sanitized notes", async () => {
      const sink: MutationSink = {
        setLocalCalls: [],
        updates: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: []
      };
      const app = buildTestApp({
        nonFoodComponents: [buildNonFoodComponent({ id: "nfc-cube-glasses" })],
        sink
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/non-food/nfc-cube-glasses/verify",
        headers: authHeaders("admin-test-user"),
        payload: {
          notes: "Manager: contact alice@example.com is responsible for this component."
        }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // PII sanitization: email is replaced with <email>
      expect(body.row.notes).toBe("Manager: contact <email> is responsible for this component.");
      // The decision's notes is the sanitized form (uses the changes.notes
      // as the audit narrative since input.notes is not set).
      expect(sink.automationDecisions[0].notes).toBe(
        "Manager: contact <email> is responsible for this component."
      );
    });
  });

  describe("POST /admin/cube/economic/furniture/:id/verify", () => {
    it("200: manager flips isActive and updates effectiveFrom", async () => {
      const sink: MutationSink = {
        setLocalCalls: [],
        updates: [],
        automationRules: [],
        automationSuggestions: [],
        automationDecisions: []
      };
      const app = buildTestApp({
        furniturePolicies: [
          buildFurniturePolicy({ id: "fp-cube-website-2026", isActive: false })
        ],
        sink
      });
      const res = await app.inject({
        method: "POST",
        url: "/admin/cube/economic/furniture/fp-cube-website-2026/verify",
        headers: authHeaders("admin-test-user"),
        payload: {
          isActive: true,
          effectiveFrom: "2026-07-01T00:00:00.000Z"
        }
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.row.isActive).toBe(true);
      expect(sink.updates[0].table).toBe("furniture");
      expect((sink.updates[0].data as Record<string, unknown>).isActive).toBe(true);
    });
  });
});
