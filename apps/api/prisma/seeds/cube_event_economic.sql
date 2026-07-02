-- CUBE Event-Economic seed fixture (ADR-0029-C §Scope file #5).
--
-- Idempotent: every INSERT is id-guarded (WHERE NOT EXISTS) so re-runs
-- are safe. All rows are scoped to the demo organization
-- "demo-organization-main" (matches the existing demo-seed pattern at
-- prisma/seeds/multi_location.sql, prisma/seeds/operational_units.sql,
-- and prisma/seeds/cube_source_conflict.sql). The DemoSeedService gate
-- (src/modules/inventory/demo-seed.service.ts) ensures this seed is never
-- executed in production.
--
-- DELIBERATE POSTURE: all rows are inserted with isActive: false AND
-- requiresManagerConfirmation: true (verbatim from
-- docs/tasks/logik/00c-cube-event-economic-rules.md §1-§4). The values
-- are extracted from the CUBE Bankettmappe 2026-06-09 and the CUBE
-- website 2026-06-09; the manager must verify the values against the
-- latest source before flipping isActive to true. This is the same
-- posture as the CUBE_Source seed (prisma/seeds/cube_source_conflict.sql)
-- — disputed data awaiting manager confirmation.
--
-- What this seeds:
--   - 1 ExclusiveRentalPolicy row (verbatim 00c §1)
--   - 5 AfterMidnightStaffRate rows (one per StaffRole; security added
--     per ADR-0029-C §2 binding decision)
--   - 17 NonFoodComponent rows (6 included_by_default + 6 optional_addon
--     + 5 cost_driver; verbatim 00c §3)
--   - 2 FurniturePolicy rows (Website + Bankettmappe; conflict demo
--     per 00c §4; same includedUntilGuestCount=100, conflict in
--     additionalFromGuestCount semantics)
--
-- No rows are inserted into InventoryItem, StorageLocation,
-- OperationalUnit, CUBE_Source, CUBE_SourceField, or CUBE_Conflict;
-- those tables are unchanged per ADR-0029-C §Scope.

BEGIN;

-- ===========================================================================
-- 1. ExclusiveRentalPolicy (verbatim 00c §1)
-- ===========================================================================

INSERT INTO "ExclusiveRentalPolicy" (
  id, "organizationId", name,
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  "minimumGuestCount",
  "dayRentalUntilHourLocal", "dayRentalRoomNetCents", "dayRentalMinConsumptionNetCents",
  "eveningRentalFromHourLocal", "eveningRentalRoomNetCents", "eveningRentalMinConsumptionNetCents",
  "seatedMenuMaxGuests", "standingReceptionMaxGuests",
  notes, "createdAt", "updatedAt"
)
SELECT
  'erp-cube-standard-2026', 'demo-organization-main',
  'CUBE Standard 2026 (verbatim Bankettmappe)',
  NULL, NULL,
  false, true,
  70,
  '16:00', 290000, 350000,
  '18:30', 450000, 900000,
  170, 250,
  'Quelle: Bankettmappe 2026-06-09. Werte Stand vor Verifizierung.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ExclusiveRentalPolicy" WHERE id = 'erp-cube-standard-2026');

-- ===========================================================================
-- 2. AfterMidnightStaffRate × 6 rows (5 from 00c §2 + security from §3)
-- ===========================================================================

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-cook', 'demo-organization-main', 'cook', 4590,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-cook');

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-service', 'demo-organization-main', 'service', 3990,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-service');

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-restaurant-manager', 'demo-organization-main', 'restaurant_manager', 5990,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-restaurant-manager');

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-bartender', 'demo-organization-main', 'bartender', 4590,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-bartender');

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-bar-buffet-staff', 'demo-organization-main', 'bar_buffet_staff', 3990,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-bar-buffet-staff');

INSERT INTO "AfterMidnightStaffRate" (
  id, "organizationId", role, "hourlyRateNetCents",
  "fromHourLocal", "toHourLocal",
  "validFrom", "validUntil",
  "isActive", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'amsr-cube-security', 'demo-organization-main', 'security', 2600,
  '00:00', '06:00',
  NULL, NULL,
  false, true,
  'Quelle: Deepdive §3, Sicherheitsdienst 26 €/h. Rolle per ADR-0029-C §2 ergänzt.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "AfterMidnightStaffRate" WHERE id = 'amsr-cube-security');

-- ===========================================================================
-- 3. NonFoodComponent × 17 rows (6 included + 6 optional + 5 cost-driver)
-- ===========================================================================

-- 3a. included_by_default × 6
INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-glasses', 'demo-organization-main', 'included_by_default',
       'glasses', 'Weingläser, Standard-Setup',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-glasses');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-porcelain', 'demo-organization-main', 'included_by_default',
       'porcelain', 'Porzellan, Standard-Setup',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-porcelain');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-cutlery', 'demo-organization-main', 'included_by_default',
       'cutlery', 'Besteck, Standard-Setup',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-cutlery');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-napkins', 'demo-organization-main', 'included_by_default',
       'napkins', 'Servietten, Standard-Setup',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-napkins');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-service-equipment', 'demo-organization-main', 'included_by_default',
       'service_equipment', 'Service-Equipment',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-service-equipment');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-kitchen-equipment', 'demo-organization-main', 'included_by_default',
       'kitchen_equipment', 'Küchen-Equipment',
       true, NULL, 'Quelle: Bankettmappe 2026-06-09.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-kitchen-equipment');

