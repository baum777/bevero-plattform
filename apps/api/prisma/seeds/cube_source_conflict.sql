-- CUBE Source-Conflict seed fixture (ADR-0029-B §Scope file #4).
--
-- Idempotent: every INSERT is id-guarded (WHERE NOT EXISTS) so re-runs are safe.
-- All rows are scoped to the demo organization "demo-organization-main"
-- (matches the existing demo-seed pattern at prisma/seeds/multi_location.sql
-- and prisma/seeds/operational_units.sql). The DemoSeedService gate
-- (src/modules/inventory/demo-seed.service.ts) ensures this seed is never
-- executed in production.
--
-- DELIBERATE ASYMMETRY with the OperationalUnit seed at
-- prisma/seeds/operational_units.sql:42, 54, 66:
--   - OperationalUnit seed: isActive = true (venue graph truth, used by
--     Cockpit's OperationalUnit read endpoint immediately).
--   - CUBE_Source seed:    isActive = false (disputed source data awaiting
--     manager verification; the manager flips isActive to true after
--     review via a future Cockpit-Form slice, NOT in this slice).
-- This asymmetry is binding per ADR-0029-B §13.
--
-- What this seeds:
--   - 3 CUBE_Source rows (cube_website, cube_kontaktseite, cube_bankettmappe_pdf)
--   - 9 CUBE_SourceField rows (verbatim from 00b-cube-source-conflict-validator.md:65-82)
--   - 3 pre-seeded open CUBE_Conflict rows for the verify-script gate
--     (cf-cube-ot-bar-hours, cf-cube-menu-count, cf-cube-furn-thresh)
--
-- No rows are inserted into InventoryItem, StorageLocation, or OperationalUnit;
-- those tables are unchanged per ADR-0029-B §Scope and the 00b spec.

BEGIN;

-- 1. CUBE_Source rows: 3 sources, all isActive: false (binding decision §9, §13).

INSERT INTO "CUBE_Source" (
  id, "organizationId", name, "displayName", version, "retrievedAt",
  url, "payloadHash", "isActive", "enteredBy", "createdAt", "updatedAt"
)
SELECT
  'src-cube-website', 'demo-organization-main',
  'cube_website', 'CUBE Website', 1, now(),
  'https://cube-restaurant.de', NULL,
  false, 'lm-demo-shiftlead-cube', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Source" WHERE id = 'src-cube-website');

INSERT INTO "CUBE_Source" (
  id, "organizationId", name, "displayName", version, "retrievedAt",
  url, "payloadHash", "isActive", "enteredBy", "createdAt", "updatedAt"
)
SELECT
  'src-cube-kontaktseite', 'demo-organization-main',
  'cube_kontaktseite', 'CUBE Kontaktseite', 1, now(),
  'https://cube-restaurant.de/kontakt', NULL,
  false, 'lm-demo-shiftlead-cube', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Source" WHERE id = 'src-cube-kontaktseite');

INSERT INTO "CUBE_Source" (
  id, "organizationId", name, "displayName", version, "retrievedAt",
  url, "payloadHash", "isActive", "enteredBy", "createdAt", "updatedAt"
)
SELECT
  'src-cube-bankettmappe', 'demo-organization-main',
  'cube_bankettmappe_pdf', 'CUBE Bankettmappe (PDF)', 1, now(),
  NULL, NULL,
  false, 'lm-demo-shiftlead-cube', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Source" WHERE id = 'src-cube-bankettmappe');

-- 2. CUBE_SourceField rows: 9 fields (verbatim from 00b §1 lines 65-82).
--    All confidence = 'requires_manager_confirmation' (binding decision §10).

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-website-hours', 'demo-organization-main', 'src-cube-website',
       'ot_bar_sunday_thursday_hours', '10:00-19:00', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-website-hours');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-website-menu', 'demo-organization-main', 'src-cube-website',
       'group_dinner_menu_count', 'two_menus', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-website-menu');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-website-furn', 'demo-organization-main', 'src-cube-website',
       'furniture_threshold', 'included_until_100', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-website-furn');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-kontakt-hours', 'demo-organization-main', 'src-cube-kontaktseite',
       'ot_bar_sunday_thursday_hours', '10:00-20:00', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-kontakt-hours');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-kontakt-menu', 'demo-organization-main', 'src-cube-kontaktseite',
       'group_dinner_menu_count', 'three_menus', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-kontakt-menu');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-bankett-furn', 'demo-organization-main', 'src-cube-bankettmappe',
       'furniture_threshold', 'additional_from_120', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-bankett-furn');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-bankett-exclmin', 'demo-organization-main', 'src-cube-bankettmappe',
       'exclusive_rental_min_guests', '70', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-bankett-exclmin');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-bankett-seated', 'demo-organization-main', 'src-cube-bankettmappe',
       'seated_menu_max', '170', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-bankett-seated');

INSERT INTO "CUBE_SourceField" (
  id, "organizationId", "sourceId", "fieldKey", "fieldValue", confidence,
  "discoveredAt", "updatedAt"
)
SELECT 'sf-cube-bankett-standing', 'demo-organization-main', 'src-cube-bankettmappe',
       'standing_reception_max', '250', 'requires_manager_confirmation',
       now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_SourceField" WHERE id = 'sf-cube-bankett-standing');

-- 3. CUBE_Conflict rows: 3 pre-seeded open conflicts.
--    sourceIds use the Postgres ARRAY['...','...']::TEXT[] syntax (binding decision §12).
--    All 3 are open (resolvedAt = NULL).

INSERT INTO "CUBE_Conflict" (
  id, "organizationId", "fieldKey", "sourceIds", "detectedAt",
  "resolvedAt", "resolvedBySuggestionId", "winningFieldValue"
)
SELECT 'cf-cube-ot-bar-hours', 'demo-organization-main',
       'ot_bar_sunday_thursday_hours',
       ARRAY['src-cube-website','src-cube-kontaktseite']::TEXT[],
       now(), NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Conflict" WHERE id = 'cf-cube-ot-bar-hours');

INSERT INTO "CUBE_Conflict" (
  id, "organizationId", "fieldKey", "sourceIds", "detectedAt",
  "resolvedAt", "resolvedBySuggestionId", "winningFieldValue"
)
SELECT 'cf-cube-menu-count', 'demo-organization-main',
       'group_dinner_menu_count',
       ARRAY['src-cube-website','src-cube-kontaktseite']::TEXT[],
       now(), NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Conflict" WHERE id = 'cf-cube-menu-count');

INSERT INTO "CUBE_Conflict" (
  id, "organizationId", "fieldKey", "sourceIds", "detectedAt",
  "resolvedAt", "resolvedBySuggestionId", "winningFieldValue"
)
SELECT 'cf-cube-furn-thresh', 'demo-organization-main',
       'furniture_threshold',
       ARRAY['src-cube-website','src-cube-bankettmappe']::TEXT[],
       now(), NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM "CUBE_Conflict" WHERE id = 'cf-cube-furn-thresh');

COMMIT;
