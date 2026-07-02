#!/usr/bin/env npx ts-node --esm
/**
 * ADR-0051 (Task 06) — Mother-Concern Read APIs Supabase Promotion Verify Script
 *
 * 12-query promotion gate. Run against named Supabase dev project
 * AFTER `prisma migrate deploy`.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node --esm scripts/verify-adr-0051-mother-concern-read.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "public" } });

type CheckResult = { q: number; label: string; pass: boolean; detail?: string };

async function runSql(sql: string): Promise<unknown[]> {
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown[];
}

async function check(q: number, label: string, fn: () => Promise<boolean>): Promise<CheckResult> {
  try {
    return { q, label, pass: await fn() };
  } catch (err) {
    return { q, label, pass: false, detail: String(err) };
  }
}

async function tableExists(t: string): Promise<boolean> {
  const rows = await runSql(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${t}'`);
  return rows.length > 0;
}

async function columnExists(table: string, col: string): Promise<boolean> {
  const rows = await runSql(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${col}'`);
  return rows.length > 0;
}

async function rlsEnabled(t: string): Promise<boolean> {
  const rows = await runSql(`SELECT relrowsecurity FROM pg_class WHERE relname='${t}' AND relnamespace='public'::regnamespace`) as Array<{ relrowsecurity: boolean }>;
  return rows[0]?.relrowsecurity === true;
}

async function hasSelectPolicy(t: string): Promise<boolean> {
  const rows = await runSql(`SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${t}' AND cmd='SELECT'`);
  return rows.length > 0;
}

async function noWriteGrant(tables: string[]): Promise<boolean> {
  const tableList = tables.map((t) => `'${t}'`).join(",");
  const rows = await runSql(
    `SELECT 1 FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN (${tableList}) AND grantee='app_runtime' AND privilege_type IN ('INSERT','UPDATE','DELETE')`
  );
  return rows.length === 0;
}

const newTables = ["EventSpace", "ExceptionRule", "ReservationConnector", "ExternalSystemLink"];

async function main(): Promise<void> {
  console.log("ADR-0051 Mother-Concern Read APIs — 12-Query Supabase Promotion Verify");
  console.log("=".repeat(70));

  const checks: CheckResult[] = await Promise.all([
    check(1, "EventSpace table exists", () => tableExists("EventSpace")),
    check(2, "ExceptionRule table exists", () => tableExists("ExceptionRule")),
    check(3, "ReservationConnector table exists", () => tableExists("ReservationConnector")),
    check(4, "ExternalSystemLink table exists", () => tableExists("ExternalSystemLink")),

    check(5, "Location.signatureAssets exists", () => columnExists("Location", "signatureAssets")),
    check(6, "Location.weatherSensitive exists", () => columnExists("Location", "weatherSensitive")),
    check(7, "Location.cinemaAvailable exists", () => columnExists("Location", "cinemaAvailable")),

    check(8, "RLS enabled on all 4 extension tables", async () => {
      const results = await Promise.all(newTables.map(rlsEnabled));
      return results.every(Boolean);
    }),

    check(9, "SELECT policy on all 4 extension tables", async () => {
      const results = await Promise.all(newTables.map(hasSelectPolicy));
      return results.every(Boolean);
    }),

    check(10, "No Write grant (app_runtime) on extension tables", () => noWriteGrant(newTables)),

    check(11, "ExceptionRule has requiresConfirmation column", () => columnExists("ExceptionRule", "requiresConfirmation")),

    check(12, "ReservationConnector has externalUrl column (open-in-new-tab affordance)", () => columnExists("ReservationConnector", "externalUrl"))
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
  console.log("=".repeat(70));
  console.log(`Result: ${passed}/12 PASS, ${failed}/12 FAIL`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
