import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { OrganizationService } from "../src/modules/organization/organization.service.js";
import type {
  BusinessUnitRecord,
  EventConceptCompatibilityRecord,
  EventConceptRecord,
  ExceptionRuleRecord,
  ExternalCatalogEntryRecord,
  LocationSummaryRecord,
  OrganizationDatabaseClient,
  OrganizationRecord,
  UpcomingInquiryRecord,
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

function buildLocation(overrides: Partial<LocationSummaryRecord> = {}): LocationSummaryRecord {
  return {
    id: "loc-1",
    organizationId: testOrganizationId,
    brandId: "brand-1",
    name: "CUBE Premium Stuttgart",
    slug: "cube-stuttgart",
    profile: "CUBE_PREMIUM",
    signatureAssets: ["forest-bar", "kamin-lounge"],
    isActive: true,
    ...overrides,
  };
}

function buildExceptionRule(overrides: Partial<ExceptionRuleRecord> = {}): ExceptionRuleRecord {
  return {
    id: "rule-1",
    organizationId: testOrganizationId,
    locationId: "loc-1",
    type: "KITCHEN_LIMITED",
    title: "Küche eingeschränkt",
    startsAt: new Date("2026-06-10T00:00:00.000Z"),
    endsAt: new Date("2026-06-20T00:00:00.000Z"),
    isActive: true,
    ...overrides,
  };
}

function buildCompatibility(
  overrides: Partial<EventConceptCompatibilityRecord> = {}
): EventConceptCompatibilityRecord {
  return {
    id: "compat-1",
    eventConceptId: "ec-1",
    locationId: "loc-1",
    externalCatalogEntryId: null,
    compatibilityScore: 85,
    notes: "Top match",
    ...overrides,
  };
}

function buildUpcomingInquiry(overrides: Partial<UpcomingInquiryRecord> = {}): UpcomingInquiryRecord {
  return {
    id: "inq-1",
    organizationId: testOrganizationId,
    businessUnitHint: "CORPORATE_EVENTS",
    source: "RAUSCHENBERGER_WEBSITE",
    subject: "CORPORATE_EVENT",
    guestCount: 80,
    contactName: "Max Mustermann",
    preferredDate: new Date("2026-07-15T18:00:00.000Z"),
    status: "NEW",
    ...overrides,
  };
}

type OverviewDbOverrides = {
  org?: OrganizationRecord | null;
  bus?: BusinessUnitRecord[];
  concepts?: EventConceptRecord[];
  externalEntries?: ExternalCatalogEntryRecord[];
  locations?: LocationSummaryRecord[];
  rules?: ExceptionRuleRecord[];
  compat?: EventConceptCompatibilityRecord[];
  upcomingInquiries?: UpcomingInquiryRecord[];
  inquiryCountLast7?: number;
  inquiryCountLast30?: number;
  inquiryStatusGroups?: Array<{ status?: string; _count: { _all: number } }>;
  inquiryBuGroups?: Array<{ businessUnitHint?: string; _count: { _all: number } }>;
};

function buildOverviewDb(overrides: OverviewDbOverrides = {}): OrganizationDatabaseClient {
  return {
    organization: {
      findFirst: async () => overrides.org ?? buildOrg(),
      findMany: async () => (overrides.org ? [overrides.org] : []),
    },
    businessUnit: {
      findMany: async () => overrides.bus ?? [buildBU()],
    },
    eventConcept: {
      findMany: async () => overrides.concepts ?? [buildEventConcept()],
      findFirst: async () => (overrides.concepts ?? [buildEventConcept()])[0] ?? null,
    },
    externalCatalogEntry: {
      findMany: async () => overrides.externalEntries ?? [buildExternalEntry()],
    },
    eventConceptLocationCompatibility: {
      findMany: async () => overrides.compat ?? [],
    },
    location: {
      findMany: async () => overrides.locations ?? [buildLocation()],
    },
    exceptionRule: {
      findMany: async () => overrides.rules ?? [],
    },
    inquiry: {
      count: async ({ where }) => {
        if (where.createdAt?.gte) {
          const diff = Date.now() - where.createdAt.gte.getTime();
          const days = diff / (24 * 60 * 60 * 1000);
          if (days < 14) return overrides.inquiryCountLast7 ?? 0;
          if (days < 60) return overrides.inquiryCountLast30 ?? 0;
        }
        return 0;
      },
      groupBy: async () => overrides.inquiryStatusGroups ?? [],
      findMany: async () => overrides.upcomingInquiries ?? [],
    },
    workflowEvent: {
      findMany: async () => [],
    },
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
                  createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
              ];
            },
          },
        } as never,
        jwtSecret: testJwtSecret,
      },
    },
  });
}

