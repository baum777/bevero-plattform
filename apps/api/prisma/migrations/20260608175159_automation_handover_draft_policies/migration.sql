-- ADR-0025: Phase E Shift Handover Draft Endpoints — write policies + grants.
-- Companion to 20260608160000_add_automation_phase_b_tables (schema) and
-- 20260608161000_add_automation_phase_b_rls (read-only RLS + SELECT grants).
--
-- Access matrix (ADR-0025 §RLS / Grant Plan, corrected at acceptance 2026-06-09):
--   ShiftHandoverDraft  read: own shift / manager+ (B-2 policy preserved)
--                         | write: shift lead for own draft; manager+ for team
--                         | write UPDATE: shift lead for own draft AND confirmedAt IS NULL
--                         | write UPDATE (confirm): manager+ sets confirmedAt
--                         | DELETE: none in this slice
--
-- The B-2 migration explicitly notes "Mutation policies are intentionally omitted;
-- RLS denies writes by default until their own ADRs (ADR-0023/0024/0025) add them."
-- This migration adds the two ShiftHandoverDraft write policies per ADR-0025.
--
-- This slice is read+write user path for the three /shift-handover/draft endpoints
-- (GET, PATCH, POST .../confirm). No service-role credential in the user path.
-- No InventoryMovement / InventoryStockSnapshot / WorkflowTask writes from these endpoints.

BEGIN;

-- 1. Write policies on ShiftHandoverDraft for the authenticated role.
-- The org-scope check is delegated to OrganizationMember; the row-scope check
-- (own draft / team draft) is enforced inline.
DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_insert" ON "ShiftHandoverDraft";
CREATE POLICY "shift_handover_draft_lead_or_manager_insert"
ON "ShiftHandoverDraft"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        "ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text
        OR om.role IN ('manager', 'admin', 'owner')
      )
  )
);

DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_update" ON "ShiftHandoverDraft";
CREATE POLICY "shift_handover_draft_lead_or_manager_update"
ON "ShiftHandoverDraft"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        -- Draft path: shift lead editing own un-confirmed draft
        ("ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text
         AND "ShiftHandoverDraft"."confirmedAt" IS NULL)
        OR
        -- Confirm path: manager+ setting confirmedAt
        om.role IN ('manager', 'admin', 'owner')
      )
  )
);

-- 2. Write grants for authenticated and app_runtime.
GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO authenticated;
GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO app_runtime;

-- 3. Regression guard: refuse to apply if the required prerequisites are missing.
-- Same pattern as 20260608165159_automation_mutation_policies and the
-- multi-location RLS migration.
DO $$
DECLARE
  shift_handover_table text := 'public."ShiftHandoverDraft"';
  shift_handover_exists boolean;
  insert_policy_count int;
  update_policy_count int;
  app_runtime_role_count int;
BEGIN
  IF to_regclass(shift_handover_table) IS NULL THEN
    RAISE EXCEPTION 'Required table % is missing; cannot apply ADR-0025 write policies.', shift_handover_table;
  END IF;
  shift_handover_exists := true;

  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ShiftHandoverDraft'
    AND policyname = 'shift_handover_draft_lead_or_manager_insert';

  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ShiftHandoverDraft'
    AND policyname = 'shift_handover_draft_lead_or_manager_update';

  IF insert_policy_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 INSERT policy named shift_handover_draft_lead_or_manager_insert on ShiftHandoverDraft, found %; cannot finalize ADR-0025 write policies.', insert_policy_count;
  END IF;

  IF update_policy_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 UPDATE policy named shift_handover_draft_lead_or_manager_update on ShiftHandoverDraft, found %; cannot finalize ADR-0025 write policies.', update_policy_count;
  END IF;

  SELECT COUNT(*) INTO app_runtime_role_count
  FROM pg_roles
  WHERE rolname = 'app_runtime';

  IF app_runtime_role_count <> 1 THEN
    RAISE EXCEPTION 'Required role app_runtime is missing; cannot apply ADR-0025 write policies.';
  END IF;
END $$;

COMMIT;
