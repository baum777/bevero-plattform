-- CUBE Venue-Model seed fixture (ADR-0029-A §Seed, 00a-cube-venue-model-spec).
--
-- Idempotent: every INSERT is id-guarded (WHERE NOT EXISTS) so re-runs are
-- safe. All rows are scoped to the demo organization "demo-organization-main"
-- and anchored to the existing Demo Site Premium location "loc-cube-stuttgart"
-- (created by multi_location.sql). The DemoSeedService gate
-- (src/modules/inventory/demo-seed.service.ts) ensures this seed is never
-- executed in production.
--
-- What this seeds (the CUBE venue graph per 00a §Venue-Graph):
--   - 3 OperationalUnits on loc-cube-stuttgart:
--       * Restaurant top floor (RESTAURANT) — à la carte, weather-insensitive.
--       * o.T. Bar & Terrasse (OUTDOOR_TERRACE) — weatherSensitive,
--         outdoorCapacityRelevant (client-side weather only per ADR-0021 §3).
--       * Exklusiv Events (EVENT) — requiresManualConfirmation, parentContext
--         "cube-stuttgart" (the venue holds the event context).
--   - ServiceSlots per unit (slot matrix per 00a §Slot-Matrix). daysOfWeekMask
--     is a 7-bit mask, bit0=Mon … bit6=Sun. 127 = all week, 124 = Wed–Sun.
--   - 1 GroupRule on the Restaurant unit (group/banquet thresholds per
--     00c-cube-event-economic-rules). The Event unit's economic rules are
--     deferred to ADR-0029-C (mutation/intake slice); this seed only fixtures
--     the read substrate.
--
-- No Brutto/Netto price fields are seeded here: priceMode is an annotation
-- deferred to the next slice per ADR-0029-A §Open Questions. The unitType
-- discriminator is the profile signal per ADR-0030 §Decisions §1 — no name
-- matching anywhere downstream.

BEGIN;

-- 1. OperationalUnits on Demo Site Premium.

INSERT INTO "OperationalUnit" (
  id, "organizationId", "locationId", key, name, "unitType",
  "parentContext", "requiresManualConfirmation", "weatherSensitive",
  "outdoorCapacityRelevant", "inventoryScopes", "dayparts",
  "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ou-cube-restaurant', 'demo-organization-main', 'loc-cube-stuttgart',
       'restaurant-top-floor', 'Restaurant top floor', 'RESTAURANT',
       NULL, false, false, false,
       ARRAY['kitchen','bar']::TEXT[], ARRAY['lunch','dinner']::TEXT[],
       10, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "OperationalUnit" WHERE id = 'ou-cube-restaurant');

INSERT INTO "OperationalUnit" (
  id, "organizationId", "locationId", key, name, "unitType",
  "parentContext", "requiresManualConfirmation", "weatherSensitive",
  "outdoorCapacityRelevant", "inventoryScopes", "dayparts",
  "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ou-cube-bar-terrasse', 'demo-organization-main', 'loc-cube-stuttgart',
       'ot-bar-terrasse', 'o.T. Bar & Terrasse', 'OUTDOOR_TERRACE',
       NULL, false, true, true,
       ARRAY['bar']::TEXT[], ARRAY['afternoon','evening','late_night']::TEXT[],
       20, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "OperationalUnit" WHERE id = 'ou-cube-bar-terrasse');

INSERT INTO "OperationalUnit" (
  id, "organizationId", "locationId", key, name, "unitType",
  "parentContext", "requiresManualConfirmation", "weatherSensitive",
  "outdoorCapacityRelevant", "inventoryScopes", "dayparts",
  "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ou-cube-events', 'demo-organization-main', 'loc-cube-stuttgart',
       'exklusiv-events', 'Exklusiv Events', 'EVENT',
       'cube-stuttgart', true, false, false,
       ARRAY['kitchen','bar','non_food']::TEXT[], ARRAY['evening','night']::TEXT[],
       30, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "OperationalUnit" WHERE id = 'ou-cube-events');

