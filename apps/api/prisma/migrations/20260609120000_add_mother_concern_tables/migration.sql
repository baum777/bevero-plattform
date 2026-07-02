-- ADR-0056: Mother-Concern Meta-Layer (Task 11)
-- Forward-only DDL: 7 enums + 9 tables.

-- Enums

CREATE TYPE "public"."BusinessUnitName" AS ENUM (
  'CORPORATE_EVENTS',
  'PRIVATE_EVENTS',
  'RESTAURANTS',
  'BOOK_THE_CONCEPT',
  'LOCATIONS'
);

CREATE TYPE "public"."EventConceptName" AS ENUM (
  'FEEL_THE_FOREST',
  'MYSTERIOUS_URBAN_VENUE',
  'WINTER_WONDERLAND',
  'DINE_AROUND_THE_WORLD',
  'GARDEN_EDEN',
  'HEAVEN_SEVEN_ELEVEN',
  'BUENA_VIDA',
  'CUSTOM'
);

CREATE TYPE "public"."InquirySource" AS ENUM (
  'RAUSCHENBERGER_WEBSITE',
  'CUBE_WEBSITE',
  'MOTORWORLD_INN_WEBSITE',
  'MANUAL_ENTRY',
  'EMAIL_IMPORT'
);

CREATE TYPE "public"."InquirySubject" AS ENUM (
  'BUSINESS_DINNER',
  'CORPORATE_EVENT',
  'INCENTIVE',
  'WEDDING',
  'PRIVATE_EVENT',
  'BIRTHDAY',
  'CONFERENCE',
  'SEMINAR',
  'WORKSHOP',
  'CHRISTMAS_PARTY',
  'PRODUCT_PRESENTATION',
  'OTHER'
);

