-- ADR-0029-B.2: CUBE Source-Conflict Mutation Surface (trigger relaxation).
-- Companion to 20260609080000_add_cube_source_manager_update_policies.
--
-- This migration relaxes the 2 CUBE_Conflict *_block_update/delete
-- triggers (cube_conflict_block_update, cube_conflict_block_delete) to
-- honour the Postgres GUC
-- `current_setting('bevero.allow_cube_source_update', true)`.
--
-- When the GUC is `'on'`, the trigger is bypassed (UPDATE allowed).
-- When the GUC is NULL or any other value, the trigger raises the
-- original `restrict_violation` exception. DELETE remains
-- unconditionally blocked in this slice; only UPDATE is relaxed.
--
-- The GUC is set ONLY by the service-layer transaction via
-- `SET LOCAL bevero.allow_cube_source_update = 'on'`. The GUC is
-- double-gated by the WITH CHECK UPDATE policy added in
-- 20260609080000: even with a leaked JWT, an UPDATE from a raw
-- authenticated client would fail the
-- `current_setting('bevero.allow_cube_source_update', true) = 'on'`
-- check in the policy's WITH CHECK clause.
--
-- The trigger function is replaced via CREATE OR REPLACE FUNCTION; the
-- triggers themselves are NOT recreated (they continue to point at the
-- same function by name). Postgres resolves the trigger function
-- reference at trigger-fire time, not at trigger-create time.
--
-- Forward-only, idempotent. The DO $$ block at the bottom asserts the
-- AutomationDecision + CUBE_Conflict trigger counts are unchanged
-- (2 + 2 = 4 triggers total).

BEGIN;

-- ---------------------------------------------------------------------------
-- RELAX THE CUBE_CONFLICT APPEND-ONLY TRIGGER FUNCTION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cube_conflict_append_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Manager-resolve path: bypass when the service-layer transaction
  -- has explicitly set the GUC. The GUC is session-local + transaction-
  -- scoped (via SET LOCAL) so it auto-reverts at COMMIT/ROLLBACK.
  IF current_setting('bevero.allow_cube_source_update', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      -- DELETE is never permitted in this slice.
      RAISE EXCEPTION 'CUBE_Conflict is append-only: DELETE is not permitted'
        USING ERRCODE = 'restrict_violation';
    END IF;
    -- UPDATE: allow. The WITH CHECK policy
    -- (20260609080000_add_cube_source_manager_update_policies) is the
    -- security boundary; the trigger is defense-in-depth.
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    -- INSERT: not possible on CUBE_Conflict (the table is the resolver
    -- output, not the entry; manager-entry targets CUBE_Source +
    -- CUBE_SourceField). Allow as a no-op.
    IF TG_OP = 'INSERT' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Default-deny: any TG_OP other than the allow-list above is blocked.
  RAISE EXCEPTION 'CUBE_Conflict is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- DEFENSE-IN-DEPTH: verify the 2 AutomationDecision + 2 CUBE_Conflict
-- append-only triggers are ALL present (no regression).
-- ---------------------------------------------------------------------------

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
      'Append-only triggers missing: AutomationDecision=(%,%), CUBE_Conflict=(%,%). Expected (1,1,1,1). Refusing to apply ADR-0029-B.2 trigger relaxation because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count,
      cube_conflict_update, cube_conflict_delete
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

COMMIT;
