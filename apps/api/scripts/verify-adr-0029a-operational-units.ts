/**
 * ADR-0029-A verification script — 14-query gate for the CUBE Venue-Model
 * (Operational Units) migrations.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0029a-operational-units.ts
 *
 * Exit code: 0 if all 14 checks pass, 1 if any fail, 2 on config error.
 *
 * What it does:
 *   - Connects as the postgres superuser (via DATABASE_URL).
 *   - Runs 14 fixed, READ-ONLY SQL queries that prove the 2 ADR-0029-A
 *     migrations (20260609040000_add_operational_units +
 *     20260609040100_add_operational_units_rls) are correctly applied.
 *   - Prints a pass/fail table.
 *
 * What it does NOT do:
 *   - It performs NO writes whatsoever (this is a read-only slice; there is no
 *     mutation surface to exercise). All 14 checks are pure catalog reads.
 *   - It does NOT impersonate authenticated; per-actor RLS proof is deferred.
 *   - It does NOT modify any policy, trigger, grant, or row.
 *
 * Invariants asserted (ADR-0029-A §Gate):
 *   - 3 venue tables + 1 enum exist (00a-shape).
 *   - RLS enabled + exactly one SELECT policy each.
 *   - authenticated has SELECT; NO write policies; NO app_runtime grant
 *     (read-only slice, same posture as ADR-0031 Phase B).
 *   - FKs cascade correctly; uniqueness on (locationId,key) and (operationalUnitId).
 *   - The AutomationDecision append-only triggers are still present
 *     (defense-in-depth regression guard, mirrors the migration's DO block).
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
  console.error("ADR-0029-A is a Promotion-Slice; it targets a named Supabase dev / prod project.");
  process.exit(2);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
});

const VENUE_TABLES = ["OperationalUnit", "ServiceSlot", "GroupRule"] as const;

const EXPECTED_ENUM_LABELS = [
  "RESTAURANT",
  "BAR",
  "EVENT",
  "CAFE",
  "OUTDOOR_TERRACE",
  "HOTEL_CONTEXT",
  "LOUNGE"
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
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(1, "3 venue tables exist", "3", String(n), n === 3);
}

async function check2EnumExists(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_type t
    JOIN pg_namespace ns ON t.typnamespace = ns.oid
    WHERE ns.nspname = 'public'
      AND t.typname = 'OperationalUnitType'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(2, "OperationalUnitType enum exists", "1", String(n), n === 1);
}

async function check3EnumLabels(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'OperationalUnitType'
      AND e.enumlabel = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, EXPECTED_ENUM_LABELS as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(3, "OperationalUnitType has all 7 expected labels", "7", String(n), n === 7);
}

async function check4RlsEnabled(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND rowsecurity = true
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(4, "3 venue tables have RLS enabled", "3", String(n), n === 3);
}

async function check5SelectPolicies(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND cmd = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(5, "3 SELECT RLS policies exist (one per table)", "3", String(n), n === 3);
}

async function check6NoWritePolicies(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
      AND cmd <> 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
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
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(7, "authenticated has SELECT grant on 3 venue tables", "3", String(n), n === 3);
}

async function check8NoAuthenticatedWriteGrants(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = ANY($1)
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(8, "authenticated has NO write grants on venue tables", "0", String(n), n === 0);
}

async function check9NoAppRuntimeGrant(): Promise<void> {
  // Read-only slice: no app_runtime grant (same posture as ADR-0031 Phase B).
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_runtime'
      AND table_schema = 'public'
      AND table_name = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, VENUE_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(9, "app_runtime has NO grant on venue tables (read-only slice)", "0", String(n), n === 0);
}

async function check10OperationalUnitFk(): Promise<void> {
  const sql = `
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'OperationalUnit_locationId_fkey'
      AND contype = 'f'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ confdeltype: string }>>(sql);
  const t = rows[0]?.confdeltype ?? "";
  recordResult(10, "OperationalUnit.locationId FK -> Location ON DELETE CASCADE", "c", t || "<missing>", t === "c");
}

async function check11ServiceSlotFk(): Promise<void> {
  const sql = `
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'ServiceSlot_operationalUnitId_fkey'
      AND contype = 'f'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ confdeltype: string }>>(sql);
  const t = rows[0]?.confdeltype ?? "";
  recordResult(11, "ServiceSlot.operationalUnitId FK -> OperationalUnit ON DELETE CASCADE", "c", t || "<missing>", t === "c");
}

async function check12GroupRuleFk(): Promise<void> {
  const sql = `
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'GroupRule_operationalUnitId_fkey'
      AND contype = 'f'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ confdeltype: string }>>(sql);
  const t = rows[0]?.confdeltype ?? "";
  recordResult(12, "GroupRule.operationalUnitId FK -> OperationalUnit ON DELETE CASCADE", "c", t || "<missing>", t === "c");
}

async function check13UniqueIndexes(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN ('OperationalUnit_locationId_key_key', 'GroupRule_operationalUnitId_key')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    13,
    "Unique indexes on OperationalUnit(locationId,key) + GroupRule(operationalUnitId)",
    "2",
    String(n),
    n === 2
  );
}

async function check14AppendOnlyTriggersIntact(): Promise<void> {
  // Defense-in-depth regression guard: the ADR-0029-A RLS migration must not
  // have dropped the AutomationDecision append-only triggers (mirrors the
  // migration's DO $$ sanity block).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(14, "AutomationDecision append-only triggers still present (no regression)", "2", String(n), n === 2);
}

async function main(): Promise<void> {
  console.log("=== ADR-0029-A verification: 14-query gate for CUBE Venue-Model (Operational Units) ===");
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
    await check10OperationalUnitFk();
    await check11ServiceSlotFk();
    await check12GroupRuleFk();
    await check13UniqueIndexes();
    await check14AppendOnlyTriggersIntact();
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
  console.log(`Summary: ${passed}/14 passed, ${failed}/14 failed.`);
  console.log("");

  if (failed > 0) {
    console.log("VERDICT: BLOCKED. Inspect the failing checks; the promotion is not yet complete.");
    console.log("Do NOT let Cockpit consume the operational-units read endpoints until all 14 pass.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("VERDICT: PASS. ADR-0029-A migrations are correctly applied to the live database.");
  console.log("The operational-units read endpoints are now safe for Cockpit consumption.");
  await prisma.$disconnect();
  process.exit(0);
}

void main();
