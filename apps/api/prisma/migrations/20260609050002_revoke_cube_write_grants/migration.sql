-- ADR-0029-B follow-up: explicit REVOKE of write privileges on the 3 CUBE
-- source-conflict tables. This is defense-in-depth on top of RLS:
-- Postgres RLS is deny-by-default when no policy matches the role/operation
-- tuple, so the default Supabase privilege grants (which include
-- INSERT/UPDATE/DELETE on `authenticated` and `anon`) are NOT a security
-- risk in practice. However, formal privilege hygiene requires an
-- explicit REVOKE so that the GRANT SELECT ON TABLE ... TO authenticated
-- in 20260609050001 is the only thing the read-only slice grants.
--
-- Mirror pattern: every read-only OperationalUnit RLS migration does the
-- same. This file is forward-only and idempotent (REVOKE IF EXISTS).

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_Source"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_SourceField"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_Conflict"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_Source"
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_SourceField"
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "CUBE_Conflict"
  FROM anon;
