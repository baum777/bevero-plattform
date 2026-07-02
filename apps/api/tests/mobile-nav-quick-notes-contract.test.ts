import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const bottomNav = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/components/bottom-nav.tsx"),
  "utf8"
);

const appShell = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/components/app-shell.tsx"),
  "utf8"
);

const quickNotesFab = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/components/quick-notes-fab.tsx"),
  "utf8"
);

const refillClient = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx"),
  "utf8"
);

const movementsClient = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/(app)/movements/movements-client.tsx"),
  "utf8"
);

const globalsCss = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/globals.css"),
  "utf8"
);

describe("mobile navigation and quick notes contracts", () => {
  it("opens withdrawal quick action via dedicated withdrawal page", () => {
    expect(bottomNav).toContain('go("/inventory/withdrawal")');
    expect(movementsClient).toContain("useSearchParams");
    expect(movementsClient).toContain('searchParams.get("type")');
  });

  it("uses workspace-aware bereich tab as mobile nav destination", () => {
    expect(bottomNav).toContain('href: "/heute"');
    expect(bottomNav).toContain('"/inventory/bar-refill"');
    expect(bottomNav).toContain('"/kitchen/walk-route"');
    expect(bottomNav).toContain('href: "/freigaben"');
    expect(bottomNav).not.toContain('label: "Dashboard", href: "/dashboard"');
  });

  it("keeps mobile header free of primary navigation and area filters", () => {
    expect(appShell).not.toContain("mobile-nav-toggle");
    expect(appShell).not.toContain("Menü");
    expect(appShell).toContain("topbar-actions desktop-only");
    expect(appShell).toContain("workspace-select");
    expect(globalsCss).toContain(".desktop-only");
    expect(globalsCss).toContain("@media (min-width: 1024px)");
    expect(globalsCss).not.toContain(".mobile-nav-toggle");
  });

  it("does not render the mobile menu label in the app shell", () => {
    expect(appShell).not.toContain("Menü");
  });

  it("keeps the area filter desktop-scoped instead of mobile primary flow", () => {
    expect(appShell).toContain("topbar-actions desktop-only");
    expect(appShell).toContain("workspace-select");
    expect(globalsCss).toContain(".desktop-only");
  });

  it("opens local note and checklist actions from the mobile plus sheet", () => {
    expect(bottomNav).toContain("bevero:open-quick-note");
    expect(bottomNav).toContain('startQuickNote("note")');
    expect(bottomNav).toContain('startQuickNote("checklist")');
    expect(quickNotesFab).toContain('window.addEventListener(OPEN_QUICK_NOTE_EVENT');
  });

  it("persists quick notes with the device-local storage contract", () => {
    expect(quickNotesFab).toContain("localStorage.setItem");
    expect(quickNotesFab).toContain("type,");
    expect(quickNotesFab).toContain("text,");
    expect(quickNotesFab).toContain("route: pathname");
    expect(quickNotesFab).toContain("context: routeContext");
    expect(quickNotesFab).toContain("createdAt");
    expect(quickNotesFab).toContain("updatedAt");
  });

  it("does not render raw fetch exceptions for the bar refill load state", () => {
    expect(refillClient).toContain("BAR_REFILL_RUNS_ENDPOINT");
    expect(refillClient).toContain("toFriendlyBarRefillMessage");
    expect(refillClient).not.toContain("setError(requestError instanceof Error ? requestError.message");
    expect(refillClient).not.toContain("Failed to fetch");
  });

  it("keeps bottom-nav and quick-notes fixed layers on declared z-index variables", () => {
    expect(globalsCss).toContain("--z-bottom-nav: 100");
    expect(globalsCss).toContain("--z-quick-action-sheet: 150");
    expect(globalsCss).toContain("--z-quick-notes: 200");
    expect(globalsCss).toContain(".bottom-nav");
    expect(globalsCss).toContain("z-index: var(--z-bottom-nav)");
    expect(globalsCss).toContain(".qa-sheet");
    expect(globalsCss).toContain("z-index: var(--z-quick-action-sheet)");
    expect(globalsCss).toContain(".qn-overlay");
    expect(globalsCss).toContain("z-index: var(--z-quick-notes)");
  });

  it("keeps refill floating actions above the mobile bottom navigation safe area", () => {
    expect(globalsCss).toContain(".bar-refill-fab");
    expect(globalsCss).toContain("bottom: calc(72px + env(safe-area-inset-bottom))");
    expect(globalsCss).toContain(".bar-refill-wrap");
    expect(globalsCss).toContain("padding-bottom: calc(128px + env(safe-area-inset-bottom))");
  });

  it("does not hardcode black overlays or shadows in the new mobile interaction blocks", () => {
    const mobileBlocks = globalsCss.slice(globalsCss.indexOf("/* bottom navigation */"));
    expect(mobileBlocks).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(mobileBlocks).not.toContain("rgba(0, 0, 0");
  });
});
