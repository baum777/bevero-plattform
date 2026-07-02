-- ADR-0023: Automation mutation surface — write policies + grants.
-- Forward-only. Rollback is the manual DROP/REVOKE script documented in ADR-0023 §Rollback Plan
-- and reproduced below in a sibling down.sql.
--
-- The B-2 migration (20260608161000_add_automation_phase_b_rls) shipped read-only policies and SELECT
-- grants. This migration opens the write path that ADR-0023 authorizes (4 mutation endpoints):
--   POST /admin/automation/suggestions/:id/approve   (manager+, role-rank >= 3)
--   POST /admin/automation/suggestions/:id/reject    (manager+, role-rank >= 3)
--   POST /admin/automation/rules                      (admin+,   role-rank >= 4)
--   PATCH /admin/automation/rules/:id                 (admin+,   role-rank >= 4)
--
-- The route handlers resolve the caller's effective role BEFORE the Prisma call (per AGENTS.md
-- and the ADR-0023 RLS/Grant Plan table note: "admin+ via row-level policy WITH CHECK that
-- asserts the caller's effective role (resolved by the Fastify handler before the Prisma call) is
-- owner / admin in the same org"). The policies below encode the same check at the DB layer as
-- defense-in-depth; the route role gate is the primary boundary.
--
-- Append-only invariant: the B-2 BEFORE UPDATE and BEFORE DELETE triggers on AutomationDecision
-- are NOT touched. A sanity check at the bottom of this migration verifies the trigger is still
-- present (in case a future migration accidentally drops it).

-- ---------------------------------------------------------------------------
-- WRITE POLICIES
-- ---------------------------------------------------------------------------

-- AutomationRule: INSERT + UPDATE for admin+ in the same org.
-- DELETE is intentionally not granted: the only deletion path is soft-delete (deletedAt),
-- handled by UPDATE. The B-2 SELECT policy remains unchanged.
DROP POLICY IF EXISTS "automation_rule_admin_insert" ON "AutomationRule";
CREATE POLICY "automation_rule_admin_insert"
ON "AutomationRule"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AutomationRule"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND om."role" IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "automation_rule_admin_update" ON "AutomationRule";
CREATE POLICY "automation_rule_admin_update"
ON "AutomationRule"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AutomationRule"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND om."role" IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AutomationRule"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND om."role" IN ('owner', 'admin')
  )
);

-- AutomationSuggestion: INSERT for app_runtime only.
-- UI never writes; the rule engine and the new approve/reject endpoints (acting on behalf of the
-- backend) write via app_runtime. Suggestions are immutable per ADR-0021 §3: no UPDATE, no DELETE.
DROP POLICY IF EXISTS "automation_suggestion_app_runtime_insert" ON "AutomationSuggestion";
CREATE POLICY "automation_suggestion_app_runtime_insert"
ON "AutomationSuggestion"
FOR INSERT
TO app_runtime
WITH CHECK (true);

-- AutomationDecision: INSERT for app_runtime only.
-- The B-2 BEFORE UPDATE / BEFORE DELETE triggers remain in force; this migration does NOT add
-- any UPDATE/DELETE policy because the triggers are unconditional and sufficient.
DROP POLICY IF EXISTS "automation_decision_app_runtime_insert" ON "AutomationDecision";
CREATE POLICY "automation_decision_app_runtime_insert"
ON "AutomationDecision"
FOR INSERT
TO app_runtime
WITH CHECK (true);

-- ShiftHandoverDraft: INSERT + UPDATE for the shift lead (own draft) or manager+ (team).
-- The confirm path (Phase E) is the first consumer; ADR-0025 widens the write surface later.
DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_insert" ON "ShiftHandoverDraft";
CREATE POLICY "shift_handover_draft_lead_or_manager_insert"
ON "ShiftHandoverDraft"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        ("ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text AND om."role" IN ('owner', 'admin', 'manager', 'staff'))
        OR om."role" IN ('owner', 'admin', 'manager')
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
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        ("ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text AND om."role" IN ('owner', 'admin', 'manager', 'staff'))
        OR om."role" IN ('owner', 'admin', 'manager')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        ("ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text AND om."role" IN ('owner', 'admin', 'manager', 'staff'))
        OR om."role" IN ('owner', 'admin', 'manager')
      )
  )
);

-- ---------------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------------
-- `authenticated` and `app_runtime` need write privileges for the policies above to take effect.
-- RLS still applies (per ADR-0017: app_runtime is NOBYPASSRLS, NOLOGIN).
-- No service-role credential is introduced.

GRANT INSERT, UPDATE ON TABLE "AutomationRule" TO authenticated;
GRANT INSERT, UPDATE ON TABLE "AutomationRule" TO app_runtime;

GRANT INSERT ON TABLE "AutomationSuggestion" TO app_runtime;

GRANT INSERT ON TABLE "AutomationDecision" TO app_runtime;

GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO authenticated;
GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO app_runtime;

-- ---------------------------------------------------------------------------
-- APPEND-ONLY INVARIANT SANITY CHECK
-- ---------------------------------------------------------------------------
-- The AutomationDecision append-only trigger is enforced by the B-2 migration. This migration
-- MUST NOT drop it. The DO block below raises an exception if the trigger is missing, which makes
-- any accidental future cleanup of the trigger fail this migration's apply step at the gate.

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
      'AutomationDecision append-only triggers missing: block_update=%, block_delete=% (expected 1, 1). Refusing to apply ADR-0023 mutation policy migration because the audit-trail invariant would be unenforceable.',
      update_trigger_count, delete_trigger_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;
