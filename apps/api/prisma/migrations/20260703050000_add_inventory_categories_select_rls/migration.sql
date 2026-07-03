-- Close the last cockpit direct-read RLS gap: inventory_categories was only
-- covered by the generic service-role policy, so authenticated user-session
-- reads were fail-closed (empty category groupings in the inventory browser).
-- Pattern follows 20260601083000_add_inventory_browser_select_rls.
-- ADR: docs/architecture/adr-rls-cockpit-reads.md
--
-- Global template rows (organization_id IS NULL) are readable: they are by
-- design the shared category set — seeded in 20260601190000 with
-- ON CONFLICT DO NOTHING and a unique index scoped to organization_id IS NULL,
-- no migration or API code creates per-org copies, and
-- InventoryItem.category_id references these template ids directly. They carry
-- no tenant data. Org-specific rows remain strictly membership-scoped.
-- SELECT only: the cockpit never writes categories; writes stay on the
-- service-role API path.

GRANT SELECT ON TABLE "inventory_categories" TO authenticated;

DROP POLICY IF EXISTS "inventory_categories_org_member_select" ON "inventory_categories";
CREATE POLICY "inventory_categories_org_member_select"
ON "inventory_categories"
FOR SELECT
TO authenticated
USING (
  -- Global template categories (shared, tenant-free by design).
  "organization_id" IS NULL
  -- Org-specific categories: only for members of that organization.
  OR EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "inventory_categories"."organization_id"
      AND om."userId" = (SELECT auth.uid())::text
  )
);
