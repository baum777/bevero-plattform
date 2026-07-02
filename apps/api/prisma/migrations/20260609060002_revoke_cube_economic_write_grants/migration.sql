-- ADR-0029-C follow-up: explicit REVOKE of write privileges on the 4 CUBE
-- event-economic tables. This is defense-in-depth on top of RLS:
-- Postgres RLS is deny-by-default when no policy matches the role/operation
-- tuple, so the default Supabase privilege grants (which include
-- INSERT/UPDATE/DELETE on `authenticated` and `anon`) are NOT a security
-- risk in practice. However, formal privilege hygiene requires an
-- explicit REVOKE so that the GRANT SELECT ON TABLE ... TO authenticated
-- in 20260609060001 is the only thing the read-only slice grants.
--
-- Mirror pattern: 20260609050002_revoke_cube_write_grants from
-- ADR-0029-B. Forward-only, idempotent (REVOKE IF EXISTS not needed:
-- REVOKE is idempotent in Postgres).

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "ExclusiveRentalPolicy"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "AfterMidnightStaffRate"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "NonFoodComponent"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "FurniturePolicy"
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "ExclusiveRentalPolicy"
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "AfterMidnightStaffRate"
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "NonFoodComponent"
  FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "FurniturePolicy"
  FROM anon;
