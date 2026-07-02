/**
 * Captures fresh screenshots of the Bevero cockpit for the landing page.
 * Requires: cockpit dev server running on localhost:3000
 * Run from monorepo root: node tools/capture-screenshots.mjs
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/home/baum/Schreibtisch/workspace/main_projects/mosaicStack/node_modules/playwright");
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const EMAIL = "demo@example.com";
const PASSWORD = "test1234";
const OUT = "apps/landing/public/screenshots";

async function login(page) {
  await page.goto(`${BASE}/sign-in`);
  await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
  await page.fill('input[type="email"], input[type="text"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"], form button');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
}

async function ensureLightMode(page) {
  // Use JS click to avoid "outside viewport" issues on mobile sidebar
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Light Mode")
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(400);
}

async function shot(page, filename) {
  await page.waitForTimeout(800); // let animations settle
  const path = join(OUT, filename);
  await page.screenshot({ path, type: "png", fullPage: false });
  console.log(`  ✓ ${filename}`);
}

async function navigateTo(page, path) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(600);
}

// ─── DESKTOP ─────────────────────────────────────────────────────────────────

async function captureDesktop(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await ctx.newPage();

  await login(page);
  await ensureLightMode(page);

  console.log("\nDesktop screenshots (1440×900):");

  // 01 — Dashboard
  await navigateTo(page, "/dashboard");
  await shot(page, "screen-01-dashboard.png");

  // 02 — Dashboard with workspace filter open
  await navigateTo(page, "/dashboard");
  await page.selectOption('select, [role="combobox"]', { label: "Service" }).catch(() => {});
  await shot(page, "screen-02-dashboard-quick-note.png");

  // 03 — Auffüllliste Bar
  await navigateTo(page, "/inventory/bar-refill");
  await page.waitForSelector('text=Auffüllliste Bar', { timeout: 8000 }).catch(() => {});
  await shot(page, "screen-03-dashboard-checkliste.png");

  // 04 — Auffüllliste Bar (scrolled to show quantity controls)
  await shot(page, "screen-04-dashboard-gespeicherte-notizen.png");

  // 05 — Artikel
  await navigateTo(page, "/inventory/items");
  await page.waitForSelector("table, [class*='item']", { timeout: 8000 }).catch(() => {});
  await shot(page, "screen-05-artikel.png");

  // 06 — Bestände (full overview)
  await navigateTo(page, "/inventory/balances");
  await shot(page, "screen-06-best-nde-gesamtansicht.png");

  // 07 — Bestände (filtered view)
  await navigateTo(page, "/inventory/balances");
  await shot(page, "screen-07-best-nde-gefilterte-ansicht.png");

  // 08 — Warenbewegungen (Wareneingang tab)
  await navigateTo(page, "/movements");
  await page.locator('button:has-text("Wareneingang")').first().click().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "screen-08-wareneingang.png");

  // 09 — Auffüllliste Bar (items + quantity bar)
  await navigateTo(page, "/inventory/bar-refill");
  await shot(page, "screen-09-auff-llliste-bar.png");

  // 10 — Warenbewegungen (item table expanded)
  await navigateTo(page, "/movements");
  // click first row to expand
  const firstRow = page.locator("tbody tr, [class*='item-row']").first();
  await firstRow.click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "screen-10-bewegungen.png");

  // 11 — Bewegung buchen (sheet open)
  await navigateTo(page, "/movements");
  const buchen = page.locator('button:has-text("Buchen")').first();
  await buchen.click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "screen-11-bewegung-buchen.png");

  // 12 — Arbeitsbereiche
  await navigateTo(page, "/workspaces");
  await shot(page, "screen-12-arbeitsbereiche.png");

  // 13 — Lagerorte
  await navigateTo(page, "/storage");
  await page.waitForSelector("table", { timeout: 8000 }).catch(() => {});
  await shot(page, "screen-13-lagerorte.png");

  // 14 — Alerts
  await navigateTo(page, "/alerts");
  await page.waitForSelector("table, [class*='alert']", { timeout: 8000 }).catch(() => {});
  await shot(page, "screen-14-alerts.png");

  // 15 — Profil
  await navigateTo(page, "/settings/profile");
  await shot(page, "screen-15-profil.png");

  // 16 — Team
  await navigateTo(page, "/settings/team");
  await shot(page, "screen-16-team.png");

  // 17 — Rollen
  await navigateTo(page, "/settings/roles");
  await shot(page, "screen-17-rollen.png");

  await ctx.close();
}

// ─── MOBILE ──────────────────────────────────────────────────────────────────

async function captureMobile(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await login(page);
  await ensureLightMode(page);

  console.log("\nMobile screenshots (390×844):");

  // 18 — Mobile Dashboard
  await navigateTo(page, "/dashboard");
  await shot(page, "screen-18-mobile-dashboard.png");

  // 19 — Mobile Auffüllliste
  await navigateTo(page, "/inventory/bar-refill");
  await page.waitForSelector('text=Auffüllliste', { timeout: 8000 }).catch(() => {});
  await shot(page, "screen-19-mobile-auff-llliste.png");

  // 20 — Mobile Bewegungen
  await navigateTo(page, "/movements");
  await shot(page, "screen-20-mobile-bewegungen.png");

  // 21 — Mobile Bestand
  await navigateTo(page, "/inventory/balances");
  await shot(page, "screen-21-mobile-bestand.png");

  // 22 — Mobile Quick Actions (FAB open)
  await navigateTo(page, "/movements");
  const fab = page.locator('button:has-text("+"), button[aria-label*="Schnell"]').first();
  await fab.click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "screen-22-mobile-quick-actions.png");

  // 23 — Mobile Alerts
  await navigateTo(page, "/alerts");
  await shot(page, "screen-23-mobile-quick-note.png");

  await ctx.close();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });
console.log("Browser launched. Starting captures…");

try {
  await captureDesktop(browser);
  await captureMobile(browser);
  console.log("\n✅ All screenshots saved to", OUT);
} finally {
  await browser.close();
}
