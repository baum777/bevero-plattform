-- ADR-0029-C.2: CUBE Event-Economic Mutation Surface (trigger relaxation).
-- Companion to 20260609070000_add_cube_economic_manager_update_policies.
--
-- This migration relaxes the 4 CUBE_Economic *_block_update triggers
-- (one per table: exclusive_rental_policy_block_update,
-- after_midnight_staff_rate_block_update, non_food_component_block_update,
-- furniture_policy_block_update) to honour the Postgres GUC
-- `current_setting('bevero.allow_cube_economic_update', true)`.
--
-- When the GUC is `'on'`, the trigger is bypassed. When the GUC is
-- NULL or any other value, the trigger raises the original
-- `restrict_violation` exception. The DELETE triggers (4) remain
-- unconditionally blocked; this slice never relaxes DELETE.
--
-- The GUC is set ONLY by the service-layer transaction via
-- `SET LOCAL bevero.allow_cube_economic_update = 'on'` (per the
-- `AutomationSuggestionService.approve()` pattern at
-- src/modules/automation/automation-suggestion.service.ts:283-374
-- — `SET LOCAL` is scoped to the transaction, so the GUC
-- automatically reverts at COMMIT/ROLLBACK).
--
-- The GUC is double-gated by the WITH CHECK UPDATE policy added in
-- 20260609070000: even with a leaked JWT, an UPDATE from a raw
-- authenticated client would fail the
-- `current_setting('bevero.allow_cube_economic_update', true) = 'on'`
-- check in the policy's WITH CHECK clause.
--
-- The trigger function is replaced via CREATE OR REPLACE FUNCTION; the
-- triggers themselves are NOT recreated (they continue to point at the
-- same function by name). Postgres resolves the trigger function
-- reference at trigger-fire time, not at trigger-create time.
--
-- Forward-only, idempotent. The DO $$ block at the bottom asserts the
-- AutomationDecision + CUBE_Conflict + CUBE_Economic trigger counts are
-- unchanged (2 + 2 + 8 = 12 triggers total).

BEGIN;

-- ---------------------------------------------------------------------------
-- RELAX THE CUBE_ECONOMIC APPEND-ONLY TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
-- The function body now checks the GUC. The `true` second arg to
-- current_setting means "return NULL if the GUC is unset" (matches the
-- GUC name's `bevero.*` namespace, which is not a known GUC; we treat
-- NULL as "not allowed" — i.e. default-deny).

CREATE OR REPLACE FUNCTION public.cube_economic_append_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Manager-verification path: bypass when the service-layer transaction
  -- has explicitly set the GUC. The GUC is session-local + transaction-
  -- scoped (via SET LOCAL) so it auto-reverts at COMMIT/ROLLBACK.
  IF current_setting('bevero.allow_cube_economic_update', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      -- DELETE is never permitted in this slice.
      RAISE EXCEPTION 'CUBE_Economic is append-only: DELETE is not permitted'
        USING ERRCODE = 'restrict_violation';
    END IF;
    -- UPDATE: allow. The WITH CHECK policy
    -- (20260609070000_add_cube_economic_manager_update_policies) is the
    -- security boundary; the trigger is defense-in-depth.
    IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
    END IF;
    -- INSERT: allow (the seed is the only INSERT path in this slice).
    IF TG_OP = 'INSERT' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Default-deny: any TG_OP other than the allow-list above is blocked.
  RAISE EXCEPTION 'CUBE_Economic is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- DEFENSE-IN-DEPTH: verify the 2 AutomationDecision + 2 CUBE_Conflict +
-- 8 CUBE_Economic append-only triggers are ALL present (no regression).
-- ---------------------------------------------------------------------------
-- The trigger FUNCTION was replaced, not the TRIGGERS. The trigger
-- counts must remain: 2 (AutomationDecision) + 2 (CUBE_Conflict) +
-- 8 (CUBE_Economic). The DO block raises restrict_violation if any
-- was dropped, refusing to apply this migration until the regression
-- is fixed.

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

  -- CUBE_Economic × 4 tables (from 20260609060001)
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
      'Append-only triggers missing: AutomationDecision=(%,%), CUBE_Conflict=(%,%), CUBE_Economic=(%,%). Expected (1,1,1,1,4,4). Refusing to apply ADR-0029-C.2 trigger relaxation because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count,
      cube_conflict_update, cube_conflict_delete,
      cube_econ_update, cube_econ_delete
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

COMMIT;
