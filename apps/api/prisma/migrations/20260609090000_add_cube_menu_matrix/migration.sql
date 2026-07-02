-- ADR-0029-A2 (Task 02): CUBE Menu Matrix — forward-only DDL
-- Brutto/Netto DB-Check-Constraint (00a §4 verbatim):
--   Restaurant/Bar scopes => gross_including_vat
--   Event/Bankett/Rental scopes => net_excluding_vat
-- Violation returns pg error 23514 check_violation.

-- Enum: MenuCategory
CREATE TYPE "public"."MenuCategory" AS ENUM (
  'FISH_MEAT',
  'VEGETARIAN',
  'VEGAN_POSSIBLE',
  'DESSERT',
  'BEVERAGE_PAIRING',
  'NON_ALCOHOLIC_PAIRING'
);

-- Table: Menu
CREATE TABLE "public"."Menu" (
  "id"                TEXT        NOT NULL,
  "organizationId"    TEXT        NOT NULL,
  "operationalUnitId" TEXT        NOT NULL,
  "name"              TEXT        NOT NULL,
  "slotKind"          TEXT        NOT NULL,
  "courseCount"       INTEGER     NOT NULL DEFAULT 3,
  "priceMode"         TEXT        NOT NULL,
  "scope"             TEXT        NOT NULL,
  "validFrom"         TIMESTAMPTZ,
  "validUntil"        TIMESTAMPTZ,
  "isActive"          BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,

  CONSTRAINT "Menu_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "Menu_operationalUnitId_fkey"
    FOREIGN KEY ("operationalUnitId")
    REFERENCES "public"."OperationalUnit"("id")
    ON DELETE CASCADE,

  CONSTRAINT "Menu_priceMode_check"
    CHECK ("priceMode" IN (
      'gross_including_vat', 'net_excluding_vat', 'per_person',
      'for_two_persons', 'minimum_consumption', 'rental_fee'
    )),

  CONSTRAINT "Menu_scope_check"
    CHECK ("scope" IN (
      'restaurant_lunch', 'restaurant_dinner', 'group_lunch', 'group_dinner',
      'corporate_event', 'exclusive_rental', 'private_package', 'ot_bar'
    )),

  -- Brutto/Netto invariant (00a §4 verbatim)
  CONSTRAINT "Menu_brutto_netto_invariant" CHECK (
    CASE
      WHEN "scope" IN ('restaurant_lunch', 'restaurant_dinner', 'ot_bar')
        THEN "priceMode" = 'gross_including_vat'
      WHEN "scope" IN ('group_lunch', 'group_dinner', 'corporate_event', 'exclusive_rental', 'private_package')
        THEN "priceMode" = 'net_excluding_vat'
      ELSE TRUE
    END
  )
);

CREATE INDEX "Menu_organizationId_idx" ON "public"."Menu"("organizationId");
CREATE INDEX "Menu_operationalUnitId_idx" ON "public"."Menu"("operationalUnitId");
CREATE INDEX "Menu_operationalUnitId_slotKind_isActive_idx" ON "public"."Menu"("operationalUnitId", "slotKind", "isActive");
CREATE INDEX "Menu_operationalUnitId_validFrom_validUntil_idx" ON "public"."Menu"("operationalUnitId", "validFrom", "validUntil");

-- Table: MenuItem
CREATE TABLE "public"."MenuItem" (
  "id"                  TEXT                       NOT NULL,
  "organizationId"      TEXT                       NOT NULL,
  "menuId"              TEXT                       NOT NULL,
  "name"                TEXT                       NOT NULL,
  "position"            INTEGER                    NOT NULL DEFAULT 0,
  "category"            "public"."MenuCategory"    NOT NULL,
  "pricePerPersonCents" INTEGER,
  "isVeganPossible"     BOOLEAN                    NOT NULL DEFAULT FALSE,
  "isVegetarian"        BOOLEAN                    NOT NULL DEFAULT FALSE,
  "description"         TEXT,
  "imageUrl"            TEXT,
  "createdAt"           TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ                NOT NULL,

  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "MenuItem_menuId_fkey"
    FOREIGN KEY ("menuId")
    REFERENCES "public"."Menu"("id")
    ON DELETE CASCADE
);

CREATE INDEX "MenuItem_organizationId_idx" ON "public"."MenuItem"("organizationId");
CREATE INDEX "MenuItem_menuId_idx" ON "public"."MenuItem"("menuId");
CREATE INDEX "MenuItem_menuId_position_idx" ON "public"."MenuItem"("menuId", "position");

-- Table: MenuItem_Ingredient
CREATE TABLE "public"."MenuItem_Ingredient" (
  "id"               TEXT        NOT NULL,
  "organizationId"   TEXT        NOT NULL,
  "menuItemId"       TEXT        NOT NULL,
  "inventoryItemId"  TEXT        NOT NULL,
  "quantityPerPerson" DOUBLE PRECISION NOT NULL,
  "unit"             TEXT        NOT NULL,
  "isPremium"        BOOLEAN     NOT NULL DEFAULT FALSE,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,

  CONSTRAINT "MenuItem_Ingredient_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "MenuItem_Ingredient_menuItemId_fkey"
    FOREIGN KEY ("menuItemId")
    REFERENCES "public"."MenuItem"("id")
    ON DELETE CASCADE
);

CREATE INDEX "MenuItem_Ingredient_organizationId_idx" ON "public"."MenuItem_Ingredient"("organizationId");
CREATE INDEX "MenuItem_Ingredient_menuItemId_idx" ON "public"."MenuItem_Ingredient"("menuItemId");

-- Table: MenuItem_Allergen
CREATE TABLE "public"."MenuItem_Allergen" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "menuItemId"     TEXT        NOT NULL,
  "allergenCode"   TEXT        NOT NULL,
  "isTrace"        BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "MenuItem_Allergen_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "MenuItem_Allergen_menuItemId_fkey"
    FOREIGN KEY ("menuItemId")
    REFERENCES "public"."MenuItem"("id")
    ON DELETE CASCADE
);

CREATE INDEX "MenuItem_Allergen_organizationId_idx" ON "public"."MenuItem_Allergen"("organizationId");
CREATE INDEX "MenuItem_Allergen_menuItemId_idx" ON "public"."MenuItem_Allergen"("menuItemId");
