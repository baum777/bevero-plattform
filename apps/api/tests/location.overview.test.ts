import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { LocationService } from "../src/modules/location/location.service.js";
import type {
  EventSpaceRecord,
  ExceptionRuleRecord,
  ExternalSystemLinkRecord,
  LocationDatabaseClient,
  LocationRecord,
  ReservationConnectorRecord
} from "../src/modules/location/location.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-overview";

function authHeaders(userId: string): Record<string, string> {
  return { authorization: `Bearer ${createTestToken(userId)}` };
}

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 })));
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", testJwtSecret).update(body).digest();
  return `${body}.${toBase64Url(sig)}`;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function orgRole(userId: string): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("viewer-")) return "viewer";
  return null;
}

function buildLoc(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "loc-ov-1",
    organizationId: testOrganizationId,
    brandId: "brand-1",
    name: "Warthausen",
    slug: "motorworld-warthausen",
    type: null,
    profile: "MOTORWORLD_STANDARD",
    precisionLevel: "BASIC",
    signatureAssets: ["Demo Hall Gamma-1", "Demo Hall Gamma-2"],
    weatherSensitive: false,
    cinemaAvailable: false,
    isActive: true,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildES(overrides: Partial<EventSpaceRecord> = {}): EventSpaceRecord {
  return {
    id: "es-ov-1",
    organizationId: testOrganizationId,
    locationId: "loc-ov-1",
    name: "Demo Hall Gamma-1",
    slug: "rennstall",
    capacitySeated: 100,
    capacityStanding: 40,
    capacityIndoor: null,
    capacityOutdoor: null,
    hasOwnBar: true,
    hasRestrooms: true,
    supports: ["PRIVATE_EVENT"],
    metadata: null,
    isActive: true,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildER(overrides: Partial<ExceptionRuleRecord> = {}): ExceptionRuleRecord {
  return {
    id: "er-ov-1",
    organizationId: testOrganizationId,
    locationId: "loc-ov-1",
    type: "OECHSLE_BUFFET_OVERRIDE",
    title: "Öchsle-Buffet Demo",
    description: null,
    affectedUnitIds: [],
    startsAt: new Date("2026-07-12T11:00:00.000Z"),
    endsAt: new Date("2026-07-12T15:00:00.000Z"),
    source: "oechsle_schedule",
    requiresConfirmation: true,
    confirmedByUserId: null,
    confirmedAt: null,
    isActive: true,
    metadata: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildRC(overrides: Partial<ReservationConnectorRecord> = {}): ReservationConnectorRecord {
  return {
    id: "rc-ov-1",
    organizationId: testOrganizationId,
    locationId: "loc-ov-1",
    provider: "GASTRONOVI",
    externalUrl: "https://www.gastronovi.com/",
    externalRef: null,
    isActive: true,
    metadata: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildESL(overrides: Partial<ExternalSystemLinkRecord> = {}): ExternalSystemLinkRecord {
  return {
    id: "esl-ov-1",
    organizationId: testOrganizationId,
    locationId: "loc-ov-1",
    kind: "OECHSLE_SCHEDULE",
    url: "https://www.oechsle.de/fahrplan/",
    externalRef: null,
    isActive: true,
    metadata: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function createFakeDb(
  locations: LocationRecord[],
  extra: {
    eventSpaces?: EventSpaceRecord[];
    exceptionRules?: ExceptionRuleRecord[];
    connectors?: ReservationConnectorRecord[];
    links?: ExternalSystemLinkRecord[];
  } = {}
): LocationDatabaseClient {
  return {
    brand: { async findMany() { return []; } },
    location: {
      async findMany(args) {
        return locations.filter((l) => l.organizationId === args.where.organizationId);
      },
      async findFirst(args) {
        return locations.find((l) => l.id === args.where.id && l.organizationId === args.where.organizationId) ?? null;
      }
    },
    area: { async findMany() { return []; } },
    storageLocation: { async findMany() { return []; } },
    locationInventoryConfig: { async findMany() { return []; } },
    eventSpace: {
      async findMany(args) {
        return (extra.eventSpaces ?? []).filter(
          (es) => es.locationId === args.where.locationId && es.organizationId === args.where.organizationId
        );
      }
    },
    exceptionRule: {
      async findMany(args) {
        return (extra.exceptionRules ?? []).filter(
          (er) => er.locationId === args.where.locationId && er.organizationId === args.where.organizationId
        );
      }
    },
    reservationConnector: {
      async findMany(args) {
        return (extra.connectors ?? []).filter(
          (rc) => rc.locationId === args.where.locationId && rc.organizationId === args.where.organizationId
        );
      }
    },
    externalSystemLink: {
      async findMany(args) {
        return (extra.links ?? []).filter(
          (esl) => esl.locationId === args.where.locationId && esl.organizationId === args.where.organizationId
        );
      }
    },
    serviceSlot: { async findMany() { return []; } }
  };
}

function buildTestApp(
  locations: LocationRecord[],
  extra: Parameters<typeof createFakeDb>[1] = {}
) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    location: {
      locationService: new LocationService({ db: createFakeDb(locations, extra) }),
      auth: {
        jwtSecret: testJwtSecret,
        db: {
          organizationMember: {
            async findMany(args: { where: { userId: string } }) {
              const role = orgRole(args.where.userId);
              if (!role) return [];
              return [{ organizationId: testOrganizationId, role, createdAt: new Date() }];
            }
          }
        } as never
      }
    }
  });
}

describe("mother-concern read APIs (ADR-0051 Task 06)", () => {
  describe("GET /admin/location/locations/:id/event-spaces", () => {
    it("returns event spaces with supports and capacity", async () => {
      const app = buildTestApp([buildLoc()], {
        eventSpaces: [buildES({ supports: ["CINEMA", "DINNER_THEATER"], capacitySeated: 27 })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/event-spaces", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { eventSpaces: Array<{ supports: string[]; capacitySeated: number }> };
        expect(body.eventSpaces[0]!.supports).toContain("CINEMA");
        expect(body.eventSpaces[0]!.capacitySeated).toBe(27);
      } finally { await app.close(); }
    });

    it("returns 401 for unauthenticated", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/event-spaces" });
        expect(res.statusCode).toBe(401);
      } finally { await app.close(); }
    });

    it("returns 403 for viewer role", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/event-spaces", headers: authHeaders("viewer-1") });
        expect(res.statusCode).toBe(403);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/exception-rules", () => {
    it("returns active exception rules with requiresConfirmation", async () => {
      const app = buildTestApp([buildLoc()], { exceptionRules: [buildER()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/exception-rules", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { exceptionRules: Array<{ type: string; requiresConfirmation: boolean }> };
        expect(body.exceptionRules[0]!.type).toBe("OECHSLE_BUFFET_OVERRIDE");
        expect(body.exceptionRules[0]!.requiresConfirmation).toBe(true);
      } finally { await app.close(); }
    });

    it("returns empty array when no exception rules exist", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/exception-rules", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        expect((res.json() as { exceptionRules: unknown[] }).exceptionRules).toHaveLength(0);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/reservation-connectors", () => {
    it("returns connectors with provider and externalUrl", async () => {
      const app = buildTestApp([buildLoc()], { connectors: [buildRC()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/reservation-connectors", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { connectors: Array<{ provider: string; externalUrl: string }> };
        expect(body.connectors[0]!.provider).toBe("GASTRONOVI");
        expect(body.connectors[0]!.externalUrl).toBe("https://www.gastronovi.com/");
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/reservation-connectors auth", () => {
    it("returns 400 for blank location id", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/%20/reservation-connectors", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(400);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/external-system-links", () => {
    it("returns external system links with kind and url", async () => {
      const app = buildTestApp([buildLoc()], { links: [buildESL()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/external-system-links", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { links: Array<{ kind: string; url: string }> };
        expect(body.links[0]!.kind).toBe("OECHSLE_SCHEDULE");
        expect(body.links[0]!.url).toContain("oechsle.de");
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/today-overview (aggregator)", () => {
    it("today-overview returns signatureAssets, weatherSensitive, connectors, links", async () => {
      const app = buildTestApp(
        [buildLoc({ weatherSensitive: false, signatureAssets: ["Demo Hall Gamma-1", "Demo Hall Gamma-2"] })],
        { connectors: [buildRC()], links: [buildESL()] }
      );
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/today-overview?date=2026-06-09", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { overview: { signatureAssets: string[]; weatherSensitive: boolean; reservationConnectors: unknown[]; externalSystemLinks: unknown[] } };
        expect(body.overview.signatureAssets).toEqual(["Demo Hall Gamma-1", "Demo Hall Gamma-2"]);
        expect(body.overview.weatherSensitive).toBe(false);
        expect(body.overview.reservationConnectors).toHaveLength(1);
        expect(body.overview.externalSystemLinks).toHaveLength(1);
      } finally { await app.close(); }
    });

    it("today-overview includes activeExceptionRules with requiresConfirmation flag", async () => {
      const app = buildTestApp(
        [buildLoc()],
        { exceptionRules: [buildER({ startsAt: new Date("2026-06-09T00:00:00.000Z"), endsAt: new Date("2026-06-09T23:59:00.000Z") })] }
      );
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/today-overview?date=2026-06-09", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { overview: { activeExceptionRules: Array<{ requiresConfirmation: boolean }> } };
        expect(body.overview.activeExceptionRules[0]!.requiresConfirmation).toBe(true);
      } finally { await app.close(); }
    });

    it("today-overview openInquiries defaults to count=0 when no db", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/today-overview", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { overview: { openInquiries: { count: number } } };
        expect(body.overview.openInquiries.count).toBe(0);
      } finally { await app.close(); }
    });

    it("today-overview returns 404 for unknown location", async () => {
      const app = buildTestApp([]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-missing/today-overview", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(404);
      } finally { await app.close(); }
    });

    it("today-overview not accessible to viewer (403)", async () => {
      const app = buildTestApp([buildLoc()]);
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-ov-1/today-overview", headers: authHeaders("viewer-1") });
        expect(res.statusCode).toBe(403);
      } finally { await app.close(); }
    });
  });
});
