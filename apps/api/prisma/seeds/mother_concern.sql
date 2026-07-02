-- ADR-0056: Mother-Concern Seed (Task 11)
-- 1 Organization + 5 BusinessUnits + 7 EventConcepts + 5 ExternalCatalogEntries
-- + 10 RoutingRules + 3 Sample-Inquiries

-- Organization
INSERT INTO "public"."Organization" ("id", "name", "slug", "headquartersAddress", "headquartersPhone", "headquartersEmail", "createdAt", "updatedAt")
VALUES (
  'org-examplecogroup',
  'ExampleCo Catering & Restaurants',
  'examplecogroup',
  'Musterstraße 10, 70000 Musterstadt',
  '+49 711 0000 0',
  'info@example.com',
  NOW(), NOW()
)
ON CONFLICT ("slug") DO NOTHING;

-- BusinessUnits
INSERT INTO "public"."BusinessUnit" ("id", "organizationId", "name", "slug", "description", "defaultWorkflowKey", "requiredInquiryFields", "createdAt", "updatedAt")
VALUES
  ('bu-corporate-events',   'org-examplecogroup', 'CORPORATE_EVENTS',   'corporate-events',   'Firmenveranstaltungen, Incentives, Produktpräsentationen', 'event_inquiry_handling', '{"guestCount":"required","eventDate":"required"}', NOW(), NOW()),
  ('bu-private-events',     'org-examplecogroup', 'PRIVATE_EVENTS',     'private-events',     'Hochzeiten, Geburtstage, private Feiern',               'event_inquiry_handling', '{"guestCount":"required","eventDate":"required"}', NOW(), NOW()),
  ('bu-restaurants',        'org-examplecogroup', 'RESTAURANTS',        'restaurants',        'Restaurant-Anfragen und Tischreservierungen',           'restaurant_inquiry_handling', '{}', NOW(), NOW()),
  ('bu-book-the-concept',   'org-examplecogroup', 'BOOK_THE_CONCEPT',   'book-the-concept',   'Buchung von Signature-Eventkonzepten',                  'concept_booking_handling', '{"eventConceptId":"required"}', NOW(), NOW()),
  ('bu-locations',          'org-examplecogroup', 'LOCATIONS',          'locations',          'Anfragen zu Locations und Räumlichkeiten',              'location_inquiry_handling', '{}', NOW(), NOW())
ON CONFLICT ("organizationId", "slug") DO NOTHING;

