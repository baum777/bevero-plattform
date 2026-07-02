import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { InquiryService } from "../src/modules/inquiry/inquiry.service.js";
import type {
  InquiryDatabaseClient,
  InquiryRecord,
  InquiryRoutingRuleRecord,
} from "../src/modules/inquiry/inquiry.types.js";

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

function orgRole(userId: string): "admin" | "manager" | "staff" | null {
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  return null;
}

function buildInquiryRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: "inq-1",
    organizationId: testOrganizationId,
    businessUnitHint: "CORPORATE_EVENTS",
    source: "RAUSCHENBERGER_WEBSITE",
    externalRef: null,
    subject: "CORPORATE_EVENT",
    guestCount: 80,
    contactName: "Max Mustermann",
    contactEmail: "max@example.de",
    contactPhone: "+49 711 123",
    contactAddress: null,
    rawMessage: "Wir suchen ein Venue für unsere Firmenfeier.",
    preferredDate: new Date("2026-09-15T18:00:00Z"),
    preferredLocationId: null,
    preferredExternalCatalogEntryId: null,
    status: "NEW",
    assignedToUserId: null,
    routingRuleId: "irr-02",
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-01T10:00:00Z"),
    ...overrides,
  };
}

function buildRoutingRule(overrides: Partial<InquiryRoutingRuleRecord> = {}): InquiryRoutingRuleRecord {
  return {
    id: "irr-01",
    organizationId: testOrganizationId,
    businessUnitHint: "PRIVATE_EVENTS",
    priority: 1,
    matchKeywords: ["hochzeit", "wedding"],
    matchSubjectTypes: ["WEDDING"],
    matchGuestCountMin: null,
    matchGuestCountMax: null,
    isActive: true,
    description: "Wedding keywords",
    createdByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function buildDb(
  inquiries: InquiryRecord[] = [buildInquiryRecord()],
  rules: InquiryRoutingRuleRecord[] = [buildRoutingRule()]
): InquiryDatabaseClient {
  return {
    inquiry: {
      findMany: async () => inquiries,
      findFirst: async ({ where }) => inquiries.find((i) => i.id === where.id && i.organizationId === where.organizationId) ?? null
    },
    inquiryRoutingRule: {
      findMany: async () => rules
    },
    inquiryClassificationAudit: {
      create: async () => ({ id: "audit-1" }),
      findMany: async () => []
    }
  };
}

function buildTestApp(db: InquiryDatabaseClient) {
  return buildApp({
    inquiry: {
      inquiryService: new InquiryService({ db }),
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

describe("GET /admin/inquiries (ADR-0056)", () => {
  it("returns inquiry list for admin (PII-sanitized)", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.inquiries).toHaveLength(1);
    const inq = body.inquiries[0];
    expect(inq.id).toBe("inq-1");
    // PII fields must not be exposed
    expect(inq.contactEmail).toBeUndefined();
    expect(inq.contactPhone).toBeUndefined();
    expect(inq.rawMessage).toBeUndefined();
    // PII indicators must be present
    expect(inq.hasRawMessage).toBe(true);
    expect(inq.hasContactEmail).toBe(true);
    expect(inq.hasContactPhone).toBe(true);
    expect(inq.contactNameInitials).toBe("M. M.");
  });

  it("returns 401 without auth token", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({ method: "GET", url: "/admin/inquiries" });
    expect(res.statusCode).toBe(401);
  });

  it("returns empty list when no inquiries", async () => {
    const app = buildTestApp(buildDb([]));
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries",
      headers: authHeaders("shift-1"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().inquiries).toHaveLength(0);
  });
});

describe("GET /admin/inquiries/:id (ADR-0056)", () => {
  it("returns inquiry detail (PII-sanitized)", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries/inq-1",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const { inquiry } = res.json();
    expect(inquiry.id).toBe("inq-1");
    expect(inquiry.contactEmail).toBeUndefined();
    expect(inquiry.hasContactEmail).toBe(true);
  });

  it("returns 404 for unknown inquiry", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries/unknown",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /admin/inquiries/classify (ADR-0056)", () => {
  it("returns classification result for wedding keyword", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "POST",
      url: "/admin/inquiries/classify",
      headers: { ...authHeaders("admin-1"), "content-type": "application/json" },
      payload: JSON.stringify({ rawMessage: "Wir planen unsere Hochzeit nächstes Jahr." }),
    });
    expect(res.statusCode).toBe(200);
    const { classification } = res.json();
    expect(classification.businessUnitHint).toBe("PRIVATE_EVENTS");
    expect(classification.matchedKeywords).toContain("hochzeit");
    expect(classification.confidence).toBeGreaterThan(0);
  });

  it("returns no-match result for unknown text", async () => {
    const app = buildTestApp(buildDb([], []));
    const res = await app.inject({
      method: "POST",
      url: "/admin/inquiries/classify",
      headers: { ...authHeaders("staff-1"), "content-type": "application/json" },
      payload: JSON.stringify({ rawMessage: "Ich möchte einfach einen Tisch buchen." }),
    });
    expect(res.statusCode).toBe(200);
    const { classification } = res.json();
    expect(classification.matchedRuleId).toBeNull();
    expect(classification.confidence).toBe(0);
  });

  it("returns 401 without auth token", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "POST",
      url: "/admin/inquiries/classify",
      headers: { "content-type": "application/json" },
      payload: "{}"
    });
    expect(res.statusCode).toBe(401);
  });
});
