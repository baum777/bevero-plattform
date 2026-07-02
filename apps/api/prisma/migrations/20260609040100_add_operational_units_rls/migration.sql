-- ADR-0029-A: CUBE Venue-Model Implementation — read-only RLS (Slice 1).
-- Companion to 20260609040000_add_operational_units.
--
-- Access matrix (ADR-0029-A §Scope, read-only slice):
--   OperationalUnit  read: org member  | write: NO POLICY (deferred to mutation ADR)
--   ServiceSlot      read: org member  | write: NO POLICY (deferred to mutation ADR)
--   GroupRule        read: org member  | write: NO POLICY (deferred to mutation ADR)
--
-- This slice ships READ-ONLY user paths only (the 4 GET endpoints under
-- /admin/operational-units/...). Mutation policies are intentionally omitted;
-- RLS denies writes by default. No app_runtime grant in this slice (read-only,
-- same as ADR-0031 Phase B). Per-location narrowing for non-admin actors is a
-- service-layer concern via LocationMember.userId, identical to ADR-0031.
--
-- Defense-in-depth: the DO $$ sanity block at the bottom asserts that the
-- AutomationDecision append-only triggers (block_update, block_delete) from
-- 20260608161000_add_automation_phase_b_rls are still present. The block
-- raises restrict_violation if either was dropped, refusing to apply this
-- migration until the regression is fixed. Same pattern as ADR-0031 Phase B RLS.

ALTER TABLE "OperationalUnit"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceSlot"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupRule"        ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "OperationalUnit"  TO authenticated;
GRANT SELECT ON TABLE "ServiceSlot"      TO authenticated;
GRANT SELECT ON TABLE "GroupRule"        TO authenticated;

-- OperationalUnit: any organization member may read. Per-location narrowing for
-- non-admin actors happens at the service layer via LocationMember.userId
-- (ADR-0030 §Decisions §1: profile is the discriminator, not the name).
DROP POLICY IF EXISTS "operational_unit_org_member_select" ON "OperationalUnit";
CREATE POLICY "operational_unit_org_member_select"
ON "OperationalUnit"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "OperationalUnit"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- ServiceSlot: any organization member may read.
DROP POLICY IF EXISTS "service_slot_org_member_select" ON "ServiceSlot";
CREATE POLICY "service_slot_org_member_select"
ON "ServiceSlot"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ServiceSlot"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- GroupRule: any organization member may read.
DROP POLICY IF EXISTS "group_rule_org_member_select" ON "GroupRule";
CREATE POLICY "group_rule_org_member_select"
ON "GroupRule"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "GroupRule"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- ---------------------------------------------------------------------------
-- APPEND-ONLY INVARIANT SANITY CHECK
-- ---------------------------------------------------------------------------
-- The AutomationDecision append-only trigger is enforced by the
-- 20260608161000_add_automation_phase_b_rls migration. This migration MUST NOT
-- drop it. The DO block below raises an exception if the trigger is missing.

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
      'AutomationDecision append-only triggers missing: block_update=%, block_delete=% (expected 1, 1). Refusing to apply ADR-0029-A operational-units RLS migration because the audit-trail invariant would be unenforceable.',
      update_trigger_count, delete_trigger_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;
