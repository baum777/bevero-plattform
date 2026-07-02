-- Enforce one sign-off per org/date/workspace/department to prevent duplicate
-- rows when concurrent POST requests race past the application-level check.
CREATE UNIQUE INDEX IF NOT EXISTS "shift_signoffs_org_date_workspace_dept_key"
  ON "public"."shift_signoffs" ("organizationId", "date", "workspaceGroupId", "department");
