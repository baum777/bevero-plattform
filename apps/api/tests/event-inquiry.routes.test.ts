import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { EventInquiryService } from "../src/modules/event-inquiry/event-inquiry.service.js";
import type {
  BeveragePackageRecord,
  EventInquiryDatabaseClient,
  EventInquiryRecord,
  EventPackageRecord,
} from "../src/modules/event-inquiry/event-inquiry.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";
const otherOrganizationId = "org-other";

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
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("viewer-")) return "viewer";
  return null;
}

function buildInquiry(overrides: Partial<EventInquiryRecord> = {}): EventInquiryRecord {
  return {
    id: "ei-1",
    organizationId: testOrganizationId,
    operationalUnitId: "ou-event",
    source: "cube_website",
    subject: "CORPORATE_EVENT",
    guestCount: 45,
    contactName: "Max Mustermann",
    contactEmail: "max@example.com",
    contactPhone: "+49 711 1234567",
    rawMessage: "Wir möchten eine Firmenfeier veranstalten.",
    preferredDate: new Date("2026-09-15T18:00:00.000Z"),
    preferredAreas: ["Exklusiv Events"],
    status: "NEW",
    assignedToUserId: null,
    confirmationEmailSentAt: null,
    confirmationExpectedWithinMinutes: 10,
    confirmationReminderSentAt: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildPackage(overrides: Partial<EventPackageRecord> = {}): EventPackageRecord {
  return {
    id: "ep-1",
    organizationId: testOrganizationId,
    operationalUnitId: "ou-event",
    name: "Firmen Flying Buffet",
    courseCount: null,
    pricePerPersonCents: 8900,
    priceMode: "net_excluding_vat",
    scope: "corporate_event",
    orderMode: "flying_buffet",
    requiredLeadTimeDays: 5,
    paymentMode: "prepayment",
    cancellationPolicy: "free_until_3_days_before",
    windowSeat: "only_by_availability",
    includedItems: ["Audio-Technik"],
    addOns: ["Stehtische"],
    defaultGuestCount: 80,
    validFrom: null,
    validUntil: null,
    isActive: true,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildPrivatePackage(overrides: Partial<EventPackageRecord> = {}): EventPackageRecord {
  return buildPackage({
    id: "ep-private",
    scope: "private_package",
    paymentMode: "prepayment",
    requiredLeadTimeDays: 14,
    ...overrides
  });
}

function buildBeveragePackage(
  overrides: Partial<BeveragePackageRecord> = {}
): BeveragePackageRecord {
  return {
    id: "bp-1",
    organizationId: testOrganizationId,
    name: "CLASSIC",
    durationHours: 4.0,
    durationHoursMin: 2.0,
    durationHoursMax: 6.0,
    includedCategories: ["Prosecco", "Wein", "Wasser"],
    pricePerPersonCents: 4900,
    serviceIncluded: true,
    isActive: true,
    isKidsPackage: false,
    childAgeMin: null,
    childAgeMax: null,
    under5Free: false,
    eventPhaseFactor: 1.0,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function createFakeDb(input: {
  inquiries?: EventInquiryRecord[];
  packages?: EventPackageRecord[];
  beveragePackages?: BeveragePackageRecord[];
}): EventInquiryDatabaseClient {
  return {
    eventInquiry: {
      async findMany(args) {
        return (input.inquiries ?? []).filter(
          (i) =>
            i.organizationId === args.where.organizationId &&
            (args.where.status === undefined || i.status === args.where.status)
        );
      },
      async findFirst(args) {
        return (
          (input.inquiries ?? []).find(
            (i) => i.id === args.where.id && i.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    },
    eventPackage: {
      async findMany(args) {
        return (input.packages ?? []).filter(
          (p) =>
            p.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || p.isActive === args.where.isActive) &&
            (args.where.operationalUnitId === undefined ||
              p.operationalUnitId === args.where.operationalUnitId)
        );
      },
      async findFirst(args) {
        return (
          (input.packages ?? []).find(
            (p) => p.id === args.where.id && p.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    },
    beveragePackage: {
      async findMany(args) {
        return (input.beveragePackages ?? []).filter(
          (b) =>
            b.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || b.isActive === args.where.isActive)
        );
      },
      async findFirst(args) {
        return (
          (input.beveragePackages ?? []).find(
            (b) => b.id === args.where.id && b.organizationId === args.where.organizationId
          ) ?? null
        );
      }
    }
  };
}

function buildTestApp(input: {
  inquiries?: EventInquiryRecord[];
  packages?: EventPackageRecord[];
  beveragePackages?: BeveragePackageRecord[];
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    eventInquiry: {
      eventInquiryService: new EventInquiryService({ db: createFakeDb(input) }),
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

describe("event-inquiry API routes (ADR-0029-A2 Task 03)", () => {
  describe("GET /admin/cube/event-inquiries", () => {
    it("returns list of inquiries without PII fields", async () => {
      const app = buildTestApp({
        inquiries: [buildInquiry({ id: "ei-1" }), buildInquiry({ id: "ei-2" })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { inquiries: Record<string, unknown>[] };
        expect(body.inquiries.length).toBe(2);
        // PII-Scrubbing check: no PII fields in response (00a §8 + ADR-0021 §5)
        for (const inq of body.inquiries) {
          expect(inq).not.toHaveProperty("rawMessage");
          expect(inq).not.toHaveProperty("contactEmail");
          expect(inq).not.toHaveProperty("contactPhone");
        }
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/event-inquiries/:id", () => {
    it("returns inquiry header without PII", async () => {
      const app = buildTestApp({
        inquiries: [buildInquiry({ id: "ei-1", confirmationExpectedWithinMinutes: 15 })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries/ei-1",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { inquiry: Record<string, unknown> };
        expect(body.inquiry.id).toBe("ei-1");
        expect(body.inquiry.confirmationExpectedWithinMinutes).toBe(15);
        expect(body.inquiry).not.toHaveProperty("rawMessage");
        expect(body.inquiry).not.toHaveProperty("contactEmail");
        expect(body.inquiry).not.toHaveProperty("contactPhone");
      } finally {
        await app.close();
      }
    });

    it("returns 404 for inquiry assigned to different user (PII-Scope-Test)", async () => {
      // assignedToUserId = "staff-other" but actor is "staff-1"
      // Service layer mirrors the DB-layer assignedToUserId-scope (ADR-0062 reserved).
      const app = buildTestApp({
        inquiries: [buildInquiry({ id: "ei-assigned", assignedToUserId: "staff-other" })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries/ei-assigned",
          headers: authHeaders("staff-1")
        });
        // The service returns null for assignedToUserId mismatch → 404
        expect(res.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a cross-org inquiry", async () => {
      const app = buildTestApp({
        inquiries: [buildInquiry({ id: "ei-foreign", organizationId: otherOrganizationId })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries/ei-foreign",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/event-packages", () => {
    it("returns list of active event packages", async () => {
      const app = buildTestApp({
        packages: [
          buildPackage({ id: "ep-active" }),
          buildPackage({ id: "ep-inactive", isActive: false })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-packages",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { packages: Array<{ id: string }> };
        expect(body.packages.map((p) => p.id)).toEqual(["ep-active"]);
      } finally {
        await app.close();
      }
    });

    it("private_package has requiredLeadTimeDays and paymentMode=prepayment", async () => {
      const app = buildTestApp({
        packages: [buildPrivatePackage({ id: "ep-private" })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-packages/ep-private",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as {
          package: { scope: string; paymentMode: string; requiredLeadTimeDays: number };
        };
        expect(body.package.scope).toBe("private_package");
        expect(body.package.paymentMode).toBe("prepayment");
        expect(body.package.requiredLeadTimeDays).toBe(14);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for unknown package", async () => {
      const app = buildTestApp({ packages: [] });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-packages/ep-missing",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/cube/beverage-packages", () => {
    it("returns active beverage packages with 00a §5 fields", async () => {
      const app = buildTestApp({
        beveragePackages: [
          buildBeveragePackage({ id: "bp-classic" }),
          buildBeveragePackage({
            id: "bp-kids",
            name: "KIDS",
            isKidsPackage: true,
            childAgeMin: 3,
            childAgeMax: 12,
            under5Free: true
          }),
          buildBeveragePackage({ id: "bp-inactive", isActive: false })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/beverage-packages",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as {
          beveragePackages: Array<{
            id: string;
            isKidsPackage: boolean;
            childAgeMin: number | null;
            under5Free: boolean;
          }>;
        };
        const ids = body.beveragePackages.map((b) => b.id);
        expect(ids).toContain("bp-classic");
        expect(ids).toContain("bp-kids");
        expect(ids).not.toContain("bp-inactive");
        const kids = body.beveragePackages.find((b) => b.id === "bp-kids");
        expect(kids?.isKidsPackage).toBe(true);
        expect(kids?.childAgeMin).toBe(3);
        expect(kids?.under5Free).toBe(true);
      } finally {
        await app.close();
      }
    });
  });

  describe("auth + role gates", () => {
    it("rejects unauthenticated with 401", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries"
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("rejects viewer with 403", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-packages",
          headers: authHeaders("viewer-1")
        });
        expect(res.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 400 for blank inquiry id", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-inquiries/%20",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await app.close();
      }
    });

    it("Brutto/Netto: corporate_event package has net_excluding_vat priceMode", async () => {
      const app = buildTestApp({
        packages: [buildPackage({ id: "ep-corp", scope: "corporate_event", priceMode: "net_excluding_vat" })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/cube/event-packages/ep-corp",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { package: { priceMode: string } };
        expect(body.package.priceMode).toBe("net_excluding_vat");
      } finally {
        await app.close();
      }
    });
  });
});
