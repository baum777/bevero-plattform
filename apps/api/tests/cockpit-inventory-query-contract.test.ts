import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync("../../apps/cockpit/lib/supabase/queries/inventory.ts", "utf8");

describe("cockpit inventory Supabase query contract", () => {
  it("uses PostgREST aliases for Prisma-mapped inventory item columns", () => {
    expect(source).toContain("categoryId:category_id");
    expect(source).toContain("targetStock:target_stock");
    expect(source).toContain("displayOrder:display_order");
    expect(source).toContain("storageLocationId");
    expect(source).not.toContain("categoryId,targetStock");
    expect(source).not.toContain("targetStock,defaultUnit,displayOrder");
  });
});
