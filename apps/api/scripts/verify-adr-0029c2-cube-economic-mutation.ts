/**
 * ADR-0029-C.2 verification: 12-query gate for CUBE Event-Economic
 * Mutation Surface (manager-verification path).
 *
 * Mirrors scripts/verify-adr-0029c-cube-event-economic.ts shape. Uses
 * the TEXTUAL `pg_policies.cmd` codes per the ADR-0029-B post-promotion
 * correction. Pre-promotion: the 4 WITH CHECK UPDATE policies do NOT
 * exist yet (the migration is not yet applied). The script is
 * pre-promotion-only — it asserts the EXISTENCE of the 4 policies
 * AFTER the 20260609070000_… migration applies them; the trigger
 * function check (Q4) confirms the GUC substring is present.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0029c2-cube-economic-mutation.ts
 *
 * Exit code: 0 if all 12 checks pass, 1 if any fail, 2 on config error.
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

async function check1WithCheckUpdatePoliciesExist(): Promise<void> {
  // 4 new WITH CHECK UPDATE policies (one per table).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'UPDATE'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(
    1,
    "4 WITH CHECK UPDATE policies (one per CUBE_Economic table)",
    "4",
    String(n),
    n === 4
  );
}

async function check2WithCheckUpdatePoliciesWithGuc(): Promise<void> {
  // The WITH CHECK clause must reference the GUC. Use pg_get_expr on
  // the policy's qual (USING) and with_check (WITH CHECK). The
  // pg_policies view exposes the textual form in `qual` and
  // `with_check` columns.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'UPDATE'
      AND (
        with_check LIKE '%bevero.allow_cube_economic_update%'
        OR qual LIKE '%bevero.allow_cube_economic_update%'
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(
    2,
    "4 WITH CHECK policies reference the GUC substring",
    "4",
    String(n),
    n === 4
  );
}

async function check3AppendOnlyTriggersIntact(): Promise<void> {
  // 8 append-only triggers still present (4 block_update + 4 block_delete).
  // The DO $$ block in 20260609070000 asserts count = 4 for each.
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
  recordResult(3, "8 CUBE_Economic append-only triggers still present", "8", String(n), n === 8);
}

async function check4TriggerFunctionGucSubstring(): Promise<void> {
  // The relaxed public.cube_economic_append_only() function must reference
  // the GUC substring 'bevero.allow_cube_economic_update'. We use
  // pg_get_functiondef() to extract the function source as a string and
  // assert the substring is present.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'cube_economic_append_only'
      AND pg_get_functiondef(p.oid) LIKE '%bevero.allow_cube_economic_update%'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    4,
    "public.cube_economic_append_only() references the GUC substring",
    "1",
    String(n),
    n === 1
  );
}

async function check5NoAuthenticatedWriteGrants(): Promise<void> {
  // The REVOKE migration (20260609060002) ensures authenticated has
  // NO INSERT/UPDATE/DELETE grants on the 4 tables. Defense-in-depth.
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
  recordResult(5, "authenticated has NO write grants (REVOKE applied)", "0", String(n), n === 0);
}

async function check6SelectPoliciesStillPresent(): Promise<void> {
  // Regression: the 4 SELECT policies from the read-only slice
  // (20260609060001) must still be present.
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
  recordResult(6, "4 SELECT RLS policies still present (regression)", "4", String(n), n === 4);
}

async function check7UniqueIndexes(): Promise<void> {
  // 4 expected business unique composite indexes (one per table, _pkey
  // excluded per the ADR-0029-C verify-script precedent).
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
  recordResult(7, "4 business unique composite indexes (_pkey excluded)", "4", String(n), n === 4);
}

async function check8NonUniqueIndexes(): Promise<void> {
  // 4 expected: ExclusiveRentalPolicy (org), AfterMidnightStaffRate
  // (org, role), NonFoodComponent (org, category), FurniturePolicy
  // (org, isActive). The _pkey index is excluded.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND indexdef NOT LIKE '%UNIQUE%'
      AND indexname NOT LIKE '%_pkey'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  // ADR-0029-C §Scope #1: 4 business unique + 1 (org) = at least 5
  // non-unique indexes; the exact count depends on additional @index
  // declarations per table. Accept the 4 org-first non-unique indexes
  // as the minimum invariant.
  recordResult(
    8,
    ">= 4 non-unique indexes (org-first convention; _pkey excluded)",
    ">=4",
    String(n),
    n >= 4
  );
}

async function check9CheckConstraints(): Promise<void> {
  // The 13 CHECK constraints from the read-only slice must still be
  // present (no regression). The mutation slice does NOT add new
  // CHECKs; the *NetCents CHECKs and the notes-length CHECK are
  // unchanged.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'public."ExclusiveRentalPolicy"'::regclass,
        'public."AfterMidnightStaffRate"'::regclass,
        'public."NonFoodComponent"'::regclass,
        'public."FurniturePolicy"'::regclass
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(9, "13 CHECK constraints still present (regression)", "13", String(n), n === 13);
}

async function check10FksToOrganization(): Promise<void> {
  // Each of the 4 CUBE_Economic tables has an organizationId column
  // with an implicit logical FK to Organization.id. The schema
  // migration adds the column without an explicit FK constraint
  // (matching the OperationalUnit + CUBE_Source precedent; the
  // organizationId is a logical FK, not enforced at the DB level).
  // We assert the columns exist via information_schema.
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
      AND column_name = 'organizationId'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_ECONOMIC_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(10, "4 organizationId columns present (logical FK)", "4", String(n), n === 4);
}

async function check11AutomationDecisionTriggers(): Promise<void> {
  // Regression: 2 AutomationDecision append-only triggers (the audit
  // trail the mutation slice writes to).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(11, "2 AutomationDecision append-only triggers still present", "2", String(n), n === 2);
}

async function check12CUBE_ConflictTriggers(): Promise<void> {
  // Regression: 2 CUBE_Conflict append-only triggers from ADR-0029-B
  // (used by the B.2 mutation slice for the resolvedBy actor path).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('cube_conflict_block_update', 'cube_conflict_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(12, "2 CUBE_Conflict append-only triggers still present", "2", String(n), n === 2);
}

async function main(): Promise<void> {
  console.log(
    "=== ADR-0029-C.2 verification: 12-query gate for CUBE Event-Economic Mutation Surface ==="
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
    await check1WithCheckUpdatePoliciesExist();
    await check2WithCheckUpdatePoliciesWithGuc();
    await check3AppendOnlyTriggersIntact();
    await check4TriggerFunctionGucSubstring();
    await check5NoAuthenticatedWriteGrants();
    await check6SelectPoliciesStillPresent();
    await check7UniqueIndexes();
    await check8NonUniqueIndexes();
    await check9CheckConstraints();
    await check10FksToOrganization();
    await check11AutomationDecisionTriggers();
    await check12CUBE_ConflictTriggers();
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
      "VERDICT: PASS. ADR-0029-C.2 migrations are correctly applied to the live database.\nThe CUBE event-economic manager-verification endpoints are now safe for Cockpit consumption."
    );
    process.exit(0);
  } else {
    console.log(
      "VERDICT: BLOCKED. Inspect the failing checks; the promotion is not yet complete.\nDo NOT let Cockpit consume the CUBE event-economic mutation endpoints until all 12 pass."
    );
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
