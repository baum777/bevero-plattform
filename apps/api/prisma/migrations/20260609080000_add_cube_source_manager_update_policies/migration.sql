-- ADR-0029-B.2: CUBE Source-Conflict Mutation Surface (manager-resolve path).
-- Companion to 20260609050000_add_cube_source_conflict_tables +
-- 20260609050001_add_cube_source_conflict_rls +
-- 20260609050002_revoke_cube_write_grants.
--
-- This migration adds a WITH CHECK-gated UPDATE policy on CUBE_Conflict
-- (the manager-resolve path: resolvedAt, resolvedBySuggestionId,
-- winningFieldValue). It also adds WITH CHECK-gated INSERT + UPDATE
-- policies on CUBE_Source and CUBE_SourceField (the manager-entry
-- path: isActive, enteredBy, fieldValue, confidence, plus the INSERT
-- for a new CUBE_Source row + its first CUBE_SourceField row).
--
-- The double gate is the binding decision from ADR-0029-B
-- §Decisions That Bind the Future Mutation Slice:
--   1. (SELECT auth.uid())::text must be in OrganizationMember for the
--      row's organizationId (org-scope).
--   2. current_setting('bevero.allow_cube_source_update', true) = 'on'
--      (GUC must be set by the service-layer transaction via
--      `SET LOCAL bevero.allow_cube_source_update = 'on'`).
--
-- The trigger function is relaxed in the next migration
-- (20260609080001_relax_cube_source_append_only) to honour the same
-- GUC. DELETE remains unconditionally blocked. INSERT remains allowed
-- (the seed + manager-entry path create new rows; the seed is the
-- only INSERT path in the read-only slice; the manager-entry path is
-- new in B.2 and is DEMO_MODE-gated per the implementer brief).
--
-- Forward-only; idempotent (DROP POLICY IF EXISTS + CREATE POLICY).

BEGIN;

-- ---------------------------------------------------------------------------
-- UPDATE POLICIES: WITH CHECK-gated manager-resolve path.
-- ---------------------------------------------------------------------------

-- CUBE_Conflict: manager sets resolvedAt, resolvedBySuggestionId,
-- winningFieldValue. The remaining columns (id, organizationId,
-- fieldKey, sourceIds, detectedAt) are NOT mutable in this slice.
DROP POLICY IF EXISTS "cube_conflict_manager_update" ON "CUBE_Conflict";
CREATE POLICY "cube_conflict_manager_update"
ON "CUBE_Conflict"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_Conflict"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_source_update', true) = 'on'
);

-- CUBE_Source: manager flips isActive, enteredBy. The remaining
-- columns (id, name, displayName, version, retrievedAt, url,
-- payloadHash, createdAt, updatedAt) are NOT mutable in this slice.
DROP POLICY IF EXISTS "cube_source_manager_update" ON "CUBE_Source";
CREATE POLICY "cube_source_manager_update"
ON "CUBE_Source"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_Source"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_source_update', true) = 'on'
);

-- CUBE_SourceField: manager flips fieldValue, confidence. The
-- remaining columns (id, sourceId, organizationId, fieldKey,
-- discoveredAt, updatedAt) are NOT mutable in this slice.
DROP POLICY IF EXISTS "cube_source_field_manager_update" ON "CUBE_SourceField";
CREATE POLICY "cube_source_field_manager_update"
ON "CUBE_SourceField"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_SourceField"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_source_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- INSERT POLICIES: WITH CHECK-gated manager-entry path.
-- ---------------------------------------------------------------------------
-- The manager-entry path creates a new CUBE_Source row + its first
-- CUBE_SourceField row. The seed is the only INSERT path in the
-- read-only slice; the B.2 slice adds the manager-entry path under
-- the same GUC gate.

DROP POLICY IF EXISTS "cube_source_manager_insert" ON "CUBE_Source";
CREATE POLICY "cube_source_manager_insert"
ON "CUBE_Source"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_Source"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_source_update', true) = 'on'
);

DROP POLICY IF EXISTS "cube_source_field_manager_insert" ON "CUBE_SourceField";
CREATE POLICY "cube_source_field_manager_insert"
ON "CUBE_SourceField"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "CUBE_SourceField"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_source_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- Defense-in-depth: assert the prior CUBE_Conflict append-only triggers
-- (2 triggers) + AutomationDecision triggers (2) are still present.
-- ---------------------------------------------------------------------------
-- The next migration (20260609080001_relax_cube_source_append_only)
-- relaxes the trigger function to honour the GUC. The trigger counts
-- do NOT change (2 block_update + 2 block_delete for CUBE_Conflict; 2
-- for AutomationDecision). CUBE_Source and CUBE_SourceField do NOT
-- have append-only triggers (they are freely INSERT-able per the
-- read-only slice; the B.2 slice adds the WITH CHECK policy to gate
-- the manager-entry path).

DO $$
DECLARE
  block_update_count      integer;
  block_delete_count      integer;
  cube_conflict_update    integer;
  cube_conflict_delete    integer;
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

  IF block_update_count <> 1 OR block_delete_count <> 1
     OR cube_conflict_update <> 1 OR cube_conflict_delete <> 1
  THEN
    RAISE EXCEPTION
      'Append-only triggers missing: AutomationDecision=(%,%), CUBE_Conflict=(%,%). Expected (1,1,1,1). Refusing to apply ADR-0029-B.2 manager-update policies because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count,
      cube_conflict_update, cube_conflict_delete
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

COMMIT;