-- 3b. optional_addon × 6
INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-chair-covers', 'demo-organization-main', 'optional_addon',
       'chair_covers', 'Hussen',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-chair-covers');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-table-decoration', 'demo-organization-main', 'optional_addon',
       'table_decoration', 'Tischdekoration',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-table-decoration');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-additional-furniture', 'demo-organization-main', 'optional_addon',
       'additional_furniture', 'Zusatzmobiliar',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-additional-furniture');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-stage-or-audio', 'demo-organization-main', 'optional_addon',
       'stage_or_audio', 'Bühne / Audio',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-stage-or-audio');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-lighting-effects', 'demo-organization-main', 'optional_addon',
       'lighting_effects', 'Licht-Effekte',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-lighting-effects');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-music-acts', 'demo-organization-main', 'optional_addon',
       'music_acts', 'Musik-Acts',
       false, NULL, 'Preis auf Anfrage.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-music-acts');

-- 3c. cost_driver × 5
INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-setup-teardown-time', 'demo-organization-main', 'cost_driver',
       'setup_teardown_time', 'Auf-/Abbau-Zeit',
       false, NULL, 'Nach Aufwand.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-setup-teardown-time');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-after-midnight-staff', 'demo-organization-main', 'cost_driver',
       'after_midnight_staff', 'Personal nach 24:00 Uhr (siehe AfterMidnightStaffRate)',
       false, NULL, 'Verweist auf AfterMidnightStaffRate-Substrat.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-after-midnight-staff');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-security', 'demo-organization-main', 'cost_driver',
       'security', 'Sicherheitsdienst, 26 €/h',
       false, NULL, 'Verweist auf AfterMidnightStaffRate.role=security.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-security');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-furniture-rental', 'demo-organization-main', 'cost_driver',
       'furniture_rental', 'Möbelmiete',
       false, NULL, 'Nach Aufwand / gemäß FurniturePolicy.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-furniture-rental');

INSERT INTO "NonFoodComponent" (
  id, "organizationId", category, name, description,
  "defaultIncluded", "extraCostNetCents", notes, "isActive", "createdAt", "updatedAt"
)
SELECT 'nfc-cube-custom-seating', 'demo-organization-main', 'cost_driver',
       'custom_seating', 'Sonderbestuhlung',
       false, NULL, 'Nach Aufwand.', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "NonFoodComponent" WHERE id = 'nfc-cube-custom-seating');

-- ===========================================================================
-- 4. FurniturePolicy × 2 rows (Website + Bankettmappe, conflict demo)
-- ===========================================================================

INSERT INTO "FurniturePolicy" (
  id, "organizationId", name,
  "includedUntilGuestCount", "additionalFromGuestCount",
  "effectiveFrom", "effectiveUntil",
  "isActive", "sourceUrl", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'fp-cube-website-2026', 'demo-organization-main',
  'CUBE Website 2026',
  100, 120,
  NULL, NULL,
  false, 'https://www.cube-restaurant.de/de/events/', true,
  'Konflikt mit Bankettmappe; Manager-Klärung ausstehend. Werte Stand vor Verifizierung.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "FurniturePolicy" WHERE id = 'fp-cube-website-2026');

INSERT INTO "FurniturePolicy" (
  id, "organizationId", name,
  "includedUntilGuestCount", "additionalFromGuestCount",
  "effectiveFrom", "effectiveUntil",
  "isActive", "sourceUrl", "requiresManagerConfirmation",
  notes, "createdAt", "updatedAt"
)
SELECT
  'fp-cube-bankettmappe-2026', 'demo-organization-main',
  'CUBE Bankettmappe 2026',
  100, 120,
  NULL, NULL,
  false, NULL, true,
  'Bankettmappe Seite 7. Werte Stand vor Verifizierung.',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "FurniturePolicy" WHERE id = 'fp-cube-bankettmappe-2026');

COMMIT;
