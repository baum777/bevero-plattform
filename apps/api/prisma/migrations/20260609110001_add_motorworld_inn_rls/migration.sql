-- ADR-0050: Motorworld-Inn Extensions RLS (Task 05)
-- Org-scoped SELECT policies + app_runtime SELECT grant on 4 new tables.
-- No Write policies, no Write grants (ADR-0021 §3).

-- EventSpace RLS
ALTER TABLE "public"."EventSpace" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EventSpace_select_org_members"
  ON "public"."EventSpace"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."EventSpace" TO app_runtime;

-- ExceptionRule RLS
ALTER TABLE "public"."ExceptionRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ExceptionRule_select_org_members"
  ON "public"."ExceptionRule"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."ExceptionRule" TO app_runtime;

-- ReservationConnector RLS
ALTER TABLE "public"."ReservationConnector" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ReservationConnector_select_org_members"
  ON "public"."ReservationConnector"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."ReservationConnector" TO app_runtime;

-- ExternalSystemLink RLS
ALTER TABLE "public"."ExternalSystemLink" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ExternalSystemLink_select_org_members"
  ON "public"."ExternalSystemLink"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM "public"."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON "public"."ExternalSystemLink" TO app_runtime;

-- Defense-in-depth: assert AutomationDecision trigger not regressed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_automation_decision_append_only'
  ) THEN
    RAISE WARNING 'ADR-0050 defense: AutomationDecision append-only trigger not found — verify migration order';
  END IF;
END $$;