CREATE TYPE "public"."InquiryStatus" AS ENUM (
  'NEW',
  'NEEDS_CLASSIFICATION',
  'NEEDS_HUMAN_REVIEW',
  'OFFER_DRAFT',
  'APPROVED',
  'SENT',
  'CONFIRMED',
  'LOST',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "public"."ExternalCatalogEntryType" AS ENUM (
  'PARTNER_RESTAURANT',
  'PARTNER_EVENT_HALL',
  'PARTNER_CONFERENCE_SPACE',
  'PARTNER_OUTDOOR',
  'PARTNER_WEDDING_LOCATION',
  'PARTNER_SPECIAL_VENUE'
);

CREATE TYPE "public"."CateringMode" AS ENUM (
  'INHOUSE_RAUSCHENBERGER',
  'EXTERNAL_EVENT_CATERING',
  'HYBRID'
);

-- Organization

CREATE TABLE "public"."Organization" (
  "id"                  TEXT        NOT NULL PRIMARY KEY,
  "name"                TEXT        NOT NULL,
  "slug"                TEXT        NOT NULL UNIQUE,
  "headquartersAddress" TEXT,
  "headquartersPhone"   TEXT,
  "headquartersEmail"   TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BusinessUnit

CREATE TABLE "public"."BusinessUnit" (
  "id"                    TEXT                         NOT NULL PRIMARY KEY,
  "organizationId"        TEXT                         NOT NULL REFERENCES "public"."Organization"("id") ON DELETE CASCADE,
  "name"                  "public"."BusinessUnitName"  NOT NULL,
  "slug"                  TEXT                         NOT NULL,
  "description"           TEXT,
  "defaultWorkflowKey"    TEXT                         NOT NULL,
  "requiredInquiryFields" JSONB,
  "createdAt"             TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  UNIQUE ("organizationId", "slug")
);

CREATE INDEX "BusinessUnit_organizationId_idx" ON "public"."BusinessUnit"("organizationId");

-- BusinessUnitLocation (m:n)

CREATE TABLE "public"."BusinessUnitLocation" (
  "businessUnitId" TEXT    NOT NULL REFERENCES "public"."BusinessUnit"("id") ON DELETE CASCADE,
  "locationId"     TEXT    NOT NULL,
  "isPrimary"      BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata"       JSONB,
  PRIMARY KEY ("businessUnitId", "locationId")
);

-- EventConcept

CREATE TABLE "public"."EventConcept" (
  "id"             TEXT                         NOT NULL PRIMARY KEY,
  "organizationId" TEXT                         NOT NULL REFERENCES "public"."Organization"("id") ON DELETE CASCADE,
  "name"           "public"."EventConceptName"  NOT NULL,
  "customName"     TEXT,
  "description"    TEXT,
  "themeTags"      TEXT[]                       NOT NULL DEFAULT '{}',
  "isActive"       BOOLEAN                      NOT NULL DEFAULT TRUE,
  "createdAt"      TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

CREATE INDEX "EventConcept_organizationId_idx" ON "public"."EventConcept"("organizationId");

-- BusinessUnitEventConcept (m:n)

CREATE TABLE "public"."BusinessUnitEventConcept" (
  "businessUnitId"  TEXT NOT NULL REFERENCES "public"."BusinessUnit"("id") ON DELETE CASCADE,
  "eventConceptId"  TEXT NOT NULL REFERENCES "public"."EventConcept"("id") ON DELETE CASCADE,
  PRIMARY KEY ("businessUnitId", "eventConceptId")
);

-- EventConceptLocationCompatibility

CREATE TABLE "public"."EventConceptLocationCompatibility" (
  "id"                     TEXT NOT NULL PRIMARY KEY,
  "eventConceptId"         TEXT NOT NULL REFERENCES "public"."EventConcept"("id") ON DELETE CASCADE,
  "locationId"             TEXT,
  "externalCatalogEntryId" TEXT,
  "compatibilityScore"     INT,
  "notes"                  TEXT
);

CREATE INDEX "EventConceptLocationCompatibility_eventConceptId_idx"
  ON "public"."EventConceptLocationCompatibility"("eventConceptId");

-- ExternalCatalogEntry

CREATE TABLE "public"."ExternalCatalogEntry" (
  "id"               TEXT                                  NOT NULL PRIMARY KEY,
  "organizationId"   TEXT                                  NOT NULL REFERENCES "public"."Organization"("id") ON DELETE CASCADE,
  "name"             TEXT                                  NOT NULL,
  "slug"             TEXT                                  NOT NULL,
  "city"             TEXT                                  NOT NULL,
  "region"           TEXT                                  NOT NULL,
  "type"             "public"."ExternalCatalogEntryType"   NOT NULL,
  "capacityMin"      INT,
  "capacityMax"      INT,
  "cateringMode"     "public"."CateringMode"               NOT NULL,
  "logisticsProfile" JSONB,
  "isActive"         BOOLEAN                               NOT NULL DEFAULT TRUE,
  "metadata"         JSONB,
  "createdAt"        TIMESTAMPTZ                           NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ                           NOT NULL DEFAULT NOW(),
  UNIQUE ("organizationId", "slug")
);

CREATE INDEX "ExternalCatalogEntry_organizationId_idx" ON "public"."ExternalCatalogEntry"("organizationId");

-- Inquiry

CREATE TABLE "public"."Inquiry" (
  "id"                            TEXT                        NOT NULL PRIMARY KEY,
  "organizationId"                TEXT                        NOT NULL REFERENCES "public"."Organization"("id") ON DELETE CASCADE,
  "businessUnitHint"              "public"."BusinessUnitName",
  "source"                        "public"."InquirySource"    NOT NULL,
  "externalRef"                   TEXT,
  "subject"                       "public"."InquirySubject"   NOT NULL,
  "guestCount"                    INT,
  "contactName"                   TEXT                        NOT NULL,
  "contactEmail"                  TEXT                        NOT NULL,
  "contactPhone"                  TEXT,
  "contactAddress"                TEXT,
  "rawMessage"                    TEXT,
  "preferredDate"                 TIMESTAMPTZ,
  "preferredLocationId"           TEXT,
  "preferredExternalCatalogEntryId" TEXT,
  "status"                        "public"."InquiryStatus"    NOT NULL DEFAULT 'NEW',
  "assignedToUserId"              TEXT,
  "routingRuleId"                 TEXT,
  "createdAt"                     TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  "updatedAt"                     TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

CREATE INDEX "Inquiry_organizationId_idx"              ON "public"."Inquiry"("organizationId");
CREATE INDEX "Inquiry_organizationId_status_idx"       ON "public"."Inquiry"("organizationId", "status");
CREATE INDEX "Inquiry_organizationId_businessUnitHint" ON "public"."Inquiry"("organizationId", "businessUnitHint");
CREATE INDEX "Inquiry_assignedToUserId_idx"            ON "public"."Inquiry"("assignedToUserId");

-- InquiryRoutingRule

CREATE TABLE "public"."InquiryRoutingRule" (
  "id"                 TEXT                         NOT NULL PRIMARY KEY,
  "organizationId"     TEXT                         NOT NULL REFERENCES "public"."Organization"("id") ON DELETE CASCADE,
  "businessUnitHint"   "public"."BusinessUnitName"  NOT NULL,
  "priority"           INT                          NOT NULL,
  "matchKeywords"      TEXT[]                       NOT NULL DEFAULT '{}',
  "matchSubjectTypes"  "public"."InquirySubject"[]  NOT NULL DEFAULT '{}',
  "matchGuestCountMin" INT,
  "matchGuestCountMax" INT,
  "isActive"           BOOLEAN                      NOT NULL DEFAULT TRUE,
  "description"        TEXT,
  "createdByUserId"    TEXT,
  "createdAt"          TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

CREATE INDEX "InquiryRoutingRule_organizationId_isActive_priority_idx"
  ON "public"."InquiryRoutingRule"("organizationId", "isActive", "priority");

-- InquiryClassificationAudit

CREATE TABLE "public"."InquiryClassificationAudit" (
  "id"               TEXT                         NOT NULL PRIMARY KEY,
  "inquiryId"        TEXT REFERENCES "public"."Inquiry"("id") ON DELETE SET NULL,
  "matchedRuleId"    TEXT,
  "matchedKeywords"  TEXT[]                       NOT NULL DEFAULT '{}',
  "confidence"       INT                          NOT NULL DEFAULT 0,
  "businessUnitHint" "public"."BusinessUnitName",
  "callerUserId"     TEXT,
  "createdAt"        TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

CREATE INDEX "InquiryClassificationAudit_inquiryId_idx"
  ON "public"."InquiryClassificationAudit"("inquiryId");
