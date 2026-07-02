/**
 * ADR-0029-C verification: 15-query gate for CUBE Event-Economic-Rules.
 *
 * Mirrors scripts/verify-adr-0029b-cube-source-conflict.ts shape. Uses the
 * TEXTUAL `pg_policies.cmd` codes ('SELECT', 'INSERT', 'UPDATE', 'DELETE',
 * 'ALL') per the ADR-0029-B post-promotion correction (see
 * docs/agent-team/mspr_logbook/2026-06-09-adr-0029-b-closure.md §1.2
 * Finding 1). The 4 CUBE_Economic tables get 8 append-only triggers
 * total (2 per table); the DO $$ block in the RLS migration asserts
 * count = 4 for each trigger kind.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0029c-cube-event-economic.ts
 *
 * Exit code: 0 if all 15 checks pass, 1 if any fail.
 */

import { config } from "dotenv";

import { PrismaClient } from "@prisma/client";

config();

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const directUrl = process.env.DIRECT_URL?.trim() ?? "";

if (!databaseUrl || !directUrl) {
  console.error("DATABASE_URL and DIRECT_URL must be set in the environment.");
  process.exit(2);
}

const parsed = new URL(databaseUrl);
const host = parsed.hostname.toLowerCase();
if (
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1" ||
  parsed.protocol === "postgresql+unix:"
) {
  console.error(
    `Refusing to run against local database (${host}). Set DATABASE_URL to the named Supabase dev project.`
  );
  process.exit(2);
}

const prisma = new PrismaClient();

const CUBE_ECONOMIC_TABLES = [
  "ExclusiveRentalPolicy",
  "AfterMidnightStaffRate",
  "NonFoodComponent",
  "FurniturePolicy"
] as const;

type Result = { id: number; description: string; expected: string; actual: string; pass: boolean };

const results: Result[] = [];

function recordResult(
  id: number,
  description: string,
  expected: string,
  actual: string,
  pass: boolean
): void {
  results.push({ id, description, expected, actual, pass });
  const marker = pass ? "PASS" : "FAIL";
  console.log(
    `${String(id).padStart(2, " ")}  ${description.padEnd(70)} ${expected.padEnd(15)} ${marker}: ${actual}`
  );
}

async function check1TablesExist(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(1, "4 CUBE_Economic tables exist", "4", String(n), n === 4);
}

async function check2EnumsExist(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_type
    WHERE typname IN ('StaffRole', 'NonFoodCategory', 'FurniturePolicySource')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(2, "3 CUBE_Economic enums exist", "3", String(n), n === 3);
}

async function check3EnumLabels(): Promise<void> {
  // Postgres stores unquoted enum type names as lowercase. The DDL
  // `CREATE TYPE "StaffRole" AS ENUM (...)` creates a type whose regtype
  // OID is looked up by case-insensitive name match in the cast. The
  // safe pattern is to JOIN against the lowercase form via the typname
  // column. We count labels per enum by matching the enumtypid's
  // typname against the expected names (case-sensitive in the
  // catalog).
  const sql = `
    SELECT t.typname, count(*)::int AS n
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname IN ('StaffRole', 'NonFoodCategory', 'FurniturePolicySource')
    GROUP BY t.typname
    ORDER BY t.typname
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ typname: string; n: number }>>(sql);
  const total = rows.reduce((acc, r) => acc + r.n, 0);
  // 6 (StaffRole) + 3 (NonFoodCategory) + 3 (FurniturePolicySource) = 12.
  recordResult(3, "12 enum labels across the 3 enums (6+3+3)", "12", String(total), total === 12);
}

async function check4RlsEnabled(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND rowsecurity = true
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(4, "4 CUBE_Economic tables have RLS enabled", "4", String(n), n === 4);
}

async function check5SelectPolicies(): Promise<void> {
  // TEXTUAL `cmd = 'SELECT'` (corrected from ADR-0029-B post-promotion).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(5, "4 SELECT RLS policies (one per table)", "4", String(n), n === 4);
}

async function check6NoWritePolicies(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(6, "NO write policies (read-only slice)", "0", String(n), n === 0);
}

async function check7AuthenticatedSelectGrants(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = ANY($1::text[])
      AND privilege_type = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(7, "authenticated has SELECT grant on 4 CUBE_Economic tables", "4", String(n), n === 4);
}

async function check8NoAuthenticatedWriteGrants(): Promise<void> {
  // Defense-in-depth: the REVOKE migration (20260609060002) revoked write
  // privileges, so `authenticated` should have NO INSERT/UPDATE/DELETE
  // grants on the 4 CUBE_Economic tables.
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = ANY($1::text[])
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(8, "authenticated has NO write grants (REVOKE applied)", "0", String(n), n === 0);
}

async function check9NoAppRuntimeGrant(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_runtime'
      AND table_schema = 'public'
      AND table_name = ANY($1::text[])
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(9, "app_runtime has NO grant on CUBE_Economic tables", "0", String(n), n === 0);
}

async function check10ForeignKeys(): Promise<void> {
  // No FKs between the 4 CUBE_Economic tables (they're independent
  // substrates). 0 FKs is the expected count.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid IN (
        'public."ExclusiveRentalPolicy"'::regclass,
        'public."AfterMidnightStaffRate"'::regclass,
        'public."NonFoodComponent"'::regclass,
        'public."FurniturePolicy"'::regclass
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(10, "0 FK constraints between CUBE_Economic tables (independent)", "0", String(n), n === 0);
}

async function check11UniqueIndexes(): Promise<void> {
  // 4 expected: ExclusiveRentalPolicy (org,name), AfterMidnightStaffRate
  // (org,role,fromHour,toHour), NonFoodComponent (org,category,name),
  // FurniturePolicy (org,name). The 4 _pkey indexes are excluded (they
  // are not the composite business uniques; they are the primary-key
  // implicit unique indexes that Postgres creates automatically).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND indexdef LIKE '%UNIQUE%'
      AND indexname NOT LIKE '%_pkey'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(11, "4 unique composite indexes (one per table, _pkey excluded)", "4", String(n), n === 4);
}

async function check12CheckConstraints(): Promise<void> {
  // Expected CHECK constraints across the 4 tables:
  //   ExclusiveRentalPolicy: 7 (min_guests, day_rental_room, day_rental_min_cons,
  //     evening_rental_room, evening_rental_min_cons, seated_max, standing_max)
  //   AfterMidnightStaffRate: 1 (rate)
  //   NonFoodComponent: 2 (included_default, extra_cost)
  //   FurniturePolicy: 3 (included_until, additional_from, notes_length)
  // Total: 13.
  const sql = `
    SELECT conrelid::regclass::text AS tbl, count(*)::int AS n
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'public."ExclusiveRentalPolicy"'::regclass,
        'public."AfterMidnightStaffRate"'::regclass,
        'public."NonFoodComponent"'::regclass,
        'public."FurniturePolicy"'::regclass
      )
    GROUP BY conrelid
    ORDER BY conrelid
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ tbl: string; n: number }>>(sql);
  const total = rows.reduce((acc, r) => acc + r.n, 0);
  recordResult(12, "13 CHECK constraints across 4 tables (7+1+2+3)", "13", String(total), total === 13);
}

