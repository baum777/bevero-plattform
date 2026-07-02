-- ADR-0059: Team-Bereich "Demo Site Alpha - Kitchen & Storage"
-- Seed: WorkspaceGroups + 12 Küchen-StorageLocations (physische Küchenstruktur)
-- DEMO_MODE-gated, id-guarded (WHERE NOT EXISTS / ON CONFLICT DO NOTHING).

DO $$
BEGIN
  IF current_setting('app.demo_mode', true) <> 'true' THEN
    RAISE NOTICE 'DEMO_MODE not set — skipping kitchen_workspace seed';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "public"."Location" WHERE "id" = 'loc-motorworld-boeblingen') THEN
    RAISE NOTICE 'loc-motorworld-boeblingen not found — skipping (run motorworld_inn_standorte.sql first)';
    RETURN;
  END IF;

  -- ── WorkspaceGroup: Bar & Service ─────────────────────────────────────────

  INSERT INTO "public"."WorkspaceGroup"
    ("id", "organization_id", "location_id", "name", "slug", "type", "is_active", "created_at", "updated_at")
  SELECT
    'wg-mwbb-bar',
    l."organizationId",
    'loc-motorworld-boeblingen',
    'Demo Site Alpha - Bar & Service',
    'mwbb-bar-service',
    'bar_service',
    true,
    NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
  ON CONFLICT ("location_id", "slug") DO NOTHING;

  -- ── WorkspaceGroup: Küche & Lager ─────────────────────────────────────────

  INSERT INTO "public"."WorkspaceGroup"
    ("id", "organization_id", "location_id", "name", "slug", "type", "is_active", "created_at", "updated_at")
  SELECT
    'wg-mwbb-kitchen',
    l."organizationId",
    'loc-motorworld-boeblingen',
    'Demo Site Alpha - Kitchen & Storage',
    'mwbb-kueche-lager',
    'kitchen_storage',
    true,
    NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
  ON CONFLICT ("location_id", "slug") DO NOTHING;

  -- ── Küchen-StorageLocations (Ebene 0 · Küche) ────────────────────────────

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-kuehlhaus-breakfast',
    l."organizationId",
    'Kühlhaus: Breakfast | À-la-carte',
    'cooling_room', 0, 'chilled', true, false, 1, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-kuehlhaus-breakfast');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-verbindungsgang',
    l."organizationId",
    'Verbindungsgang - Produktionsküche',
    'passage', 0, 'dry', true, true, 2, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-verbindungsgang');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-kuehlhaus-produktion',
    l."organizationId",
    'Kühlhaus: Produktion | Events',
    'cooling_room', 0, 'chilled', true, false, 3, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-kuehlhaus-produktion');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-produktionskueche',
    l."organizationId",
    'Produktionsküche',
    'production_kitchen', 0, 'production', false, false, 4, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-produktionskueche');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-eingang',
    l."organizationId",
    'Froster - Produktionsküche (Eingang)',
    'freezer_chest', 0, 'frozen', true, false, 5, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-eingang');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-links',
    l."organizationId",
    'Froster - Produktionsküche (linke Seite)',
    'freezer_chest', 0, 'frozen', true, false, 6, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-links');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-saucier',
    l."organizationId",
    'Froster stehend (Saucier | Fleisch) [links]',
    'freezer_upright', 0, 'frozen', true, false, 7, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-saucier');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-entremetier',
    l."organizationId",
    'Froster stehend (Entremetier | Pommes, Pasta) [mitte links]',
    'freezer_upright', 0, 'frozen', true, false, 8, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-entremetier');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-mitte-rechts',
    l."organizationId",
    'Froster stehend [mitte rechts]',
    'freezer_upright', 0, 'frozen', true, false, 9, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-mitte-rechts');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-froster-breakfast',
    l."organizationId",
    'Froster stehend (Breakfast | Gebäck, Kuchen) [rechts]',
    'freezer_upright', 0, 'frozen', true, false, 10, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-froster-breakfast');

  -- ── Küchen-StorageLocations (Ebene -1 · Keller) ───────────────────────────

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-keller-lebensmittel',
    l."organizationId",
    'Keller: Lebensmittel - Trockenlager',
    'dry_storage', -1, 'dry', true, false, 11, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-keller-lebensmittel');

  INSERT INTO "public"."StorageLocation"
    ("id", "organization_id", "name", "type", "floor", "temperature_zone",
     "is_countable", "is_transfer_point", "walk_order", "workspace_group_id",
     "isActive", "createdAt", "updatedAt")
  SELECT
    'sl-kue-keller-hygiene',
    l."organizationId",
    'Keller: Hygieneartikel',
    'dry_storage', -1, 'neutral', true, false, 12, 'wg-mwbb-kitchen',
    true, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
    AND NOT EXISTS (SELECT 1 FROM "public"."StorageLocation" WHERE "id" = 'sl-kue-keller-hygiene');

  -- ── Bestehende Bar-Lagerorte → bar_service WorkspaceGroup ─────────────────
  -- Link existing bar/beverage storage locations to wg-mwbb-bar.
  -- Targets locations that belong to the same org as loc-motorworld-boeblingen.

  UPDATE "public"."StorageLocation" sl
  SET "workspace_group_id" = 'wg-mwbb-bar'
  FROM "public"."WorkspaceGroup" wg
  WHERE wg."id" = 'wg-mwbb-bar'
    AND sl."organization_id" = wg."organization_id"
    AND sl."workspace_group_id" IS NULL
    AND sl."name" IN (
      'Demo Site Alpha Live-Bestand',
      'Getränkelager',
      'Bar',
      'Bartresen',
      'Ausgabe',
      'Lager Service'
    );

  RAISE NOTICE 'kitchen_workspace seed complete: 2 WorkspaceGroups + 12 kitchen StorageLocations';
END $$;
