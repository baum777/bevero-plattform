-- ADR-0022: Phase B Rules Engine MVP — RLS + append-only enforcement (B-2).
-- Companion to 20260608160000_add_automation_phase_b_tables.
--
-- Access matrix (ADR-0022 §RLS Plan):
--   AutomationRule        read: org member          | write: admin+ (endpoint-enforced; no write policy in this slice)
--   AutomationSuggestion  read: org member          | write: server-only via app_runtime
--   AutomationDecision    read: manager+ (via join) | append-only, DB trigger blocks UPDATE/DELETE
--   OfflineActionQueue    read: row owner           | write: row owner (no write policy in this slice)
--   ShiftHandoverDraft    read: own shift / manager+ | write: shift lead / manager+ (no write policy in this slice)
--
-- This slice ships READ-ONLY user paths only (GET /automation/rules, POST .../test-dry-run).
-- Mutation policies are intentionally omitted; RLS denies writes by default until their own ADRs
-- (ADR-0023/0024/0025) add them. The AutomationDecision append-only trigger is in scope here
-- because it is a database-enforced invariant required by ADR-0022 §Test Plan gate 6.

ALTER TABLE "AutomationRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfflineActionQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftHandoverDraft" ENABLE ROW LEVEL SECURITY;

-- Browser (authenticated) read path: privilege grants gated by the org-scoped policies below.
GRANT SELECT ON TABLE "AutomationRule" TO authenticated;
GRANT SELECT ON TABLE "AutomationSuggestion" TO authenticated;
GRANT SELECT ON TABLE "AutomationDecision" TO authenticated;
GRANT SELECT ON TABLE "OfflineActionQueue" TO authenticated;
GRANT SELECT ON TABLE "ShiftHandoverDraft" TO authenticated;

-- Backend runtime read path (ADR-0017 app_runtime). Mirrors 20260530211000.
DO $$
DECLARE
  target_table text;
  target_tables text[] := ARRAY[
    'public."AutomationRule"',
    'public."AutomationSuggestion"',
    'public."AutomationDecision"',
    'public."OfflineActionQueue"',
    'public."ShiftHandoverDraft"'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    RAISE EXCEPTION 'Required role app_runtime is missing; cannot apply automation Phase B grant slice.';
  END IF;

  FOREACH target_table IN ARRAY target_tables LOOP
    IF to_regclass(target_table) IS NULL THEN
      RAISE EXCEPTION 'Required table % is missing; cannot apply automation Phase B grant slice.', target_table;
    END IF;

    EXECUTE format('GRANT SELECT ON TABLE %s TO app_runtime;', target_table);
  END LOOP;
END $$;

-- AutomationRule: any organization member may read; the GET /automation/rules endpoint
-- further restricts to admin+ (ADR-0022 §Test Plan gate 4).
DROP POLICY IF EXISTS "automation_rule_org_member_select" ON "AutomationRule";
CREATE POLICY "automation_rule_org_member_select"
ON "AutomationRule"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AutomationRule"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- AutomationSuggestion: any organization member may read.
DROP POLICY IF EXISTS "automation_suggestion_org_member_select" ON "AutomationSuggestion";
CREATE POLICY "automation_suggestion_org_member_select"
ON "AutomationSuggestion"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AutomationSuggestion"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

-- AutomationDecision: manager+ only, scoped through the parent suggestion's organization.
DROP POLICY IF EXISTS "automation_decision_manager_select" ON "AutomationDecision";
CREATE POLICY "automation_decision_manager_select"
ON "AutomationDecision"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "AutomationSuggestion" AS s
    JOIN "OrganizationMember" AS om
      ON om."organizationId" = s."organizationId"
    WHERE s."id" = "AutomationDecision"."suggestionId"
      AND om."userId" = (SELECT auth.uid())::text
      AND om."role" IN ('owner', 'admin', 'manager')
  )
);

-- OfflineActionQueue: row owner only.
DROP POLICY IF EXISTS "offline_action_queue_owner_select" ON "OfflineActionQueue";
CREATE POLICY "offline_action_queue_owner_select"
ON "OfflineActionQueue"
FOR SELECT
TO authenticated
USING ("userId" = (SELECT auth.uid())::text);

-- ShiftHandoverDraft: the shift lead reads own drafts; manager+ reads the team's drafts.
DROP POLICY IF EXISTS "shift_handover_draft_own_or_manager_select" ON "ShiftHandoverDraft";
CREATE POLICY "shift_handover_draft_own_or_manager_select"
ON "ShiftHandoverDraft"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ShiftHandoverDraft"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
      AND (
        "ShiftHandoverDraft"."shiftLeadId" = (SELECT auth.uid())::text
        OR om."role" IN ('owner', 'admin', 'manager')
      )
  )
);

-- AutomationDecision is append-only. ADR-0022 §RLS Plan requires this as a database-enforced
-- invariant, not a backend convention. INSERT remains allowed (no row-deny here); UPDATE and
-- DELETE are blocked unconditionally by a trigger so even a privileged path cannot mutate history.
CREATE OR REPLACE FUNCTION public.automation_decision_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AutomationDecision is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS "automation_decision_block_update" ON "AutomationDecision";
CREATE TRIGGER "automation_decision_block_update"
BEFORE UPDATE ON "AutomationDecision"
FOR EACH ROW
EXECUTE FUNCTION public.automation_decision_append_only();

DROP TRIGGER IF EXISTS "automation_decision_block_delete" ON "AutomationDecision";
CREATE TRIGGER "automation_decision_block_delete"
BEFORE DELETE ON "AutomationDecision"
FOR EACH ROW
EXECUTE FUNCTION public.automation_decision_append_only();
