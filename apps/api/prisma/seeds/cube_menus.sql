-- ADR-0029-A2 (Task 02): CUBE Menu Matrix seed data
-- DEMO_MODE-gated, id-guarded (WHERE NOT EXISTS). 3 menus + items + ingredients + allergens.
-- Scopes + priceModes comply with the Brutto/Netto invariant (00a §4).
-- Assumes operational units from operational_units.sql are present (seed dependency: ou-cube-restaurant, ou-cube-event).

-- Menu 1: CUBE Lunch (restaurant_lunch scope → gross_including_vat)
INSERT INTO "public"."Menu" (
  "id", "organizationId", "operationalUnitId",
  "name", "slotKind", "courseCount", "priceMode", "scope",
  "validFrom", "isActive", "createdAt", "updatedAt"
)
SELECT
  'menu-cube-lunch-2026',
  'demo-org',
  'ou-cube-restaurant',
  'CUBE Mittagsmenü 2026',
  'lunch',
  3,
  'gross_including_vat',
  'restaurant_lunch',
  '2026-01-01T00:00:00.000Z',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."Menu" WHERE "id" = 'menu-cube-lunch-2026'
);

-- Menu 2: CUBE Dinner (restaurant_dinner scope → gross_including_vat)
INSERT INTO "public"."Menu" (
  "id", "organizationId", "operationalUnitId",
  "name", "slotKind", "courseCount", "priceMode", "scope",
  "validFrom", "isActive", "createdAt", "updatedAt"
)
SELECT
  'menu-cube-dinner-2026',
  'demo-org',
  'ou-cube-restaurant',
  'CUBE Abendmenü 2026',
  'dinner',
  4,
  'gross_including_vat',
  'restaurant_dinner',
  '2026-01-01T00:00:00.000Z',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."Menu" WHERE "id" = 'menu-cube-dinner-2026'
);

-- Menu 3: Group Menu — corporate event (corporate_event scope → net_excluding_vat)
INSERT INTO "public"."Menu" (
  "id", "organizationId", "operationalUnitId",
  "name", "slotKind", "courseCount", "priceMode", "scope",
  "validFrom", "isActive", "createdAt", "updatedAt"
)
SELECT
  'menu-cube-group-2026',
  'demo-org',
  'ou-cube-event',
  'CUBE Gruppenmenü Firmen 2026',
  'group',
  4,
  'net_excluding_vat',
  'corporate_event',
  '2026-01-01T00:00:00.000Z',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."Menu" WHERE "id" = 'menu-cube-group-2026'
);

-- Menu items for Lunch menu
INSERT INTO "public"."MenuItem" (
  "id", "organizationId", "menuId", "name", "position",
  "category", "pricePerPersonCents", "isVeganPossible", "isVegetarian",
  "description", "createdAt", "updatedAt"
)
SELECT * FROM (VALUES
  ('mi-lunch-1', 'demo-org', 'menu-cube-lunch-2026', 'Tagessuppe', 1, 'VEGETARIAN'::"public"."MenuCategory", NULL, TRUE, TRUE, 'Saisonale Suppe', NOW(), NOW()),
  ('mi-lunch-2', 'demo-org', 'menu-cube-lunch-2026', 'Lachs auf Blattspinat', 2, 'FISH_MEAT'::"public"."MenuCategory", 2890, FALSE, FALSE, 'Atlantischer Lachs, Sahnesauce', NOW(), NOW()),
  ('mi-lunch-3', 'demo-org', 'menu-cube-lunch-2026', 'Crème brûlée', 3, 'DESSERT'::"public"."MenuCategory", NULL, FALSE, TRUE, 'Mit Vanille aus Madagaskar', NOW(), NOW()),
  ('mi-dinner-1', 'demo-org', 'menu-cube-dinner-2026', 'Burrata & Tomate', 1, 'VEGETARIAN'::"public"."MenuCategory", NULL, FALSE, TRUE, 'Büffelmilch-Burrata, Heirloom-Tomaten', NOW(), NOW()),
  ('mi-dinner-2', 'demo-org', 'menu-cube-dinner-2026', 'Rinderfilet Wellington', 2, 'FISH_MEAT'::"public"."MenuCategory", 5490, FALSE, FALSE, '200g, mit Périgueux-Sauce', NOW(), NOW()),
  ('mi-dinner-3', 'demo-org', 'menu-cube-dinner-2026', 'Gefüllte Paprika', 2, 'VEGAN_POSSIBLE'::"public"."MenuCategory", 3290, TRUE, TRUE, 'Quinoa, Kräuter, Tomate', NOW(), NOW()),
  ('mi-dinner-4', 'demo-org', 'menu-cube-dinner-2026', 'Mousse au Chocolat', 3, 'DESSERT'::"public"."MenuCategory", NULL, FALSE, TRUE, '72% Valrhona', NOW(), NOW()),
  ('mi-group-1', 'demo-org', 'menu-cube-group-2026', 'Vitello Tonnato', 1, 'FISH_MEAT'::"public"."MenuCategory", NULL, FALSE, FALSE, 'Klassisch', NOW(), NOW()),
  ('mi-group-2', 'demo-org', 'menu-cube-group-2026', 'Entenbrust a l''Orange', 2, 'FISH_MEAT'::"public"."MenuCategory", NULL, FALSE, FALSE, 'Confierte Entenbrust', NOW(), NOW()),
  ('mi-group-3', 'demo-org', 'menu-cube-group-2026', 'Wine Flight Spätburgunder', 2, 'BEVERAGE_PAIRING'::"public"."MenuCategory", NULL, FALSE, FALSE, '3 Positionen aus Baden', NOW(), NOW()),
  ('mi-group-4', 'demo-org', 'menu-cube-group-2026', 'Petits Fours', 3, 'DESSERT'::"public"."MenuCategory", NULL, FALSE, TRUE, 'Saisonale Auswahl', NOW(), NOW())
) AS v("id", "organizationId", "menuId", "name", "position", "category", "pricePerPersonCents", "isVeganPossible", "isVegetarian", "description", "createdAt", "updatedAt")
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."MenuItem" WHERE "id" = v."id"
);

-- Allergens for Lachs (mi-lunch-2): Gluten (A), Fisch (D), Milch (G)
INSERT INTO "public"."MenuItem_Allergen" (
  "id", "organizationId", "menuItemId", "allergenCode", "isTrace", "createdAt", "updatedAt"
)
SELECT * FROM (VALUES
  ('mia-lunch2-A', 'demo-org', 'mi-lunch-2', 'A', FALSE, NOW(), NOW()),
  ('mia-lunch2-D', 'demo-org', 'mi-lunch-2', 'D', FALSE, NOW(), NOW()),
  ('mia-lunch2-G', 'demo-org', 'mi-lunch-2', 'G', TRUE, NOW(), NOW()),
  ('mia-dinner2-A', 'demo-org', 'mi-dinner-2', 'A', FALSE, NOW(), NOW()),
  ('mia-dinner2-C', 'demo-org', 'mi-dinner-2', 'C', TRUE, NOW(), NOW())
) AS v("id", "organizationId", "menuItemId", "allergenCode", "isTrace", "createdAt", "updatedAt")
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."MenuItem_Allergen" WHERE "id" = v."id"
);
