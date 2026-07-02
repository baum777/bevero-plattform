-- ADR-0029-C.2: CUBE Event-Economic Mutation Surface (manager-verification path).
-- Companion to 20260609060000_add_cube_event_economics + 20260609060001_add_cube_event_economics_rls
-- + 20260609060002_revoke_cube_economic_write_grants.
--
-- This migration adds a WITH CHECK-gated UPDATE policy on each of the 4
-- CUBE_Economic tables for the manager-verification path. The double gate
-- is the binding decision from ADR-0029-C §Decisions That Bind the Future
-- Mutation Slice:
--   1. (SELECT auth.uid())::text must be in OrganizationMember for the
--      row's organizationId (org-scope).
--   2. current_setting('bevero.allow_cube_economic_update', true) = 'on'
--      (GUC must be set by the service-layer transaction via
--      `SET LOCAL bevero.allow_cube_economic_update = 'on'`).
--
-- The trigger function is relaxed in the next migration
-- (20260609070001_relax_cube_economic_append_only) to honour the same
-- GUC. DELETE remains unconditionally blocked. INSERT remains allowed
-- (the seed is the only INSERT path; the manager-verification path
-- does not create new rows).
--
-- The role gate at the route layer is the existing
-- `leadRoles = ["admin", "shift_lead"]` (manager gate). RLS does not
-- distinguish roles; the service-layer + route layer enforce the
-- manager-only path. The GUC is the only way for an UPDATE to slip
-- past the trigger; the GUC is set ONLY by the service-layer
-- transaction, so the only path is the one the route layer exposes
-- to `admin` or `shift_lead` actors.
--
-- Forward-only; idempotent (DROP POLICY IF EXISTS + CREATE POLICY).

BEGIN;

-- ---------------------------------------------------------------------------
-- UPDATE POLICIES: WITH CHECK-gated manager-verification path.
-- ---------------------------------------------------------------------------
-- The WITH CHECK clause re-asserts the GUC + org-scope (defense-in-depth:
-- the USING clause is not consulted on UPDATE — only WITH CHECK is — so the
-- GUC and org-scope must appear in WITH CHECK).
--
-- Permitted columns (manager-verification only — binding decision
-- ADR-0029-C §13 + Risk ID-001):
--   ExclusiveRentalPolicy: isActive, requiresManagerConfirmation, notes,
--                          validFrom, validUntil
--   AfterMidnightStaffRate: isActive, requiresManagerConfirmation, notes,
--                           validFrom, validUntil
--   NonFoodComponent:       isActive, notes
--   FurniturePolicy:        isActive, requiresManagerConfirmation, notes,
--                          effectiveFrom, effectiveUntil
--
-- The Brutto/Netto-Disziplin (ADR-0029-C §5) is enforced at the DB layer
-- via CHECK constraints; the service layer additionally rejects any
-- negative or zero value for *NetCents fields with a 400. The mutation
-- slice does not loosen these checks.

-- ---------------------------------------------------------------------------
-- ExclusiveRentalPolicy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "exclusive_rental_policy_manager_update" ON "ExclusiveRentalPolicy";
CREATE POLICY "exclusive_rental_policy_manager_update"
ON "ExclusiveRentalPolicy"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "ExclusiveRentalPolicy"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_economic_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- AfterMidnightStaffRate
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "after_midnight_staff_rate_manager_update" ON "AfterMidnightStaffRate";
CREATE POLICY "after_midnight_staff_rate_manager_update"
ON "AfterMidnightStaffRate"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "AfterMidnightStaffRate"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_economic_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- NonFoodComponent
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "non_food_component_manager_update" ON "NonFoodComponent";
CREATE POLICY "non_food_component_manager_update"
ON "NonFoodComponent"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "NonFoodComponent"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_economic_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- FurniturePolicy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "furniture_policy_manager_update" ON "FurniturePolicy";
CREATE POLICY "furniture_policy_manager_update"
ON "FurniturePolicy"
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "FurniturePolicy"."organizationId"
      AND om."userId" = (SELECT auth.uid())::text
  )
  AND current_setting('bevero.allow_cube_economic_update', true) = 'on'
);

-- ---------------------------------------------------------------------------
-- Defense-in-depth: assert the prior CUBE_Economic append-only triggers
-- (2 per table × 4 tables = 8 total) are still present.
-- ---------------------------------------------------------------------------
-- The next migration (20260609070001_relax_cube_economic_append_only)
-- relaxes the trigger function to honour the GUC. The trigger counts
-- do NOT change (8 block_update + 8 block_delete = 16 triggers total
-- across the 4 tables, mirroring the read-only slice's
-- 20260609060001_add_cube_event_economics_rls:201-216 DO $$ block).

DO $$
DECLARE
  block_update_count      integer;
  block_delete_count      integer;
BEGIN
  SELECT count(*) INTO block_update_count
    FROM pg_trigger
   WHERE tgname IN (
     'exclusive_rental_policy_block_update',
     'after_midnight_staff_rate_block_update',
     'non_food_component_block_update',
     'furniture_policy_block_update'
   );
  SELECT count(*) INTO block_delete_count
    FROM pg_trigger
   WHERE tgname IN (
     'exclusive_rental_policy_block_delete',
     'after_midnight_staff_rate_block_delete',
     'non_food_component_block_delete',
     'furniture_policy_block_delete'
   );

  IF block_update_count <> 4 OR block_delete_count <> 4 THEN
    RAISE EXCEPTION
      'CUBE_Economic append-only triggers missing: block_update=%, block_delete=% (expected 4, 4). Refusing to apply ADR-0029-C.2 manager-update policies because the audit-trail invariant would be unenforceable.',
      block_update_count, block_delete_count
      USING ERRCODE = 'restrict_violation';
  END IF;
END $$;

COMMIT;
