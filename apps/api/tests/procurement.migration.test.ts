import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260602120000_add_procurement_email_ingest/migration.sql"
  ),
  "utf8"
);

describe("procurement email ingest migration contract", () => {
  it("creates all four procurement tables", () => {
    expect(migration).toContain('CREATE TABLE "procurement_mail_imports"');
    expect(migration).toContain('CREATE TABLE "procurement_orders"');
    expect(migration).toContain('CREATE TABLE "procurement_order_items"');
    expect(migration).toContain('CREATE TABLE "article_mappings"');
  });

  it("enforces message_id idempotency and one order per mail", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "procurement_mail_imports_message_id_key"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "procurement_orders_source_mail_import_id_key"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "procurement_orders_org_external_number_key"'
    );
  });

  it("bounds parse confidence between 0 and 1 and quantities non-negative", () => {
    expect(migration).toContain(
      '"parse_confidence" >= 0 AND "parse_confidence" <= 1'
    );
    expect(migration).toContain('"ordered_qty" >= 0');
  });

  it("cascades order items and protects mail import deletion", () => {
    expect(migration).toContain(
      'REFERENCES "procurement_orders" ("id")\n  ON DELETE CASCADE'
    );
    expect(migration).toContain(
      'REFERENCES "procurement_mail_imports" ("id")\n  ON DELETE SET NULL'
    );
  });
});
