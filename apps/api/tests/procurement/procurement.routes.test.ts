import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import type { ProcurementRouteDependencies } from "../../src/routes/procurement.route.js";
import type { ProcurementIngestService } from "../../src/modules/procurement/procurement-ingest.service.js";
import type { ProcurementReadService } from "../../src/modules/procurement/procurement-read.service.js";
import type { ProcurementWriteService } from "../../src/modules/procurement/procurement-write.service.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";

type TestRole = "admin" | "shift_lead" | "staff" | "viewer" | "owner";

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function authHeaders(userId: string): Record<string, string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 }))
  );
  const body = `${header}.${payload}`;
  const signature = toBase64Url(createHmac("sha256", testJwtSecret).update(body).digest());
  return { authorization: `Bearer ${body}.${signature}` };
}

function roleForUser(userId: string): TestRole | null {
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "shift_lead";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("orphan-")) return null;
  return null;
}

const orgRoleMap: Record<TestRole, "owner" | "admin" | "manager" | "staff" | "viewer"> = {
  admin: "admin",
  shift_lead: "manager",
  staff: "staff",
  viewer: "viewer",
  owner: "owner"
};

function fakeProcurement(
  overrides: {
    readService?: Partial<ProcurementReadService>;
    writeService?: Partial<ProcurementWriteService>;
    ingestService?: Partial<ProcurementIngestService>;
  } = {}
): ProcurementRouteDependencies {
  return {
    readService: {
      async listOrders() {
        return {
          data: [
            {
              id: "order-1",
              externalOrderNumber: "FN-12345",
              supplierName: "Metro",
              status: "pending_receipt",
              expectedDeliveryAt: "2026-06-05T00:00:00.000Z",
              itemCount: 18,
              unmappedCount: 2,
              createdAt: "2026-06-02T10:30:00.000Z"
            }
          ],
          pagination: { page: 1, limit: 25, total: 1, hasMore: false }
        };
      },
      async getOrder() {
        return {
          order: {
            id: "order-1",
            externalOrderNumber: "FN-12345",
            supplierName: "Metro",
            status: "pending_receipt",
            source: "mail",
            orderedAt: "2026-06-01T14:00:00.000Z",
            createdAt: "2026-06-02T10:30:00.000Z",
            updatedAt: "2026-06-02T10:30:00.000Z"
          },
          items: [
            {
              id: "item-1",
              lineNumber: 1,
              productNameRaw: "Coca Cola 0,2l",
              unit: "Kiste",
              orderedQty: 24,
              mappingStatus: "pending"
            }
          ]
        };
      },
      async parseFailures24h() {
        return null;
      },
      async mailStatus() {
        return { failureCount24h: 0, status: "healthy" as const };
      },
      ...overrides.readService
    } as unknown as ProcurementReadService,
    writeService: {
      async updateItem() {
        return {
          item: { id: "item-1", mappingStatus: "mapped", inventoryItemId: "inv-1" },
          orderStatus: "ready_to_confirm",
          changed: true
        };
      },
      async receiveOrder() {
        return {
          order: { id: "order-1", status: "received", confirmedAt: "2026-06-02T12:00:00.000Z" },
          movements: ["mv-1"],
          stockUpdates: [{ inventoryItemId: "inv-1", quantity: 24 }]
        };
      },
      ...overrides.writeService
    } as unknown as ProcurementWriteService,
    ingestService: {
      async ingestPoll() {
        return { polled: 0, imported: 0, failed: 0, skippedDkim: 0, duplicates: 0 };
      },
      ...overrides.ingestService
    } as unknown as ProcurementIngestService,
    auth: {
      jwtSecret: testJwtSecret,
      db: {
        organizationMember: {
          async findMany(args: { where: { userId: string } }) {
            const role = roleForUser(args.where.userId);
            if (!role) {
              return [];
            }
            return [
              {
                organizationId: testOrganizationId,
                role: orgRoleMap[role],
                createdAt: new Date("2026-05-30T10:00:00.000Z")
              }
            ];
          }
        }
      } as unknown as NonNullable<ProcurementRouteDependencies["auth"]>["db"]
    }
  };
}

function buildProcurementApp(overrides = {}) {
  return buildApp({
    env: { NODE_ENV: "test", SUPABASE_JWT_SECRET: testJwtSecret },
    inventory: undefined,
    procurement: fakeProcurement(overrides)
  });
}

