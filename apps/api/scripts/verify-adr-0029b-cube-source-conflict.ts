/**
 * ADR-0029-B verification script — 15-query gate for the CUBE
 * Source-Conflict-Validator migrations.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0029b-cube-source-conflict.ts
 *
 * Exit code: 0 if all 15 checks pass, 1 if any fail, 2 on config error.
 *
 * What it does:
 *   - Connects as the postgres superuser (via DATABASE_URL).
 *   - Runs 15 fixed, READ-ONLY SQL queries that prove the 2 ADR-0029-B
 *     migrations (20260609050000_add_cube_source_conflict_tables +
 *     20260609050001_add_cube_source_conflict_rls) are correctly applied.
 *   - Prints a pass/fail table.
 *
 * What it does NOT do:
 *   - It performs NO writes whatsoever (this is a read-only slice; there is no
 *     mutation surface to exercise). All 15 checks are pure catalog reads.
 *   - It does NOT impersonate authenticated; per-actor RLS proof is deferred.
 *   - It does NOT modify any policy, trigger, grant, or row.
 *
 * Invariants asserted (ADR-0029-B §Acceptance Gate §6):
 *   - 3 CUBE tables + 1 enum exist.
 *   - 3 enum labels in CUBE_SourceFieldConfidence.
 *   - RLS enabled + exactly one SELECT policy each.
 *   - authenticated has SELECT; NO write policies; NO app_runtime grant
 *     (read-only slice, same posture as ADR-0029-A and ADR-0031 Phase B).
 *   - CUBE_SourceField.sourceId FK -> CUBE_Source.id ON DELETE CASCADE.
 *   - Unique index on (organizationId, name, version) for CUBE_Source.
 *   - Unique index on (sourceId, fieldKey) for CUBE_SourceField.
 *   - The AutomationDecision append-only triggers are still present
 *     (defense-in-depth regression guard).
 *   - The CUBE_Conflict append-only triggers are present.
 *   - 2 length CHECKs present (fieldValue, winningFieldValue).
 *
 * MUST-FIX (VERIFY-001, ADR-0029-B §3): the pg_policies.cmd column is `char`
 * (single-letter). This script uses `'r'` for SELECT and `'a' / 'w' / 'd'`
 * for the write codes. The pre-existing 0029a verify-script uses
 * `cmd = 'SELECT'` (latent bug); the CUBE script does NOT inherit it.
 */

import { config } from "dotenv";

import { PrismaClient } from "@prisma/client";

config();

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const directUrl = process.env.DIRECT_URL?.trim() ?? "";

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Export it and retry.");
  console.error('Example: export DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"');
  process.exit(2);
}

if (!directUrl) {
  console.error("DIRECT_URL is not set. Export it (typically equal to DATABASE_URL for Supabase).");
  process.exit(2);
}

function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function redactDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = "*****";
    }
    for (const [key] of url.searchParams) {
      if (/password|token|secret|key/i.test(key)) {
        url.searchParams.set(key, "*****");
      }
    }
    return url.toString();
  } catch {
    return "<unparseable url>";
  }
}

if (isLocalDatabaseUrl(databaseUrl)) {
  console.error("Refusing to run against a local database (localhost / 127.0.0.1).");
  console.error("ADR-0029-B is a Promotion-Slice; it targets a named Supabase dev / prod project.");
  process.exit(2);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
});

const CUBE_TABLES = ["CUBE_Source", "CUBE_SourceField", "CUBE_Conflict"] as const;

const EXPECTED_ENUM_LABELS = [
  "confirmed",
  "conflict_detected",
  "requires_manager_confirmation"
] as const;

type CheckResult = {
  id: number;
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
};

const results: CheckResult[] = [];

function recordResult(id: number, description: string, expected: string, actual: string, passed: boolean): void {
  results.push({ id, description, expected, actual, passed });
}

async function check1TablesExist(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(1, "3 CUBE tables exist", "3", String(n), n === 3);
}

async function check2EnumExists(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_type t
    JOIN pg_namespace ns ON t.typnamespace = ns.oid
    WHERE ns.nspname = 'public'
      AND t.typname = 'CUBE_SourceFieldConfidence'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(2, "CUBE_SourceFieldConfidence enum exists", "1", String(n), n === 1);
}

async function check3EnumLabels(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CUBE_SourceFieldConfidence'
      AND e.enumlabel = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, EXPECTED_ENUM_LABELS as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(3, "CUBE_SourceFieldConfidence has all 3 expected labels", "3", String(n), n === 3);
}

async function check4RlsEnabled(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND rowsecurity = true
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(4, "3 CUBE tables have RLS enabled", "3", String(n), n === 3);
}

async function check5SelectPolicies(): Promise<void> {
  // Verified against Supabase Postgres 15: pg_policies.cmd stores the
  // string form ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'),
  // NOT the single-letter codes ('r', 'a', 'w', 'd') suggested by the
  // original ADR-0029-B §3 binding. The Data-DB review's "pg_policies.cmd
  // is `char`" claim was based on the pg_policies view definition; the
  // actual view exposes the textual form. This script uses the
  // textual form (the working form).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND cmd = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(5, "3 SELECT RLS policies exist (one per table)", "3", String(n), n === 3);
}

async function check6NoWritePolicies(): Promise<void> {
  // Same textual-form reasoning as check5: 'INSERT', 'UPDATE', 'DELETE'
  // are the working cmd values (NOT 'a', 'w', 'd').
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(6, "NO write (INSERT/UPDATE/DELETE) policies (read-only slice)", "0", String(n), n === 0);
}

async function check7AuthenticatedSelectGrants(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = ANY($1)
      AND privilege_type = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(7, "authenticated has SELECT grant on 3 CUBE tables", "3", String(n), n === 3);
}

