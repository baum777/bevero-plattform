-- ADR-0029-C: CUBE Event-Economic-Rules — read-only DDL (Slice 3).
-- Companion to 20260609060000_add_cube_event_economics_rls.
--
-- Access matrix (ADR-0029-C §Scope, read-only slice):
--   ExclusiveRentalPolicy    read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   AfterMidnightStaffRate   read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   NonFoodComponent         read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--   FurniturePolicy          read: org member  | write: NO POLICY (deferred to ADR-0029-C.2)
--
-- Append-only invariant: enforced in the companion RLS migration via
-- 2 BEFORE UPDATE/DELETE triggers per table (8 triggers total), mirroring
-- the CUBE_Conflict pattern at ADR-0029-B §11.
--
-- Brutto/Netto-Disziplin: all monetary columns use the *NetCents suffix
-- (ADR-0029-C §5 binding). The DB does NOT store both net and gross.
-- CHECK constraints enforce category-specific invariants on
-- NonFoodComponent (included_by_default ⇒ extraCostNetCents IS NULL).
--
-- Mirror pattern: 20260609040000_add_operational_units/migration.sql
-- (OperationalUnit, ServiceSlot, GroupRule DDL).

BEGIN;

-- 1. Enums
CREATE TYPE "StaffRole" AS ENUM (
  'cook',
  'service',
  'restaurant_manager',
  'bartender',
  'bar_buffet_staff',
  'security'
);

CREATE TYPE "NonFoodCategory" AS ENUM (
  'included_by_default',
  'optional_addon',
  'cost_driver'
);

CREATE TYPE "FurniturePolicySource" AS ENUM (
  'CUBE_WEBSITE',
  'CUBE_BANKETTMAPPE_PDF',
  'OTHER'
);

-- 2. ExclusiveRentalPolicy
CREATE TABLE "ExclusiveRentalPolicy" (
  id                              TEXT NOT NULL,
  "organizationId"                TEXT NOT NULL,
  name                            TEXT NOT NULL,
  "validFrom"                     TIMESTAMP(3),
  "validUntil"                    TIMESTAMP(3),
  "isActive"                      BOOLEAN NOT NULL DEFAULT true,
  "requiresManagerConfirmation"   BOOLEAN NOT NULL DEFAULT false,
  "minimumGuestCount"             INTEGER NOT NULL,
  "dayRentalUntilHourLocal"       TEXT NOT NULL,
  "dayRentalRoomNetCents"         INTEGER NOT NULL,
  "dayRentalMinConsumptionNetCents" INTEGER NOT NULL,
  "eveningRentalFromHourLocal"    TEXT NOT NULL,
  "eveningRentalRoomNetCents"     INTEGER NOT NULL,
  "eveningRentalMinConsumptionNetCents" INTEGER NOT NULL,
  "seatedMenuMaxGuests"           INTEGER NOT NULL,
  "standingReceptionMaxGuests"    INTEGER NOT NULL,
  notes                           TEXT,
  "createdAt"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExclusiveRentalPolicy_pkey" PRIMARY KEY (id),
  CONSTRAINT "ExclusiveRentalPolicy_org_name_unique" UNIQUE ("organizationId", name),
  CONSTRAINT "ExclusiveRentalPolicy_min_guests_check" CHECK ("minimumGuestCount" > 0),
  CONSTRAINT "ExclusiveRentalPolicy_day_rental_room_check" CHECK ("dayRentalRoomNetCents" >= 0),
  CONSTRAINT "ExclusiveRentalPolicy_day_rental_min_consumption_check" CHECK ("dayRentalMinConsumptionNetCents" >= 0),
  CONSTRAINT "ExclusiveRentalPolicy_evening_rental_room_check" CHECK ("eveningRentalRoomNetCents" >= 0),
  CONSTRAINT "ExclusiveRentalPolicy_evening_rental_min_consumption_check" CHECK ("eveningRentalMinConsumptionNetCents" >= 0),
  CONSTRAINT "ExclusiveRentalPolicy_seated_max_check" CHECK ("seatedMenuMaxGuests" > 0),
  CONSTRAINT "ExclusiveRentalPolicy_standing_max_check" CHECK ("standingReceptionMaxGuests" > 0)
);

CREATE INDEX "ExclusiveRentalPolicy_org_active_validFrom_idx" ON "ExclusiveRentalPolicy" ("organizationId", "isActive", "validFrom");
CREATE INDEX "ExclusiveRentalPolicy_org_validUntil_idx" ON "ExclusiveRentalPolicy" ("organizationId", "validUntil");

