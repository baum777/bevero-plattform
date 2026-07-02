-- ADR-0059: Team-Bereich "MW Inn Böblingen - Küche & Lager"
-- Adds WorkspaceGroup / WorkspaceGroupMember concept and kitchen-specific
-- fields on StorageLocation (floor, temperatureZone, isCountable,
-- isTransferPoint, walkOrder, workspaceGroupId).

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."WorkspaceGroupType" AS ENUM (
    'kitchen_storage', 'bar_service', 'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."TemperatureZone" AS ENUM (
    'chilled', 'frozen', 'dry', 'production', 'neutral'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."KitchenTeamRole" AS ENUM (
    'kitchen_lead', 'kitchen_staff', 'inventory_controller', 'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── WorkspaceGroup ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."WorkspaceGroup" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "location_id"     TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "type"            "public"."WorkspaceGroupType" NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "WorkspaceGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceGroup_locationId_slug_key" UNIQUE ("location_id", "slug")
);

CREATE INDEX IF NOT EXISTS "WorkspaceGroup_organization_id_idx"
  ON "public"."WorkspaceGroup" ("organization_id");

CREATE INDEX IF NOT EXISTS "WorkspaceGroup_location_id_idx"
  ON "public"."WorkspaceGroup" ("location_id");

-- ── WorkspaceGroupMember ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."WorkspaceGroupMember" (
  "id"                 TEXT NOT NULL,
  "workspace_group_id" TEXT NOT NULL,
  "user_id"            TEXT NOT NULL,
  "role"               "public"."KitchenTeamRole" NOT NULL,
  "is_default"         BOOLEAN NOT NULL DEFAULT false,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "WorkspaceGroupMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceGroupMember_workspaceGroupId_userId_key"
    UNIQUE ("workspace_group_id", "user_id"),
  CONSTRAINT "WorkspaceGroupMember_workspaceGroupId_fkey"
    FOREIGN KEY ("workspace_group_id")
    REFERENCES "public"."WorkspaceGroup" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "WorkspaceGroupMember_user_id_idx"
  ON "public"."WorkspaceGroupMember" ("user_id");

CREATE INDEX IF NOT EXISTS "WorkspaceGroupMember_workspace_group_id_idx"
  ON "public"."WorkspaceGroupMember" ("workspace_group_id");

-- ── StorageLocation — new kitchen fields ─────────────────────────────────────

ALTER TABLE "public"."StorageLocation"
  ADD COLUMN IF NOT EXISTS "floor"               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "temperature_zone"    "public"."TemperatureZone",
  ADD COLUMN IF NOT EXISTS "is_countable"        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_transfer_point"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "walk_order"          INTEGER,
  ADD COLUMN IF NOT EXISTS "workspace_group_id"  TEXT;

ALTER TABLE "public"."StorageLocation"
  DROP CONSTRAINT IF EXISTS "StorageLocation_workspace_group_id_fkey";

ALTER TABLE "public"."StorageLocation"
  ADD CONSTRAINT "StorageLocation_workspace_group_id_fkey"
  FOREIGN KEY ("workspace_group_id")
  REFERENCES "public"."WorkspaceGroup" ("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "StorageLocation_workspace_group_id_idx"
  ON "public"."StorageLocation" ("workspace_group_id");

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."WorkspaceGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkspaceGroupMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role admin access" ON "public"."WorkspaceGroup";
CREATE POLICY "Service role admin access" ON "public"."WorkspaceGroup"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role admin access" ON "public"."WorkspaceGroupMember";
CREATE POLICY "Service role admin access" ON "public"."WorkspaceGroupMember"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
