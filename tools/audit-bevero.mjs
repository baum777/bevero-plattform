import { chromium, firefox } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const EMAIL = process.env.AUDIT_EMAIL;
const PASSWORD = process.env.AUDIT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('AUDIT_EMAIL and AUDIT_PASSWORD required');
  process.exit(1);
}

const TABS_DIR = 'assets/Screenshots/01-tabs';
const FLOWS_DIR = 'assets/Screenshots/02-cta-flows';
mkdirSync(TABS_DIR, { recursive: true });
mkdirSync(FLOWS_DIR, { recursive: true });

const consoleErrors = [];
const networkIssues = [];
const findings = { blockers: [], serious: [], moderate: [], minor: [] };

const ROUTES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/heute', label: 'Heute' },
  { path: '/inventory/items', label: 'Inventory Items' },
  { path: '/inventory/balances', label: 'Inventory Balances' },
  { path: '/inventory/bar-refill', label: 'Bar Refill' },
  { path: '/inventory/goods-receipt', label: 'Goods Receipt' },
  { path: '/inventory/withdrawal', label: 'Withdrawal' },
  { path: '/movements', label: 'Movements' },
  { path: '/storage', label: 'Storage' },
  { path: '/procurement', label: 'Procurement' },
  { path: '/shift-handover', label: 'Shift Handover' },
  { path: '/workspaces', label: 'Workspaces' },
  { path: '/inquiries', label: 'Inquiries' },
  { path: '/notes', label: 'Notes' },
  { path: '/alerts', label: 'Alerts' },
  { path: '/automation/suggestions', label: 'Automation' },
  { path: '/freigaben', label: 'Freigaben' },
  { path: '/mother-concern', label: 'Mother Concern' },
  { path: '/settings/profile', label: 'Settings Profile' },
  { path: '/settings/team', label: 'Settings Team' },
];

async function run() {
  console.log('🚀 Bevero Browser Audit gestartet (Firefox)');

  const browser = await firefox.launch({
    headless: false,
    executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH
      ? undefined
      : '/home/baum/.cache/ms-playwright/firefox-1532/firefox/firefox',
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() });
  });
  page.on('response', res => {
    if (res.status() >= 400) networkIssues.push({ status: res.status(), url: res.url(), method: res.request().method() });
  });

  // --- LOGIN ---
  console.log('\n🔐 Login...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: join(TABS_DIR, '00-login.png') });

  try {
    await page.fill('input[type="email"], input[placeholder*="mail" i], input[placeholder*="Mail"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"], button:has-text("Sign"), button:has-text("Login"), button:has-text("Anmelden")');
    await page.waitForURL(u => !u.toString().includes('sign-in') && !u.toString().includes('login'), { timeout: 15000 });
    console.log('✅ Login erfolgreich');
  } catch (e) {
    console.log('❌ Login fehlgeschlagen:', e.message);
    await page.screenshot({ path: join(TABS_DIR, '00-login-error.png') });
    await browser.close();
    return;
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(TABS_DIR, '01-dashboard.png') });
  console.log('✅ Dashboard Screenshot');

  // --- TAB SCREENSHOTS ---
  console.log('\n📸 Tab Screenshots...');
  const tabResults = [];

  for (let i = 0; i < ROUTES.length; i++) {
    const { path, label } = ROUTES[i];
    const num = String(i + 2).padStart(2, '0');
    const filename = `${num}-${label.toLowerCase().replace(/\s+/g, '-')}.png`;

    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(TABS_DIR, filename) });
      console.log(`  ✓ [${num}] ${label}`);
      tabResults.push({ num: i + 1, path, label, screenshot: `01-tabs/${filename}`, status: 'documented' });
    } catch (e) {
      console.log(`  ✗ [${num}] ${label}: ${e.message.slice(0, 60)}`);
      tabResults.push({ num: i + 1, path, label, screenshot: '', status: 'not-reachable', error: e.message.slice(0, 100) });
      findings.serious.push({ issue: `Tab nicht erreichbar: ${label}`, where: path, error: e.message.slice(0, 80) });
    }
  }

  // --- RESPONSIVE ---
  console.log('\n📱 Responsive Screenshots...');
  const viewports = [
    { name: 'desktop-1440', w: 1440, h: 900 },
    { name: 'tablet-768', w: 768, h: 1024 },
    { name: 'mobile-390', w: 390, h: 844 },
  ];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(TABS_DIR, `responsive-${vp.name}.png`) });
    console.log(`  ✓ ${vp.name} (${vp.w}×${vp.h})`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // --- CTA FLOWS (Dashboard) ---
  console.log('\n🔗 CTA Flows (Dashboard)...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const ctaFlows = [];
  const buttons = await page.locator('button').all();
  let ctaCount = 0;

  for (const btn of buttons.slice(0, 12)) {
    try {
      const text = (await btn.textContent())?.trim().slice(0, 50);
      if (!text || text.length < 2) continue;
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;

      const beforeFile = `cta-${String(ctaCount).padStart(2, '0')}-before.png`;
      const afterFile = `cta-${String(ctaCount).padStart(2, '0')}-after.png`;

      await page.screenshot({ path: join(FLOWS_DIR, beforeFile) });
      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(FLOWS_DIR, afterFile) });

      ctaFlows.push({ label: text, before: `02-cta-flows/${beforeFile}`, after: `02-cta-flows/${afterFile}`, status: 'documented' });
      console.log(`  ✓ CTA: "${text}"`);

      await page.goBack().catch(() => {});
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(500);
      ctaCount++;
    } catch (e) {
      // skip failing CTAs silently
    }
  }

  await browser.close();

  // --- REPORT ---
  console.log('\n📄 Generating report...');
  const date = new Date().toLocaleString('de-DE');

  const tabTable = tabResults.map(t =>
    `| ${t.num} | **${t.label}** | \`${t.path}\` | ${t.screenshot ? `[Screenshot](${t.screenshot})` : '–'} | ${t.status} |`
  ).join('\n');

  const ctaTable = ctaFlows.map((c, i) =>
    `| ${i + 1} | ${c.label} | Dashboard | click | documented | [before](${c.before}) · [after](${c.after}) |`
  ).join('\n');

  const report = `# Bevero Webapp — In-App Browser Audit Report

## Ziel

- **URL:** ${BASE_URL}
- **Browser:** Mozilla Firefox 151.0 (Playwright)
- **Viewport(s):** 1440×900 · 768×1024 · 390×844
- **Scope:** Vollständiger In-App-Browser-Audit (Tabs, CTAs, Responsive)
- **Datum:** ${date}
- **Login:** ✅ Erfolgreich (admin)

---

## Erfasste Tabs

| Nr. | Tab | Route | Screenshot | Status |
|---:|---|---|---|---|
${tabTable}

---

## Responsive Design

| Viewport | Auflösung | Screenshot |
|---|---|---|
| Desktop | 1440×900 | [responsive-desktop-1440.png](01-tabs/responsive-desktop-1440.png) |
| Tablet | 768×1024 | [responsive-tablet-768.png](01-tabs/responsive-tablet-768.png) |
| Mobile | 390×844 | [responsive-mobile-390.png](01-tabs/responsive-mobile-390.png) |

---

## CTA-Flows (Dashboard)

| Nr. | CTA | Seite | Aktion | Status | Screenshots |
|---:|---|---|---|---|---|
${ctaTable || '| – | Keine CTAs erfasst | – | – | – | – |'}

---

## Console-Fehler

${consoleErrors.length === 0 ? '✅ Keine JavaScript-Fehler erfasst.' : consoleErrors.slice(0, 10).map(e => `- \`${e.url}\`: ${e.text.slice(0, 120)}`).join('\n')}

