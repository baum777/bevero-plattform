import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const movementsClient = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/(app)/movements/movements-client.tsx"),
  "utf8"
);

const movementsPage = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/(app)/movements/page.tsx"),
  "utf8"
);

const globalsCss = readFileSync(
  join(process.cwd(), "../../apps/cockpit/app/globals.css"),
  "utf8"
);

describe("movements quick-actions cockpit UI", () => {
  it("uses the accepted bottom-sheet quick-action flow with the four supported movement types", () => {
    expect(movementsClient).toContain(
      'type MovementType = "withdrawal" | "goods_receipt" | "correction" | "transfer"'
    );
    expect(movementsClient).toContain("const [sheetVisible, setSheetVisible] = useState(false)");
    expect(movementsClient).toContain("requestAnimationFrame(() => setSheetVisible(true))");
    expect(movementsClient).toContain("function closeSheet()");
    expect(movementsClient).toContain("setSelectedItem(item)");
    expect(movementsClient).toContain("mv-type-bar");
    expect(movementsClient).toContain("mv-type-pill");
    expect(movementsClient).toContain("mv-sheet");
    expect(movementsClient).not.toContain('type MovementType = "purchase_in" | "consume" | "waste"');
  });

  it("keeps backend request shapes aligned and hides idempotency keys from the UI", () => {
    expect(movementsClient).toContain('path = "/withdrawals"');
    expect(movementsClient).toContain('path = "/goods-receipts"');
    expect(movementsClient).toContain('path = "/correction-requests"');
    expect(movementsClient).toContain('path = "/transfers"');
    expect(movementsClient).toContain("crypto.randomUUID()");
    expect(movementsClient).not.toContain("Idempotency Key");
    expect(movementsClient).not.toContain("movement-idempotency");

    const withdrawalBlock =
      movementsClient.match(/if \(movementType === "withdrawal"\)[\s\S]*?else if \(movementType === "goods_receipt"\)/)?.[0] ??
      "";
    expect(withdrawalBlock).toContain('path = "/withdrawals";');
    expect(withdrawalBlock).toContain("idempotencyKey: createIdempotencyKey()");
    expect(withdrawalBlock).toContain("storageLocationId: item.storageLocationId");
  });

  it("loads stock metadata into the picker and renders compact history controls", () => {
    expect(movementsPage).toContain("listInventoryItemsWithStock");
    expect(movementsClient).toContain("targetStock");
    expect(movementsClient).toContain("currentStock");
    expect(movementsClient).toContain("const [itemRows, setItemRows] = useState(items)");
    expect(movementsClient).toContain("nextStockAfterMovement");
    expect(movementsClient).toContain("currentStock: nextStockAfterMovement");
    expect(movementsClient).toContain("mv-history-list");
    expect(movementsClient).toContain("Verlauf konnte nicht geladen werden");
    expect(movementsClient).toContain("loadMovements");
    expect(movementsClient).toContain("HISTORY_POLL_MS = 30_000");
  });

  it("renders a hybrid movement table with Canvas2D sparklines and HTML labels", () => {
    expect(movementsClient).toContain("function MovementTrendCanvas");
    expect(movementsClient).toContain("function buildMovementTableRows");
    expect(movementsClient).toContain('aria-label={`Bewegungstrend für ${label}`}');
    expect(movementsClient).toContain("globalThis.devicePixelRatio");
    expect(movementsClient).toContain("context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)");
    expect(movementsClient).toContain("const barGap = 2");
    expect(movementsClient).toContain("const usableBarWidth = width - paddingX * 2 - barGap * (values.length - 1)");
    expect(movementsClient).toContain("movementTableRows.map");

    expect(globalsCss).toContain(".mv-movement-table");
    expect(globalsCss).toContain(".mv-trend-canvas");
    expect(globalsCss).toContain(".mv-table-mobile-card");
    expect(globalsCss).toContain("@media (min-width: 1180px)");
  });

  it("can simulate multi-week movement history without writing to the backend", () => {
    expect(movementsClient).toContain("const SIMULATION_WINDOW_DAYS = 28");
    expect(movementsClient).toContain("function buildSimulatedMovements");
    expect(movementsClient).toContain("const [simulationEnabled, setSimulationEnabled] = useState(false)");
    expect(movementsClient).toContain("const visibleMovements = simulationEnabled ? simulatedMovements : movements");
    expect(movementsClient).toContain("Simulation 4 Wochen");
    expect(movementsClient).toContain("Echte Bewegungen");
    expect(movementsClient).not.toContain("fetch(`${getBackendApiBase()}${HISTORY_PATH}`, {\n        method: \"POST\"");

    expect(globalsCss).toContain(".mv-simulation-note");
    expect(globalsCss).toContain(".mv-table-actions");
  });

  it("defines the quick-action CSS block with mobile touch targets in globals.css", () => {
    expect(globalsCss).toContain("/* movements quick-actions */");
    expect(globalsCss).toContain(".mv-type-bar");
    expect(globalsCss).toContain(".mv-type-pill");
    expect(globalsCss).toContain(".mv-sheet");
    expect(globalsCss).toContain(".mv-sheet-backdrop");
    expect(globalsCss).toContain(".mv-stepper");
    expect(globalsCss).toContain(".mv-history-list");
    expect(globalsCss).toContain("min-height: 56px");
    expect(globalsCss).toContain("width: 56px");
    expect(globalsCss).toContain("height: 56px");
  });
});
