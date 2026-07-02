-- ADR-0050: Demo multi-site seed (Task 05)
-- DEMO_MODE-gated, id-guarded (WHERE NOT EXISTS).
-- 4 Locations + EventSpaces + Connectors + 1 Demo ExceptionRule.
--
-- NOTE (Phase 3 productization): display values are generic demo data. The
-- internal ids/slugs (loc-motorworld-*, brand-motorworld) and the enum values
-- (MOTORWORLD_STANDARD, provider codes) are kept as-is — renaming them is a
-- code/schema change tracked as a Phase 4 follow-up in
-- docs/productization/bevero-demo-data-policy-v0.md.

DO $$
BEGIN
  IF current_setting('app.demo_mode', true) <> 'true' THEN
    RAISE NOTICE 'DEMO_MODE not set — skipping demo multi-site seed';
    RETURN;
  END IF;

  -- Require a demo brand to exist (seeded by multi_location.sql or manually)
  IF NOT EXISTS (SELECT 1 FROM "public"."Brand" WHERE "id" = 'brand-motorworld') THEN
    RAISE NOTICE 'brand-motorworld not found — skipping demo multi-site seed (run multi_location.sql first)';
    RETURN;
  END IF;

  -- ── Demo Site Beta ────────────────────────────────────────────────────────
  INSERT INTO "public"."Location" (
    "id", "organizationId", "brandId", "name", "slug", "profile", "precisionLevel",
    "signatureAssets", "weatherSensitive", "cinemaAvailable", "isActive",
    "createdAt", "updatedAt"
  )
  SELECT
    'loc-motorworld-muenchen', org."organizationId", 'brand-motorworld',
    'Demo Site Beta', 'motorworld-muenchen', 'MOTORWORLD_STANDARD', 'BASIC',
    ARRAY['Demo Bar', 'Demo Showpiece', 'Demo Track', 'Demo Collection'],
    FALSE, TRUE, TRUE,
    NOW(), NOW()
  FROM (SELECT "organizationId" FROM "public"."Brand" WHERE "id" = 'brand-motorworld' LIMIT 1) org
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Location" WHERE "id" = 'loc-motorworld-muenchen');

  -- Demo Site Beta EventSpaces
  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-muenchen-cinema', l."organizationId", 'loc-motorworld-muenchen',
    'Demo Cinema Hall', 'movie-cars-cinema',
    27, NULL, FALSE, TRUE,
    ARRAY['CINEMA','DINNER_THEATER']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-muenchen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-muenchen-eventlocation', l."organizationId", 'loc-motorworld-muenchen',
    'Demo Event Hall Beta', 'eventlocation-muenchen',
    200, 300, TRUE, TRUE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT','WEDDING','PRODUCT_PRESENTATION']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-muenchen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  -- Demo Site Beta Connector
  INSERT INTO "public"."ReservationConnector" (
    "id", "organizationId", "locationId", "provider", "externalUrl", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'rc-muenchen-gastronaut', l."organizationId", 'loc-motorworld-muenchen',
    'GASTRONAUT', 'https://www.gastronaut.de/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-muenchen'
  ON CONFLICT DO NOTHING;

  -- Demo Site Beta ExternalSystemLink
  INSERT INTO "public"."ExternalSystemLink" (
    "id", "organizationId", "locationId", "kind", "url", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'esl-muenchen-amadeus', l."organizationId", 'loc-motorworld-muenchen',
    'GUTSCHEINE_AMADEUS360', 'https://www.amadeus360.com/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-muenchen'
  ON CONFLICT DO NOTHING;

  -- ── Demo Site Alpha ───────────────────────────────────────────────────────
  INSERT INTO "public"."Location" (
    "id", "organizationId", "brandId", "name", "slug", "profile", "precisionLevel",
    "signatureAssets", "weatherSensitive", "cinemaAvailable", "isActive",
    "createdAt", "updatedAt"
  )
  SELECT
    'loc-motorworld-boeblingen', org."organizationId", 'brand-motorworld',
    'Demo Site Alpha', 'motorworld-boeblingen', 'MOTORWORLD_STANDARD', 'BASIC',
    ARRAY['Demo Village', 'Demo Exhibition', 'Demo Meeting Rooms', 'Demo Hotel'],
    FALSE, FALSE, TRUE,
    NOW(), NOW()
  FROM (SELECT "organizationId" FROM "public"."Brand" WHERE "id" = 'brand-motorworld' LIMIT 1) org
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Location" WHERE "id" = 'loc-motorworld-boeblingen');

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-boeblingen-eventlocation', l."organizationId", 'loc-motorworld-boeblingen',
    'Demo Event Hall Alpha', 'eventlocation-boeblingen',
    300, 500, TRUE, TRUE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT','WEDDING','CONFERENCE']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."ReservationConnector" (
    "id", "organizationId", "locationId", "provider", "externalUrl", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'rc-boeblingen-gastronaut', l."organizationId", 'loc-motorworld-boeblingen',
    'GASTRONAUT', 'https://www.gastronaut.de/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
  ON CONFLICT DO NOTHING;

  INSERT INTO "public"."ExternalSystemLink" (
    "id", "organizationId", "locationId", "kind", "url", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'esl-boeblingen-eviivo', l."organizationId", 'loc-motorworld-boeblingen',
    'HOTEL_EVIIVO', 'https://www.eviivo.com/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-boeblingen'
  ON CONFLICT DO NOTHING;

  -- ── Demo Site Gamma ───────────────────────────────────────────────────────
  INSERT INTO "public"."Location" (
    "id", "organizationId", "brandId", "name", "slug", "profile", "precisionLevel",
    "signatureAssets", "weatherSensitive", "cinemaAvailable", "isActive",
    "createdAt", "updatedAt"
  )
  SELECT
    'loc-motorworld-warthausen', org."organizationId", 'brand-motorworld',
    'Demo Site Gamma', 'motorworld-warthausen', 'MOTORWORLD_STANDARD', 'BASIC',
    ARRAY['Demo Railway', 'Demo Stable', 'Demo Museum', 'Demo Cellar', 'Demo Themed Rooms'],
    FALSE, FALSE, TRUE,
    NOW(), NOW()
  FROM (SELECT "organizationId" FROM "public"."Brand" WHERE "id" = 'brand-motorworld' LIMIT 1) org
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Location" WHERE "id" = 'loc-motorworld-warthausen');

  -- Demo Site Gamma EventSpaces
  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-warthausen-rennstall', l."organizationId", 'loc-motorworld-warthausen',
    'Demo Hall Gamma-1', 'rennstall',
    100, 40, TRUE, TRUE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT','WEDDING','DINNER_THEATER']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-warthausen-museum', l."organizationId", 'loc-motorworld-warthausen',
    'Demo Hall Gamma-2', 'museum',
    175, 200, FALSE, TRUE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT','PRODUCT_PRESENTATION','CONFERENCE']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacitySeated", "capacityStanding", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-warthausen-sieben-schwaben', l."organizationId", 'loc-motorworld-warthausen',
    'Demo Cellar Gamma-3', 'sieben-schwaben-hubertus',
    20, NULL, TRUE, TRUE,
    ARRAY['PRIVATE_EVENT','DINNER_THEATER']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  -- Demo Site Gamma ExceptionRule (buffet-override demo)
  INSERT INTO "public"."ExceptionRule" (
    "id", "organizationId", "locationId", "type", "title", "description",
    "affectedUnitIds", "startsAt", "endsAt", "source",
    "requiresConfirmation", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'er-warthausen-oechsle-demo', l."organizationId", 'loc-motorworld-warthausen',
    'OECHSLE_BUFFET_OVERRIDE',
    'Special Excursion — Buffet-Override (Demo)',
    'Demo: special excursion day, ~120 guests expected. Buffet instead of regular menu.',
    '{}',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '4 hours',
    'oechsle_schedule',
    TRUE, TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT DO NOTHING;

  -- Demo Site Gamma Connectors
  INSERT INTO "public"."ReservationConnector" (
    "id", "organizationId", "locationId", "provider", "externalUrl", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'rc-warthausen-gastronovi', l."organizationId", 'loc-motorworld-warthausen',
    'GASTRONOVI', 'https://www.gastronovi.com/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT DO NOTHING;

  INSERT INTO "public"."ReservationConnector" (
    "id", "organizationId", "locationId", "provider", "externalUrl", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'rc-warthausen-eviivo', l."organizationId", 'loc-motorworld-warthausen',
    'EVIIVO', 'https://www.eviivo.com/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT DO NOTHING;

  INSERT INTO "public"."ExternalSystemLink" (
    "id", "organizationId", "locationId", "kind", "url", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'esl-warthausen-oechsle', l."organizationId", 'loc-motorworld-warthausen',
    'OECHSLE_SCHEDULE', 'https://www.oechsle.de/fahrplan/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-warthausen'
  ON CONFLICT DO NOTHING;

  -- ── Demo Site Delta ───────────────────────────────────────────────────────
  INSERT INTO "public"."Location" (
    "id", "organizationId", "brandId", "name", "slug", "profile", "precisionLevel",
    "signatureAssets", "weatherSensitive", "cinemaAvailable", "isActive",
    "createdAt", "updatedAt"
  )
  SELECT
    'loc-motorworld-mallorca', org."organizationId", 'brand-motorworld',
    'Demo Site Delta', 'motorworld-mallorca', 'MOTORWORLD_STANDARD', 'BASIC',
    ARRAY['Demo Event Hall', 'Demo Seminar Area', 'Demo Outdoor Terrace'],
    TRUE, FALSE, TRUE,
    NOW(), NOW()
  FROM (SELECT "organizationId" FROM "public"."Brand" WHERE "id" = 'brand-motorworld' LIMIT 1) org
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Location" WHERE "id" = 'loc-motorworld-mallorca');

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacityIndoor", "capacityOutdoor", "capacitySeated", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-mallorca-eventhalle', l."organizationId", 'loc-motorworld-mallorca',
    'Demo Event Hall Delta', 'eventhalle-mallorca',
    450, NULL, 300, TRUE, TRUE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT','WEDDING','CONFERENCE','PRODUCT_PRESENTATION']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-mallorca'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."EventSpace" (
    "id", "organizationId", "locationId", "name", "slug",
    "capacityIndoor", "capacityOutdoor", "hasOwnBar", "hasRestrooms",
    "supports", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'es-mallorca-outdoor', l."organizationId", 'loc-motorworld-mallorca',
    'Demo Terrace Delta', 'outdoor-terrasse-mallorca',
    NULL, 220, TRUE, FALSE,
    ARRAY['PRIVATE_EVENT','COMPANY_EVENT']::"public"."EventSpaceSupport"[],
    TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-mallorca'
  ON CONFLICT ("locationId", "slug") DO NOTHING;

  INSERT INTO "public"."ReservationConnector" (
    "id", "organizationId", "locationId", "provider", "externalUrl", "isActive", "createdAt", "updatedAt"
  )
  SELECT
    'rc-mallorca-gastronaut', l."organizationId", 'loc-motorworld-mallorca',
    'GASTRONAUT', 'https://www.gastronaut.de/', TRUE, NOW(), NOW()
  FROM "public"."Location" l WHERE l."id" = 'loc-motorworld-mallorca'
  ON CONFLICT DO NOTHING;

END $$;
