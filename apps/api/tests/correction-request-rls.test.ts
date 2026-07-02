import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260619_add_correction_request_evidence_fields/migration.sql"
  ),
  "utf8"
);

const existingInventoryBrowserRls = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260601083000_add_inventory_browser_select_rls/migration.sql"
  ),
  "utf8"
);

const enableRlsMigration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260527202000_enable_public_table_rls/migration.sql"
  ),
  "utf8"
);

const allRlsMigration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260617_enable_rls_all_tables/migration.sql"
  ),
  "utf8"
);

describe("InventoryCorrectionRequest RLS hardening", () => {
  it("adds the org-scoped evidence columns expected by the Phase 2 kitchen workflow", () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "organization_id"    TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "storage_location_id" TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "note"               TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "expected_quantity"  DOUBLE PRECISION');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "counted_quantity"   DOUBLE PRECISION');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "source_label"       TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "submitted_at"       TIMESTAMPTZ');
  });

  it("adds a foreign key from storage_location_id to StorageLocation", () => {
    expect(migration).toContain('FOREIGN KEY ("storage_location_id")');
    expect(migration).toContain('REFERENCES "public"."StorageLocation" ("id")');
    expect(migration).toContain(
      'InventoryCorrectionRequest_storage_location_id_fkey'
    );
  });

  it("adds the new indexes for org-scoped reads, storage lookup, and chronological order", () => {
    expect(migration).toContain(
      '"InventoryCorrectionRequest_organization_id_status_created_at_idx"'
    );
    expect(migration).toContain(
      '"InventoryCorrectionRequest_storage_location_id_idx"'
    );
    expect(migration).toContain(
      '"InventoryCorrectionRequest_created_at_idx"'
    );
  });

  it("uses explicit `TO authenticated` clauses for browser reads and avoids auth.role()", () => {
    expect(migration).toContain("FOR SELECT");
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain(
      'CREATE POLICY "inventory_correction_request_org_member_select"'
    );
    expect(migration).not.toMatch(/TO\s+public\b/i);
    expect(migration).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)/i);
    expect(migration).not.toMatch(/USING\s*\(\s*auth\.role\s*\(/i);
    expect(migration).not.toMatch(/WITH\s+CHECK\s*\(\s*auth\.role\s*\(/i);
  });

  it("scopes browser reads to the current organization member", () => {
    expect(migration).toContain('"organization_id" IS NOT NULL');
    expect(migration).toContain('om."organizationId" = "InventoryCorrectionRequest"."organization_id"');
    expect(migration).toContain('om."userId" = (SELECT auth.uid())::text');
  });

  it("grants browser read access only to authenticated users and keeps service_role writers intact", () => {
    expect(migration).toContain(
      'GRANT SELECT ON TABLE "public"."InventoryCorrectionRequest" TO authenticated;'
    );
    expect(migration).not.toMatch(/GRANT\s+.*\b(INSERT|UPDATE|DELETE|ALL)\b.*TO\s+authenticated/i);
    expect(allRlsMigration).toContain("USING (auth.role() = ''service_role'')");
  });

  it("preserves the RLS-enable invariant from prior migrations", () => {
    expect(enableRlsMigration).toContain(
      'ALTER TABLE "InventoryCorrectionRequest" ENABLE ROW LEVEL SECURITY;'
    );
    expect(existingInventoryBrowserRls).toContain('GRANT SELECT ON TABLE "InventoryItem" TO authenticated;');
  });
});
