-- ADR-0029-A2 (Task 03): CUBE Event-Intake Read — forward-only DDL
-- Brutto/Netto DB-Check-Constraint (00a §4) and private_package ⇒ prepayment (00a §7).
-- PII defense-in-depth length caps: rawMessage <= 5000, contactEmail <= 500
-- (mirror ADR-0029-B §Decisions §5). No auto-trigger on PII fields; service-layer
-- sanitizePII regex is the scrubbing mechanism.

-- Enums

CREATE TYPE "public"."EventInquirySubject" AS ENUM (
  'BUSINESS_DINNER',
  'CORPORATE_EVENT',
  'INCENTIVE',
  'WEDDING',
  'PRIVATE_EVENT',
  'OTHER'
);

CREATE TYPE "public"."EventInquiryStatus" AS ENUM (
  'NEW',
  'NEEDS_REVIEW',
  'OFFER_DRAFT',
  'APPROVED',
  'CONFIRMED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "public"."BeveragePackageName" AS ENUM (
  'APERITIF',
  'CLASSIC',
  'EXKLUSIV',
  'KIDS',
  'DIGESTIF',
  'COCKTAILS_LONGDRINKS',
  'CUSTOM'
);

CREATE TYPE "public"."EventPackageOrderMode" AS ENUM (
  'a_la_carte',
  'fixed_menu',
  'group_menu_required',
  'buffet',
  'flying_buffet',
  'package'
);

-- Table: BeveragePackage (no FK dependencies)
CREATE TABLE "public"."BeveragePackage" (
  "id"                  TEXT                           NOT NULL,
  "organizationId"      TEXT                           NOT NULL,
  "name"                "public"."BeveragePackageName" NOT NULL,
  "durationHours"       DOUBLE PRECISION               NOT NULL,
  "durationHoursMin"    DOUBLE PRECISION               NOT NULL,
  "durationHoursMax"    DOUBLE PRECISION               NOT NULL,
  "includedCategories"  TEXT[]                         NOT NULL DEFAULT '{}',
  "pricePerPersonCents" INTEGER,
  "serviceIncluded"     BOOLEAN                        NOT NULL DEFAULT TRUE,
  "isActive"            BOOLEAN                        NOT NULL DEFAULT TRUE,
  "isKidsPackage"       BOOLEAN                        NOT NULL DEFAULT FALSE,
  "childAgeMin"         INTEGER,
  "childAgeMax"         INTEGER,
  "under5Free"          BOOLEAN                        NOT NULL DEFAULT FALSE,
  "eventPhaseFactor"    DOUBLE PRECISION               NOT NULL DEFAULT 1.0,
  "createdAt"           TIMESTAMPTZ                    NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ                    NOT NULL,

  CONSTRAINT "BeveragePackage_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "BeveragePackage_pricePerPersonCents_check"
    CHECK ("pricePerPersonCents" IS NULL OR "pricePerPersonCents" > 0)
);

CREATE INDEX "BeveragePackage_organizationId_idx" ON "public"."BeveragePackage"("organizationId");
CREATE INDEX "BeveragePackage_organizationId_isActive_idx" ON "public"."BeveragePackage"("organizationId", "isActive");

