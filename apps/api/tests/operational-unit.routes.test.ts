import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { OperationalUnitService } from "../src/modules/operational-unit/operational-unit.service.js";
import type {
  GroupRuleRecord,
  OperationalUnitDatabaseClient,
  OperationalUnitRecord,
  ServiceSlotRecord
} from "../src/modules/operational-unit/operational-unit.types.js";

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

function buildOperationalUnit(
  overrides: Partial<OperationalUnitRecord> = {}
): OperationalUnitRecord {
  return {
    id: "ou-1",
    organizationId: testOrganizationId,
    locationId: "loc-cube",
    key: "restaurant-top-floor",
    name: "Restaurant top floor",
    unitType: "RESTAURANT",
    parentContext: null,
    requiresManualConfirmation: false,
    weatherSensitive: false,
    outdoorCapacityRelevant: false,
    inventoryScopes: ["kitchen", "bar"],
    dayparts: ["lunch", "dinner"],
    sortOrder: 10,
    isActive: true,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function buildServiceSlot(overrides: Partial<ServiceSlotRecord> = {}): ServiceSlotRecord {
  return {
    id: "ss-1",
    organizationId: testOrganizationId,
    operationalUnitId: "ou-1",
    slotKind: "lunch",
    name: "Mittagstisch",
    daysOfWeekMask: 124,
    startTimeLocal: "12:00",
    endTimeLocal: "14:30",
    kitchenTimeLocal: "14:00",
    inventoryImpact: ["kitchen"],
    sortOrder: 10,
    isActive: true,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function buildGroupRule(overrides: Partial<GroupRuleRecord> = {}): GroupRuleRecord {
  return {
    id: "gr-1",
    organizationId: testOrganizationId,
    operationalUnitId: "ou-1",
    alaCarteMaxGuests: 8,
    groupMenuRequiredFrom: 9,
    bankettInquiryFrom: 20,
    exclusiveRentalFrom: 60,
    seatedMenuMax: 80,
    standingReceptionMax: 120,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function createFakeDb(input: {
  units?: OperationalUnitRecord[];
  slots?: ServiceSlotRecord[];
  groupRules?: GroupRuleRecord[];
}): OperationalUnitDatabaseClient {
  return {
    operationalUnit: {
      async findMany(args) {
        return (input.units ?? [])
          .filter(
            (unit) =>
              unit.locationId === args.where.locationId &&
              unit.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || unit.isActive === args.where.isActive)
          )
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      },
      async findFirst(args) {
        return (
          (input.units ?? []).find(
            (unit) =>
              unit.id === args.where.id && unit.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    },
    serviceSlot: {
      async findMany(args) {
        return (input.slots ?? [])
          .filter(
            (slot) =>
              slot.operationalUnitId === args.where.operationalUnitId &&
              slot.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || slot.isActive === args.where.isActive)
          )
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      }
    },
    groupRule: {
      async findFirst(args) {
        return (
          (input.groupRules ?? []).find(
            (rule) =>
              rule.operationalUnitId === args.where.operationalUnitId &&
              rule.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    }
  };
}

function buildTestApp(input: {
  units?: OperationalUnitRecord[];
  slots?: ServiceSlotRecord[];
  groupRules?: GroupRuleRecord[];
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    operationalUnit: {
      operationalUnitService: new OperationalUnitService({
        db: createFakeDb(input)
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
    }
  });
}

describe("operational-unit API routes", () => {
  describe("GET /admin/operational-units/locations/:id/units", () => {
    it("returns the location's active units in sort order", async () => {
      const app = buildTestApp({
        units: [
          buildOperationalUnit({ id: "ou-events", name: "Exklusiv Events", unitType: "EVENT", sortOrder: 30 }),
          buildOperationalUnit({ id: "ou-restaurant", name: "Restaurant top floor", sortOrder: 10 }),
          buildOperationalUnit({
            id: "ou-terrasse",
            name: "o.T. Bar & Terrasse",
            unitType: "OUTDOOR_TERRACE",
            sortOrder: 20
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/locations/loc-cube/units",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { units: Array<{ id: string; unitType: string }> };
        expect(body.units.map((u) => u.id)).toEqual(["ou-restaurant", "ou-terrasse", "ou-events"]);
        expect(body.units[1]?.unitType).toBe("OUTDOOR_TERRACE");
      } finally {
        await app.close();
      }
    });

    it("excludes inactive units", async () => {
      const app = buildTestApp({
        units: [
          buildOperationalUnit({ id: "ou-active" }),
          buildOperationalUnit({ id: "ou-inactive", isActive: false })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/locations/loc-cube/units",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { units: Array<{ id: string }> };
        expect(body.units.map((u) => u.id)).toEqual(["ou-active"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/operational-units/:id", () => {
    it("returns the unit detail for an own-org actor", async () => {
      const app = buildTestApp({
        units: [
          buildOperationalUnit({
            id: "ou-terrasse",
            unitType: "OUTDOOR_TERRACE",
            weatherSensitive: true,
            outdoorCapacityRelevant: true,
            parentContext: "cube-stuttgart"
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-terrasse",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          unit: {
            id: string;
            unitType: string;
            weatherSensitive: boolean;
            organizationId: string;
            createdAt: string;
          };
        };
        expect(body.unit.id).toBe("ou-terrasse");
        expect(body.unit.unitType).toBe("OUTDOOR_TERRACE");
        expect(body.unit.weatherSensitive).toBe(true);
        expect(body.unit.organizationId).toBe(testOrganizationId);
        expect(body.unit.createdAt).toBe("2026-06-01T10:00:00.000Z");
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a cross-org unit", async () => {
      const app = buildTestApp({
        units: [buildOperationalUnit({ id: "ou-foreign", organizationId: otherOrganizationId })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-foreign",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/operational-units/:id/slots", () => {
    it("returns the unit's active slots in sort order", async () => {
      const app = buildTestApp({
        units: [buildOperationalUnit({ id: "ou-1" })],
        slots: [
          buildServiceSlot({ id: "ss-dinner", slotKind: "dinner", name: "Abendservice", sortOrder: 20 }),
          buildServiceSlot({ id: "ss-lunch", slotKind: "lunch", name: "Mittagstisch", sortOrder: 10 }),
          buildServiceSlot({ id: "ss-old", isActive: false, sortOrder: 5 })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-1/slots",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          slots: Array<{ id: string; daysOfWeekMask: number }>;
        };
        expect(body.slots.map((s) => s.id)).toEqual(["ss-lunch", "ss-dinner"]);
        expect(body.slots[0]?.daysOfWeekMask).toBe(124);
      } finally {
        await app.close();
      }
    });

    it("returns an empty list for an unknown unit", async () => {
      const app = buildTestApp({ units: [], slots: [] });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-missing/slots",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { slots: unknown[] };
        expect(body.slots).toEqual([]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/operational-units/:id/group-rule", () => {
    it("returns the unit's group rule", async () => {
      const app = buildTestApp({
        units: [buildOperationalUnit({ id: "ou-1" })],
        groupRules: [buildGroupRule({ id: "gr-1", operationalUnitId: "ou-1" })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-1/group-rule",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          groupRule: { id: string; alaCarteMaxGuests: number; bankettInquiryFrom: number };
        };
        expect(body.groupRule.id).toBe("gr-1");
        expect(body.groupRule.alaCarteMaxGuests).toBe(8);
        expect(body.groupRule.bankettInquiryFrom).toBe(20);
      } finally {
        await app.close();
      }
    });

    it("returns 404 when the unit exists but has no group rule", async () => {
      const app = buildTestApp({
        units: [buildOperationalUnit({ id: "ou-1" })],
        groupRules: []
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/ou-1/group-rule",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("auth + role gates", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/locations/loc-cube/units"
        });

        expect(response.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("rejects a viewer with 403", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/locations/loc-cube/units",
          headers: authHeaders("viewer-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 400 for a blank unit id in the URL", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/operational-units/%20",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(400);
      } finally {
        await app.close();
      }
    });
  });
});
