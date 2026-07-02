import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260601190000_add_bar_refill_and_inventory_categories/migration.sql"
  ),
  "utf8"
);

describe("bar refill migration contract", () => {
  it("creates required tables and enum types", () => {
    expect(migration).toContain('CREATE TYPE "BarRefillRunStatus"');
    expect(migration).toContain('CREATE TYPE "BarRefillRunItemStatus"');
    expect(migration).toContain('CREATE TABLE "inventory_categories"');
    expect(migration).toContain('CREATE TABLE "bar_refill_template_items"');
    expect(migration).toContain('CREATE TABLE "bar_refill_runs"');
    expect(migration).toContain('CREATE TABLE "bar_refill_run_items"');
  });

  it("adds constraints for one open run per local day and non-negative quantities", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "bar_refill_runs_open_per_day_key"');
    expect(migration).toContain('"status" IN (\'open\', \'partially_confirmed\')');
    expect(migration).toContain('ADD CONSTRAINT "bar_refill_run_items_requested_quantity_check"');
    expect(migration).toContain('"requested_quantity" IS NULL OR "requested_quantity" >= 0');
  });

  it("seeds all 43 template rows and keeps Sonstiges at position 43", () => {
    const templateIds = migration.match(/bar-template-\d+/g) ?? [];
    expect(new Set(templateIds).size).toBe(43);
    expect(migration).toContain("('bar-template-43', NULL, 43, 'Sonstiges', '-', NULL, NULL, true, true)");
  });
});
