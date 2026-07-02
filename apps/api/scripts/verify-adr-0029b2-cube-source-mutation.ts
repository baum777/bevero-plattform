/**
 * ADR-0029-B.2 verification: 12-query gate for CUBE Source-Conflict
 * Mutation Surface (manager-resolve + manager-entry paths).
 *
 * Mirrors scripts/verify-adr-0029b-cube-source-conflict.ts shape. Uses
 * the TEXTUAL `pg_policies.cmd` codes per the ADR-0029-B post-promotion
 * correction. Pre-promotion: the 3 UPDATE + 2 INSERT WITH CHECK policies
 * do NOT exist yet (the migration is not yet applied). The script is
 * pre-promotion-only — it asserts the EXISTENCE of the 5 policies AFTER
 * the 20260609080000_… migration applies them; the trigger function
 * check (Q4) confirms the GUC substring is present.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0029b2-cube-source-mutation.ts
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

const CUBE_TABLES = ["CUBE_Source", "CUBE_SourceField", "CUBE_Conflict"] as const;

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
  // 3 WITH CHECK UPDATE policies (one per CUBE table).
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'UPDATE'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(
    1,
    "3 WITH CHECK UPDATE policies (one per CUBE table)",
    "3",
    String(n),
    n === 3
  );
}

async function check2WithCheckInsertPoliciesExist(): Promise<void> {
  // 2 WITH CHECK INSERT policies (CUBE_Source + CUBE_SourceField for
  // the manager-entry path). CUBE_Conflict is the resolver output, not
  // the entry; no INSERT policy.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'INSERT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    ["CUBE_Source", "CUBE_SourceField"] as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(
    2,
    "2 WITH CHECK INSERT policies (CUBE_Source + CUBE_SourceField)",
    "2",
    String(n),
    n === 2
  );
}

async function check3WithCheckPoliciesWithGuc(): Promise<void> {
  // The 5 WITH CHECK policies (3 UPDATE + 2 INSERT) must reference
  // the GUC substring. The textual pg_policies view exposes the
  // with_check column.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd IN ('UPDATE', 'INSERT')
      AND (
        with_check LIKE '%bevero.allow_cube_source_update%'
        OR qual LIKE '%bevero.allow_cube_source_update%'
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(
    3,
    "5 WITH CHECK policies reference the GUC substring",
    "5",
    String(n),
    n === 5
  );
}

async function check4TriggerFunctionGucSubstring(): Promise<void> {
  // The relaxed public.cube_conflict_append_only() function must
  // reference the GUC substring 'bevero.allow_cube_source_update'.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'cube_conflict_append_only'
      AND pg_get_functiondef(p.oid) LIKE '%bevero.allow_cube_source_update%'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(
    4,
    "public.cube_conflict_append_only() references the GUC substring",
    "1",
    String(n),
    n === 1
  );
}

async function check5NoAuthenticatedWriteGrants(): Promise<void> {
  // The REVOKE migration (20260609050002) ensures authenticated has
  // NO INSERT/UPDATE/DELETE grants on the 3 CUBE tables.
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
    CUBE_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(5, "authenticated has NO write grants (REVOKE applied)", "0", String(n), n === 0);
}

async function check6SelectPoliciesStillPresent(): Promise<void> {
  // Regression: the 3 SELECT policies from the read-only slice
  // (20260609050001) must still be present.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
      AND cmd = 'SELECT'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    sql,
    CUBE_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(6, "3 SELECT RLS policies still present (regression)", "3", String(n), n === 3);
}

async function check7CUBE_ConflictTriggersIntact(): Promise<void> {
  // The 2 CUBE_Conflict append-only triggers (now GUC-gated) must
  // still be present.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('cube_conflict_block_update', 'cube_conflict_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(7, "2 CUBE_Conflict append-only triggers still present", "2", String(n), n === 2);
}

async function check8AutomationDecisionTriggers(): Promise<void> {
  // Regression: 2 AutomationDecision append-only triggers.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(8, "2 AutomationDecision append-only triggers still present", "2", String(n), n === 2);
}

async function check9UniqueIndexes(): Promise<void> {
  // 2 expected: CUBE_Source (org, name, version) + CUBE_SourceField
  // (sourceId, fieldKey). The 3 _pkey indexes are excluded.
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
    CUBE_TABLES as unknown as string[]
  );
  const n = rows[0]?.n ?? 0;
  recordResult(9, "2 business unique composite indexes (_pkey excluded)", "2", String(n), n === 2);
}

async function check10LengthCheckConstraints(): Promise<void> {
  // The 2 DB-level length CHECKs (binding decision ADR-0029-B §8): one
  // on CUBE_SourceField.fieldValue, one on CUBE_Conflict.winningFieldValue.
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
    10,
    "DB-level length CHECKs on CUBE_SourceField.fieldValue + CUBE_Conflict.winningFieldValue",
    "2",
    String(n),
    n === 2
  );
}

async function check11CUBE_SourceFieldFkCascade(): Promise<void> {
  // Regression: the CUBE_SourceField.sourceId FK must still cascade
  // on delete (mirrors the ADR-0029-B verify-script check #10).
  const sql = `
    SELECT confdeltype
    FROM pg_constraint
    WHERE conname = 'CUBE_SourceField_sourceId_fkey'
      AND contype = 'f'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ confdeltype: string }>>(sql);
  const t = rows[0]?.confdeltype ?? "";
  recordResult(
    11,
    "CUBE_SourceField.sourceId FK -> CUBE_Source.id ON DELETE CASCADE",
    "c",
    t || "<missing>",
    t === "c"
  );
}

async function check12CUBE_EconomicTriggersUnaffected(): Promise<void> {
  // Cross-slice regression: the 8 CUBE_Economic append-only triggers
  // (from ADR-0029-C, used by the C.2 mutation slice) must still be
  // present. The B.2 migration does not touch them.
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
  recordResult(12, "8 CUBE_Economic append-only triggers still present (cross-slice)", "8", String(n), n === 8);
}

async function main(): Promise<void> {
  console.log(
    "=== ADR-0029-B.2 verification: 12-query gate for CUBE Source-Conflict Mutation Surface ==="
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
    await check2WithCheckInsertPoliciesExist();
    await check3WithCheckPoliciesWithGuc();
    await check4TriggerFunctionGucSubstring();
    await check5NoAuthenticatedWriteGrants();
    await check6SelectPoliciesStillPresent();
    await check7CUBE_ConflictTriggersIntact();
    await check8AutomationDecisionTriggers();
    await check9UniqueIndexes();
    await check10LengthCheckConstraints();
    await check11CUBE_SourceFieldFkCascade();
    await check12CUBE_EconomicTriggersUnaffected();
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
      "VERDICT: PASS. ADR-0029-B.2 migrations are correctly applied to the live database.\nThe CUBE source-conflict mutation endpoints are now safe for Cockpit consumption."
    );
    process.exit(0);
  } else {
    console.log(
      "VERDICT: BLOCKED. Inspect the failing checks; the promotion is not yet complete.\nDo NOT let Cockpit consume the CUBE source-conflict mutation endpoints until all 12 pass."
    );
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