-- 2. ServiceSlots (daysOfWeekMask: bit0=Mon … bit6=Sun; 127=all, 124=Wed–Sun).

-- Restaurant: lunch (Wed–Sun) + dinner (Tue–Sun).
INSERT INTO "ServiceSlot" (
  id, "organizationId", "operationalUnitId", "slotKind", name,
  "daysOfWeekMask", "startTimeLocal", "endTimeLocal", "kitchenTimeLocal",
  "inventoryImpact", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ss-cube-restaurant-lunch', 'demo-organization-main', 'ou-cube-restaurant',
       'lunch', 'Mittagstisch', 124, '12:00', '14:30', '14:00',
       ARRAY['kitchen']::TEXT[], 10, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ServiceSlot" WHERE id = 'ss-cube-restaurant-lunch');

INSERT INTO "ServiceSlot" (
  id, "organizationId", "operationalUnitId", "slotKind", name,
  "daysOfWeekMask", "startTimeLocal", "endTimeLocal", "kitchenTimeLocal",
  "inventoryImpact", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ss-cube-restaurant-dinner', 'demo-organization-main', 'ou-cube-restaurant',
       'dinner', 'Abendservice', 126, '18:00', '23:00', '22:00',
       ARRAY['kitchen','bar']::TEXT[], 20, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ServiceSlot" WHERE id = 'ss-cube-restaurant-dinner');

-- Bar & Terrasse: afternoon + late bar (all week).
INSERT INTO "ServiceSlot" (
  id, "organizationId", "operationalUnitId", "slotKind", name,
  "daysOfWeekMask", "startTimeLocal", "endTimeLocal", "kitchenTimeLocal",
  "inventoryImpact", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ss-cube-terrasse-afternoon', 'demo-organization-main', 'ou-cube-bar-terrasse',
       'afternoon', 'Terrassen-Nachmittag', 127, '14:00', '18:00', NULL,
       ARRAY['bar']::TEXT[], 10, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ServiceSlot" WHERE id = 'ss-cube-terrasse-afternoon');

INSERT INTO "ServiceSlot" (
  id, "organizationId", "operationalUnitId", "slotKind", name,
  "daysOfWeekMask", "startTimeLocal", "endTimeLocal", "kitchenTimeLocal",
  "inventoryImpact", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ss-cube-terrasse-latebar', 'demo-organization-main', 'ou-cube-bar-terrasse',
       'late_bar', 'Late Bar', 96, '22:00', '02:00', NULL,
       ARRAY['bar']::TEXT[], 20, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ServiceSlot" WHERE id = 'ss-cube-terrasse-latebar');

-- Events: evening event window (Thu–Sat).
INSERT INTO "ServiceSlot" (
  id, "organizationId", "operationalUnitId", "slotKind", name,
  "daysOfWeekMask", "startTimeLocal", "endTimeLocal", "kitchenTimeLocal",
  "inventoryImpact", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 'ss-cube-events-evening', 'demo-organization-main', 'ou-cube-events',
       'event', 'Event-Abend', 112, '18:00', '01:00', '23:30',
       ARRAY['kitchen','bar','non_food']::TEXT[], 10, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "ServiceSlot" WHERE id = 'ss-cube-events-evening');

-- 3. GroupRule on the Restaurant unit (00c economic thresholds; read substrate).
INSERT INTO "GroupRule" (
  id, "organizationId", "operationalUnitId",
  "alaCarteMaxGuests", "groupMenuRequiredFrom", "bankettInquiryFrom",
  "exclusiveRentalFrom", "seatedMenuMax", "standingReceptionMax",
  "createdAt", "updatedAt")
SELECT 'gr-cube-restaurant', 'demo-organization-main', 'ou-cube-restaurant',
       8, 9, 20, 60, 80, 120, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "GroupRule" WHERE id = 'gr-cube-restaurant');

COMMIT;
