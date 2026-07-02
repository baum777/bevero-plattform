-- ADR-0017 follow-up: guarantee the app_runtime role exists.
-- The downstream grant migration (20260530211000) RAISES if app_runtime is
-- missing, which would break a fresh-environment deploy. This migration runs
-- earlier and creates the role idempotently.
--
-- app_runtime is a NOLOGIN role used purely as a RLS-scoped grant target.
-- The LOGIN application role (app_user) remains a separate operational step.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN;
  END IF;
END $$;