-- Table: EventInquiry
CREATE TABLE "public"."EventInquiry" (
  "id"                               TEXT                              NOT NULL,
  "organizationId"                   TEXT                              NOT NULL,
  "operationalUnitId"                TEXT                              NOT NULL,
  "source"                           TEXT                              NOT NULL,
  "subject"                          "public"."EventInquirySubject"    NOT NULL,
  "guestCount"                       INTEGER                           NOT NULL,
  "contactName"                      TEXT                              NOT NULL,
  "contactEmail"                     TEXT                              NOT NULL,
  "contactPhone"                     TEXT,
  "rawMessage"                       TEXT,
  "preferredDate"                    TIMESTAMPTZ,
  "preferredAreas"                   TEXT[]                            NOT NULL DEFAULT '{}',
  "status"                           "public"."EventInquiryStatus"     NOT NULL DEFAULT 'NEW',
  "assignedToUserId"                 TEXT,
  "confirmationEmailSentAt"          TIMESTAMPTZ,
  "confirmationExpectedWithinMinutes" INTEGER                          NOT NULL DEFAULT 10,
  "confirmationReminderSentAt"       TIMESTAMPTZ,
  "createdAt"                        TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  "updatedAt"                        TIMESTAMPTZ                       NOT NULL,

  CONSTRAINT "EventInquiry_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "EventInquiry_operationalUnitId_fkey"
    FOREIGN KEY ("operationalUnitId")
    REFERENCES "public"."OperationalUnit"("id")
    ON DELETE CASCADE,

  -- PII defense-in-depth length caps (ADR-0029-B §Decisions §5 mirror)
  CONSTRAINT "EventInquiry_rawMessage_length_check"
    CHECK ("rawMessage" IS NULL OR length("rawMessage") <= 5000),
  CONSTRAINT "EventInquiry_contactEmail_length_check"
    CHECK (length("contactEmail") <= 500),

  CONSTRAINT "EventInquiry_source_check"
    CHECK ("source" IN ('cube_website', 'manual', 'email', 'phone'))
);

CREATE INDEX "EventInquiry_organizationId_idx" ON "public"."EventInquiry"("organizationId");
CREATE INDEX "EventInquiry_organizationId_status_idx" ON "public"."EventInquiry"("organizationId", "status");
CREATE INDEX "EventInquiry_operationalUnitId_idx" ON "public"."EventInquiry"("operationalUnitId");
CREATE INDEX "EventInquiry_assignedToUserId_idx" ON "public"."EventInquiry"("assignedToUserId");

-- Table: EventPackage
CREATE TABLE "public"."EventPackage" (
  "id"                  TEXT                              NOT NULL,
  "organizationId"      TEXT                              NOT NULL,
  "operationalUnitId"   TEXT                              NOT NULL,
  "name"                TEXT                              NOT NULL,
  "courseCount"         INTEGER,
  "pricePerPersonCents" INTEGER,
  "priceMode"           TEXT                              NOT NULL DEFAULT 'net_excluding_vat',
  "scope"               TEXT                              NOT NULL DEFAULT 'corporate_event',
  "orderMode"           "public"."EventPackageOrderMode"  NOT NULL DEFAULT 'group_menu_required',
  "requiredLeadTimeDays" INTEGER                          NOT NULL DEFAULT 3,
  "paymentMode"         TEXT                              NOT NULL DEFAULT 'prepayment',
  "cancellationPolicy"  TEXT                              NOT NULL DEFAULT 'free_until_3_days_before',
  "windowSeat"          TEXT                              NOT NULL DEFAULT 'only_by_availability',
  "includedItems"       TEXT[]                            NOT NULL DEFAULT '{}',
  "addOns"              TEXT[]                            NOT NULL DEFAULT '{}',
  "defaultGuestCount"   INTEGER                           NOT NULL DEFAULT 2,
  "validFrom"           TIMESTAMPTZ,
  "validUntil"          TIMESTAMPTZ,
  "isActive"            BOOLEAN                           NOT NULL DEFAULT TRUE,
  "createdAt"           TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ                       NOT NULL,

  CONSTRAINT "EventPackage_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "EventPackage_operationalUnitId_fkey"
    FOREIGN KEY ("operationalUnitId")
    REFERENCES "public"."OperationalUnit"("id")
    ON DELETE CASCADE,

  CONSTRAINT "EventPackage_priceMode_check"
    CHECK ("priceMode" IN (
      'gross_including_vat', 'net_excluding_vat', 'per_person',
      'for_two_persons', 'minimum_consumption', 'rental_fee'
    )),

  CONSTRAINT "EventPackage_scope_check"
    CHECK ("scope" IN (
      'restaurant_lunch', 'restaurant_dinner', 'group_lunch', 'group_dinner',
      'corporate_event', 'exclusive_rental', 'private_package', 'ot_bar'
    )),

  -- Brutto/Netto invariant (00a §4 verbatim)
  CONSTRAINT "EventPackage_brutto_netto_invariant" CHECK (
    CASE
      WHEN "scope" IN ('restaurant_lunch', 'restaurant_dinner', 'ot_bar')
        THEN "priceMode" = 'gross_including_vat'
      WHEN "scope" IN ('group_lunch', 'group_dinner', 'corporate_event', 'exclusive_rental', 'private_package')
        THEN "priceMode" = 'net_excluding_vat'
      ELSE TRUE
    END
  ),

  -- private_package ⇒ prepayment (00a §7)
  CONSTRAINT "EventPackage_private_package_prepayment" CHECK (
    "scope" <> 'private_package' OR "paymentMode" = 'prepayment'
  )
);

