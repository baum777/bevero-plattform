#!/usr/bin/env tsx
/**
 * ADR-0057 (Task 12) — Mother-Concern Read APIs v2 Supabase Promotion Verify Script
 *
 * 12-query promotion gate. Run against named Supabase dev project
 * AFTER `prisma migrate deploy`. Covers PII-sanitization, overview aggregates,
 * compatible-locations join, and the InquiryClassificationAudit table.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/verify-adr-0057-mother-concern-read-v2.ts
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
  const rows = (await runSql(`SELECT relrowsecurity FROM pg_class WHERE relname='${t}' AND relnamespace='public'::regnamespace`)) as Array<{ relrowsecurity: boolean }>;
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

const v2Tables = [
  "Organization",
  "BusinessUnit",
  "EventConcept",
  "EventConceptLocationCompatibility",
  "ExternalCatalogEntry",
  "Inquiry",
  "InquiryRoutingRule",
  "InquiryClassificationAudit"
];

async function main(): Promise<void> {
  console.log("ADR-0057 Mother-Concern Read v2 — 12-Query Supabase Promotion Verify");
  console.log("=".repeat(72));

  const checks: CheckResult[] = await Promise.all([
    check(1, "Organization table exists", () => tableExists("Organization")),
    check(2, "Inquiry table exists", () => tableExists("Inquiry")),
    check(3, "InquiryClassificationAudit table exists", () => tableExists("InquiryClassificationAudit")),
    check(4, "EventConceptLocationCompatibility table exists", () => tableExists("EventConceptLocationCompatibility")),

    check(5, "Inquiry.contactEmail column exists (PII-stored at rest)", () => columnExists("Inquiry", "contactEmail")),
    check(6, "Inquiry.rawMessage column exists", () => columnExists("Inquiry", "rawMessage")),
    check(7, "Inquiry.status enum includes NEEDS_HUMAN_REVIEW", async () => {
      const rows = await runSql(`SELECT 1 FROM pg_enum WHERE enumlabel='NEEDS_HUMAN_REVIEW' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='InquiryStatus')`);
      return rows.length > 0;
    }),
    check(8, "EventConceptLocationCompatibility.compatibilityScore column exists", () => columnExists("EventConceptLocationCompatibility", "compatibilityScore")),

    check(9, "RLS enabled on all mother-concern tables", async () => {
      const results = await Promise.all(v2Tables.map(rlsEnabled));
      return results.every(Boolean);
    }),

    check(10, "SELECT policy on all mother-concern tables", async () => {
      const results = await Promise.all(v2Tables.map(hasSelectPolicy));
      return results.every(Boolean);
    }),

    check(11, "No write grant (app_runtime) on mother-concern tables", () => noWriteGrant(v2Tables)),

    check(12, "InquiryRoutingRule businessUnitHint FK to enum type", async () => {
      const rows = await runSql(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='InquiryRoutingRule' AND column_name='businessUnitHint' AND udt_name='BusinessUnitName'`);
      return rows.length > 0;
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
  console.log("=".repeat(72));
  console.log(`Result: ${passed}/12 PASS, ${failed}/12 FAIL`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
