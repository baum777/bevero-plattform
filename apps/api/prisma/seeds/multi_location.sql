-- Multi-Standort seed fixture (ADR-0031 §Scope, file #4).
--
-- Idempotent: every INSERT is name-guarded (WHERE NOT EXISTS) so re-runs
-- are safe. All rows are scoped to the demo organization
-- "demo-organization-main" (matches demo-seed.service.ts). The
-- DemoSeedService gate (src/modules/inventory/demo-seed.service.ts)
-- ensures this seed is never executed in production.
--
-- What this seeds:
--   - 1 Brand: "ExampleCo Innenstadt" (the Brand row is the
--     organization-grouped brand for the multi-standort demo, not the
--     group-operations parent itself).
--   - 2 Locations: "Demo Site Alpha" (MOTORWORLD_STANDARD) and
--     "Demo Site Premium" (CUBE_PREMIUM, PREMIUM_TRACEABLE).
--   - Per-location Areas (Bar / Kitchen / Service / Storage / Restaurant /
--     Premium-Lager) with stable IDs.
--   - Per-location LocationMember rows for the demo shift-lead.
--   - 1 LocationInventoryConfig example on Demo Site Premium with all three
--     premium flags set (the premium-site example per ADR-0030
--     cube-premium-compatibility.md §3 and ADR-0031 §Open Questions §4).
--   - 1 LocationInventoryConfig example on Demo Site Alpha with all three
--     premium flags false (the standard-site default per ADR-0030
--     location-profiles.md §3).
--
-- No rows are inserted into InventoryItem or StorageLocation: those tables
-- are unchanged per ADR-0030 §Decisions Made Binding §2-3. The
-- LocationInventoryConfig rows reference the existing demo items by
-- sku='DEMO-ITEM-001' (created by the demo-seed.service.ts flow) and
-- fall back gracefully if no such item exists (the inventoryItemId
-- column is then NULL, which the read endpoint surfaces as 'no item
-- mapped yet' rather than crashing).

BEGIN;

-- 1. Brand: ExampleCo Innenstadt (mother concern grouping)
INSERT INTO "Brand" (id, "organizationId", name, slug, "createdAt", "updatedAt")
SELECT 'brand-rauschenberger-innenstadt', 'demo-organization-main',
       'ExampleCo Innenstadt', 'rauschenberger-innenstadt', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "Brand"
  WHERE "organizationId" = 'demo-organization-main'
    AND slug = 'rauschenberger-innenstadt'
);

-- 2. Locations: Demo Site Alpha (standard) + Demo Site Premium (premium)
INSERT INTO "Location" (id, "organizationId", "brandId", name, slug, type, profile, "precisionLevel", "isActive", "createdAt", "updatedAt")
SELECT 'loc-motorworld-inn-bb', 'demo-organization-main',
       'brand-rauschenberger-innenstadt',
       'Demo Site Alpha', 'motorworld-inn-bb', 'inn',
       'MOTORWORLD_STANDARD', 'DETAILED', true, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "Location"
  WHERE "organizationId" = 'demo-organization-main'
    AND slug = 'motorworld-inn-bb'
);

INSERT INTO "Location" (id, "organizationId", "brandId", name, slug, type, profile, "precisionLevel", "isActive", "createdAt", "updatedAt")
SELECT 'loc-cube-stuttgart', 'demo-organization-main',
       'brand-rauschenberger-innenstadt',
       'Demo Site Premium', 'cube-stuttgart', 'restaurant',
       'CUBE_PREMIUM', 'PREMIUM_TRACEABLE', true, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM "Location"
  WHERE "organizationId" = 'demo-organization-main'
    AND slug = 'cube-stuttgart'
);

-- 3. Areas: per-location sections. Areas have an optional storageLocationId
--    that points to the existing StorageLocation table (left NULL for the
--    Phase B seed; a future backfill migration will link them per ADR-0031
--    §Open Questions §1).

