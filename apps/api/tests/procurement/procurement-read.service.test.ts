import { describe, expect, it } from "vitest";

import { InventoryNotFoundError } from "../../src/modules/inventory/errors.js";
import {
  ProcurementReadService,
  type ProcurementReadDatabaseClient
} from "../../src/modules/procurement/procurement-read.service.js";

const now = () => new Date("2026-06-02T12:00:00.000Z");

describe("ProcurementReadService", () => {
  it("scopes the list to the organization, counts unmapped items and computes hasMore", async () => {
    const captured: { where?: unknown; skip?: number; take?: number } = {};
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany(args) {
          captured.where = args.where;
          captured.skip = args.skip;
          captured.take = args.take;
          return [
            {
              id: "order-1",
              externalOrderNumber: "FN-1",
              supplierName: "Metro",
              status: "pending_receipt",
              expectedDeliveryAt: new Date("2026-06-05T00:00:00.000Z"),
              createdAt: new Date("2026-06-02T10:00:00.000Z"),
              items: [{ mappingStatus: "pending" }, { mappingStatus: "mapped" }]
            }
          ];
        },
        async count() {
          return 60;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    const result = await service.listOrders("org-1", {
      status: "pending_receipt",
      page: 2,
      limit: 25
    });

    expect(captured.where).toMatchObject({ organizationId: "org-1", status: "pending_receipt" });
    expect(captured.skip).toBe(25);
    expect(captured.take).toBe(25);
    expect(result.data[0]).toMatchObject({ itemCount: 2, unmappedCount: 1 });
    expect(result.pagination).toEqual({ page: 2, limit: 25, total: 60, hasMore: true });
  });

  it("throws a 404 when the order belongs to another organization", async () => {
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany() {
          return [];
        },
        async count() {
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    await expect(service.getOrder("org-1", "missing")).rejects.toBeInstanceOf(InventoryNotFoundError);
  });

  it("filters order list by source for FoodNotify pending receipts", async () => {
    const captured: { where?: unknown } = {};
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany(args) {
          captured.where = args.where;
          return [];
        },
        async count(args) {
          captured.where = args.where;
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    await service.listOrders("org-1", {
      source: "foodnotify_email",
      status: "pending_receipt",
      page: 1,
      limit: 25
    });

    expect(captured.where).toMatchObject({
      organizationId: "org-1",
      source: "foodnotify_email",
      status: "pending_receipt"
    });
  });

  it("returns an alert only when failures exceed the threshold", async () => {
    const failures = [
      {
        id: "import-2",
        messageId: "<b>",
        subject: "x",
        from: "noreply@foodnotify.com",
        parseErrorMsg: "low confidence",
        parseConfidence: 0.4,
        createdAt: new Date("2026-06-02T11:00:00.000Z")
      },
      {
        id: "import-1",
        messageId: "<a>",
        subject: "y",
        from: "noreply@foodnotify.com",
        parseErrorMsg: "low confidence",
        parseConfidence: 0.3,
        createdAt: new Date("2026-06-02T09:00:00.000Z")
      }
    ];
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany() {
          return [];
        },
        async count() {
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return failures;
        },
        async findFirst() {
          return { createdAt: new Date("2026-06-02T11:30:00.000Z") };
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const lenient = new ProcurementReadService({ db, failureAlertThreshold: 5, now });
    expect(await lenient.parseFailures24h("org-1")).toBeNull();

    const strict = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    const alert = await strict.parseFailures24h("org-1");
    expect(alert).toMatchObject({
      failureCount: 2,
      lastFailureAt: "2026-06-02T11:00:00.000Z",
      failedMailIds: ["import-2", "import-1"]
    });

    const status = await strict.mailStatus("org-1");
    expect(status).toMatchObject({ failureCount24h: 2, status: "alert" });
  });

  it("reports stuck orders older than the threshold with their age", async () => {
    let capturedWhere: unknown;
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany(args) {
          capturedWhere = args.where;
          return [
            {
              id: "order-stuck",
              externalOrderNumber: "FN-9",
              supplierName: "Metro",
              status: "needs_mapping",
              expectedDeliveryAt: null,
              createdAt: new Date("2026-05-30T12:00:00.000Z"),
              items: []
            }
          ];
        },
        async count() {
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    const result = await service.stuckOrders("org-1");

    expect(capturedWhere).toMatchObject({
      organizationId: "org-1",
      status: { in: expect.arrayContaining(["needs_mapping"]) }
    });
    expect(result).toMatchObject({ count: 1, thresholdHours: 48 });
    expect(result.orders[0]).toMatchObject({ id: "order-stuck", ageHours: 72 });
  });

  it("scopes receive errors to the organization recorded in the event", async () => {
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany() {
          return [];
        },
        async count() {
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [
            {
              externalId: "order-1",
              occurredAt: new Date("2026-06-02T11:00:00.000Z"),
              dataJson: { organizationId: "org-1", reason: "duplicate receive" }
            },
            {
              externalId: "order-2",
              occurredAt: new Date("2026-06-02T10:00:00.000Z"),
              dataJson: { organizationId: "org-other", reason: "x" }
            }
          ];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    const result = await service.receiveErrors("org-1");

    expect(result.count).toBe(1);
    expect(result.errors[0]).toMatchObject({ orderId: "order-1", reason: "duplicate receive" });
  });

  it("flags negative stock snapshots as integrity violations", async () => {
    const db: ProcurementReadDatabaseClient = {
      procurementOrder: {
        async findMany() {
          return [];
        },
        async count() {
          return 0;
        },
        async findFirst() {
          return null;
        }
      },
      procurementMailImport: {
        async findMany() {
          return [];
        },
        async findFirst() {
          return null;
        }
      },
      workflowEvent: {
        async findMany() {
          return [];
        }
      },
      inventoryStockSnapshot: {
        async findMany() {
          return [
            { inventoryItemId: "inv-1", storageLocationId: "loc-1", quantity: -3, unit: "Kiste" }
          ];
        }
      }
    };

    const service = new ProcurementReadService({ db, failureAlertThreshold: 0, now });
    const result = await service.snapshotIntegrity("org-1");

    expect(result).toMatchObject({ ok: false, violationCount: 1 });
    expect(result.violations[0]).toMatchObject({ inventoryItemId: "inv-1", quantity: -3 });
  });
});
