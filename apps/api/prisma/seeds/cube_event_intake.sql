-- ADR-0029-A2 (Task 03): CUBE Event-Intake Read seed data
-- DEMO_MODE-gated, id-guarded (WHERE NOT EXISTS).
-- 3 EventPackages + 2 BeveragePackages + 1 EventInquiry (no real PII).
-- Assumes operational units from operational_units.sql are present (ou-cube-event).

-- BeveragePackage 1: Classic
INSERT INTO "public"."BeveragePackage" (
  "id", "organizationId", "name",
  "durationHours", "durationHoursMin", "durationHoursMax",
  "includedCategories", "pricePerPersonCents",
  "serviceIncluded", "isActive",
  "isKidsPackage", "under5Free", "eventPhaseFactor",
  "createdAt", "updatedAt"
)
SELECT
  'bp-cube-classic',
  'demo-org',
  'CLASSIC'::"public"."BeveragePackageName",
  4.0, 2.0, 6.0,
  ARRAY['Prosecco', 'Wein', 'Wasser', 'Softdrinks'],
  4900,
  TRUE, TRUE,
  FALSE, FALSE, 1.0,
  NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."BeveragePackage" WHERE "id" = 'bp-cube-classic'
);

-- BeveragePackage 2: Exklusiv
INSERT INTO "public"."BeveragePackage" (
  "id", "organizationId", "name",
  "durationHours", "durationHoursMin", "durationHoursMax",
  "includedCategories", "pricePerPersonCents",
  "serviceIncluded", "isActive",
  "isKidsPackage", "under5Free", "eventPhaseFactor",
  "createdAt", "updatedAt"
)
SELECT
  'bp-cube-exklusiv',
  'demo-org',
  'EXKLUSIV'::"public"."BeveragePackageName",
  5.0, 3.0, 8.0,
  ARRAY['Champagner', 'Wein', 'Cocktails', 'Wasser', 'Softdrinks'],
  8900,
  TRUE, TRUE,
  FALSE, FALSE, 1.1,
  NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."BeveragePackage" WHERE "id" = 'bp-cube-exklusiv'
);

-- EventPackage 1: Wedding 4-Gang (private_package → net_excluding_vat, paymentMode = prepayment)
INSERT INTO "public"."EventPackage" (
  "id", "organizationId", "operationalUnitId",
  "name", "courseCount", "pricePerPersonCents",
  "priceMode", "scope", "orderMode",
  "requiredLeadTimeDays", "paymentMode", "cancellationPolicy",
  "windowSeat", "includedItems", "addOns", "defaultGuestCount",
  "isActive", "createdAt", "updatedAt"
)
SELECT
  'ep-cube-wedding',
  'demo-org',
  'ou-cube-event',
  'Hochzeitspaket 4-Gang',
  4,
  15900,
  'net_excluding_vat',
  'private_package',
  'fixed_menu'::"public"."EventPackageOrderMode",
  14,
  'prepayment',
  'free_until_14_days_before',
  'guaranteed',
  ARRAY['Tischdekorations-Service', 'Persönlicher Event-Manager', 'Getränkeberatung'],
  ARRAY['Blumendekoration', 'Foto-Ecke', 'Dessert-Buffet'],
  60,
  TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."EventPackage" WHERE "id" = 'ep-cube-wedding'
);

-- EventPackage 2: Corporate Event Flying Buffet (corporate_event → net_excluding_vat)
INSERT INTO "public"."EventPackage" (
  "id", "organizationId", "operationalUnitId",
  "name", "courseCount", "pricePerPersonCents",
  "priceMode", "scope", "orderMode",
  "requiredLeadTimeDays", "paymentMode", "cancellationPolicy",
  "windowSeat", "includedItems", "addOns", "defaultGuestCount",
  "isActive", "createdAt", "updatedAt"
)
SELECT
  'ep-cube-corporate',
  'demo-org',
  'ou-cube-event',
  'Firmen Flying Buffet',
  NULL,
  8900,
  'net_excluding_vat',
  'corporate_event',
  'flying_buffet'::"public"."EventPackageOrderMode",
  5,
  'prepayment',
  'free_until_3_days_before',
  'only_by_availability',
  ARRAY['Audio-Technik', 'Beamer & Leinwand'],
  ARRAY['Stehtische', 'Namensschilder', 'Willkommens-Sekt'],
  80,
  TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."EventPackage" WHERE "id" = 'ep-cube-corporate'
);

-- EventPackage 3: Incentive 3-Gang (corporate_event → net_excluding_vat)
INSERT INTO "public"."EventPackage" (
  "id", "organizationId", "operationalUnitId",
  "name", "courseCount", "pricePerPersonCents",
  "priceMode", "scope", "orderMode",
  "requiredLeadTimeDays", "paymentMode", "cancellationPolicy",
  "windowSeat", "includedItems", "addOns", "defaultGuestCount",
  "isActive", "createdAt", "updatedAt"
)
SELECT
  'ep-cube-incentive',
  'demo-org',
  'ou-cube-event',
  'Incentive-Menü 3-Gang',
  3,
  11900,
  'net_excluding_vat',
  'corporate_event',
  'fixed_menu'::"public"."EventPackageOrderMode",
  3,
  'prepayment',
  'free_until_3_days_before',
  'only_by_availability',
  ARRAY['Event-Koordination'],
  ARRAY['Wine Pairing', 'Cocktail-Workshop'],
  20,
  TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."EventPackage" WHERE "id" = 'ep-cube-incentive'
);

-- EventInquiry: sample (rawMessage is demo text, no real PII)
INSERT INTO "public"."EventInquiry" (
  "id", "organizationId", "operationalUnitId",
  "source", "subject", "guestCount",
  "contactName", "contactEmail", "contactPhone",
  "rawMessage", "preferredDate", "preferredAreas",
  "status", "confirmationExpectedWithinMinutes",
  "createdAt", "updatedAt"
)
SELECT
  'ei-cube-demo-001',
  'demo-org',
  'ou-cube-event',
  'cube_website',
  'CORPORATE_EVENT'::"public"."EventInquirySubject",
  45,
  'Demo Kontakt',
  'demo@example.com',
  NULL,
  'Demo-Anfrage: Firmenfeier 45 Personen, Wunschtermin flexibel. Bitte um Rückruf.',
  '2026-09-15T18:00:00.000Z',
  ARRAY['Exklusiv Events'],
  'NEW'::"public"."EventInquiryStatus",
  10,
  NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."EventInquiry" WHERE "id" = 'ei-cube-demo-001'
);
