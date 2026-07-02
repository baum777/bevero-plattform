import { describe, expect, it } from "vitest";

import { InventoryMasterDataService } from "../src/modules/inventory/inventory-master-data.service.js";

describe("InventoryMasterDataService", () => {
  it("lists active suppliers from the actor organization plus legacy global suppliers", async () => {
    const calls: unknown[] = [];
    const service = new InventoryMasterDataService({
      db: {
        supplier: {
          async findMany(args: unknown) {
            calls.push(args);
            return [
              {
                id: "supplier-org",
                organizationId: "org-1",
                name: "Org Supplier",
                email: null,
                phone: null,
                isActive: true
              },
              {
                id: "supplier-global",
                organizationId: null,
                name: "Legacy Supplier",
                email: null,
                phone: null,
                isActive: true
              }
            ];
          }
        },
        storageLocation: {
          async findMany(args: unknown) {
            calls.push(args);
            return [];
          }
        },
        inventoryItem: {
          async findMany() {
            return [];
          }
        },
        purchaseOrder: {
          async findMany() {
            return [];
          }
        }
      },
      inventoryReadService: {
        async listStock() {
          return [];
        },
        async listMovements() {
          return [];
        },
        async listOpenReviewTasks() {
          return [];
        },
        async listCorrectionRequests() {
          return [];
        },
        async listStockByLocation() {
          return [];
        }
      }
    });

    const result = await service.list("org-1");

    expect(calls[0]).toEqual({
      where: {
        isActive: true,
        OR: [{ organizationId: "org-1" }, { organizationId: null }]
      },
      orderBy: {
        name: "asc"
      }
    });
    expect(calls[1]).toEqual({
      where: {
        isActive: true,
        name: {
          notIn: [
            "Trockenlager",
            "Transferpunkt Kühlwagen",
            "Kühlhaus",
            "Gefrierschrank 1",
            "Gefrierschrank 2"
          ]
        }
      },
      orderBy: {
        name: "asc"
      }
    });
    expect(result.suppliers.map((supplier) => supplier.supplierId)).toEqual([
      "supplier-org",
      "supplier-global"
    ]);
  });
});