async function check13AutomationDecisionTriggers(): Promise<void> {
  // Defense-in-depth: the 2 AutomationDecision triggers from
  // 20260608161000 must still be present.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(13, "2 AutomationDecision append-only triggers still present", "2", String(n), n === 2);
}

async function check14CUBE_ConflictTriggers(): Promise<void> {
  // Defense-in-depth: the 2 CUBE_Conflict triggers from ADR-0029-B
  // (20260609050001) must still be present.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('cube_conflict_block_update', 'cube_conflict_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(14, "2 CUBE_Conflict append-only triggers still present", "2", String(n), n === 2);
}

async function check15CUBE_EconomicTriggers(): Promise<void> {
  // The 8 CUBE_Economic append-only triggers (2 per table × 4 tables).
  const expected = [
    "exclusive_rental_policy_block_update",
    "exclusive_rental_policy_block_delete",
    "after_midnight_staff_rate_block_update",
    "after_midnight_staff_rate_block_delete",
    "non_food_component_block_update",
    "non_food_component_block_delete",
    "furniture_policy_block_update",
    "furniture_policy_block_delete"
  ];
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname = ANY($1::text[])
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    expected as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(15, "8 CUBE_Economic append-only triggers (2 per table × 4)", "8", String(n), n === 8);
}

async function main(): Promise<void> {
  console.log(
    "=== ADR-0029-C verification: 15-query gate for CUBE Event-Economic-Rules ==="
  );
  console.log(
    `Target: ${databaseUrl.replace(/:[^:@/]+@/, ":*****@")}`
  );
  console.log(`Time:   ${new Date().toISOString()}\n`);

  console.log("ID  Description".padEnd(75) + "Expected".padEnd(17) + "Actual");
  console.log(
    "--  --------------------------------------------------------------------- --------------- ----------------------------------------"
  );

  try {
    await check1TablesExist();
    await check2EnumsExist();
    await check3EnumLabels();
    await check4RlsEnabled();
    await check5SelectPolicies();
    await check6NoWritePolicies();
    await check7AuthenticatedSelectGrants();
    await check8NoAuthenticatedWriteGrants();
    await check9NoAppRuntimeGrant();
    await check10ForeignKeys();
    await check11UniqueIndexes();
    await check12CheckConstraints();
    await check13AutomationDecisionTriggers();
    await check14CUBE_ConflictTriggers();
    await check15CUBE_EconomicTriggers();
  } finally {
    await prisma.$disconnect();
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  console.log(
    "\n" +
      "-".repeat(90) +
      "\n" +
      `Summary: ${passed}/${results.length} passed, ${failed}/${results.length} failed.\n`
  );

  if (failed === 0) {
    console.log(
      "VERDICT: PASS. ADR-0029-C migrations are correctly applied to the live database.\nThe CUBE event-economic read endpoints are now safe for Cockpit consumption."
    );
    process.exit(0);
  } else {
    console.log(
      "VERDICT: BLOCKED. Inspect the failing checks; the promotion is not yet complete.\nDo NOT let Cockpit consume the CUBE event-economic read endpoints until all 15 pass."
    );
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