describe("GET /admin/organization/overview (ADR-0057)", () => {
  it("returns 200 with business unit counts, location count, and stats", async () => {
    const app = buildTestApp(
      buildOverviewDb({
        bus: [
          buildBU({ id: "bu-corp", name: "CORPORATE_EVENTS", slug: "corporate-events" }),
          buildBU({ id: "bu-priv", name: "PRIVATE_EVENTS", slug: "private-events" }),
          buildBU({ id: "bu-rest", name: "RESTAURANTS", slug: "restaurants" }),
        ],
        inquiryStatusGroups: [
          { status: "NEW", _count: { _all: 5 } },
          { status: "OFFER_DRAFT", _count: { _all: 2 } },
        ],
        inquiryBuGroups: [{ businessUnitHint: "CORPORATE_EVENTS", _count: { _all: 5 } }],
        inquiryCountLast7: 3,
        inquiryCountLast30: 6,
      })
    );
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/overview",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.overview.organizationId).toBe(testOrganizationId);
    expect(body.overview.businessUnitCounts.CORPORATE_EVENTS).toBe(1);
    expect(body.overview.businessUnitCounts.PRIVATE_EVENTS).toBe(1);
    expect(body.overview.businessUnitCounts.RESTAURANTS).toBe(1);
    expect(body.overview.inquiryStats.total).toBe(7);
    expect(body.overview.inquiryStats.last7Days).toBe(3);
    expect(body.overview.inquiryStats.last30Days).toBe(6);
    expect(body.overview.signatureAssetCount).toBe(1);
  });

  it("returns 403 for staff (admin-only overview endpoint)", async () => {
    const app = buildTestApp(buildOverviewDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/overview",
      headers: authHeaders("staff-1"),
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns 401 without auth token", async () => {
    const app = buildTestApp(buildOverviewDb());
    const res = await app.inject({ method: "GET", url: "/admin/organization/overview" });
    expect(res.statusCode).toBe(401);
  });

  it("includes critical stock locations, exception rules, and upcoming events", async () => {
    const app = buildTestApp(
      buildOverviewDb({
        rules: [buildExceptionRule({ id: "rule-1" })],
        upcomingInquiries: [
          buildUpcomingInquiry({ id: "inq-1", status: "NEW" }),
          buildUpcomingInquiry({ id: "inq-2", status: "NEEDS_HUMAN_REVIEW" }),
        ],
      })
    );
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/overview",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const overview = res.json().overview;
    expect(overview.activeExceptionRules).toHaveLength(1);
    expect(overview.activeExceptionRules[0].title).toBe("Küche eingeschränkt");
    expect(overview.upcomingEvents).toHaveLength(2);
    expect(overview.upcomingEvents[0].contactNameInitials).toBe("M. M.");
  });
});

describe("GET /admin/organization/event-concepts (ADR-0057) with businessUnitId filter", () => {
  it("accepts businessUnitId query param and returns all concepts (filter is a no-op in v2)", async () => {
    const app = buildTestApp(buildOverviewDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/event-concepts?businessUnitId=bu-corp",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.eventConcepts).toHaveLength(1);
    expect(body.eventConcepts[0].name).toBe("FEEL_THE_FOREST");
  });
});

describe("GET /admin/organization/event-concepts/:id/compatible-locations (ADR-0057)", () => {
  it("returns compatible locations sorted by score desc (own + external)", async () => {
    const app = buildTestApp(
      buildOverviewDb({
        compat: [
          buildCompatibility({
            id: "c-own-1",
            locationId: "loc-1",
            externalCatalogEntryId: null,
            compatibilityScore: 85,
            notes: "Top match",
          }),
          buildCompatibility({
            id: "c-ext-1",
            locationId: null,
            externalCatalogEntryId: "ext-1",
            compatibilityScore: 60,
            notes: "Fallback",
          }),
        ],
      })
    );
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/event-concepts/ec-1/compatible-locations",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.compatibleLocations).toHaveLength(2);
    expect(body.compatibleLocations[0].compatibilityScore).toBe(85);
    expect(body.compatibleLocations[0].location.isExternal).toBe(false);
    expect(body.compatibleLocations[1].compatibilityScore).toBe(60);
    expect(body.compatibleLocations[1].location.isExternal).toBe(true);
  });

  it("returns 404 when event concept not found", async () => {
    const app = buildTestApp(
      buildOverviewDb({
        concepts: [],
      })
    );
    const res = await app.inject({
      method: "GET",
      url: "/admin/organization/event-concepts/unknown/compatible-locations",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(404);
  });
});
