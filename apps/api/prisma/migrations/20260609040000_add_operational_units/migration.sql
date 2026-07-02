-- ADR-0029-A: CUBE Venue-Model Implementation — schema additions (Slice 1).
-- Forward-only. Rollback is the manual DROP script documented in
-- ADR-0029-A §Rollback (drop GroupRule, ServiceSlot, OperationalUnit, then the
-- OperationalUnitType enum). Three new tables + one new enum in the public
-- schema. No RLS, no grants here — those land in the companion RLS migration
-- 20260609040100_add_operational_units_rls.
--
-- OperationalUnit (Geschäftswelt) is 1:n on Location and decoupled from Area
-- (Lagerwelt) per ADR-0029-A. The 00a-annotations (parentContext,
-- requiresManualConfirmation, weatherSensitive, outdoorCapacityRelevant,
-- inventoryScopes, dayparts) are folded in from creation so no throwaway
-- migration is needed. Existing models are UNCHANGED; these tables layer on
-- top via an additive foreign key to Location.

CREATE TYPE "OperationalUnitType" AS ENUM (
  'RESTAURANT', 'BAR', 'EVENT', 'CAFE', 'OUTDOOR_TERRACE', 'HOTEL_CONTEXT', 'LOUNGE'
);

CREATE TABLE "OperationalUnit" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unitType" "OperationalUnitType" NOT NULL,
  "parentContext" TEXT,
  "requiresManualConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "weatherSensitive" BOOLEAN NOT NULL DEFAULT false,
  "outdoorCapacityRelevant" BOOLEAN NOT NULL DEFAULT false,
  "inventoryScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dayparts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceSlot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "operationalUnitId" TEXT NOT NULL,
  "slotKind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "daysOfWeekMask" INTEGER NOT NULL,
  "startTimeLocal" TEXT NOT NULL,
  "endTimeLocal" TEXT NOT NULL,
  "kitchenTimeLocal" TEXT,
  "inventoryImpact" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "operationalUnitId" TEXT NOT NULL,
  "alaCarteMaxGuests" INTEGER NOT NULL,
  "groupMenuRequiredFrom" INTEGER NOT NULL,
  "bankettInquiryFrom" INTEGER NOT NULL,
  "exclusiveRentalFrom" INTEGER,
  "seatedMenuMax" INTEGER,
  "standingReceptionMax" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalUnit_locationId_key_key" ON "OperationalUnit"("locationId", "key");
CREATE INDEX "OperationalUnit_organizationId_idx" ON "OperationalUnit"("organizationId");
CREATE INDEX "OperationalUnit_locationId_idx" ON "OperationalUnit"("locationId");
CREATE INDEX "OperationalUnit_locationId_isActive_idx" ON "OperationalUnit"("locationId", "isActive");
CREATE INDEX "OperationalUnit_unitType_idx" ON "OperationalUnit"("unitType");

CREATE INDEX "ServiceSlot_organizationId_idx" ON "ServiceSlot"("organizationId");
CREATE INDEX "ServiceSlot_operationalUnitId_idx" ON "ServiceSlot"("operationalUnitId");
CREATE INDEX "ServiceSlot_operationalUnitId_isActive_idx" ON "ServiceSlot"("operationalUnitId", "isActive");
CREATE INDEX "ServiceSlot_operationalUnitId_sortOrder_idx" ON "ServiceSlot"("operationalUnitId", "sortOrder");

CREATE UNIQUE INDEX "GroupRule_operationalUnitId_key" ON "GroupRule"("operationalUnitId");
CREATE INDEX "GroupRule_organizationId_idx" ON "GroupRule"("organizationId");

ALTER TABLE "OperationalUnit"
  ADD CONSTRAINT "OperationalUnit_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceSlot"
  ADD CONSTRAINT "ServiceSlot_operationalUnitId_fkey"
  FOREIGN KEY ("operationalUnitId") REFERENCES "OperationalUnit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupRule"
  ADD CONSTRAINT "GroupRule_operationalUnitId_fkey"
  FOREIGN KEY ("operationalUnitId") REFERENCES "OperationalUnit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
