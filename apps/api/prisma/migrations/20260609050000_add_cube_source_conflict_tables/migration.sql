-- ADR-0029-B: CUBE Source-Conflict-Validator — schema additions (Slice 2).
-- Forward-only. Rollback is the manual DROP script documented in ADR-0029-B
-- §Scope. Three new tables + one new enum in the public schema. No RLS, no
-- grants here — those land in the companion RLS migration
-- 20260609050001_add_cube_source_conflict_rls.
--
-- CUBE_Source / CUBE_SourceField / CUBE_Conflict are the source-conflict
-- validator substrate from docs/tasks/logik/00b-cube-source-conflict-validator.md.
-- CUBE_Source is a versioned source register (cube_website, cube_kontaktseite,
-- cube_bankettmappe_pdf). CUBE_SourceField is the key/value claim row attached
-- to a CUBE_Source. CUBE_Conflict is the detected-conflict substrate awaiting
-- manager resolution. The append-only invariant on CUBE_Conflict is enforced
-- via DB triggers in the RLS companion migration, not here.
--
-- Existing models are UNCHANGED; these tables layer on top via an additive
-- foreign key to themselves (CUBE_SourceField.sourceId -> CUBE_Source.id,
-- ON DELETE CASCADE). There is no FK to a Location, Brand, AutomationSuggestion,
-- or InventoryItem — sources are org-scoped only (SEED-001 deferral; v1 is
-- single-brand).

CREATE TYPE "CUBE_SourceFieldConfidence" AS ENUM (
  'confirmed', 'conflict_detected', 'requires_manager_confirmation'
);

CREATE TABLE "CUBE_Source" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  "url" TEXT,
  "payloadHash" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "enteredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CUBE_Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CUBE_SourceField" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "fieldValue" TEXT NOT NULL,
  "confidence" "CUBE_SourceFieldConfidence" NOT NULL DEFAULT 'requires_manager_confirmation',
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CUBE_SourceField_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CUBE_SourceField_fieldValue_length_check" CHECK (length("fieldValue") <= 500)
);

CREATE TABLE "CUBE_Conflict" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "sourceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBySuggestionId" TEXT,
  "winningFieldValue" TEXT,
  CONSTRAINT "CUBE_Conflict_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CUBE_Conflict_winningFieldValue_length_check" CHECK (length("winningFieldValue") <= 500)
);

CREATE UNIQUE INDEX "CUBE_Source_org_name_version_unique" ON "CUBE_Source"("organizationId", "name", "version");
CREATE INDEX "CUBE_Source_org_active_idx" ON "CUBE_Source"("organizationId", "isActive");
CREATE INDEX "CUBE_Source_org_name_idx" ON "CUBE_Source"("organizationId", "name");

CREATE UNIQUE INDEX "CUBE_SourceField_source_field_unique" ON "CUBE_SourceField"("sourceId", "fieldKey");
CREATE INDEX "CUBE_SourceField_org_idx" ON "CUBE_SourceField"("organizationId");
CREATE INDEX "CUBE_SourceField_org_field_idx" ON "CUBE_SourceField"("organizationId", "fieldKey");
CREATE INDEX "CUBE_SourceField_confidence_idx" ON "CUBE_SourceField"("confidence");

CREATE INDEX "CUBE_Conflict_org_resolved_idx" ON "CUBE_Conflict"("organizationId", "resolvedAt");
CREATE INDEX "CUBE_Conflict_org_field_resolved_idx" ON "CUBE_Conflict"("organizationId", "fieldKey", "resolvedAt");

ALTER TABLE "CUBE_SourceField"
  ADD CONSTRAINT "CUBE_SourceField_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "CUBE_Source"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