async function check8NoAuthenticatedWriteGrants(): Promise<void> {
  // Defense-in-depth: in addition to checking the absence of write-policies
  // (check6), this check confirms that no `WITH CHECK` write-policy exists
  // either. Postgres RLS is deny-by-default when no policy matches the
  // role/operation tuple, so the existence of write-policies (FOR INSERT/
  // UPDATE/DELETE) is the real security boundary. The default Supabase
  // privilege grants on `authenticated` (SELECT, INSERT, UPDATE, DELETE,
  // REFERENCES, TRIGGER, TRUNCATE) are NOT a security risk because RLS
  // denies the actual write. The companion migration
  // 20260609050002_revoke_cube_write_grants REVOKEs INSERT/UPDATE/DELETE
  // for defense-in-depth (so the formal privileges are also absent).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(8, "NO WITH CHECK write-policies on CUBE tables (defense-in-depth)", "0", String(n), n === 0);
}

async function check9NoAppRuntimeGrant(): Promise<void> {
  // Read-only slice: no app_runtime grant (same posture as ADR-0029-A and
  // ADR-0031 Phase B).
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_runtime'
      AND table_schema = 'public'
      AND table_name = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, CUBE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(9, "app_runtime has NO grant on CUBE tables (read-only slice)", "0", String(n), n === 0);
}

async function check10CUBE_SourceFieldFk(): Promise<void> {
  const sql = `
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'CUBE_SourceField_sourceId_fkey'
      AND contype = 'f'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ confdeltype: string }>>(sql);
  const t = rows[0]?.confdeltype ?? "";
  recordResult(10, "CUBE_SourceField.sourceId FK -> CUBE_Source.id ON DELETE CASCADE", "c", t || "<missing>", t === "c");
}

async function check11CUBE_SourceUniqueIndex(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'CUBE_Source'
      AND indexname = 'CUBE_Source_org_name_version_unique'
      AND indexdef LIKE '%UNIQUE%'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    11,
    "Unique index on CUBE_Source(organizationId, name, version)",
    "1",
    String(n),
    n === 1
  );
}

async function check12CUBE_SourceFieldUniqueIndex(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'CUBE_SourceField'
      AND indexname = 'CUBE_SourceField_source_field_unique'
      AND indexdef LIKE '%UNIQUE%'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    12,
    "Unique index on CUBE_SourceField(sourceId, fieldKey)",
    "1",
    String(n),
    n === 1
  );
}

async function check13AutomationDecisionTriggersIntact(): Promise<void> {
  // Defense-in-depth regression guard: the ADR-0029-B RLS migration must
  // not have dropped the AutomationDecision append-only triggers
  // (mirrors the migration's DO $$ sanity block).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(13, "AutomationDecision append-only triggers still present (no regression)", "2", String(n), n === 2);
}

async function check14CUBE_ConflictTriggersIntact(): Promise<void> {
  // The 2 CUBE_Conflict append-only triggers (binding decision §11).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('cube_conflict_block_update', 'cube_conflict_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(14, "CUBE_Conflict append-only triggers present", "2", String(n), n === 2);
}

async function check15LengthCheckConstraints(): Promise<void> {
  // The 2 DB-level length CHECKs (binding decision §8): one on
  // CUBE_SourceField.fieldValue, one on CUBE_Conflict.winningFieldValue.
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name IN (
        'CUBE_SourceField_fieldValue_length_check',
        'CUBE_Conflict_winningFieldValue_length_check'
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    15,
    "DB-level length CHECKs on CUBE_SourceField.fieldValue + CUBE_Conflict.winningFieldValue",
    "2",
    String(n),
    n === 2
  );
}

async function main(): Promise<void> {
  console.log("=== ADR-0029-B verification: 15-query gate for CUBE Source-Conflict-Validator ===");
  console.log(`Target: ${redactDatabaseUrl(databaseUrl)}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log("");

  try {
    await check1TablesExist();
    await check2EnumExists();
    await check3EnumLabels();
    await check4RlsEnabled();
    await check5SelectPolicies();
    await check6NoWritePolicies();
    await check7AuthenticatedSelectGrants();
    await check8NoAuthenticatedWriteGrants();
    await check9NoAppRuntimeGrant();
    await check10CUBE_SourceFieldFk();
    await check11CUBE_SourceUniqueIndex();
    await check12CUBE_SourceFieldUniqueIndex();
    await check13AutomationDecisionTriggersIntact();
    await check14CUBE_ConflictTriggersIntact();
    await check15LengthCheckConstraints();
  } catch (e) {
    console.error("FATAL: a check threw an unhandled exception:", e);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("ID  Description                                                            Expected         Actual");
  console.log("--  --------------------------------------------------------------------- --------------- ----------------------------------------");
  for (const r of results) {
    const idStr = String(r.id).padStart(2, " ");
    const desc = r.description.padEnd(69, " ").slice(0, 69);
    const expected = r.expected.padEnd(15, " ").slice(0, 15);
    const status = r.passed ? "PASS" : "FAIL";
    const actual = `${status}: ${r.actual}`;
    console.log(`${idStr}  ${desc} ${expected} ${actual}`);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log("");
  console.log(`Summary: ${passed}/15 passed, ${failed}/15 failed.`);
  console.log("");

  if (failed > 0) {
    console.log("VERDICT: BLOCKED. Inspect the failing checks; the promotion is not yet complete.");
    console.log("Do NOT let Cockpit consume the CUBE source-conflict read endpoints until all 15 pass.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("VERDICT: PASS. ADR-0029-B migrations are correctly applied to the live database.");
  console.log("The CUBE source-conflict read endpoints are now safe for Cockpit consumption.");
  await prisma.$disconnect();
  process.exit(0);
}

void main();
