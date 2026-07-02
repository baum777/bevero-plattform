import { describe, expect, it } from "vitest";

import { createTransferSchema } from "../src/modules/inventory/inventory.schemas.js";

describe("transfer request schema", () => {
  it("accepts a valid transfer payload", () => {
    const result = createTransferSchema.safeParse({
      inventoryItemId: "item-1",
      quantity: 2,
      unit: "Stück",
      fromStorageLocationId: "loc-a",
      toStorageLocationId: "loc-b",
      note: "mise en place"
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = createTransferSchema.safeParse({
      inventoryItemId: "item-1",
      quantity: 0,
      unit: "Stück",
      fromStorageLocationId: "loc-a",
      toStorageLocationId: "loc-b"
    });

    expect(result.success).toBe(false);
  });

  it("rejects identical source and target locations", () => {
    const result = createTransferSchema.safeParse({
      inventoryItemId: "item-1",
      quantity: 1,
      unit: "Stück",
      fromStorageLocationId: "loc-a",
      toStorageLocationId: "loc-a"
    });

    expect(result.success).toBe(false);
  });
});
