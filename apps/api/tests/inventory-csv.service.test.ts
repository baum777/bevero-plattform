import { describe, expect, it } from "vitest";

import {
  InventoryCsvService,
  parseInventoryCsv,
  serializeInventoryCsv
} from "../src/modules/inventory/inventory-csv.service.js";

describe("inventory CSV service helpers", () => {
  it("serializes inventory rows with stable headers and escaped cells", () => {
    const csv = serializeInventoryCsv([
      {
        name: 'Tomaten, "San Marzano"',
        sku: "TOM-1",
        category: "food",
        defaultUnit: "kg",
        minStock: 2,
        storageLocationName: "Kueche",
        currentStock: 5
      }
    ]);

    expect(csv).toBe(
      'name,sku,category,defaultUnit,minStock,storageLocationName,currentStock\n"Tomaten, ""San Marzano""",TOM-1,food,kg,2,Kueche,5'
    );
  });

  it("parses inventory rows and normalizes optional numbers", () => {
    const rows = parseInventoryCsv(
      'name,sku,category,defaultUnit,minStock,storageLocationName,currentStock\n"Tomaten, rot",TOM,food,kg,1,Kueche,3\nServietten,,,Packung,,,'
    );

    expect(rows).toEqual([
      {
        name: "Tomaten, rot",
        sku: "TOM",
        category: "food",
        defaultUnit: "kg",
        minStock: 1,
        storageLocationName: "Kueche",
        currentStock: 3
      },
      {
        name: "Servietten",
        sku: undefined,
        category: undefined,
        defaultUnit: "Packung",
        minStock: undefined,
        storageLocationName: undefined,
        currentStock: 0
      }
    ]);
  });

  it("fails closed when required CSV headers are missing", () => {
    expect(() => parseInventoryCsv("name,sku\nTomaten,TOM")).toThrow(/CSV header missing/);
  });

  it("writes imported rows and supplier reset with the actor organization", async () => {
    const calls: Array<{ model: string; method: string; args: unknown }> = [];
    const service = new InventoryCsvService({
      now: () => new Date("2026-06-04T10:00:00.000Z"),
      db: {
        async $transaction<T>(callback: (transaction: ReturnType<typeof csvTransaction>) => Promise<T>) {
          return callback(csvTransaction(calls));
        },
        inventoryItem: {
          async findMany() {
            return [];
          }
        }
      }
    });

    await service.importCsv({
      actorOrganizationId: "org-1",
      actorUserId: "admin-1",
      csv: "name,sku,category,defaultUnit,minStock,storageLocationName,currentStock\nTomaten,TOM,food,kg,1,Kueche,3",
      reset: true
    });

    expect(calls).toContainEqual({
      model: "supplier",
      method: "deleteMany",
      args: { where: { organizationId: "org-1" } }
    });
    expect(calls).toContainEqual({
      model: "storageLocation",
      method: "findFirst",
      args: {
        where: {
          name: "Kueche",
          OR: [{ organizationId: "org-1" }, { organizationId: null }]
        }
      }
    });
    expect(calls).toContainEqual({
      model: "storageLocation",
      method: "create",
      args: {
        data: {
          name: "Kueche",
          organizationId: "org-1",
          type: "csv"
        }
      }
    });
    expect(calls).toContainEqual({
      model: "inventoryItem",
      method: "create",
      args: expect.objectContaining({
        data: expect.objectContaining({
          name: "Tomaten",
          organizationId: "org-1",
          storageLocationId: "location-1"
        })
      })
    });
  });
});

function csvTransaction(calls: Array<{ model: string; method: string; args: unknown }>) {
  const countDelegate = (model: string) => ({
    async deleteMany(args: unknown = {}) {
      calls.push({ model, method: "deleteMany", args });
      return { count: 0 };
    }
  });

  return {
    workflowTask: countDelegate("workflowTask"),
    workflowEvent: countDelegate("workflowEvent"),
    inventoryCorrectionRequest: countDelegate("inventoryCorrectionRequest"),
    inventoryStockSnapshot: {
      ...countDelegate("inventoryStockSnapshot"),
      async create(args: unknown) {
        calls.push({ model: "inventoryStockSnapshot", method: "create", args });
        return { id: "snapshot-1" };
      }
    },
    inventoryMovement: {
      ...countDelegate("inventoryMovement"),
      async create(args: unknown) {
        calls.push({ model: "inventoryMovement", method: "create", args });
        return { id: "movement-1" };
      }
    },
    goodsReceiptItem: countDelegate("goodsReceiptItem"),
    goodsReceipt: countDelegate("goodsReceipt"),
    purchaseOrderItem: countDelegate("purchaseOrderItem"),
    purchaseOrder: countDelegate("purchaseOrder"),
    inventoryItem: {
      ...countDelegate("inventoryItem"),
      async create(args: unknown) {
        calls.push({ model: "inventoryItem", method: "create", args });
        return { id: "item-1" };
      }
    },
    supplier: countDelegate("supplier"),
    storageLocation: {
      ...countDelegate("storageLocation"),
      async findFirst(args: unknown) {
        calls.push({ model: "storageLocation", method: "findFirst", args });
        return null;
      },
      async create(args: unknown) {
        calls.push({ model: "storageLocation", method: "create", args });
        return { id: "location-1", name: "Kueche", organizationId: "org-1" };
      }
    }
  };
}
