#!/usr/bin/env npx ts-node --esm
/**
 * ADR-0029-A2 (Task 02) — CUBE Menu Matrix Supabase Promotion Verify Script
 *
 * 14-query promotion gate (mirror verify-adr-0029a-operational-units.ts structure).
 * Run against the named Supabase dev project AFTER `prisma migrate deploy`.
 *
 * Usage:
 *   SUPABASE_DB_URL=postgresql://... npx ts-node --esm scripts/verify-adr-0029a2-menu-matrix.ts
 *
 * All 14 checks must pass (PASS) before the Cockpit may consume these read endpoints.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "public" }
});

type CheckResult = { q: number; label: string; pass: boolean; detail?: string };

async function runSql(sql: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown[];
}

async function check(
  q: number,
  label: string,
  fn: () => Promise<boolean>
): Promise<CheckResult> {
  try {
    const pass = await fn();
    return { q, label, pass };
  } catch (err) {
    return { q, label, pass: false, detail: String(err) };
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`
  );
  return rows.length > 0;
}

async function enumExists(enumName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT 1 FROM pg_type WHERE typname = '${enumName}' AND typtype = 'e'`
  );
  return rows.length > 0;
}

async function rlsEnabled(tableName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT relrowsecurity FROM pg_class WHERE relname = '${tableName}' AND relnamespace = 'public'::regnamespace`
  ) as Array<{ relrowsecurity: boolean }>;
  return rows[0]?.relrowsecurity === true;
}

async function hasSelectPolicy(tableName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND cmd = 'SELECT'`
  );
  return rows.length > 0;
}

async function noWritePolicy(tableName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${tableName}' AND cmd IN ('INSERT','UPDATE','DELETE')`
  );
  return rows.length === 0;
}

async function checkConstraintExists(tableName: string, constraintName: string): Promise<boolean> {
  const rows = await runSql(
    `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = '${tableName}' AND constraint_name = '${constraintName}' AND constraint_type = 'CHECK'`
  );
  return rows.length > 0;
}

async function main(): Promise<void> {
  console.log("ADR-0029-A2 Menu Matrix — 14-Query Supabase Promotion Verify");
  console.log("=".repeat(60));

  const checks: CheckResult[] = await Promise.all([
    // Q1-Q4: Tables exist
    check(1, "Table Menu exists", () => tableExists("Menu")),
    check(2, "Table MenuItem exists", () => tableExists("MenuItem")),
    check(3, "Table MenuItem_Ingredient exists", () => tableExists("MenuItem_Ingredient")),
    check(4, "Table MenuItem_Allergen exists", () => tableExists("MenuItem_Allergen")),

    // Q5: Enum exists
    check(5, "Enum MenuCategory exists", () => enumExists("MenuCategory")),

    // Q6: Brutto/Netto CHECK constraint on Menu
    check(6, "Menu brutto_netto_invariant CHECK exists", () =>
      checkConstraintExists("Menu", "Menu_brutto_netto_invariant")),

    // Q7: priceMode CHECK on Menu
    check(7, "Menu priceMode CHECK exists", () =>
      checkConstraintExists("Menu", "Menu_priceMode_check")),

    // Q8: scope CHECK on Menu
    check(8, "Menu scope CHECK exists", () =>
      checkConstraintExists("Menu", "Menu_scope_check")),

    // Q9-Q12: RLS enabled + SELECT policy + no Write policies
    check(9, "RLS enabled on Menu", () => rlsEnabled("Menu")),
    check(10, "SELECT policy on Menu", () => hasSelectPolicy("Menu")),
    check(11, "No Write policies on Menu", () => noWritePolicy("Menu")),
    check(12, "RLS enabled on MenuItem", () => rlsEnabled("MenuItem")),

    // Q13: SELECT policy on MenuItem
    check(13, "SELECT policy on MenuItem", () => hasSelectPolicy("MenuItem")),

    // Q14: No app_runtime GRANT on Menu tables
    check(14, "No app_runtime GRANT on Menu tables", async () => {
      const rows = await runSql(
        `SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('Menu','MenuItem','MenuItem_Ingredient','MenuItem_Allergen') AND grantee = 'app_runtime' AND privilege_type IN ('INSERT','UPDATE','DELETE')`
      );
      return rows.length === 0;
    })
  ]);

  let passed = 0;
  let failed = 0;
  for (const r of checks) {
    const status = r.pass ? "PASS" : "FAIL";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  Q${String(r.q).padStart(2, "0")} [${status}] ${r.label}${detail}`);
    if (r.pass) passed++;
    else failed++;
  }

  console.log("=".repeat(60));
  console.log(`Result: ${passed}/14 PASS, ${failed}/14 FAIL`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
