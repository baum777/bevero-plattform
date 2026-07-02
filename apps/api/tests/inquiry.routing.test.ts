import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { InquiryService } from "../src/modules/inquiry/inquiry.service.js";
import type {
  ClassificationAuditRow,
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

function orgRole(userId: string): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
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

function buildAuditRow(overrides: Partial<ClassificationAuditRow> = {}): ClassificationAuditRow {
  return {
    id: "audit-1",
    inquiryId: "inq-1",
    matchedRuleId: "irr-01",
    matchedKeywords: ["hochzeit"],
    confidence: 60,
    businessUnitHint: "PRIVATE_EVENTS",
    callerUserId: "admin-1",
    createdAt: new Date("2026-06-09T12:00:00Z"),
    ...overrides,
  };
}

type InquiryDbOverrides = {
  inquiries?: InquiryRecord[];
  rules?: InquiryRoutingRuleRecord[];
  audit?: ClassificationAuditRow[];
  createdAudit?: ClassificationAuditRow[];
};

function buildDb(overrides: InquiryDbOverrides = {}): InquiryDatabaseClient {
  const inquiries = overrides.inquiries ?? [buildInquiryRecord()];
  const rules = overrides.rules ?? [buildRoutingRule()];
  const audit = overrides.audit ?? [];
  const createdAudit = overrides.createdAudit ?? [];
  return {
    inquiry: {
      findMany: async ({ where }) => {
        let rows = inquiries.filter((i) => i.organizationId === where.organizationId);
        if (where.status) rows = rows.filter((i) => i.status === where.status);
        if (where.businessUnitHint) {
          rows = rows.filter((i) => i.businessUnitHint === where.businessUnitHint);
        }
        if (where.source) rows = rows.filter((i) => i.source === where.source);
        if (where.createdAt?.gte) {
          rows = rows.filter((i) => i.createdAt >= where.createdAt!.gte!);
        }
        if (where.createdAt?.lte) {
          rows = rows.filter((i) => i.createdAt <= where.createdAt!.lte!);
        }
        return rows;
      },
      findFirst: async ({ where }) =>
        inquiries.find((i) => i.id === where.id && i.organizationId === where.organizationId) ?? null,
    },
    inquiryRoutingRule: {
      findMany: async () => rules,
    },
    inquiryClassificationAudit: {
      create: async () => ({ id: "audit-new" }),
      findMany: async ({ where }) => audit.filter((a) => a.inquiryId === where.inquiryId),
    },
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

describe("GET /admin/inquiries?dateFrom/dateTo (ADR-0057)", () => {
  it("filters by dateFrom", async () => {
    const db = buildDb({
      inquiries: [
        buildInquiryRecord({ id: "inq-old", createdAt: new Date("2026-01-01T10:00:00Z") }),
        buildInquiryRecord({ id: "inq-new", createdAt: new Date("2026-06-09T10:00:00Z") }),
      ],
    });
    const app = buildTestApp(db);
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries?dateFrom=2026-06-01T00:00:00Z",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.inquiries).toHaveLength(1);
    expect(body.inquiries[0].id).toBe("inq-new");
  });

  it("rejects invalid dateFrom with 400", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries?dateFrom=not-a-date",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /admin/inquiries/classify (ADR-0057) with commit flag", () => {
  it("with commit=true writes audit and returns classification", async () => {
    const db = buildDb();
    const app = buildTestApp(db);
    const res = await app.inject({
      method: "POST",
      url: "/admin/inquiries/classify",
      headers: { ...authHeaders("admin-1"), "content-type": "application/json" },
      payload: JSON.stringify({
        rawMessage: "Wir planen unsere Hochzeit nächstes Jahr.",
        commit: true,
      }),
    });
    expect(res.statusCode).toBe(200);
    const { classification } = res.json();
    expect(classification.businessUnitHint).toBe("PRIVATE_EVENTS");
    expect(classification.matchedKeywords).toContain("hochzeit");
  });

  it("with commit=false does not write audit and still returns classification", async () => {
    const db = buildDb();
    const app = buildTestApp(db);
    const res = await app.inject({
      method: "POST",
      url: "/admin/inquiries/classify",
      headers: { ...authHeaders("admin-1"), "content-type": "application/json" },
      payload: JSON.stringify({
        rawMessage: "Wir planen unsere Hochzeit nächstes Jahr.",
        commit: false,
      }),
    });
    expect(res.statusCode).toBe(200);
    const { classification } = res.json();
    expect(classification.businessUnitHint).toBe("PRIVATE_EVENTS");
  });
});

describe("GET /admin/inquiries/:id/audit (ADR-0057)", () => {
  it("returns PII-sanitized audit history", async () => {
    const db = buildDb({
      audit: [
        buildAuditRow({ id: "a-1" }),
        buildAuditRow({ id: "a-2", matchedKeywords: ["geburtstag"], businessUnitHint: "PRIVATE_EVENTS" }),
      ],
    });
    const app = buildTestApp(db);
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries/inq-1/audit",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.auditEntries).toHaveLength(2);
    expect(body.auditEntries[0].matchedRuleId).toBe("irr-01");
    expect(body.auditEntries[0].matchedKeywords).toContain("hochzeit");
  });

  it("returns 404 for unknown inquiry", async () => {
    const app = buildTestApp(buildDb());
    const res = await app.inject({
      method: "GET",
      url: "/admin/inquiries/unknown/audit",
      headers: authHeaders("admin-1"),
    });
    expect(res.statusCode).toBe(404);
  });
});
