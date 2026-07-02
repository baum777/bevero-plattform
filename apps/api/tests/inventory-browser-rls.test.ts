import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260601083000_add_inventory_browser_select_rls/migration.sql"
  ),
  "utf8"
);

const hardeningMigration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260601153000_harden_inventory_browser_select_rls/migration.sql"
  ),
  "utf8"
);

const effectiveInventoryBrowserRls = `${migration}\n${hardeningMigration}`;

const authFoundationMigration = readFileSync(
  join(process.cwd(), "prisma/migrations/20260530100255_patch1_auth_foundation/migration.sql"),
  "utf8"
);

const profileRlsMigration = readFileSync(
  join(process.cwd(), "prisma/migrations/20260531132000_harden_user_profile_rls/migration.sql"),
  "utf8"
);

const inventoryQuery = readFileSync(
  join(process.cwd(), "../../apps/cockpit/lib/supabase/queries/inventory.ts"),
  "utf8"
);

const storageQuery = readFileSync(
  join(process.cwd(), "../../apps/cockpit/lib/supabase/queries/storage.ts"),
  "utf8"
);

const movementsPage = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/(app)/movements/page.tsx"),
  "utf8"
);

function policySql(policyName: string) {
  const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = Array.from(
    effectiveInventoryBrowserRls.matchAll(
      new RegExp(`CREATE POLICY "${escapedName}"[\\s\\S]*?;`, "g")
    )
  );
  expect(matches.length, `policy ${policyName} exists`).toBeGreaterThan(0);
  return matches[matches.length - 1]?.[0] ?? "";
}

describe("inventory browser RLS policies", () => {
  it("grants browser read access only to authenticated users", () => {
    expect(migration).toContain('GRANT SELECT ON TABLE "InventoryItem" TO authenticated;');
    expect(migration).toContain('GRANT SELECT ON TABLE "StorageLocation" TO authenticated;');
    expect(migration).toContain(
      'GRANT SELECT ON TABLE "InventoryStockSnapshot" TO authenticated;'
    );
    expect(hardeningMigration).toContain(
      'GRANT SELECT ON TABLE "OrganizationMember" TO authenticated;'
    );
    expect(hardeningMigration).toContain(
      'GRANT SELECT ON TABLE "WorkspaceMember" TO authenticated;'
    );
    expect(hardeningMigration).toContain('GRANT SELECT ON TABLE "UserProfile" TO authenticated;');

    expect(effectiveInventoryBrowserRls).not.toMatch(/TO\s+(anon|public)\b/i);
    expect(effectiveInventoryBrowserRls).not.toMatch(
      /GRANT\s+.*\b(INSERT|UPDATE|DELETE|ALL)\b.*TO\s+authenticated/i
    );
  });

  it("scopes inventory item and storage location reads to the current organization member", () => {
    const itemPolicy = policySql("inventory_item_org_member_select");
    const storagePolicy = policySql("storage_location_org_member_select");

    expect(itemPolicy).toContain("FOR SELECT");
    expect(itemPolicy).toContain("TO authenticated");
    expect(itemPolicy).toContain('"InventoryItem"."organization_id"');
    expect(itemPolicy).toContain('"organization_id" IS NOT NULL');
    expect(itemPolicy).toContain('om."organizationId" = "InventoryItem"."organization_id"');
    expect(itemPolicy).toContain('om."userId" = (SELECT auth.uid())::text');

    expect(storagePolicy).toContain("FOR SELECT");
    expect(storagePolicy).toContain("TO authenticated");
    expect(storagePolicy).toContain('"StorageLocation"."organization_id"');
    expect(storagePolicy).toContain('"organization_id" IS NOT NULL');
    expect(storagePolicy).toContain('om."organizationId" = "StorageLocation"."organization_id"');
    expect(storagePolicy).toContain('om."userId" = (SELECT auth.uid())::text');
  });

  it("relies on existing scoped membership and profile policies for browser role hydration", () => {
    expect(authFoundationMigration).toContain('CREATE POLICY "organization_member_isolation"');
    expect(authFoundationMigration).toContain('CREATE POLICY "workspace_member_isolation"');
    expect(authFoundationMigration).toContain(
      'USING ((SELECT auth.uid())::text = "userId")'
    );
    expect(authFoundationMigration).toContain(
      'om."userId" = (SELECT auth.uid())::text'
    );

    expect(profileRlsMigration).toContain('CREATE POLICY "user_profile_self_or_org_select"');
    expect(profileRlsMigration).toContain('private.can_read_user_profile("authUserId")');
  });

  it("scopes stock snapshots through the owned item and rejects cross-org location leakage", () => {
    const snapshotPolicy = policySql("inventory_stock_snapshot_org_member_select");

    expect(snapshotPolicy).toContain("FOR SELECT");
    expect(snapshotPolicy).toContain("TO authenticated");
    expect(snapshotPolicy).toContain('item."id" = "InventoryStockSnapshot"."inventoryItemId"');
    expect(snapshotPolicy).toContain('item."organization_id" IS NOT NULL');
    expect(snapshotPolicy).toContain('om."organizationId" = item."organization_id"');
    expect(snapshotPolicy).toContain('om."userId" = (SELECT auth.uid())::text');
    expect(snapshotPolicy).toContain('"InventoryStockSnapshot"."storageLocationId" IS NULL');
    expect(snapshotPolicy).toContain('location."id" = "InventoryStockSnapshot"."storageLocationId"');
    expect(snapshotPolicy).toContain('location."organization_id" = item."organization_id"');
    expect(snapshotPolicy).not.toMatch(
      /OR\s+EXISTS\s*\([\s\S]*FROM "StorageLocation" AS location\s+JOIN "OrganizationMember"/
    );
  });

  it("matches the Cockpit movement browser read shape", () => {
    expect(migration).toContain('CREATE POLICY "inventory_item_org_member_select"');
    expect(migration).toContain('CREATE POLICY "storage_location_org_member_select"');
    expect(migration).toContain('CREATE POLICY "inventory_stock_snapshot_org_member_select"');

    expect(movementsPage).toContain("listInventoryItems");
    expect(movementsPage).toContain("listStorageLocations");
    expect(inventoryQuery).toContain('.from("InventoryItem")');
    expect(inventoryQuery).toContain(
      ".select(\"id,name,sku,category,categoryId:category_id,defaultUnit,minStock,targetStock:target_stock,displayOrder:display_order,isActive\")"
    );
    expect(storageQuery).toContain('.from("StorageLocation")');
    expect(storageQuery).toContain(".select(\"id,name,type,isActive,createdAt\")");
    expect(storageQuery).toContain('.from("InventoryStockSnapshot")');
    expect(storageQuery).toContain(".select(\"storageLocationId,quantity,calculatedAt\")");
  });

  it("does not add browser write policies or broad bypasses for inventory master data", () => {
    expect(effectiveInventoryBrowserRls).not.toMatch(/FOR\s+(INSERT|UPDATE|DELETE)/i);
    expect(effectiveInventoryBrowserRls).not.toContain("WITH CHECK");
    expect(effectiveInventoryBrowserRls).not.toContain("USING (true)");
    expect(effectiveInventoryBrowserRls).not.toContain("service_role");
  });
});