-- EventConcepts
INSERT INTO "public"."EventConcept" ("id", "organizationId", "name", "description", "themeTags", "isActive", "createdAt", "updatedAt")
VALUES
  ('ec-feel-the-forest',         'org-examplecogroup', 'FEEL_THE_FOREST',         'Waldambiente, natürliche Materialien, Botanik', ARRAY['nature','forest','outdoor','green'], TRUE, NOW(), NOW()),
  ('ec-mysterious-urban-venue',  'org-examplecogroup', 'MYSTERIOUS_URBAN_VENUE',  'Industrial-Chic, Versteckte Locations, Urban', ARRAY['industrial','urban','hidden','exclusive'], TRUE, NOW(), NOW()),
  ('ec-winter-wonderland',       'org-examplecogroup', 'WINTER_WONDERLAND',       'Winter-Thema, Eis- und Schneemotive, saisonal', ARRAY['winter','snow','seasonal','christmas'], TRUE, NOW(), NOW()),
  ('ec-dine-around-the-world',   'org-examplecogroup', 'DINE_AROUND_THE_WORLD',   'Multi-Cuisine-Stationen, Weltreise-Thema', ARRAY['international','cuisine','worldfood','buffet'], TRUE, NOW(), NOW()),
  ('ec-garden-eden',             'org-examplecogroup', 'GARDEN_EDEN',             'Grün und botanisch, Indoor oder Outdoor', ARRAY['garden','botanical','green','outdoor'], TRUE, NOW(), NOW()),
  ('ec-heaven-seven-eleven',     'org-examplecogroup', 'HEAVEN_SEVEN_ELEVEN',     'Eleviertes Luxus-Dining auf erhöhter Ebene', ARRAY['luxury','elevated','exclusive','rooftop'], TRUE, NOW(), NOW()),
  ('ec-buena-vida',              'org-examplecogroup', 'BUENA_VIDA',              'Mediterranes und lateinamerikanisches Flair, Sommer', ARRAY['mediterranean','summer','outdoor','festive'], TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ExternalCatalogEntries (5 Partner-Locations)
INSERT INTO "public"."ExternalCatalogEntry" ("id", "organizationId", "name", "slug", "city", "region", "type", "capacityMin", "capacityMax", "cateringMode", "logisticsProfile", "isActive", "createdAt", "updatedAt")
VALUES
  ('ext-goldberg-werk',    'org-examplecogroup', 'Demo Venue One',   'goldberg-werk',    'Demo City A', 'stuttgart', 'PARTNER_SPECIAL_VENUE',    20,  400, 'INHOUSE', '{"kitchenAccess":"full","loadingDock":true}',    TRUE, NOW(), NOW()),
  ('ext-legendenhalle',    'org-examplecogroup', 'Demo Venue Two',   'legendenhalle',    'Demo City A', 'stuttgart', 'PARTNER_EVENT_HALL',       50,  800, 'INHOUSE', '{"kitchenAccess":"limited","loadingDock":true}', TRUE, NOW(), NOW()),
  ('ext-carl-benz-arena',  'org-examplecogroup', 'Demo Venue Three', 'carl-benz-arena',  'Demo City A', 'stuttgart', 'PARTNER_CONFERENCE_SPACE', 200, 15000,'HYBRID',                '{"kitchenAccess":"none","loadingDock":true}',   TRUE, NOW(), NOW()),
  ('ext-zenith',           'org-examplecogroup', 'Demo Venue Four',  'zenith',           'Demo City B', 'muenchen',  'PARTNER_EVENT_HALL',       100, 5000, 'HYBRID',                '{"kitchenAccess":"limited","loadingDock":true}', TRUE, NOW(), NOW()),
  ('ext-kesselhaus',       'org-examplecogroup', 'Demo Venue Five',  'kesselhaus',       'Demo City A', 'stuttgart', 'PARTNER_EVENT_HALL',       50,  600, 'INHOUSE', '{"kitchenAccess":"full","loadingDock":false}',  TRUE, NOW(), NOW())
ON CONFLICT ("organizationId", "slug") DO NOTHING;

-- InquiryRoutingRules (10 deterministische Regeln, kein LLM)
INSERT INTO "public"."InquiryRoutingRule" ("id", "organizationId", "businessUnitHint", "priority", "matchKeywords", "matchSubjectTypes", "matchGuestCountMin", "matchGuestCountMax", "isActive", "description", "createdAt", "updatedAt")
VALUES
  ('irr-01', 'org-examplecogroup', 'PRIVATE_EVENTS',   1,  ARRAY['hochzeit','wedding','heirat','trauung','standesamt'],    ARRAY['WEDDING'::\"public\".\"InquirySubject\"'],                    NULL, NULL, TRUE, 'Hochzeits-Anfragen → Private Events', NOW(), NOW()),
  ('irr-02', 'org-examplecogroup', 'CORPORATE_EVENTS', 2,  ARRAY['firmenveranstaltung','corporate','firmenevent','incentive','betriebsfeier'], ARRAY['CORPORATE_EVENT'::\"public\".\"InquirySubject\",'INCENTIVE'::\"public\".\"InquirySubject\"], NULL, NULL, TRUE, 'Firmenveranstaltungen → Corporate Events', NOW(), NOW()),
  ('irr-03', 'org-examplecogroup', 'PRIVATE_EVENTS',   3,  ARRAY['geburtstag','birthday','jubiläum','jubilaeumsfest'],     ARRAY['BIRTHDAY'::\"public\".\"InquirySubject\",'PRIVATE_EVENT'::\"public\".\"InquirySubject\"], NULL, NULL, TRUE, 'Geburtstag/Jubiläum → Private Events', NOW(), NOW()),
  ('irr-04', 'org-examplecogroup', 'CORPORATE_EVENTS', 4,  ARRAY['konferenz','conference','seminar','workshop','tagung'],  ARRAY['CONFERENCE'::\"public\".\"InquirySubject\",'SEMINAR'::\"public\".\"InquirySubject\",'WORKSHOP'::\"public\".\"InquirySubject\"], NULL, NULL, TRUE, 'Konferenz/Seminar → Corporate Events', NOW(), NOW()),
  ('irr-05', 'org-examplecogroup', 'CORPORATE_EVENTS', 5,  ARRAY['weihnachtsfeier','christmas','xmas','weihnachten'],     ARRAY['CHRISTMAS_PARTY'::\"public\".\"InquirySubject\"],             NULL, NULL, TRUE, 'Weihnachtsfeier → Corporate Events', NOW(), NOW()),
  ('irr-06', 'org-examplecogroup', 'CORPORATE_EVENTS', 6,  ARRAY['produktpräsentation','product presentation','launch','präsentation'], ARRAY['PRODUCT_PRESENTATION'::\"public\".\"InquirySubject\"], NULL, NULL, TRUE, 'Produktpräsentation → Corporate Events', NOW(), NOW()),
  ('irr-07', 'org-examplecogroup', 'RESTAURANTS',      7,  ARRAY['restaurant','abendessen','tisch','reservierung','dinner'], ARRAY['BUSINESS_DINNER'::\"public\".\"InquirySubject\"],           NULL, NULL, TRUE, 'Restaurant-Anfragen → Restaurants', NOW(), NOW()),
  ('irr-08', 'org-examplecogroup', 'LOCATIONS',        8,  ARRAY['location mieten','eventlocation','venue','location anfrage','halle'], ARRAY[]::\"public\".\"InquirySubject\"[],                    NULL, NULL, TRUE, 'Location-Anfragen → Locations', NOW(), NOW()),
  ('irr-09', 'org-examplecogroup', 'BOOK_THE_CONCEPT', 9,  ARRAY['feel the forest','winter wonderland','buena vida','concept booking','eventkonzept'], ARRAY[]::\"public\".\"InquirySubject\"[], NULL, NULL, TRUE, 'Konzept-Buchung → Book-the-Concept', NOW(), NOW()),
  ('irr-10', 'org-examplecogroup', 'CORPORATE_EVENTS', 10, ARRAY[]::TEXT[],                                               ARRAY[]::\"public\".\"InquirySubject\"[],                              200,  NULL, TRUE, 'Catch-all: Großveranstaltung (>=200 Gäste) → Corporate Events', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Sample-Inquiries (3: 1 corporate, 1 private, 1 restaurant)
INSERT INTO "public"."Inquiry" ("id", "organizationId", "businessUnitHint", "source", "subject", "guestCount", "contactName", "contactEmail", "contactPhone", "rawMessage", "preferredDate", "status", "routingRuleId", "createdAt", "updatedAt")
VALUES
  ('inq-sample-01', 'org-examplecogroup', 'CORPORATE_EVENTS', 'RAUSCHENBERGER_WEBSITE', 'CORPORATE_EVENT', 80,  'Erika Mustermann', 'erika@example.com', '+49 000 0000001', 'Wir suchen eine Location für unsere Firmenveranstaltung im September mit ca. 80 Personen.', '2026-09-20 18:00:00+00', 'NEW', 'irr-02', NOW(), NOW()),
  ('inq-sample-02', 'org-examplecogroup', 'PRIVATE_EVENTS',   'CUBE_WEBSITE',           'WEDDING',         120, 'Hans Bauer',       'hans@example.com',    '+49 000 0000002', 'Wir planen unsere Hochzeit für nächstes Jahr und interessieren uns für Ihre Locations.', '2027-06-12 14:00:00+00', 'NEW', 'irr-01', NOW(), NOW()),
  ('inq-sample-03', 'org-examplecogroup', 'RESTAURANTS',      'MANUAL_ENTRY',           'BUSINESS_DINNER', 12,  'Petra Schmidt',    'petra@example.com',    NULL,              'Reservierung für Geschäftsessen, 12 Personen, gerne Fensterlage.', '2026-07-08 19:00:00+00', 'NEW', 'irr-07', NOW(), NOW())
ON CONFLICT DO NOTHING;
