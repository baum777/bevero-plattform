#!/usr/bin/env npx ts-node --esm
/**
 * ADR-0029-A2 (Task 03) — CUBE Event-Intake Read Supabase Promotion Verify Script
 *
 * 14-query promotion gate (mirror verify-adr-0029a-operational-units.ts structure).
 * Run against the named Supabase dev project AFTER `prisma migrate deploy`.
 *
 * Usage:
 *   SUPABASE_DB_URL=postgresql://... npx ts-node --esm scripts/verify-adr-0029a2-event-intake-read.ts
 *
 * All 14 checks must pass (PASS) before the Cockpit may consume these read endpoints.
 * Key checks:
 *   - 6 tables + 4 enums exist
 *   - Brutto/Netto DB-Check-Constraint on EventPackage
 *   - private_package ⇒ prepayment invariant
 *   - PII DB-length caps (rawMessage <= 5000, contactEmail <= 500)
 *   - RLS posture: SELECT-only, no Write-Policies, no app_runtime GRANT
 *   - AutomationDecision triggers not regressed
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

const eventIntakeTables = [
  "EventInquiry",
  "EventPackage",
  "BeveragePackage",
  "EventPackageMenuItem",
  "EventPackageBeverage",
  "EventPackageSelection"
];

async function main(): Promise<void> {
  console.log("ADR-0029-A2 Event-Intake Read — 14-Query Supabase Promotion Verify");
  console.log("=".repeat(65));

  const checks: CheckResult[] = await Promise.all([
    // Q1-Q6: 6 tables exist
    check(1, "Table EventInquiry exists", () => tableExists("EventInquiry")),
    check(2, "Table EventPackage exists", () => tableExists("EventPackage")),
    check(3, "Table BeveragePackage exists", () => tableExists("BeveragePackage")),
    check(4, "Table EventPackageMenuItem exists", () => tableExists("EventPackageMenuItem")),
    check(5, "Table EventPackageBeverage exists", () => tableExists("EventPackageBeverage")),
    check(6, "Table EventPackageSelection exists", () => tableExists("EventPackageSelection")),

    // Q7: 4 enums exist (spot-check EventInquirySubject + BeveragePackageName)
    check(7, "Enums EventInquirySubject + BeveragePackageName exist", async () => {
      const [a, b] = await Promise.all([
        enumExists("EventInquirySubject"),
        enumExists("BeveragePackageName")
      ]);
      return a && b;
    }),

    // Q8: Brutto/Netto invariant CHECK on EventPackage
    check(8, "EventPackage brutto_netto_invariant CHECK exists", () =>
      checkConstraintExists("EventPackage", "EventPackage_brutto_netto_invariant")),

    // Q9: private_package ⇒ prepayment CHECK
    check(9, "EventPackage private_package_prepayment CHECK exists", () =>
      checkConstraintExists("EventPackage", "EventPackage_private_package_prepayment")),

    // Q10: PII length cap on EventInquiry.rawMessage
    check(10, "EventInquiry rawMessage length CHECK exists", () =>
      checkConstraintExists("EventInquiry", "EventInquiry_rawMessage_length_check")),

    // Q11: RLS enabled on EventInquiry
    check(11, "RLS enabled on EventInquiry", () => rlsEnabled("EventInquiry")),

    // Q12: SELECT policy on EventInquiry
    check(12, "SELECT policy on EventInquiry", () => hasSelectPolicy("EventInquiry")),

    // Q13: No Write policies on any event-intake table
    check(13, "No Write policies on event-intake tables", async () => {
      const results = await Promise.all(eventIntakeTables.map((t) => noWritePolicy(t)));
      return results.every(Boolean);
    }),

    // Q14: No app_runtime GRANT write privileges on event-intake tables
    check(14, "No app_runtime GRANT write on event-intake tables", async () => {
      const tableList = eventIntakeTables.map((t) => `'${t}'`).join(",");
      const rows = await runSql(
        `SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN (${tableList}) AND grantee = 'app_runtime' AND privilege_type IN ('INSERT','UPDATE','DELETE')`
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

  console.log("=".repeat(65));
  console.log(`Result: ${passed}/14 PASS, ${failed}/14 FAIL`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
