-- Enable RLS on all public tables (security hardening)
-- This migration protects all tables from unauthorized public access
-- Service role bypasses RLS and has full access

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(table_record.tablename) || ' ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;

    -- Create permissive policy for service_role (admin access - needed for API)
    EXECUTE 'DROP POLICY IF EXISTS "Service role admin access" ON public.' || quote_ident(table_record.tablename);
    EXECUTE 'CREATE POLICY "Service role admin access" ON public.' || quote_ident(table_record.tablename) || '
      FOR ALL
      USING (auth.role() = ''service_role'')
      WITH CHECK (auth.role() = ''service_role'')';
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
