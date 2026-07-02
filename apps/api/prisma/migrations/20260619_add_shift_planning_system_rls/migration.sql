-- RLS for the shift-planning tables.
--
-- Matches the project-wide pattern (see 20260617_enable_rls_all_tables and
-- 20260618_add_workspace_groups_and_kitchen_locations): the API connects with
-- the Supabase service_role and performs all organization-scoping in the
-- application layer. RLS therefore only needs to (a) be enabled so the tables
-- are not reachable by anon/authenticated public access, and (b) grant the
-- service_role full access.

DO $$
DECLARE
  table_name TEXT;
  shift_tables TEXT[] := ARRAY[
    'kitchen_areas',
    'shift_plan_imports',
    'shift_assignments',
    'checklist_tasks',
    'task_day_matrix',
    'task_instances',
    'task_issues',
    'task_comments',
    'shift_signoffs'
  ];
BEGIN
  FOREACH table_name IN ARRAY shift_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format(
      'DROP POLICY IF EXISTS "Service role admin access" ON public.%I',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY "Service role admin access" ON public.%I
         FOR ALL
         USING (auth.role() = ''service_role'')
         WITH CHECK (auth.role() = ''service_role'')',
      table_name
    );
  END LOOP;
END $$;