describe("procurement API routes", () => {
  it("rejects unauthenticated requests", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({ method: "GET", url: "/procurement/orders" });
      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("forbids users without an organization membership", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/procurement/orders",
        headers: authHeaders("orphan-1")
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("forbids staff from the lead-only orders list", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/procurement/orders",
        headers: authHeaders("staff-1")
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("returns a paginated order list for a shift lead", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/procurement/orders?status=pending_receipt&page=1&limit=25",
        headers: authHeaders("shift-1")
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject({ externalOrderNumber: "FN-12345", unmappedCount: 2 });
      expect(body.pagination).toMatchObject({ page: 1, total: 1, hasMore: false });
    } finally {
      await app.close();
    }
  });

  it("rejects an out-of-range limit", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/procurement/orders?limit=500",
        headers: authHeaders("admin-1")
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("returns an order detail with items", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/procurement/orders/order-1",
        headers: authHeaders("shift-1")
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.order.externalOrderNumber).toBe("FN-12345");
      expect(body.items[0]).toMatchObject({ productNameRaw: "Coca Cola 0,2l", orderedQty: 24 });
    } finally {
      await app.close();
    }
  });

  it("exposes parse failures only to admins", async () => {
    const app = buildProcurementApp({
      readService: {
        async parseFailures24h() {
          return {
            failureCount: 2,
            lastFailureAt: "2026-06-02T09:00:00.000Z",
            failedMailIds: ["import-1", "import-2"],
            suggestedAction: "Review failed mails"
          };
        }
      }
    });
    try {
      const forbidden = await app.inject({
        method: "GET",
        url: "/procurement/health/parse-failures-24h",
        headers: authHeaders("shift-1")
      });
      expect(forbidden.statusCode).toBe(403);

      const ok = await app.inject({
        method: "GET",
        url: "/procurement/health/parse-failures-24h",
        headers: authHeaders("admin-1")
      });
      expect(ok.statusCode).toBe(200);
      expect(ok.json().failureCount).toBe(2);
    } finally {
      await app.close();
    }
  });

  it("lets a shift lead patch an order item", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/procurement/orders/order-1/items/item-1",
        headers: authHeaders("shift-1"),
        payload: { inventory_item_id: "inv-1" }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ orderStatus: "ready_to_confirm" });
    } finally {
      await app.close();
    }
  });

  it("rejects a patch body with unknown fields", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/procurement/orders/order-1/items/item-1",
        headers: authHeaders("shift-1"),
        payload: { bogus: true }
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("forbids staff from receiving an order", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/procurement/orders/order-1/receive",
        headers: authHeaders("staff-1"),
        payload: { items: [{ item_id: "item-1", accepted_qty: 24 }] }
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("confirms a receive for a shift lead", async () => {
    const app = buildProcurementApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/procurement/orders/order-1/receive",
        headers: authHeaders("shift-1"),
        payload: { items: [{ item_id: "item-1", accepted_qty: 24 }] }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ order: { status: "received" } });
    } finally {
      await app.close();
    }
  });

  it("propagates a write-service conflict as a 409", async () => {
    const app = buildProcurementApp({
      writeService: {
        async receiveOrder() {
          const { InventoryConflictError } = await import(
            "../../src/modules/inventory/errors.js"
          );
          throw new InventoryConflictError("order already confirmed");
        }
      }
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/procurement/orders/order-1/receive",
        headers: authHeaders("shift-1"),
        payload: { items: [{ item_id: "item-1", accepted_qty: 24 }] }
      });
      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ error: "InventoryConflict" });
    } finally {
      await app.close();
    }
  });

  it("exposes stuck-orders only to admins", async () => {
    const app = buildProcurementApp({
      readService: {
        async stuckOrders() {
          return { count: 1, thresholdHours: 48, orders: [] };
        }
      }
    });
    try {
      const forbidden = await app.inject({
        method: "GET",
        url: "/procurement/health/stuck-orders",
        headers: authHeaders("shift-1")
      });
      expect(forbidden.statusCode).toBe(403);

      const ok = await app.inject({
        method: "GET",
        url: "/procurement/health/stuck-orders",
        headers: authHeaders("admin-1")
      });
      expect(ok.statusCode).toBe(200);
      expect(ok.json().count).toBe(1);
    } finally {
      await app.close();
    }
  });

  it("triggers a manual mail-check poll for admins", async () => {
    const app = buildProcurementApp({
      ingestService: {
        async ingestPoll() {
          return { polled: 5, imported: 3, failed: 1, skippedDkim: 1, duplicates: 0 };
        }
      }
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/procurement/ingest/mail-check",
        headers: authHeaders("admin-1")
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ polled: 5, imported: 3 });
    } finally {
      await app.close();
    }
  });

  it("exposes the FoodNotify integration import run alias only to admins", async () => {
    const app = buildProcurementApp({
      ingestService: {
        async ingestPoll() {
          return {
            found: 2,
            polled: 2,
            imported: 1,
            failed: 0,
            skippedDkim: 0,
            duplicates: 1,
            ignored: 0
          };
        }
      }
    });
    try {
      const forbidden = await app.inject({
        method: "POST",
        url: "/integrations/foodnotify/email-import/run",
        headers: authHeaders("shift-1")
      });
      expect(forbidden.statusCode).toBe(403);

      const ok = await app.inject({
        method: "POST",
        url: "/integrations/foodnotify/email-import/run",
        headers: authHeaders("admin-1")
      });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toMatchObject({ found: 2, imported: 1, duplicates: 1 });
    } finally {
      await app.close();
    }
  });
});
