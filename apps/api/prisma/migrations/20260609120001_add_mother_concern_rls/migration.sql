-- ADR-0056: Mother-Concern Meta-Layer RLS (Task 11)
-- Org-scoped SELECT policies + app_runtime SELECT grant on 6 new tables.
-- No Write policies, no Write grants (ADR-0021 §3).

-- Organization RLS
ALTER TABLE "public"."Organization" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization_select_org_members"
  ON "public"."Organization"
  FOR SELECT
  TO authenticated
  USING (
    "id" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."Organization" TO app_runtime;

-- BusinessUnit RLS
ALTER TABLE "public"."BusinessUnit" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BusinessUnit_select_org_members"
  ON "public"."BusinessUnit"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."BusinessUnit" TO app_runtime;

-- BusinessUnitLocation RLS
ALTER TABLE "public"."BusinessUnitLocation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BusinessUnitLocation_select_org_members"
  ON "public"."BusinessUnitLocation"
  FOR SELECT
  TO authenticated
  USING (
    "businessUnitId" IN (
      SELECT bu."id"
      FROM "public"."BusinessUnit" bu
      JOIN "public"."OrganizationMember" om ON om."organizationId" = bu."organizationId"
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."BusinessUnitLocation" TO app_runtime;

-- EventConcept RLS
ALTER TABLE "public"."EventConcept" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EventConcept_select_org_members"
  ON "public"."EventConcept"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."EventConcept" TO app_runtime;

-- BusinessUnitEventConcept RLS
ALTER TABLE "public"."BusinessUnitEventConcept" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BusinessUnitEventConcept_select_org_members"
  ON "public"."BusinessUnitEventConcept"
  FOR SELECT
  TO authenticated
  USING (
    "businessUnitId" IN (
      SELECT bu."id"
      FROM "public"."BusinessUnit" bu
      JOIN "public"."OrganizationMember" om ON om."organizationId" = bu."organizationId"
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."BusinessUnitEventConcept" TO app_runtime;

-- EventConceptLocationCompatibility RLS
ALTER TABLE "public"."EventConceptLocationCompatibility" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EventConceptLocationCompatibility_select_org_members"
  ON "public"."EventConceptLocationCompatibility"
  FOR SELECT
  TO authenticated
  USING (
    "eventConceptId" IN (
      SELECT ec."id"
      FROM "public"."EventConcept" ec
      JOIN "public"."OrganizationMember" om ON om."organizationId" = ec."organizationId"
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."EventConceptLocationCompatibility" TO app_runtime;

-- ExternalCatalogEntry RLS
ALTER TABLE "public"."ExternalCatalogEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ExternalCatalogEntry_select_org_members"
  ON "public"."ExternalCatalogEntry"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."ExternalCatalogEntry" TO app_runtime;

-- Inquiry RLS
ALTER TABLE "public"."Inquiry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inquiry_select_org_members"
  ON "public"."Inquiry"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."Inquiry" TO app_runtime;

-- InquiryRoutingRule RLS
ALTER TABLE "public"."InquiryRoutingRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InquiryRoutingRule_select_org_members"
  ON "public"."InquiryRoutingRule"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."InquiryRoutingRule" TO app_runtime;

-- InquiryClassificationAudit RLS
ALTER TABLE "public"."InquiryClassificationAudit" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InquiryClassificationAudit_select_org_members"
  ON "public"."InquiryClassificationAudit"
  FOR SELECT
  TO authenticated
  USING (
    "inquiryId" IN (
      SELECT i."id"
      FROM "public"."Inquiry" i
      JOIN "public"."OrganizationMember" om ON om."organizationId" = i."organizationId"
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."InquiryClassificationAudit" TO app_runtime;
