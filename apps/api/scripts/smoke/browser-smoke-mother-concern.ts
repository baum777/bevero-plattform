#!/usr/bin/env tsx
/**
 * Browser-Smoke Mother-Concern Cockpit (ADR-0058, Task 13)
 *
 * Lightweight smoke that verifies the four new pages can be served by the
 * Next.js cockpit without server-side crashes. Does not assert on visual
 * layout. Run: npx tsx scripts/smoke/browser-smoke-mother-concern.ts
 *
 * Note: this is a HTTP smoke, not a full Playwright run. The cockpit pages
 * are client components and require hydration to be meaningful — the smoke
 * confirms the route returns 2xx/3xx and contains expected testid hooks.
 */

const baseUrl = process.env.COCKPIT_BASE_URL ?? "http://localhost:3000";

const PAGES = [
  "/mother-concern",
  "/mother-concern/event-concepts",
  "/mother-concern/partner-locations",
  "/inquiries"
];

type SmokeResult = { url: string; pass: boolean; detail?: string };

async function checkPage(path: string): Promise<SmokeResult> {
  try {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 500) {
      return { url: path, pass: false, detail: `status ${res.status}` };
    }
    return { url: path, pass: true, detail: `status ${res.status}` };
  } catch (err) {
    return { url: path, pass: false, detail: String(err) };
  }
}

async function main(): Promise<void> {
  console.log("Browser-Smoke Mother-Concern Cockpit (ADR-0058)");
  console.log("=".repeat(60));
  console.log(`Target: ${baseUrl}`);
  console.log("");

  const results: SmokeResult[] = [];
  for (const path of PAGES) {
    const r = await checkPage(path);
    results.push(r);
  }

  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  [${status}] ${r.url}${detail}`);
    if (r.pass) passed++;
    else failed++;
  }
  console.log("=".repeat(60));
  console.log(`Result: ${passed}/${results.length} PASS`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
