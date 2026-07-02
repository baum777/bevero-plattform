-- ADR-0050: Motorworld-Inn Extensions (Task 05)
-- Forward-only DDL: 4 enums + 4 tables + 3 Location-field-additions.

-- Location field additions
ALTER TABLE "public"."Location"
  ADD COLUMN IF NOT EXISTS "signatureAssets" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "weatherSensitive" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "cinemaAvailable" BOOLEAN NOT NULL DEFAULT FALSE;

-- Enums
CREATE TYPE "public"."EventSpaceSupport" AS ENUM (
  'PRIVATE_EVENT',
  'COMPANY_EVENT',
  'WEDDING',
  'CONFERENCE',
  'PRODUCT_PRESENTATION',
  'CINEMA',
  'DINNER_THEATER',
  'WORKSHOP',
  'SEMINAR',
  'PRESENTATION_PITCH',
  'TRAINING',
  'EVENT_ADDON'
);

CREATE TYPE "public"."ExceptionRuleType" AS ENUM (
  'EXCLUSIVE_EVENT_CLOSURE',
  'BRUNCH_BLOCKS_REGULAR_SERVICE',
  'OECHSLE_BUFFET_OVERRIDE',
  'WEATHER_OUTDOOR_CHANGE',
  'HOLIDAY_SCHEDULE',
  'HOTEL_OPERATIONAL_HOLIDAY',
  'BRUNCH_SUNDAY_LATE_START',
  'EVENT_CLOSURE_PRIVATE'
);

CREATE TYPE "public"."ReservationProvider" AS ENUM (
  'GASTRONAUT',
  'GASTRONOVI',
  'PHONE',
  'WALK_IN',
  'EVENT_INQUIRY',
  'EVIIVO',
  'OTHER'
);

CREATE TYPE "public"."ExternalSystemLinkKind" AS ENUM (
  'GUTSCHEINE_AMADEUS360',
  'HOTEL_EVIIVO',
  'OECHSLE_SCHEDULE',
  'FOODNOTIFY_BRIDGE',
  'GASTRONOVI_BRIDGE',
  'GASTRONAUT_BRIDGE',
  'OTHER'
);

-- EventSpace
CREATE TABLE "public"."EventSpace" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "locationId"       TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "slug"             TEXT NOT NULL,
  "capacitySeated"   INTEGER,
  "capacityStanding" INTEGER,
  "capacityIndoor"   INTEGER,
  "capacityOutdoor"  INTEGER,
  "hasOwnBar"        BOOLEAN NOT NULL DEFAULT FALSE,
  "hasRestrooms"     BOOLEAN NOT NULL DEFAULT FALSE,
  "supports"         "public"."EventSpaceSupport"[] NOT NULL DEFAULT '{}',
  "metadata"         JSONB,
  "isActive"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventSpace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventSpace_locationId_slug_key" UNIQUE ("locationId", "slug"),
  CONSTRAINT "EventSpace_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE
);

CREATE INDEX "EventSpace_organizationId_idx" ON "public"."EventSpace"("organizationId");
CREATE INDEX "EventSpace_locationId_idx" ON "public"."EventSpace"("locationId");
CREATE INDEX "EventSpace_locationId_isActive_idx" ON "public"."EventSpace"("locationId", "isActive");

-- ExceptionRule
CREATE TABLE "public"."ExceptionRule" (
  "id"                   TEXT NOT NULL,
  "organizationId"       TEXT NOT NULL,
  "locationId"           TEXT NOT NULL,
  "type"                 "public"."ExceptionRuleType" NOT NULL,
  "title"                TEXT NOT NULL,
  "description"          TEXT,
  "affectedUnitIds"      TEXT[] NOT NULL DEFAULT '{}',
  "startsAt"             TIMESTAMP(3),
  "endsAt"               TIMESTAMP(3),
  "source"               TEXT NOT NULL,
  "requiresConfirmation" BOOLEAN NOT NULL DEFAULT FALSE,
  "confirmedByUserId"    TEXT,
  "confirmedAt"          TIMESTAMP(3),
  "isActive"             BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata"             JSONB,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExceptionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExceptionRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE
);

CREATE INDEX "ExceptionRule_organizationId_idx" ON "public"."ExceptionRule"("organizationId");
CREATE INDEX "ExceptionRule_locationId_idx" ON "public"."ExceptionRule"("locationId");
CREATE INDEX "ExceptionRule_locationId_isActive_idx" ON "public"."ExceptionRule"("locationId", "isActive");
CREATE INDEX "ExceptionRule_locationId_type_idx" ON "public"."ExceptionRule"("locationId", "type");
CREATE INDEX "ExceptionRule_startsAt_endsAt_idx" ON "public"."ExceptionRule"("startsAt", "endsAt");

-- ReservationConnector
CREATE TABLE "public"."ReservationConnector" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId"     TEXT NOT NULL,
  "provider"       "public"."ReservationProvider" NOT NULL,
  "externalUrl"    TEXT,
  "externalRef"    TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReservationConnector_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReservationConnector_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE
);

CREATE INDEX "ReservationConnector_organizationId_idx" ON "public"."ReservationConnector"("organizationId");
CREATE INDEX "ReservationConnector_locationId_idx" ON "public"."ReservationConnector"("locationId");
CREATE INDEX "ReservationConnector_locationId_isActive_idx" ON "public"."ReservationConnector"("locationId", "isActive");

-- ExternalSystemLink
CREATE TABLE "public"."ExternalSystemLink" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId"     TEXT NOT NULL,
  "kind"           "public"."ExternalSystemLinkKind" NOT NULL,
  "url"            TEXT NOT NULL,
  "externalRef"    TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalSystemLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExternalSystemLink_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE
);

CREATE INDEX "ExternalSystemLink_organizationId_idx" ON "public"."ExternalSystemLink"("organizationId");
CREATE INDEX "ExternalSystemLink_locationId_idx" ON "public"."ExternalSystemLink"("locationId");
CREATE INDEX "ExternalSystemLink_locationId_isActive_idx" ON "public"."ExternalSystemLink"("locationId", "isActive");