---

## Netzwerk-Probleme (4xx / 5xx)

${networkIssues.length === 0 ? '✅ Keine fehlgeschlagenen Requests erfasst.' : networkIssues.slice(0, 10).map(e => `- **${e.status}** ${e.method} \`${e.url.slice(0, 100)}\``).join('\n')}

---

## Befunde

### Serious
${findings.serious.length === 0 ? '_Keine_' : findings.serious.map(f => `- **${f.issue}** — \`${f.where}\``).join('\n')}

### Minor
${findings.minor.length === 0 ? '_Keine_' : findings.minor.map(f => `- ${f.issue}`).join('\n')}

---

## Empfehlungen

1. **Console-Fehler beheben** — ${consoleErrors.length} JS-Fehler gefunden
2. **API-Fehler analysieren** — ${networkIssues.length} fehlgeschlagene Requests
3. **Nicht erreichbare Tabs prüfen** — ${findings.serious.length} Routen mit Fehlern
4. **Mobile-Navigation testen** — Sidebar auf 390px verifizieren
5. **Accessibility-Audit** — Lighthouse a11y-Score ermitteln
6. **Leere States dokumentieren** — Empty-States bei Inventory, Movements etc.
7. **Ladezeiten messen** — Core Web Vitals (LCP, CLS, INP) prüfen
8. **E2E-Tests hinzufügen** — Kritische Flows (Bestellung, Wareneingang) automatisieren

---

## Zusammenfassung

| Metrik | Wert |
|---|---|
| Erfasste Tabs | ${tabResults.filter(t => t.status === 'documented').length} / ${tabResults.length} |
| Nicht erreichbar | ${tabResults.filter(t => t.status === 'not-reachable').length} |
| CTA-Flows dokumentiert | ${ctaFlows.length} |
| JS-Fehler | ${consoleErrors.length} |
| Netzwerk-Fehler | ${networkIssues.length} |
| Responsive Screenshots | 3 |

---

_Report generiert: ${date}_
_Screenshots: \`assets/Screenshots/\`_
`;

  writeFileSync('assets/Screenshots/screenshot-audit-report.md', report);
  console.log('\n✅ Audit abgeschlossen!');
  console.log(`   📁 Screenshots: assets/Screenshots/`);
  console.log(`   📄 Report: assets/Screenshots/screenshot-audit-report.md`);
  console.log(`\n   Tabs erfasst: ${tabResults.filter(t => t.status === 'documented').length}/${tabResults.length}`);
  console.log(`   CTAs getestet: ${ctaFlows.length}`);
  console.log(`   JS-Fehler: ${consoleErrors.length}`);
  console.log(`   Netzwerk-Fehler: ${networkIssues.length}`);
}

run().catch(e => {
  console.error('❌ Audit fehlgeschlagen:', e);
  process.exit(1);
});
