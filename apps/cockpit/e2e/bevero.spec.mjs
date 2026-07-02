// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE}/sign-in`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('sign-in'), { timeout: 15000 });
});

// --- Navigation ---

test('Dashboard lädt nach Login', async ({ page }) => {
  await page.goto(`${BASE}/dashboard`);
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.locator('body')).toBeVisible();
});

test('Inventory Items Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/inventory/items`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Inventory Balances Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/inventory/balances`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Bar Refill Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/inventory/bar-refill`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Goods Receipt Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/inventory/goods-receipt`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Procurement Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/procurement`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Shift Handover Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/shift-handover`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Workspaces Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/workspaces`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Storage Seite erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/storage`);
  await expect(page).not.toHaveURL(/sign-in/);
});

test('Settings Profile erreichbar', async ({ page }) => {
  await page.goto(`${BASE}/settings/profile`);
  await expect(page).not.toHaveURL(/sign-in/);
});

// --- Auth ---

test('Logout funktioniert', async ({ page }) => {
  await page.goto(`${BASE}/dashboard`);
  // Theme/Logout button suchen
  const logoutBtn = page.getByRole('button', { name: /abmelden|logout|sign out/i });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL(/sign-in/, { timeout: 10000 });
    await expect(page).toHaveURL(/sign-in/);
  }
});

test('Nicht eingeloggter Zugriff wird zu /sign-in umgeleitet', async ({ page: unauthPage, browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/dashboard`);
  await expect(p).toHaveURL(/sign-in/);
  await ctx.close();
});

// --- Inventory Flow ---

test('Inventory Items: Tabelle sichtbar oder leerer State', async ({ page }) => {
  await page.goto(`${BASE}/inventory/items`);
  await page.waitForTimeout(1500);
  const hasTable = await page.locator('table').isVisible().catch(() => false);
  const hasEmpty = await page.locator('[class*="empty"], [class*="no-data"], [class*="placeholder"]').isVisible().catch(() => false);
  expect(hasTable || hasEmpty).toBeTruthy();
});

test('Bar Refill: Keine JS-Fehler', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`${BASE}/inventory/bar-refill`);
  await page.waitForTimeout(1000);
  expect(errors.filter(e => !e.includes('Cross-Origin'))).toHaveLength(0);
});

// --- Responsive ---

test('Dashboard mobile (390px) — keine horizontale Überlauf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(500);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(395);
});
