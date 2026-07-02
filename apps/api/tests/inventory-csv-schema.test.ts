import { describe, expect, it } from "vitest";

import { importInventoryCsvSchema } from "../src/modules/inventory/inventory.schemas.js";

const header = "name,sku,category,defaultUnit,minStock,storageLocationName,currentStock";

describe("importInventoryCsvSchema limits", () => {
  it("accepts a normal CSV payload", () => {
    const csv = `${header}\nTomaten,TOM,food,kg,1,Kueche,3`;
    expect(importInventoryCsvSchema.safeParse({ csv }).success).toBe(true);
  });

  it("rejects a CSV payload that exceeds the byte limit", () => {
    const bigRow = `\nItem,SKU,food,kg,1,Kueche,${"9".repeat(1024)}`;
    const csv = header + bigRow.repeat(6000);
    const result = importInventoryCsvSchema.safeParse({ csv });
    expect(result.success).toBe(false);
  });

  it("rejects a CSV payload that exceeds the row limit", () => {
    const rows = Array.from({ length: 5001 }, (_, index) => `Item${index},SKU${index},food,kg,1,Kueche,1`);
    const csv = [header, ...rows].join("\n");
    const result = importInventoryCsvSchema.safeParse({ csv });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => /data rows/.test(issue.message))).toBe(true);
    }
  });
});
