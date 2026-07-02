-- ADR-0031: Multi-Standort Phase B Data Model — read-only RLS (B-2).
-- Companion to 20260608170000_add_multi_location_tables.
--
-- Access matrix (ADR-0031 §Scope + §Explicit Non-Scope):
--   Brand                    read: org member          | write: NO POLICY (deferred to ADR-0033)
--   Location                 read: org member          | write: NO POLICY (deferred to ADR-0033)
--   Area                     read: org member          | write: NO POLICY (deferred to ADR-0033)
--   LocationMember           read: org member          | write: NO POLICY (deferred to ADR-0033)
--   LocationInventoryConfig  read: org member          | write: NO POLICY (deferred to ADR-0033)
--
-- This slice ships READ-ONLY user paths only (the 7 GET endpoints under
-- /admin/location/...). Mutation policies are intentionally omitted; RLS
-- denies writes by default until ADR-0033 adds them. The Phase B slice is
-- not a write surface per ADR-0030 §Decisions Made Binding §6 and ADR-0031
-- §Explicit Non-Scope §1-2.
--
-- Defense-in-depth: the DO $$ sanity block at the bottom asserts that the
-- AutomationDecision append-only triggers (block_update, block_delete) from
-- 20260608161000_add_automation_phase_b_rls are still present. The block
-- raises restrict_violation if either was dropped, refusing to apply this
-- migration until the regression is fixed. Same pattern as
-- 20260608165159_automation_mutation_policies §Sanity check.

ALTER TABLE "Brand"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Area"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationMember"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationInventoryConfig"  ENABLE ROW LEVEL SECURITY;

-- Browser (authenticated) read path: privilege grants gated by the org-scoped
-- policies below. No app_runtime grant in this slice: Phase B is read-only and
-- the in-memory stub pattern in the vitest fakes does not require a real DB
-- roundtrip. ADR-0033 (admin write APIs) will add the app_runtime grant when
-- the write path lands.

GRANT SELECT ON TABLE "Brand"                    TO authenticated;
GRANT SELECT ON TABLE "Location"                 TO authenticated;
GRANT SELECT ON TABLE "Area"                     TO authenticated;
GRANT SELECT ON TABLE "LocationMember"           TO authenticated;
GRANT SELECT ON TABLE "LocationInventoryConfig"  TO authenticated;

-- Brand: any organization member may read.
DROP POLICY IF EXISTS "brand_org_member_select" ON "Brand";
CREATE POLICY "brand_org_member_select"
ON "Brand"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "Brand"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- Location: any organization member may read. Per-location narrowing for
-- non-admin actors happens at the service layer via LocationMember.userId
-- (ADR-0031 §Decisions Made Binding §1).
DROP POLICY IF EXISTS "location_org_member_select" ON "Location";
CREATE POLICY "location_org_member_select"
ON "Location"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "Location"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- Area: any organization member may read.
DROP POLICY IF EXISTS "area_org_member_select" ON "Area";
CREATE POLICY "area_org_member_select"
ON "Area"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "Area"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- LocationMember: the user reads own row + the OrganizationMember-scope read for
-- admin/manager future use. The service layer filters on
-- LocationMember.userId = actor.userId for non-admin actors.
DROP POLICY IF EXISTS "location_member_org_member_select" ON "LocationMember";
CREATE POLICY "location_member_org_member_select"
ON "LocationMember"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "LocationMember"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- LocationInventoryConfig: any organization member may read.
DROP POLICY IF EXISTS "location_inventory_config_org_member_select" ON "LocationInventoryConfig";
CREATE POLICY "location_inventory_config_org_member_select"
ON "LocationInventoryConfig"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "LocationInventoryConfig"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- ---------------------------------------------------------------------------
-- APPEND-ONLY INVARIANT SANITY CHECK
-- ---------------------------------------------------------------------------
-- The AutomationDecision append-only trigger is enforced by the
-- 20260608161000_add_automation_phase_b_rls migration. This migration MUST NOT
-- drop it. The DO block below raises an exception if the trigger is missing,
-- which makes any accidental future cleanup of the trigger fail this
-- migration's apply step at the gate. Same pattern as
-- 20260608165159_automation_mutation_policies §Sanity check.

DO $$
DECLARE
  update_trigger_count integer;
  delete_trigger_count integer;
BEGIN
  SELECT count(*) INTO update_trigger_count
    FROM pg_trigger
   WHERE tgname = 'automation_decision_block_update';

  SELECT count(*) INTO delete_trigger_count
    FROM pg_trigger
   WHERE tgname = 'automation_decision_block_delete';

  IF update_trigger_count <> 1 OR delete_trigger_count <> 1 THEN
    RAISE EXCEPTION
      'AutomationDecision append-only triggers missing: block_update=%, block_delete=% (expected 1, 1). Refusing to apply ADR-0031 Phase B RLS migration because the audit-trail invariant would be unenforceable.',
      update_trigger_count, delete_trigger_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;