CREATE INDEX "EventPackage_organizationId_idx" ON "public"."EventPackage"("organizationId");
CREATE INDEX "EventPackage_operationalUnitId_idx" ON "public"."EventPackage"("operationalUnitId");
CREATE INDEX "EventPackage_operationalUnitId_isActive_idx" ON "public"."EventPackage"("operationalUnitId", "isActive");

-- Table: EventPackageMenuItem
CREATE TABLE "public"."EventPackageMenuItem" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "eventPackageId" TEXT        NOT NULL,
  "menuItemId"     TEXT        NOT NULL,
  "isOptional"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "position"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,

  CONSTRAINT "EventPackageMenuItem_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "EventPackageMenuItem_eventPackageId_fkey"
    FOREIGN KEY ("eventPackageId")
    REFERENCES "public"."EventPackage"("id")
    ON DELETE CASCADE
);

CREATE INDEX "EventPackageMenuItem_organizationId_idx" ON "public"."EventPackageMenuItem"("organizationId");
CREATE INDEX "EventPackageMenuItem_eventPackageId_idx" ON "public"."EventPackageMenuItem"("eventPackageId");

-- Table: EventPackageBeverage
CREATE TABLE "public"."EventPackageBeverage" (
  "id"               TEXT        NOT NULL,
  "organizationId"   TEXT        NOT NULL,
  "eventPackageId"   TEXT        NOT NULL,
  "beveragePackageId" TEXT       NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,

  CONSTRAINT "EventPackageBeverage_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "EventPackageBeverage_eventPackageId_fkey"
    FOREIGN KEY ("eventPackageId")
    REFERENCES "public"."EventPackage"("id")
    ON DELETE CASCADE,

  CONSTRAINT "EventPackageBeverage_beveragePackageId_fkey"
    FOREIGN KEY ("beveragePackageId")
    REFERENCES "public"."BeveragePackage"("id")
    ON DELETE CASCADE
);

CREATE INDEX "EventPackageBeverage_organizationId_idx" ON "public"."EventPackageBeverage"("organizationId");
CREATE INDEX "EventPackageBeverage_eventPackageId_idx" ON "public"."EventPackageBeverage"("eventPackageId");

-- Table: EventPackageSelection
CREATE TABLE "public"."EventPackageSelection" (
  "id"               TEXT        NOT NULL,
  "organizationId"   TEXT        NOT NULL,
  "eventInquiryId"   TEXT        NOT NULL,
  "eventPackageId"   TEXT        NOT NULL,
  "guestCountOverride" INTEGER,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,

  CONSTRAINT "EventPackageSelection_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "EventPackageSelection_eventInquiryId_fkey"
    FOREIGN KEY ("eventInquiryId")
    REFERENCES "public"."EventInquiry"("id")
    ON DELETE CASCADE,

  CONSTRAINT "EventPackageSelection_eventPackageId_fkey"
    FOREIGN KEY ("eventPackageId")
    REFERENCES "public"."EventPackage"("id")
    ON DELETE CASCADE
);

CREATE INDEX "EventPackageSelection_organizationId_idx" ON "public"."EventPackageSelection"("organizationId");
CREATE INDEX "EventPackageSelection_eventInquiryId_idx" ON "public"."EventPackageSelection"("eventInquiryId");
