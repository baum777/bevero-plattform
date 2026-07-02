#!/usr/bin/env npx ts-node --esm
/**
 * ADR-0050 (Task 05) — Motorworld-Inn Extensions Supabase Promotion Verify Script
 *
 * 14-query promotion gate. Run against named Supabase dev project
 * AFTER `prisma migrate deploy`.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node --esm scripts/verify-adr-0050-motorworld-extensions.ts
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

async function enumExists(e: string): Promise<boolean> {
  const rows = await runSql(`SELECT 1 FROM pg_type WHERE typname='${e}' AND typtype='e'`);
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

async function noWritePolicy(t: string): Promise<boolean> {
  const rows = await runSql(`SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${t}' AND cmd IN ('INSERT','UPDATE','DELETE')`);
  return rows.length === 0;
}

const newTables = ["EventSpace", "ExceptionRule", "ReservationConnector", "ExternalSystemLink"];

async function main(): Promise<void> {
  console.log("ADR-0050 Motorworld-Inn Extensions — 14-Query Supabase Promotion Verify");
  console.log("=".repeat(70));

  const checks: CheckResult[] = await Promise.all([
    check(1, "Table EventSpace exists", () => tableExists("EventSpace")),
    check(2, "Table ExceptionRule exists", () => tableExists("ExceptionRule")),
    check(3, "Table ReservationConnector exists", () => tableExists("ReservationConnector")),
    check(4, "Table ExternalSystemLink exists", () => tableExists("ExternalSystemLink")),

    check(5, "Enum EventSpaceSupport exists", () => enumExists("EventSpaceSupport")),
    check(6, "Enum ExceptionRuleType exists", () => enumExists("ExceptionRuleType")),
    check(7, "Enum ReservationProvider exists", () => enumExists("ReservationProvider")),
    check(8, "Enum ExternalSystemLinkKind exists", () => enumExists("ExternalSystemLinkKind")),

    check(9, "Location.signatureAssets column exists", () => columnExists("Location", "signatureAssets")),
    check(10, "Location.weatherSensitive column exists", () => columnExists("Location", "weatherSensitive")),
    check(11, "Location.cinemaAvailable column exists", () => columnExists("Location", "cinemaAvailable")),

    check(12, "RLS enabled on all 4 new tables", async () => {
      const results = await Promise.all(newTables.map(rlsEnabled));
      return results.every(Boolean);
    }),

    check(13, "SELECT policy on all 4 new tables", async () => {
      const results = await Promise.all(newTables.map(hasSelectPolicy));
      return results.every(Boolean);
    }),

    check(14, "No Write policies on 4 new tables", async () => {
      const results = await Promise.all(newTables.map(noWritePolicy));
      return results.every(Boolean);
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
  console.log("=".repeat(70));
  console.log(`Result: ${passed}/14 PASS, ${failed}/14 FAIL`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
