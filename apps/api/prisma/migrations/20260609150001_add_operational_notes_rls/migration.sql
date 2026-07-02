-- Scope D: Operational Notes RLS
-- Org-scoped policies: members sehen nur Notes ihrer Organisation.
-- Visibility-Filter (private/team/manager_only) wird auf App-Ebene durchgesetzt.

ALTER TABLE public."OperationalNote" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OperationalNote_select_org_members"
  ON public."OperationalNote"
  FOR SELECT
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM public."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

CREATE POLICY "OperationalNote_insert_org_members"
  ON public."OperationalNote"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM public."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

CREATE POLICY "OperationalNote_update_org_members"
  ON public."OperationalNote"
  FOR UPDATE
  TO authenticated
  USING (
    "organizationId" IN (
      SELECT om."organizationId"
      FROM public."OrganizationMember" om
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON public."OperationalNote" TO app_runtime;

-- AuditEvent: nur lesen, nie löschen
ALTER TABLE public."OperationalNoteAuditEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OperationalNoteAuditEvent_select_org_members"
  ON public."OperationalNoteAuditEvent"
  FOR SELECT
  TO authenticated
  USING (
    "noteId" IN (
      SELECT n."id"
      FROM public."OperationalNote" n
      JOIN public."OrganizationMember" om ON om."organizationId" = n."organizationId"
      WHERE om."userId" = auth.uid()
    )
  );

GRANT SELECT ON public."OperationalNoteAuditEvent" TO app_runtime;
