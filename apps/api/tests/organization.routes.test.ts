import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { OrganizationService } from "../src/modules/organization/organization.service.js";
import type {
  BusinessUnitRecord,
  EventConceptRecord,
  ExternalCatalogEntryRecord,
  OrganizationDatabaseClient,
  OrganizationRecord,
} from "../src/modules/organization/organization.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";

function authHeaders(userId: string): Record<string, string> {
  return { authorization: `Bearer ${createTestToken(userId)}` };
}

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 }))
  );
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", testJwtSecret).update(body).digest();
  return `${body}.${toBase64Url(sig)}`;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function orgRole(userId: string): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  return null;
}

function buildOrg(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: testOrganizationId,
    name: "ExampleCo Catering",
    slug: "rauschenberger",
    headquartersAddress: "Stuttgart",
    headquartersPhone: null,
    headquartersEmail: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildBU(overrides: Partial<BusinessUnitRecord> = {}): BusinessUnitRecord {
  return {
    id: "bu-1",
    organizationId: testOrganizationId,
    name: "CORPORATE_EVENTS",
    slug: "corporate-events",
    description: null,
    defaultWorkflowKey: "event_inquiry_handling",
    requiredInquiryFields: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildEventConcept(overrides: Partial<EventConceptRecord> = {}): EventConceptRecord {
  return {
    id: "ec-1",
    organizationId: testOrganizationId,
    name: "FEEL_THE_FOREST",
    customName: null,
    description: "Forest theme",
    themeTags: ["nature"],
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildExternalEntry(overrides: Partial<ExternalCatalogEntryRecord> = {}): ExternalCatalogEntryRecord {
  return {
    id: "ext-1",
    organizationId: testOrganizationId,
    name: "Demo Venue One",
    slug: "goldberg-werk",
    city: "Stuttgart",
    region: "stuttgart",
    type: "PARTNER_SPECIAL_VENUE",
    capacityMin: 20,
    capacityMax: 400,
    cateringMode: "INHOUSE",
    logisticsProfile: {},
    isActive: true,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildDb(
  org: OrganizationRecord | null = buildOrg(),
  bus: BusinessUnitRecord[] = [buildBU()],
  concepts: EventConceptRecord[] = [buildEventConcept()],
  entries: ExternalCatalogEntryRecord[] = [buildExternalEntry()]
): OrganizationDatabaseClient {
  return {
    organization: {
      findFirst: async () => org,
      findMany: async () => (org ? [org] : [])
    },
    businessUnit: {
      findMany: async () => bus
    },
    eventConcept: {
      findMany: async () => concepts,
      findFirst: async () => concepts[0] ?? null
    },
    externalCatalogEntry: {
      findMany: async () => entries
    },
    eventConceptLocationCompatibility: {
      findMany: async () => []
    },
    location: {
      findMany: async () => []
    },
    exceptionRule: {
      findMany: async () => []
    },
    inquiry: {
      count: async () => 0,
      groupBy: async () => [],
      findMany: async () => []
    },
    workflowEvent: {
      findMany: async () => []
    }
  };
}

function buildTestApp(db: OrganizationDatabaseClient) {
  return buildApp({
    organization: {
      organizationService: new OrganizationService({ db }),
      auth: {
        db: {
          organizationMember: {
            findMany: async ({ where }: { where: { userId: string } }) => {
              const role = orgRole(where.userId);
              if (!role) return [];
              return [
                {
                  userId: where.userId,
                  organizationId: testOrganizationId,
                  role,
                  createdAt: new Date("2026-01-01T00:00:00.000Z")
                }
              ];
            }
          }
        } as never,
        jwtSecret: testJwtSecret
      }
    }
  });
}

describe("GET /admin/organization (ADR-0056)", () => {
  it("returns 200 with organization data for admin", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.organization.id).toBe(testOrganizationId);
    expect(body.organization.name).toBe("ExampleCo Catering");
  });

  it("returns 401 without auth token", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({ method: "GET", url: "/admin/organization" });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when organization not found", async () => {
    const app = buildTestApp(buildDb(null));
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /admin/organization/business-units (ADR-0056)", () => {
  it("returns business units list", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/business-units",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.businessUnits).toHaveLength(1);
    expect(body.businessUnits[0].name).toBe("CORPORATE_EVENTS");
  });

  it("returns empty list when no business units", async () => {
    const app = buildTestApp(buildDb(buildOrg(), []));
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/business-units",
      headers: authHeaders("shift-1"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().businessUnits).toHaveLength(0);
  });
});

describe("GET /admin/organization/event-concepts (ADR-0056)", () => {
  it("returns event concepts list", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/event-concepts",
      headers: authHeaders("staff-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.eventConcepts).toHaveLength(1);
    expect(body.eventConcepts[0].name).toBe("FEEL_THE_FOREST");
  });
});

describe("GET /admin/organization/external-catalog-entries (ADR-0056)", () => {
  it("returns external catalog entries for admin", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/external-catalog-entries",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.externalCatalogEntries).toHaveLength(1);
    expect(body.externalCatalogEntries[0].name).toBe("Demo Venue One");
  });

  it("returns 403 for staff (admin-only endpoint)", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/external-catalog-entries",
      headers: authHeaders("staff-1"),
    });
    expect(res.statusCode).toBe(403);
  });
});
