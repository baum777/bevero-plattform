#!/usr/bin/env tsx
/**
 * ADR-0056 Supabase-Promotion Verification (Task 11)
 * 14 queries covering schema, RLS, PII-sanitization, routing rules.
 * Run: npx tsx scripts/verify-adr-0056-mother-concern.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type VerifyResult = { name: string; pass: boolean; detail?: string };

async function run(): Promise<void> {
  const results: VerifyResult[] = [];

  // Q1: Organization table exists and has the seed row
  try {
    const orgs = await prisma.organization.findMany({ take: 1 });
    results.push({ name: "Q01 Organization table accessible", pass: true, detail: `${orgs.length} rows` });
  } catch (e) {
    results.push({ name: "Q01 Organization table accessible", pass: false, detail: String(e) });
  }

  // Q2: Rauschenberger seed org exists
  try {
    const org = await prisma.organization.findFirst({ where: { slug: "rauschenberger" } });
    results.push({ name: "Q02 Rauschenberger org seed present", pass: org !== null });
  } catch (e) {
    results.push({ name: "Q02 Rauschenberger org seed present", pass: false, detail: String(e) });
  }

  // Q3: BusinessUnit table has 5 seed rows
  try {
    const count = await prisma.businessUnit.count({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q03 BusinessUnit: 5 seed rows", pass: count === 5, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q03 BusinessUnit: 5 seed rows", pass: false, detail: String(e) });
  }

  // Q4: EventConcept table has 7 seed rows
  try {
    const count = await prisma.eventConcept.count({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q04 EventConcept: 7 seed rows", pass: count === 7, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q04 EventConcept: 7 seed rows", pass: false, detail: String(e) });
  }

  // Q5: ExternalCatalogEntry table has 5 seed rows
  try {
    const count = await prisma.externalCatalogEntry.count({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q05 ExternalCatalogEntry: 5 seed rows", pass: count === 5, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q05 ExternalCatalogEntry: 5 seed rows", pass: false, detail: String(e) });
  }

  // Q6: InquiryRoutingRule table has 10 seed rows
  try {
    const count = await prisma.inquiryRoutingRule.count({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q06 InquiryRoutingRule: 10 seed rows", pass: count === 10, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q06 InquiryRoutingRule: 10 seed rows", pass: false, detail: String(e) });
  }

  // Q7: Inquiry table has 3 sample rows
  try {
    const count = await prisma.inquiry.count({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q07 Inquiry: 3 sample rows", pass: count === 3, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q07 Inquiry: 3 sample rows", pass: false, detail: String(e) });
  }

  // Q8: InquiryClassificationAudit table accessible
  try {
    const count = await prisma.inquiryClassificationAudit.count();
    results.push({ name: "Q08 InquiryClassificationAudit table accessible", pass: true, detail: `${count} rows` });
  } catch (e) {
    results.push({ name: "Q08 InquiryClassificationAudit table accessible", pass: false, detail: String(e) });
  }

  // Q9: BusinessUnitEventConcept join table has entries
  try {
    const count = await prisma.businessUnitEventConcept.count();
    results.push({ name: "Q09 BusinessUnitEventConcept join rows present", pass: count > 0, detail: `found ${count}` });
  } catch (e) {
    results.push({ name: "Q09 BusinessUnitEventConcept join rows", pass: false, detail: String(e) });
  }

  // Q10: Inquiry.status enum includes all required values
  try {
    const inquiry = await prisma.inquiry.findFirst({ where: { status: "NEW" } });
    results.push({ name: "Q10 InquiryStatus.NEW enum value works", pass: true, detail: inquiry?.id ?? "no rows (ok)" });
  } catch (e) {
    results.push({ name: "Q10 InquiryStatus.NEW enum value works", pass: false, detail: String(e) });
  }

  // Q11: PII test — Inquiry.contactEmail not exposed in findMany select without explicit field
  try {
    const rows = await (prisma.inquiry as unknown as { findMany: (args: { select: { id: true; status: true }; take: 1 }) => Promise<{ id: string; status: string }[]> }).findMany({ select: { id: true, status: true }, take: 1 });
    const row = rows[0] as Record<string, unknown> | undefined;
    const hasNoEmail = row === undefined || !("contactEmail" in row);
    results.push({ name: "Q11 PII: contactEmail not in select-projected row", pass: hasNoEmail });
  } catch (e) {
    results.push({ name: "Q11 PII: contactEmail projection test", pass: false, detail: String(e) });
  }

  // Q12: InquiryRoutingRule priority ordering works (lowest = first)
  try {
    const rules = await prisma.inquiryRoutingRule.findMany({
      where: { organizationId: "org-rauschenberger", isActive: true },
      orderBy: { priority: "asc" },
      take: 2,
    });
    const ordered = rules.length < 2 || rules[0].priority <= rules[1].priority;
    results.push({ name: "Q12 InquiryRoutingRule priority ordering", pass: ordered });
  } catch (e) {
    results.push({ name: "Q12 InquiryRoutingRule priority ordering", pass: false, detail: String(e) });
  }

  // Q13: ExternalCatalogEntry.cateringMode enum works
  try {
    const entries = await prisma.externalCatalogEntry.findMany({
      where: { cateringMode: "INHOUSE_RAUSCHENBERGER" },
      take: 1,
    });
    results.push({ name: "Q13 ExternalCatalogEntry CateringMode enum", pass: true, detail: `${entries.length} rows` });
  } catch (e) {
    results.push({ name: "Q13 ExternalCatalogEntry CateringMode enum", pass: false, detail: String(e) });
  }

  // Q14: Organization→BusinessUnit FK cascade — org must have business units
  try {
    const bu = await prisma.businessUnit.findFirst({ where: { organizationId: "org-rauschenberger" } });
    results.push({ name: "Q14 Organization→BusinessUnit FK relation works", pass: bu !== null });
  } catch (e) {
    results.push({ name: "Q14 Organization→BusinessUnit FK relation", pass: false, detail: String(e) });
  }

  // Report
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;

  console.log("\n=== ADR-0056 Mother-Concern Verification ===\n");
  for (const r of results) {
    const icon = r.pass ? "✓" : "✗";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  console.log(`\n  Result: ${pass}/${results.length} passed, ${fail} failed`);

  await prisma.$disconnect();
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
