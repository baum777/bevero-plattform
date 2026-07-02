-- ADR-0029-C: CUBE Event-Economic-Rules — read-only RLS (Slice 3).
-- Companion to 20260609060000_add_cube_event_economics.
--
-- Access matrix (ADR-0029-C §Scope, read-only slice):
--   ExclusiveRentalPolicy    read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   AfterMidnightStaffRate   read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   NonFoodComponent         read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   FurniturePolicy          read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--
-- This slice ships READ-ONLY user paths only (the 4 GET endpoints under
-- /admin/cube/economic/...). Mutation policies are intentionally omitted;
-- RLS denies writes by default. The append-only invariant is enforced at
-- the DB layer via 2 BEFORE UPDATE/DELETE triggers per table (8 triggers
-- total), mirroring the CUBE_Conflict pattern at
-- 20260609050001_add_cube_source_conflict_rls/migration.sql. No
-- app_runtime grant in this slice (read-only slice, matches the
-- OperationalUnit + CUBE_Conflict RLS precedent).
--
-- Defense-in-depth: the DO $$ sanity block at the end of this file
-- asserts that ALL prior append-only triggers (AutomationDecision × 2 +
-- CUBE_Conflict × 2 + CUBE_Economic × 8) are present. The block raises
-- restrict_violation if any is dropped, refusing to apply this migration
-- until the regression is fixed.

BEGIN;

-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE "ExclusiveRentalPolicy"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AfterMidnightStaffRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NonFoodComponent"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FurniturePolicy"        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- GRANTS: SELECT only (defense-in-depth REVOKE follows in a separate
-- migration: 20260609060002_revoke_cube_economic_write_grants)
-- ---------------------------------------------------------------------------

GRANT SELECT ON TABLE "ExclusiveRentalPolicy"  TO authenticated;
GRANT SELECT ON TABLE "AfterMidnightStaffRate" TO authenticated;
GRANT SELECT ON TABLE "NonFoodComponent"       TO authenticated;
GRANT SELECT ON TABLE "FurniturePolicy"        TO authenticated;

-- ---------------------------------------------------------------------------
-- SELECT POLICIES: org-scoped via OrganizationMember join on auth.uid()
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "exclusive_rental_policy_org_member_select" ON "ExclusiveRentalPolicy";
CREATE POLICY "exclusive_rental_policy_org_member_select"
ON "ExclusiveRentalPolicy"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ExclusiveRentalPolicy"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "after_midnight_staff_rate_org_member_select" ON "AfterMidnightStaffRate";
CREATE POLICY "after_midnight_staff_rate_org_member_select"
ON "AfterMidnightStaffRate"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AfterMidnightStaffRate"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "non_food_component_org_member_select" ON "NonFoodComponent";
CREATE POLICY "non_food_component_org_member_select"
ON "NonFoodComponent"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "NonFoodComponent"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "furniture_policy_org_member_select" ON "FurniturePolicy";
CREATE POLICY "furniture_policy_org_member_select"
ON "FurniturePolicy"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "FurniturePolicy"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- ---------------------------------------------------------------------------
-- APPEND-ONLY TRIGGERS (8 total: 2 per table)
-- ---------------------------------------------------------------------------
-- Each of the 4 CUBE_Economic tables is append-only at the DB layer.
-- The future mutation slice (ADR-0029-C.2) will add a WITH CHECK-gated
-- UPDATE policy and relax the trigger to allow the manager-verification
-- path. For now, UPDATE and DELETE are blocked unconditionally, mirroring
-- the AutomationDecision pattern at
-- 20260608161000_add_automation_phase_b_rls:130-152 and the
-- CUBE_Conflict pattern at
-- 20260609050001_add_cube_source_conflict_rls. INSERT is NOT blocked.

CREATE OR REPLACE FUNCTION public.cube_economic_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'CUBE_Economic is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ExclusiveRentalPolicy triggers
CREATE TRIGGER "exclusive_rental_policy_block_update"
  BEFORE UPDATE ON "ExclusiveRentalPolicy"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

CREATE TRIGGER "exclusive_rental_policy_block_delete"
  BEFORE DELETE ON "ExclusiveRentalPolicy"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

-- AfterMidnightStaffRate triggers
CREATE TRIGGER "after_midnight_staff_rate_block_update"
  BEFORE UPDATE ON "AfterMidnightStaffRate"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

CREATE TRIGGER "after_midnight_staff_rate_block_delete"
  BEFORE DELETE ON "AfterMidnightStaffRate"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

-- NonFoodComponent triggers
CREATE TRIGGER "non_food_component_block_update"
  BEFORE UPDATE ON "NonFoodComponent"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

CREATE TRIGGER "non_food_component_block_delete"
  BEFORE DELETE ON "NonFoodComponent"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

-- FurniturePolicy triggers
CREATE TRIGGER "furniture_policy_block_update"
  BEFORE UPDATE ON "FurniturePolicy"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

CREATE TRIGGER "furniture_policy_block_delete"
  BEFORE DELETE ON "FurniturePolicy"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_economic_append_only();

-- ---------------------------------------------------------------------------
-- DEFENSE-IN-DEPTH: verify all prior append-only triggers are present
-- ---------------------------------------------------------------------------
-- This block asserts that the 2 AutomationDecision + 2 CUBE_Conflict +
-- 8 CUBE_Economic append-only triggers are ALL present. If any is
-- dropped, this block raises an exception and refuses to apply the
-- migration. This protects the entire append-only invariant family
-- against future regressions.

DO $$
DECLARE
  block_update_count      integer;
  block_delete_count      integer;
  cube_conflict_update    integer;
  cube_conflict_delete    integer;
  cube_econ_update        integer;
  cube_econ_delete        integer;
BEGIN
  -- AutomationDecision (from 20260608161000)
  SELECT count(*) INTO block_update_count
    FROM pg_trigger WHERE tgname = 'automation_decision_block_update';
  SELECT count(*) INTO block_delete_count
    FROM pg_trigger WHERE tgname = 'automation_decision_block_delete';

  -- CUBE_Conflict (from 20260609050001)
  SELECT count(*) INTO cube_conflict_update
    FROM pg_trigger WHERE tgname = 'cube_conflict_block_update';
  SELECT count(*) INTO cube_conflict_delete
    FROM pg_trigger WHERE tgname = 'cube_conflict_block_delete';

  -- CUBE_Economic × 4 tables (this migration)
  SELECT count(*) INTO cube_econ_update
    FROM pg_trigger
   WHERE tgname IN (
     'exclusive_rental_policy_block_update',
     'after_midnight_staff_rate_block_update',
     'non_food_component_block_update',
     'furniture_policy_block_update'
   );
  SELECT count(*) INTO cube_econ_delete
    FROM pg_trigger
   WHERE tgname IN (
     'exclusive_rental_policy_block_delete',
     'after_midnight_staff_rate_block_delete',
     'non_food_component_block_delete',
     'furniture_policy_block_delete'
   );

  IF block_update_count <> 1 OR block_delete_count <> 1
     OR cube_conflict_update <> 1 OR cube_conflict_delete <> 1
     OR cube_econ_update <> 4 OR cube_econ_delete <> 4
  THEN
    RAISE EXCEPTION
      'Append-only triggers missing: AutomationDecision=(%,%), CUBE_Conflict=(%,%), CUBE_Economic=(%,%). Expected (1,1,1,1,4,4). Refusing to apply ADR-0029-C CUBE event-economic RLS migration because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count,
      cube_conflict_update, cube_conflict_delete,
      cube_econ_update, cube_econ_delete
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

COMMIT;
