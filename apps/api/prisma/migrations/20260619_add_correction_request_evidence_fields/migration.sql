-- Phase 2 Kitchen Inventory Workflow: harden InventoryCorrectionRequest
-- with org-scoped evidence fields, indexes, and an explicit `TO authenticated`
-- SELECT policy that mirrors the existing inventory browser RLS pattern.
--
-- The Fastify backend (service_role) remains the authoritative writer; this
-- policy only governs browser / anon reads (no RLS bypass, no auth.role()
-- policy).

-- ── New columns ──────────────────────────────────────────────────────────────

ALTER TABLE "public"."InventoryCorrectionRequest"
  ADD COLUMN IF NOT EXISTS "organization_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "storage_location_id" TEXT,
  ADD COLUMN IF NOT EXISTS "note"               TEXT,
  ADD COLUMN IF NOT EXISTS "expected_quantity"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "counted_quantity"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "source_label"       TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at"       TIMESTAMPTZ;

-- ── Foreign key (storage_location_id → StorageLocation) ──────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'InventoryCorrectionRequest_storage_location_id_fkey'
  ) THEN
    ALTER TABLE "public"."InventoryCorrectionRequest"
      ADD CONSTRAINT "InventoryCorrectionRequest_storage_location_id_fkey"
      FOREIGN KEY ("storage_location_id")
      REFERENCES "public"."StorageLocation" ("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "InventoryCorrectionRequest_organization_id_status_created_at_idx"
  ON "public"."InventoryCorrectionRequest" ("organization_id", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "InventoryCorrectionRequest_storage_location_id_idx"
  ON "public"."InventoryCorrectionRequest" ("storage_location_id");

CREATE INDEX IF NOT EXISTS "InventoryCorrectionRequest_created_at_idx"
  ON "public"."InventoryCorrectionRequest" ("createdAt" DESC);

-- ── RLS hardening ────────────────────────────────────────────────────────────
-- Use explicit `TO authenticated` clauses (mirrors the
-- `20260601083000_add_inventory_browser_select_rls` pattern). The existing
-- `TO service_role` policy from `20260617_enable_rls_all_tables` is kept and
-- continues to gate backend / migration writers.

DROP POLICY IF EXISTS "inventory_correction_request_org_member_select" ON "public"."InventoryCorrectionRequest";
CREATE POLICY "inventory_correction_request_org_member_select"
ON "public"."InventoryCorrectionRequest"
FOR SELECT
TO authenticated
USING (
  "organization_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "OrganizationMember" AS om
    WHERE om."organizationId" = "InventoryCorrectionRequest"."organization_id"
      AND om."userId" = (SELECT auth.uid())::text
  )
);

GRANT SELECT ON TABLE "public"."InventoryCorrectionRequest" TO authenticated;
