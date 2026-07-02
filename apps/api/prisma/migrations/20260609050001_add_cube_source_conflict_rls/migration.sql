-- ADR-0029-B: CUBE Source-Conflict-Validator — read-only RLS (Slice 2).
-- Companion to 20260609050000_add_cube_source_conflict_tables.
--
-- Access matrix (ADR-0029-B §Scope, read-only slice):
--   CUBE_Source        read: org member  | write: NO POLICY (deferred to mutation ADR-0029-B.2)
--   CUBE_SourceField   read: org member  | write: NO POLICY (deferred to mutation ADR-0029-B.2)
--   CUBE_Conflict      read: org member  | write: NO POLICY + DB triggers (append-only)
--
-- This slice ships READ-ONLY user paths only (the 5 GET endpoints under
-- /admin/cube/...). Mutation policies are intentionally omitted; RLS denies
-- writes by default. The CUBE_Conflict append-only invariant is enforced at
-- the DB layer via two BEFORE UPDATE/DELETE triggers (mirroring the
-- AutomationDecision pattern at
-- 20260608161000_add_automation_phase_b_rls:130-152). No app_runtime grant in
-- this slice (read-only slice, matches the OperationalUnit RLS precedent at
-- 20260609040100_add_operational_units_rls).
--
-- Defense-in-depth: the DO $$ sanity block in the middle of this file
-- asserts that the 2 AutomationDecision append-only triggers
-- (block_update, block_delete) from 20260608161000_add_automation_phase_b_rls
-- are still present. The block raises restrict_violation if either was
-- dropped, refusing to apply this migration until the regression is fixed.
-- Same pattern as the OperationalUnit RLS migration at
-- 20260609040100_add_operational_units_rls:83-101.

ALTER TABLE "CUBE_Source"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CUBE_SourceField"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CUBE_Conflict"      ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "CUBE_Source"        TO authenticated;
GRANT SELECT ON TABLE "CUBE_SourceField"   TO authenticated;
GRANT SELECT ON TABLE "CUBE_Conflict"      TO authenticated;

-- CUBE_Source: any organization member may read. Per-source narrowing for
-- non-admin actors is a service-layer concern in the future mutation slice
-- (ADR-0029-B.2); the read-only slice is org-wide.
DROP POLICY IF EXISTS "cube_source_org_member_select" ON "CUBE_Source";
CREATE POLICY "cube_source_org_member_select"
ON "CUBE_Source"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_Source"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- CUBE_SourceField: any organization member may read.
DROP POLICY IF EXISTS "cube_source_field_org_member_select" ON "CUBE_SourceField";
CREATE POLICY "cube_source_field_org_member_select"
ON "CUBE_SourceField"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_SourceField"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- CUBE_Conflict: any organization member may read. Future mutation slice
-- (ADR-0029-B.2) will add a WITH CHECK-gated UPDATE policy for the
-- resolvedBy actor path; the append-only trigger below blocks raw
-- UPDATE/DELETE for now.
DROP POLICY IF EXISTS "cube_conflict_org_member_select" ON "CUBE_Conflict";
CREATE POLICY "cube_conflict_org_member_select"
ON "CUBE_Conflict"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_Conflict"."organizationId"
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
  block_update_count integer;
  block_delete_count integer;
BEGIN
  SELECT count(*) INTO block_update_count
    FROM pg_trigger
   WHERE tgname = 'automation_decision_block_update';

  SELECT count(*) INTO block_delete_count
    FROM pg_trigger
   WHERE tgname = 'automation_decision_block_delete';

  IF block_update_count <> 1 OR block_delete_count <> 1 THEN
    RAISE EXCEPTION
      'AutomationDecision append-only triggers missing: block_update=%, block_delete=% (expected 1, 1). Refusing to apply ADR-0029-B CUBE source-conflict RLS migration because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- CUBE_CONFLICT APPEND-ONLY TRIGGERS
-- ---------------------------------------------------------------------------
-- CUBE_Conflict is append-only at the DB layer. The future mutation slice
-- (ADR-0029-B.2) will add a WITH CHECK-gated UPDATE policy and relax the
-- trigger to allow the manager-resolution path. For now, UPDATE and DELETE
-- are blocked unconditionally, mirroring the AutomationDecision pattern at
-- 20260608161000_add_automation_phase_b_rls:130-152. INSERT is NOT blocked.

CREATE OR REPLACE FUNCTION public.cube_conflict_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'CUBE_Conflict is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cube_conflict_block_update
  BEFORE UPDATE ON "CUBE_Conflict"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_conflict_append_only();

CREATE TRIGGER cube_conflict_block_delete
  BEFORE DELETE ON "CUBE_Conflict"
  FOR EACH ROW
  EXECUTE FUNCTION public.cube_conflict_append_only();
