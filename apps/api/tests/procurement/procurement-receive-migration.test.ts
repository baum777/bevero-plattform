import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260602140000_add_procurement_receive_flow/migration.sql"
  ),
  "utf8"
);

describe("procurement receive flow migration contract", () => {
  it("adds the rejection reason and mapping author columns", () => {
    expect(migration).toContain('ALTER TABLE "procurement_order_items"');
    expect(migration).toContain('ADD COLUMN "rejection_reason" TEXT');
    expect(migration).toContain('ADD COLUMN "created_by" TEXT');
  });

  it("links inventory movements back to procurement order items", () => {
    expect(migration).toContain(
      'ALTER TABLE "InventoryMovement"\n  ADD COLUMN "procurement_order_item_id" TEXT'
    );
    expect(migration).toContain(
      'REFERENCES "procurement_order_items" ("id")\n  ON DELETE SET NULL'
    );
    expect(migration).toContain(
      'CREATE INDEX "InventoryMovement_procurement_order_item_id_idx"'
    );
  });

  it("guards delivered and accepted quantities as non-negative", () => {
    expect(migration).toContain('"accepted_qty" IS NULL OR "accepted_qty" >= 0');
    expect(migration).toContain('"delivered_qty" IS NULL OR "delivered_qty" >= 0');
  });
});
