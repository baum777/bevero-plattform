-- ADR-0029-A2 (Task 02): CUBE Menu Matrix — RLS
-- Read-only slice: ENABLE RLS, 1 SELECT-Policy per table, authenticated SELECT only.
-- No app_runtime grant, no Write-Policies (mirror ADR-0029-A L1752-1753).

ALTER TABLE "public"."Menu" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MenuItem_Ingredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MenuItem_Allergen" ENABLE ROW LEVEL SECURITY;

-- SELECT policies: org-scoped via OrganizationMember join (mirror ADR-0029-A pattern)

CREATE POLICY "menu_select_org_member"
  ON "public"."Menu"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "Menu"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

CREATE POLICY "menu_item_select_org_member"
  ON "public"."MenuItem"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "MenuItem"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

CREATE POLICY "menu_item_ingredient_select_org_member"
  ON "public"."MenuItem_Ingredient"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "MenuItem_Ingredient"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

CREATE POLICY "menu_item_allergen_select_org_member"
  ON "public"."MenuItem_Allergen"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "public"."OrganizationMember" om
      WHERE om."organizationId" = "MenuItem_Allergen"."organizationId"
        AND om."userId" = auth.uid()::text
    )
  );

-- Defense-in-depth: assert that AutomationDecision triggers are not regressed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_automation_decision_append_only'
  ) THEN
    RAISE EXCEPTION 'Defense-in-depth: AutomationDecision append-only trigger missing';
  END IF;
END;
$$;