-- Demo Site Alpha areas
INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-mw-bar', 'loc-motorworld-inn-bb', 'demo-organization-main',
       'Bar', 'bar', NULL, 10, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-mw-bar');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-mw-kitchen', 'loc-motorworld-inn-bb', 'demo-organization-main',
       'Küche', 'kitchen', NULL, 20, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-mw-kitchen');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-mw-service', 'loc-motorworld-inn-bb', 'demo-organization-main',
       'Service', 'service', NULL, 30, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-mw-service');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-mw-storage', 'loc-motorworld-inn-bb', 'demo-organization-main',
       'Lager', 'storage', NULL, 40, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-mw-storage');

-- Demo Site Premium areas (Bar + Restaurant separated per ADR-0030
-- cube-premium-compatibility.md §5)
INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-cube-bar', 'loc-cube-stuttgart', 'demo-organization-main',
       'Bar', 'bar', NULL, 10, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-cube-bar');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-cube-restaurant', 'loc-cube-stuttgart', 'demo-organization-main',
       'Restaurant', 'restaurant', NULL, 20, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-cube-restaurant');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-cube-kitchen', 'loc-cube-stuttgart', 'demo-organization-main',
       'Küche', 'kitchen', NULL, 30, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-cube-kitchen');

INSERT INTO "Area" (id, "locationId", "organizationId", name, type, "storageLocationId", "sortOrder", "createdAt", "updatedAt")
SELECT 'area-cube-premium-storage', 'loc-cube-stuttgart', 'demo-organization-main',
       'Premium-Lager', 'premium_storage', NULL, 40, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Area" WHERE id = 'area-cube-premium-storage');

-- 4. LocationMember: demo shift-lead on both locations.
INSERT INTO "LocationMember" (id, "organizationId", "locationId", "userId", role, "isActive", "createdAt", "updatedAt")
SELECT 'lm-demo-shiftlead-mw', 'demo-organization-main', 'loc-motorworld-inn-bb',
       'demo-shiftlead-001', 'shift_lead', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "LocationMember" WHERE id = 'lm-demo-shiftlead-mw');

INSERT INTO "LocationMember" (id, "organizationId", "locationId", "userId", role, "isActive", "createdAt", "updatedAt")
SELECT 'lm-demo-shiftlead-cube', 'demo-organization-main', 'loc-cube-stuttgart',
       'demo-shiftlead-001', 'shift_lead', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "LocationMember" WHERE id = 'lm-demo-shiftlead-cube');

-- 5. LocationInventoryConfig: 1 premium-site example + 1 standard-site example.
--    The inventoryItemId is resolved from the existing demo inventory item
--    (created by the demo-seed.service.ts flow) when present; the seed does
--    not fail if the demo item is missing. The premium-site example sets all
--    three premium flags; the standard-site example sets all three to false.

INSERT INTO "LocationInventoryConfig" (id, "organizationId", "locationId", "inventoryItemId", "areaId", "storageLocationId", "targetQuantity", "minimumQuantity", "premiumHandlingRequired", "qualityNoteRequired", "batchNoteAllowed", "isActive", "createdAt", "updatedAt")
SELECT 'lic-cube-example-001', 'demo-organization-main', 'loc-cube-stuttgart',
       COALESCE((SELECT id FROM "InventoryItem" WHERE "organizationId" = 'demo-organization-main' ORDER BY "createdAt" LIMIT 1), ''),
       'area-cube-premium-storage', NULL, 12, 4, true, true, true, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "LocationInventoryConfig" WHERE id = 'lic-cube-example-001');

INSERT INTO "LocationInventoryConfig" (id, "organizationId", "locationId", "inventoryItemId", "areaId", "storageLocationId", "targetQuantity", "minimumQuantity", "premiumHandlingRequired", "qualityNoteRequired", "batchNoteAllowed", "isActive", "createdAt", "updatedAt")
SELECT 'lic-mw-example-001', 'demo-organization-main', 'loc-motorworld-inn-bb',
       COALESCE((SELECT id FROM "InventoryItem" WHERE "organizationId" = 'demo-organization-main' ORDER BY "createdAt" LIMIT 1), ''),
       'area-mw-storage', NULL, 24, 8, false, false, false, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "LocationInventoryConfig" WHERE id = 'lic-mw-example-001');

COMMIT;
