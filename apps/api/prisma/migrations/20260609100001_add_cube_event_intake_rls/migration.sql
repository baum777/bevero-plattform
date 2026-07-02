-- ADR-0029-A2 (Task 03): CUBE Event-Intake Read — RLS
-- Read-only slice: ENABLE RLS, SELECT-policies (org-scoped + assignedToUserId scope on EventInquiry).
-- No app_runtime grant, no Write-Policies (mirror ADR-0029-A pattern).

ALTER TABLE "public"."BeveragePackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventInquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventPackageMenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventPackageBeverage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EventPackageSelection" ENABLE ROW LEVEL SECURITY;

-- BeveragePackage: org-scoped SELECT
CREATE POLICY "beverage_package_select_org_member"
  ON "public"."BeveragePackage"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "BeveragePackage"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- EventInquiry: org-scoped + assignedToUserId scope (ADR-0062 reserved)
-- A member may see an inquiry only if they are org-member AND
-- (either the inquiry is unassigned OR they are the assigned user).
CREATE POLICY "event_inquiry_select_org_member"
  ON "public"."EventInquiry"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "EventInquiry"."organizationId"
        AND om."userId" = auth.uid()::text
    )
    AND (
      "EventInquiry"."assignedToUserId" IS NULL
      OR "EventInquiry"."assignedToUserId" = auth.uid()::text
    )
  );

-- EventPackage: org-scoped SELECT
CREATE POLICY "event_package_select_org_member"
  ON "public"."EventPackage"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "EventPackage"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- EventPackageMenuItem: org-scoped SELECT
CREATE POLICY "event_package_menu_item_select_org_member"
  ON "public"."EventPackageMenuItem"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "EventPackageMenuItem"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- EventPackageBeverage: org-scoped SELECT
CREATE POLICY "event_package_beverage_select_org_member"
  ON "public"."EventPackageBeverage"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "EventPackageBeverage"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- EventPackageSelection: org-scoped SELECT
CREATE POLICY "event_package_selection_select_org_member"
  ON "public"."EventPackageSelection"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "EventPackageSelection"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- Defense-in-depth: assert AutomationDecision + CUBE_Conflict triggers not regressed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_automation_decision_append_only'
  ) THEN
    RAISE EXCEPTION 'Defense-in-depth: AutomationDecision append-only trigger missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname LIKE 'trg_cube_conflict%'
  ) THEN
    RAISE EXCEPTION 'Defense-in-depth: CUBE_Conflict triggers missing';
  END IF;
END;
$$;
