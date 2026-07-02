import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { LocationService } from "../src/modules/location/location.service.js";
import type {
  AreaRecord,
  BrandRecord,
  ConnectorListItem,
  EventSpaceRecord,
  ExceptionRuleRecord,
  ExternalSystemLinkRecord,
  LocationDatabaseClient,
  LocationInventoryConfigRecord,
  LocationRecord,
  LocationStorageLocationRecord,
  ReservationConnectorRecord
} from "../src/modules/location/location.types.js";

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

function buildBrand(overrides: Partial<BrandRecord> = {}): BrandRecord {
  return {
    id: "brand-1",
    organizationId: testOrganizationId,
    name: "ExampleCo Innenstadt",
    slug: "rauschenberger-innenstadt",
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function buildLocation(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "loc-1",
    organizationId: testOrganizationId,
    brandId: "brand-1",
    name: "Demo Site Alpha",
    slug: "motorworld-inn-bb",
    type: "inn",
    profile: "MOTORWORLD_STANDARD",
    precisionLevel: "DETAILED",
    signatureAssets: ["Oldtimer-Ausstellung"],
    weatherSensitive: false,
    cinemaAvailable: false,
    isActive: true,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function buildArea(overrides: Partial<AreaRecord> = {}): AreaRecord {
  return {
    id: "area-1",
    locationId: "loc-1",
    organizationId: testOrganizationId,
    name: "Bar",
    type: "bar",
    storageLocationId: "sl-1",
    sortOrder: 10,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function buildStorageLocation(
  overrides: Partial<LocationStorageLocationRecord> = {}
): LocationStorageLocationRecord {
  return {
    id: "sl-1",
    name: "Getränkelager",
    type: "lager",
    isActive: true,
    organizationId: testOrganizationId,
    ...overrides
  };
}

function buildLocationInventoryConfig(
  overrides: Partial<LocationInventoryConfigRecord> = {}
): LocationInventoryConfigRecord {
  return {
    id: "lic-1",
    organizationId: testOrganizationId,
    locationId: "loc-1",
    inventoryItemId: "item-1",
    areaId: "area-1",
    storageLocationId: "sl-1",
    targetQuantity: 12,
    minimumQuantity: 4,
    premiumHandlingRequired: false,
    qualityNoteRequired: false,
    batchNoteAllowed: false,
    isActive: true,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function createFakeDb(input: {
  brands?: BrandRecord[];
  locations?: LocationRecord[];
  areas?: AreaRecord[];
  storageLocations?: LocationStorageLocationRecord[];
  inventoryConfigs?: LocationInventoryConfigRecord[];
  eventSpaces?: EventSpaceRecord[];
  exceptionRules?: ExceptionRuleRecord[];
  connectors?: ReservationConnectorRecord[];
  links?: ExternalSystemLinkRecord[];
}): LocationDatabaseClient {
  return {
    brand: {
      async findMany(args) {
        return (input.brands ?? [])
          .filter((brand) => brand.organizationId === args.where.organizationId)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    },
    location: {
      async findMany(args) {
        return (input.locations ?? [])
          .filter(
            (location) =>
              location.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined ||
                location.isActive === args.where.isActive)
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      async findFirst(args) {
        return (
          (input.locations ?? []).find(
            (location) =>
              location.id === args.where.id &&
              location.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    },
    area: {
      async findMany(args) {
        return (input.areas ?? [])
          .filter(
            (area) =>
              area.locationId === args.where.locationId &&
              area.organizationId === args.where.organizationId
          )
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      }
    },
    storageLocation: {
      async findMany(args) {
        const idSet = new Set(args.where.id.in);
        return (input.storageLocations ?? []).filter((sl) => idSet.has(sl.id));
      }
    },
    locationInventoryConfig: {
      async findMany(args) {
        return (input.inventoryConfigs ?? [])
          .filter(
            (lic) =>
              lic.locationId === args.where.locationId &&
              lic.organizationId === args.where.organizationId &&
              (args.where.isActive === undefined || lic.isActive === args.where.isActive)
          )
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    },
    eventSpace: {
      async findMany(args) {
        return (input.eventSpaces ?? []).filter(
          (es) =>
            es.locationId === args.where.locationId &&
            es.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || es.isActive === args.where.isActive)
        );
      }
    },
    exceptionRule: {
      async findMany(args) {
        return (input.exceptionRules ?? []).filter(
          (er) =>
            er.locationId === args.where.locationId &&
            er.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || er.isActive === args.where.isActive)
        );
      }
    },
    reservationConnector: {
      async findMany(args) {
        return (input.connectors ?? []).filter(
          (rc) =>
            rc.locationId === args.where.locationId &&
            rc.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || rc.isActive === args.where.isActive)
        );
      }
    },
    externalSystemLink: {
      async findMany(args) {
        return (input.links ?? []).filter(
          (esl) =>
            esl.locationId === args.where.locationId &&
            esl.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || esl.isActive === args.where.isActive)
        );
      }
    },
    serviceSlot: {
      async findMany() { return []; }
    }
  };
}

function buildTestApp(input: {
  brands?: BrandRecord[];
  locations?: LocationRecord[];
  areas?: AreaRecord[];
  storageLocations?: LocationStorageLocationRecord[];
  inventoryConfigs?: LocationInventoryConfigRecord[];
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    location: {
      locationService: new LocationService({
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

describe("location API routes", () => {
  describe("GET /admin/location/organizations", () => {
    it("returns the actor's organization", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/organizations",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          organizations: Array<{ organizationId: string }>;
        };
        expect(body.organizations).toEqual([
          { organizationId: testOrganizationId }
        ]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/organizations/:id/brands", () => {
    it("returns the org's brands for a staff user", async () => {
      const app = buildTestApp({
        brands: [buildBrand({ id: "brand-mw" }), buildBrand({ id: "brand-cube" })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: `/admin/location/organizations/${testOrganizationId}/brands`,
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as { brands: Array<{ id: string }> };
        expect(body.brands.map((b) => b.id)).toEqual(["brand-mw", "brand-cube"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations", () => {
    it("returns the org's active locations", async () => {
      const app = buildTestApp({
        locations: [
          buildLocation({ id: "loc-mw" }),
          buildLocation({ id: "loc-cube", profile: "CUBE_PREMIUM", precisionLevel: "PREMIUM_TRACEABLE" })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          locations: Array<{ id: string; profile: string }>;
        };
        expect(body.locations.map((l) => l.id)).toEqual(["loc-mw", "loc-cube"]);
        expect(body.locations[1]?.profile).toBe("CUBE_PREMIUM");
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations/:id", () => {
    it("returns the location for an own-org actor", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ id: "loc-cube", profile: "CUBE_PREMIUM" })]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-cube",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          location: { id: string; profile: string; organizationId: string };
        };
        expect(body.location.id).toBe("loc-cube");
        expect(body.location.profile).toBe("CUBE_PREMIUM");
        expect(body.location.organizationId).toBe(testOrganizationId);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a cross-org location", async () => {
      const app = buildTestApp({
        locations: [
          buildLocation({ id: "loc-foreign", organizationId: otherOrganizationId })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-foreign",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations/:id/profile", () => {
    it("returns the location profile and precision level", async () => {
      const app = buildTestApp({
        locations: [
          buildLocation({
            id: "loc-cube",
            profile: "CUBE_PREMIUM",
            precisionLevel: "PREMIUM_TRACEABLE"
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-cube/profile",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          profile: { profile: string; precisionLevel: string };
        };
        expect(body.profile.profile).toBe("CUBE_PREMIUM");
        expect(body.profile.precisionLevel).toBe("PREMIUM_TRACEABLE");
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations/:id/areas", () => {
    it("returns the location's areas joined with storageLocationId", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ id: "loc-cube" })],
        areas: [
          buildArea({ id: "area-bar", locationId: "loc-cube", name: "Bar", type: "bar", sortOrder: 10 }),
          buildArea({
            id: "area-restaurant",
            locationId: "loc-cube",
            name: "Restaurant",
            type: "restaurant",
            sortOrder: 20
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-cube/areas",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          areas: Array<{ id: string; type: string }>;
        };
        expect(body.areas.map((a) => a.id)).toEqual(["area-bar", "area-restaurant"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations/:id/storage-locations", () => {
    it("returns the storage locations joined via Area.storageLocationId", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ id: "loc-1" })],
        areas: [
          buildArea({ id: "area-bar", locationId: "loc-1", storageLocationId: "sl-1" }),
          buildArea({ id: "area-legacy", locationId: "loc-1", storageLocationId: "sl-legacy" }),
          buildArea({ id: "area-transfer", locationId: "loc-1", storageLocationId: "sl-transfer" }),
          buildArea({ id: "area-cooler", locationId: "loc-1", storageLocationId: "sl-cooler" }),
          buildArea({ id: "area-freezer-1", locationId: "loc-1", storageLocationId: "sl-freezer-1" }),
          buildArea({ id: "area-freezer-2", locationId: "loc-1", storageLocationId: "sl-freezer-2" })
        ],
        storageLocations: [
          buildStorageLocation({ id: "sl-1", name: "Getränkelager" }),
          buildStorageLocation({ id: "sl-legacy", name: "Trockenlager", type: "dry_storage" }),
          buildStorageLocation({ id: "sl-transfer", name: "Transferpunkt Kühlwagen", type: "transfer_point" }),
          buildStorageLocation({ id: "sl-cooler", name: "Kühlhaus", type: "walk_in_cooler" }),
          buildStorageLocation({ id: "sl-freezer-1", name: "Gefrierschrank 1", type: "freezer" }),
          buildStorageLocation({ id: "sl-freezer-2", name: "Gefrierschrank 2", type: "freezer" })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-1/storage-locations",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          storageLocations: Array<{ id: string; name: string }>;
        };
        expect(body.storageLocations).toEqual([
          { id: "sl-1", name: "Getränkelager", type: "lager", isActive: true, organizationId: testOrganizationId }
        ]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/location/locations/:id/inventory-config", () => {
    it("returns the location's LocationInventoryConfig rows", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ id: "loc-cube", profile: "CUBE_PREMIUM" })],
        areas: [buildArea({ id: "area-cube-ps", locationId: "loc-cube", name: "Premium-Lager", type: "premium_storage" })],
        inventoryConfigs: [
          buildLocationInventoryConfig({
            id: "lic-cube-001",
            locationId: "loc-cube",
            areaId: "area-cube-ps",
            premiumHandlingRequired: true,
            qualityNoteRequired: true,
            batchNoteAllowed: true,
            targetQuantity: 12,
            minimumQuantity: 4
          })
        ]
      });

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/loc-cube/inventory-config",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(200);
        const body = response.json() as {
          inventoryConfig: Array<{
            id: string;
            premiumHandlingRequired: boolean;
            qualityNoteRequired: boolean;
            batchNoteAllowed: boolean;
          }>;
        };
        expect(body.inventoryConfig).toHaveLength(1);
        const lic = body.inventoryConfig[0]!;
        expect(lic.id).toBe("lic-cube-001");
        expect(lic.premiumHandlingRequired).toBe(true);
        expect(lic.qualityNoteRequired).toBe(true);
        expect(lic.batchNoteAllowed).toBe(true);
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
          url: "/admin/location/organizations"
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
          url: "/admin/location/organizations",
          headers: authHeaders("viewer-1")
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 400 for a missing location id in the URL", async () => {
      const app = buildTestApp({});

      try {
        await app.ready();
        const response = await app.inject({
          method: "GET",
          url: "/admin/location/locations/%20",
          headers: authHeaders("staff-1")
        });

        expect(response.statusCode).toBe(400);
      } finally {
        await app.close();
      }
    });
  });
});

// ADR-0050 + ADR-0051: Demo multi-site Extensions tests (+11 cases)
describe("location motorworld-inn extensions (ADR-0050 / ADR-0051)", () => {
  function buildEventSpace(overrides: Partial<EventSpaceRecord> = {}): EventSpaceRecord {
    return {
      id: "es-1",
      organizationId: testOrganizationId,
      locationId: "loc-1",
      name: "Demo Hall Gamma-1",
      slug: "rennstall",
      capacitySeated: 100,
      capacityStanding: 40,
      capacityIndoor: null,
      capacityOutdoor: null,
      hasOwnBar: true,
      hasRestrooms: true,
      supports: ["PRIVATE_EVENT", "COMPANY_EVENT"],
      metadata: null,
      isActive: true,
      createdAt: new Date("2026-06-09T10:00:00.000Z"),
      updatedAt: new Date("2026-06-09T10:00:00.000Z"),
      ...overrides
    };
  }

  function buildExceptionRule(overrides: Partial<ExceptionRuleRecord> = {}): ExceptionRuleRecord {
    return {
      id: "er-1",
      organizationId: testOrganizationId,
      locationId: "loc-1",
      type: "OECHSLE_BUFFET_OVERRIDE",
      title: "Öchsle-Buffet",
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

  function buildConnector(overrides: Partial<ReservationConnectorRecord> = {}): ReservationConnectorRecord {
    return {
      id: "rc-1",
      organizationId: testOrganizationId,
      locationId: "loc-1",
      provider: "GASTRONAUT",
      externalUrl: "https://www.gastronaut.de/",
      externalRef: null,
      isActive: true,
      metadata: null,
      createdAt: new Date("2026-06-09T10:00:00.000Z"),
      updatedAt: new Date("2026-06-09T10:00:00.000Z"),
      ...overrides
    };
  }

  function buildExternalLink(overrides: Partial<ExternalSystemLinkRecord> = {}): ExternalSystemLinkRecord {
    return {
      id: "esl-1",
      organizationId: testOrganizationId,
      locationId: "loc-1",
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

  function buildExtTestApp(ext: Parameters<typeof createFakeDb>[0]) {
    const loc = buildLocation();
    return buildTestApp({ locations: [loc], ...ext });
  }

  describe("GET /admin/location/locations/:id/event-spaces", () => {
    it("returns active event spaces for a location", async () => {
      const app = buildExtTestApp({
        eventSpaces: [buildEventSpace({ id: "es-rennstall" }), buildEventSpace({ id: "es-museum", name: "Demo Hall Gamma-2", slug: "museum", isActive: false })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/event-spaces", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { eventSpaces: Array<{ id: string }> };
        const ids = body.eventSpaces.map((e) => e.id);
        expect(ids).toContain("es-rennstall");
        expect(ids).not.toContain("es-museum");
      } finally { await app.close(); }
    });

    it("returns event space with capacitySeated and supports", async () => {
      const app = buildExtTestApp({
        eventSpaces: [buildEventSpace({ supports: ["CINEMA", "DINNER_THEATER"] })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/event-spaces", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { eventSpaces: Array<{ supports: string[]; capacitySeated: number }> };
        expect(body.eventSpaces[0]!.supports).toContain("CINEMA");
        expect(body.eventSpaces[0]!.capacitySeated).toBe(100);
      } finally { await app.close(); }
    });

    it("returns 200 empty array for unknown location", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-missing/event-spaces", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { eventSpaces: unknown[] };
        expect(body.eventSpaces).toHaveLength(0);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/exception-rules", () => {
    it("returns active exception rules", async () => {
      const app = buildExtTestApp({ exceptionRules: [buildExceptionRule()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/exception-rules", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { exceptionRules: Array<{ id: string; requiresConfirmation: boolean; type: string }> };
        expect(body.exceptionRules[0]!.type).toBe("OECHSLE_BUFFET_OVERRIDE");
        expect(body.exceptionRules[0]!.requiresConfirmation).toBe(true);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/reservation-connectors", () => {
    it("returns active connectors with provider and externalUrl", async () => {
      const app = buildExtTestApp({ connectors: [buildConnector()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/reservation-connectors", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { connectors: Array<ConnectorListItem> };
        expect(body.connectors[0]!.provider).toBe("GASTRONAUT");
        expect(body.connectors[0]!.externalUrl).toBe("https://www.gastronaut.de/");
      } finally { await app.close(); }
    });

    it("returns empty array when no connectors", async () => {
      const app = buildExtTestApp({});
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/reservation-connectors", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        expect((res.json() as { connectors: unknown[] }).connectors).toHaveLength(0);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/external-system-links", () => {
    it("returns external system links", async () => {
      const app = buildExtTestApp({ links: [buildExternalLink()] });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/external-system-links", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { links: Array<{ kind: string; url: string }> };
        expect(body.links[0]!.kind).toBe("OECHSLE_SCHEDULE");
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations (signatureAssets in list)", () => {
    it("location list includes signatureAssets and cinemaAvailable fields", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ cinemaAvailable: true, signatureAssets: ["25m Bar", "Rennwagen"] })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { locations: Array<{ signatureAssets: string[]; cinemaAvailable: boolean }> };
        expect(body.locations[0]!.cinemaAvailable).toBe(true);
        expect(body.locations[0]!.signatureAssets).toEqual(["25m Bar", "Rennwagen"]);
      } finally { await app.close(); }
    });
  });

  describe("GET /admin/location/locations/:id/today-overview", () => {
    it("returns today overview with signatureAssets and weatherSensitive", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ signatureAssets: ["Demo Hall Gamma-1", "Demo Hall Gamma-2"], weatherSensitive: false })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/today-overview?date=2026-06-09", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { overview: { signatureAssets: string[]; weatherSensitive: boolean } };
        expect(body.overview.signatureAssets).toEqual(["Demo Hall Gamma-1", "Demo Hall Gamma-2"]);
        expect(body.overview.weatherSensitive).toBe(false);
      } finally { await app.close(); }
    });

    it("returns 404 for unknown location", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-missing/today-overview", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(404);
      } finally { await app.close(); }
    });

    it("location with weatherSensitive=true shows weatherSensitive in overview", async () => {
      const app = buildTestApp({
        locations: [buildLocation({ weatherSensitive: true, signatureAssets: ["Outdoor Terrasse"] })]
      });
      try {
        await app.ready();
        const res = await app.inject({ method: "GET", url: "/admin/location/locations/loc-1/today-overview", headers: authHeaders("staff-1") });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { overview: { weatherSensitive: boolean } };
        expect(body.overview.weatherSensitive).toBe(true);
      } finally { await app.close(); }
    });
  });
});