-- 3. AfterMidnightStaffRate
CREATE TABLE "AfterMidnightStaffRate" (
  id                          TEXT NOT NULL,
  "organizationId"            TEXT NOT NULL,
  role                        "StaffRole" NOT NULL,
  "hourlyRateNetCents"        INTEGER NOT NULL,
  "fromHourLocal"             TEXT NOT NULL,
  "toHourLocal"               TEXT NOT NULL,
  "validFrom"                 TIMESTAMP(3),
  "validUntil"                TIMESTAMP(3),
  "isActive"                  BOOLEAN NOT NULL DEFAULT true,
  "requiresManagerConfirmation" BOOLEAN NOT NULL DEFAULT false,
  notes                       TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AfterMidnightStaffRate_pkey" PRIMARY KEY (id),
  CONSTRAINT "AfterMidnightStaffRate_org_role_window_unique" UNIQUE ("organizationId", role, "fromHourLocal", "toHourLocal"),
  CONSTRAINT "AfterMidnightStaffRate_rate_check" CHECK ("hourlyRateNetCents" >= 0)
);

CREATE INDEX "AfterMidnightStaffRate_org_role_active_idx" ON "AfterMidnightStaffRate" ("organizationId", role, "isActive");
CREATE INDEX "AfterMidnightStaffRate_validFrom_idx" ON "AfterMidnightStaffRate" ("validFrom");

-- 4. NonFoodComponent
CREATE TABLE "NonFoodComponent" (
  id                          TEXT NOT NULL,
  "organizationId"            TEXT NOT NULL,
  category                    "NonFoodCategory" NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT,
  "defaultIncluded"           BOOLEAN NOT NULL DEFAULT false,
  "extraCostNetCents"         INTEGER,
  notes                       TEXT,
  "isActive"                  BOOLEAN NOT NULL DEFAULT true,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NonFoodComponent_pkey" PRIMARY KEY (id),
  CONSTRAINT "NonFoodComponent_org_category_name_unique" UNIQUE ("organizationId", category, name),
  CONSTRAINT "NonFoodComponent_included_default_check" CHECK (
    (category = 'included_by_default' AND "extraCostNetCents" IS NULL AND "defaultIncluded" = true)
    OR
    (category <> 'included_by_default')
  ),
  CONSTRAINT "NonFoodComponent_extra_cost_check" CHECK (
    "extraCostNetCents" IS NULL OR "extraCostNetCents" >= 0
  )
);

CREATE INDEX "NonFoodComponent_org_category_idx" ON "NonFoodComponent" ("organizationId", category);
CREATE INDEX "NonFoodComponent_org_active_idx" ON "NonFoodComponent" ("organizationId", "isActive");

-- 5. FurniturePolicy
CREATE TABLE "FurniturePolicy" (
  id                          TEXT NOT NULL,
  "organizationId"            TEXT NOT NULL,
  name                        TEXT NOT NULL,
  "includedUntilGuestCount"   INTEGER NOT NULL,
  "additionalFromGuestCount"  INTEGER NOT NULL,
  "effectiveFrom"             TIMESTAMP(3),
  "effectiveUntil"            TIMESTAMP(3),
  "isActive"                  BOOLEAN NOT NULL DEFAULT true,
  "sourceUrl"                 TEXT,
  "requiresManagerConfirmation" BOOLEAN NOT NULL DEFAULT false,
  notes                       TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FurniturePolicy_pkey" PRIMARY KEY (id),
  CONSTRAINT "FurniturePolicy_org_name_unique" UNIQUE ("organizationId", name),
  CONSTRAINT "FurniturePolicy_included_until_check" CHECK ("includedUntilGuestCount" > 0),
  CONSTRAINT "FurniturePolicy_additional_from_check" CHECK ("additionalFromGuestCount" >= "includedUntilGuestCount"),
  CONSTRAINT "FurniturePolicy_notes_length_check" CHECK (notes IS NULL OR length(notes) <= 1000)
);

CREATE INDEX "FurniturePolicy_org_active_idx" ON "FurniturePolicy" ("organizationId", "isActive");
CREATE INDEX "FurniturePolicy_org_effectiveFrom_idx" ON "FurniturePolicy" ("organizationId", "effectiveFrom");

COMMIT;
