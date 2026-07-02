-- Follow-up to ADR-0017 app_runtime role hardening.
-- Purpose: version reproducible SELECT grants required by app_user->app_runtime runtime path.

DO $$
DECLARE
  target_table text;
  target_tables text[] := ARRAY[
    'public."Supplier"',
    'public."StorageLocation"',
    'public."PurchaseOrder"',
    'public."PurchaseOrderItem"'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    RAISE EXCEPTION 'Required role app_runtime is missing; cannot apply app_user RLS grant slice.';
  END IF;

  FOREACH target_table IN ARRAY target_tables LOOP
    IF to_regclass(target_table) IS NULL THEN
      RAISE EXCEPTION 'Required table % is missing; cannot apply app_user RLS grant slice.', target_table;
    END IF;

    EXECUTE format('GRANT SELECT ON TABLE %s TO app_runtime;', target_table);
  END LOOP;
END $$;
