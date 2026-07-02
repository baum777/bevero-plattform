/**
 * ADR-0025 verification script — 12-query gate for the Phase E
 * Shift Handover Draft write policies + grants migration.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
 *   export DIRECT_URL="$DATABASE_URL"
 *   npx tsx scripts/verify-adr-0025-handover-draft-policies.ts
 *
 * Exit code: 0 if all 12 checks pass, 1 if any fail, 2 on config error.
 *
 * What it does:
 *   - Connects to the database as the postgres superuser (via DATABASE_URL).
 *   - Runs 12 fixed, READ-ONLY SQL queries that prove the
 *     `20260608175159_automation_handover_draft_policies` migration is
 *     correctly applied to the live Supabase project.
 *   - Prints a table of pass/fail per check.
 *
 * What it does NOT do:
 *   - It does NOT impersonate authenticated / app_runtime for the RLS row-level
 *     check. The RLS-correct gate is policy existence (queries #2, #3, #4)
 *     and grant existence (queries #6, #7). Row-level behavior is deferred to
 *     a follow-up slice because it requires a JWT-aware connection pool.
 *   - It does NOT touch the existing inventory tables (#11).
 *   - It does NOT modify any policy, trigger, grant, or row.
 *   - It does NOT touch the AutomationDecision append-only triggers (#9)
 *     beyond asserting they remain present after the new migration.
 *
 * Safety model:
 *   - All 12 queries are pure catalog reads against `pg_catalog`,
 *     `pg_policies`, `pg_trigger`, `pg_roles`, `pg_proc`, and
 *     `information_schema.role_table_grants`. No INSERT, UPDATE, or DELETE.
 *   - The script is intended to be run by the human owner in their own
 *     terminal after `npx prisma migrate deploy` has completed.
 *
 * Hard guardrails (per AGENTS.md + the ADR-0028 promotion runbook pattern):
 *   - Refuses to run against localhost / 127.0.0.1.
 *   - Refuses to run if DATABASE_URL is not set.
 *   - The only role authorized to read `pg_catalog` for this gate is
 *     `postgres` (the Supabase default superuser). The `authenticated`,
 *     `app_runtime`, and `app_user` roles lack `pg_catalog` access and
 *     would fail queries #9 and #10.
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
  console.error("ADR-0025 is a Promotion-Slice; it targets a named Supabase dev / prod project.");
  process.exit(2);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl }
  }
});

const EXPECTED_PHASE_B_TABLES = [
  "AutomationRule",
  "AutomationSuggestion",
  "AutomationDecision",
  "OfflineActionQueue",
  "ShiftHandoverDraft"
] as const;

const EXPECTED_PHASE_B_ENUMS = [
  "AutomationRuleType",
  "AutomationRuleEvaluationMode",
  "AutomationSuggestionType",
  "AutomationSuggestionStatus",
  "AutomationDecisionStatus",
  "OfflineActionType",
  "OfflineActionStatus"
] as const;

const EXISTING_INVENTORY_TABLES = [
  "InventoryItem",
  "InventoryMovement",
  "InventoryStockSnapshot",
  "WorkflowTask"
] as const;

const NEW_WRITE_POLICIES = [
  "shift_handover_draft_lead_or_manager_insert",
  "shift_handover_draft_lead_or_manager_update"
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

async function check1MigrationApplied(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM "_prisma_migrations"
    WHERE migration_name = '20260608175159_automation_handover_draft_policies'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(1, "Migration 20260608175159_automation_handover_draft_policies is in _prisma_migrations", "1", String(n), n === 1);
}

async function check2InsertPolicyExists(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ShiftHandoverDraft'
      AND policyname = 'shift_handover_draft_lead_or_manager_insert'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(2, "shift_handover_draft_lead_or_manager_insert policy exists on ShiftHandoverDraft", "1", String(n), n === 1);
}

async function check3UpdatePolicyExists(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ShiftHandoverDraft'
      AND policyname = 'shift_handover_draft_lead_or_manager_update'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(3, "shift_handover_draft_lead_or_manager_update policy exists on ShiftHandoverDraft", "1", String(n), n === 1);
}

async function check4InsertPolicyForAuthenticated(): Promise<void> {
  // The new INSERT policy must be FOR INSERT TO authenticated (no `TO app_runtime`).
  // pg_policies.roles is a text[]; we check that `authenticated` is the only role.
  const sql = `
    SELECT roles::text AS roles_text, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ShiftHandoverDraft'
      AND policyname = 'shift_handover_draft_lead_or_manager_insert'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ roles_text: string; cmd: string }>>(sql);
  const row = rows[0];
  if (!row) {
    recordResult(4, "Insert policy is FOR INSERT TO authenticated (not TO app_runtime)", "{authenticated} INSERT", "<missing policy>", false);
    return;
  }
  const roles = row.roles_text;
  const cmd = row.cmd;
  const isInsert = cmd === "INSERT";
  const isAuthenticatedOnly = roles === "{authenticated}";
  recordResult(
    4,
    "Insert policy is FOR INSERT TO authenticated (not TO app_runtime)",
    "{authenticated} / INSERT",
    `${roles} / ${cmd}`,
    isInsert && isAuthenticatedOnly
  );
}

async function check5UpdatePolicyForAuthenticated(): Promise<void> {
  // The new UPDATE policy must be FOR UPDATE TO authenticated.
  const sql = `
    SELECT roles::text AS roles_text, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ShiftHandoverDraft'
      AND policyname = 'shift_handover_draft_lead_or_manager_update'
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ roles_text: string; cmd: string }>>(sql);
  const row = rows[0];
  if (!row) {
    recordResult(5, "Update policy is FOR UPDATE TO authenticated", "{authenticated} UPDATE", "<missing policy>", false);
    return;
  }
  const roles = row.roles_text;
  const cmd = row.cmd;
  const isUpdate = cmd === "UPDATE";
  const isAuthenticatedOnly = roles === "{authenticated}";
  recordResult(
    5,
    "Update policy is FOR UPDATE TO authenticated",
    "{authenticated} / UPDATE",
    `${roles} / ${cmd}`,
    isUpdate && isAuthenticatedOnly
  );
}

async function check6AuthenticatedWriteGrants(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = 'ShiftHandoverDraft'
      AND privilege_type IN ('INSERT', 'UPDATE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(6, "authenticated has INSERT+UPDATE on ShiftHandoverDraft (2 grants)", "2", String(n), n === 2);
}

async function check7AppRuntimeWriteGrants(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_runtime'
      AND table_schema = 'public'
      AND table_name = 'ShiftHandoverDraft'
      AND privilege_type IN ('INSERT', 'UPDATE')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(7, "app_runtime has INSERT+UPDATE on ShiftHandoverDraft (2 grants)", "2", String(n), n === 2);
}

async function check8B1B2BaselineRegression(): Promise<void> {
  // Regression guard: 5 tables, 7 enums, 5 SELECT policies, 2 append-only triggers.
  // Run as a single batch with sub-queries (catalog reads only) for atomicity.
  const sql = `
    SELECT
      (SELECT count(*)::int FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1)) AS tables_n,
      (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
         WHERE n.nspname = 'public' AND t.typname = ANY($2)) AS enums_n,
      (SELECT count(*)::int FROM pg_policies
         WHERE schemaname = 'public' AND tablename = ANY($1) AND cmd = 'SELECT') AS select_policies_n,
      (SELECT count(*)::int FROM pg_trigger
         WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')) AS triggers_n
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{
    tables_n: number;
    enums_n: number;
    select_policies_n: number;
    triggers_n: number;
  }>>(
    sql,
    EXPECTED_PHASE_B_TABLES as unknown as string[],
    EXPECTED_PHASE_B_ENUMS as unknown as string[]
  );
  const r = rows[0];
  if (!r) {
    recordResult(8, "B-1/B-2 baseline regression: 5 tables / 7 enums / 5 SELECT / 2 triggers", "5/7/5/2", "<no row>", false);
    return;
  }
  const allPass = r.tables_n === 5 && r.enums_n === 7 && r.select_policies_n === 5 && r.triggers_n === 2;
  recordResult(
    8,
    "B-1/B-2 baseline regression: 5 tables / 7 enums / 5 SELECT / 2 triggers",
    "5/7/5/2",
    `${r.tables_n}/${r.enums_n}/${r.select_policies_n}/${r.triggers_n}`,
    allPass
  );
}

async function check9AutomationDecisionTriggersIntact(): Promise<void> {
  // Defense-in-depth regression guard: the ADR-0025 migration must not have
  // dropped the AutomationDecision append-only triggers.
  const sql = `
    SELECT count(*)::int AS n
    FROM pg_trigger
    WHERE tgname IN ('automation_decision_block_update', 'automation_decision_block_delete')
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  const n = rows[0]?.n ?? 0;
  recordResult(9, "AutomationDecision BEFORE UPDATE / BEFORE DELETE triggers still present", "2", String(n), n === 2);
}

async function check10AppRuntimeNoBypassRls(): Promise<void> {
  const sql = `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime'`;
  const rows = await prisma.$queryRawUnsafe<Array<{ rolname: string; rolbypassrls: boolean }>>(sql);
  const row = rows[0];
  if (!row) {
    recordResult(10, "app_runtime role exists with NOBYPASSRLS (per ADR-0017)", "rolbypassrls = f", "role does not exist", false);
    return;
  }
  recordResult(
    10,
    "app_runtime role exists with NOBYPASSRLS (per ADR-0017)",
    "rolbypassrls = f",
    `rolbypassrls = ${row.rolbypassrls}`,
    row.rolbypassrls === false
  );
}

async function check11InventoryTablesUntouched(): Promise<void> {
  const sql = `
    SELECT count(*)::int AS n
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, EXISTING_INVENTORY_TABLES as unknown as string[]);
  const n = rows[0]?.n ?? 0;
  recordResult(11, "Existing 4 inventory tables are untouched (no regression)", "4", String(n), n === 4);
}

async function check12MigrationRegressionGuardAssertions(): Promise<void> {
  // The new migration's DO $$ block asserts 4 invariants at apply time:
  //   (a) `public."ShiftHandoverDraft"` exists
  //   (b) exactly 1 INSERT policy named shift_handover_draft_lead_or_manager_insert
  //   (c) exactly 1 UPDATE policy named shift_handover_draft_lead_or_manager_update
  //   (d) exactly 1 `app_runtime` role
  // We re-assert them here as the migration's own sanity guard would.
  const sql = `
    SELECT
      (CASE WHEN to_regclass('public."ShiftHandoverDraft"') IS NOT NULL THEN 1 ELSE 0 END) AS table_present,
      (SELECT count(*)::int FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'ShiftHandoverDraft'
           AND policyname = 'shift_handover_draft_lead_or_manager_insert') AS insert_policy_n,
      (SELECT count(*)::int FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = 'ShiftHandoverDraft'
           AND policyname = 'shift_handover_draft_lead_or_manager_update') AS update_policy_n,
      (SELECT count(*)::int FROM pg_roles WHERE rolname = 'app_runtime') AS app_runtime_role_n
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{
    table_present: number;
    insert_policy_n: number;
    update_policy_n: number;
    app_runtime_role_n: number;
  }>>(sql);
  const r = rows[0];
  if (!r) {
    recordResult(12, "Migration's DO $$ regression guard would pass (4/4 assertions)", "1/1/1/1", "<no row>", false);
    return;
  }
  const allPass = r.table_present === 1 && r.insert_policy_n === 1 && r.update_policy_n === 1 && r.app_runtime_role_n === 1;
  recordResult(
    12,
    "Migration's DO $$ regression guard would pass (4/4 assertions)",
    "1/1/1/1",
    `${r.table_present}/${r.insert_policy_n}/${r.update_policy_n}/${r.app_runtime_role_n}`,
    allPass
  );
}

async function main(): Promise<void> {
  console.log("=== ADR-0025 verification: 12-query gate for Phase E Shift Handover Draft write policies ===");
  console.log(`Target: ${redactDatabaseUrl(databaseUrl)}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log("");

  try {
    await check1MigrationApplied();
    await check2InsertPolicyExists();
    await check3UpdatePolicyExists();
    await check4InsertPolicyForAuthenticated();
    await check5UpdatePolicyForAuthenticated();
    await check6AuthenticatedWriteGrants();
    await check7AppRuntimeWriteGrants();
    await check8B1B2BaselineRegression();
    await check9AutomationDecisionTriggersIntact();
    await check10AppRuntimeNoBypassRls();
    await check11InventoryTablesUntouched();
    await check12MigrationRegressionGuardAssertions();
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
  console.log(`Summary: ${passed}/12 passed, ${failed}/12 failed.`);
  console.log("");

  if (failed > 0) {
    console.log("VERDICT: FAIL. Inspect the failing check numbers above; the promotion is not yet complete.");
    console.log("Do NOT let Cockpit consume the /shift-handover/draft endpoints until all 12 pass.");
    const failedIds = results.filter((r) => !r.passed).map((r) => r.id).join(",");
    console.log(`Failing check IDs: ${failedIds}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("VERDICT: PASS. Phase E Shift Handover Draft write policies are correctly applied to the live database.");
  console.log("The /shift-handover/draft endpoints are now safe for Cockpit consumption against the real database.");
  await prisma.$disconnect();
  process.exit(0);
}

void main();
