import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const apiFetch = readRepoFile("../../apps/cockpit/lib/backend/api-fetch.ts");
const authProvider = readRepoFile("../../apps/cockpit/app/providers/auth-provider.tsx");
const appShell = readRepoFile("../../apps/cockpit/app/components/app-shell.tsx");
const refillClient = readRepoFile(
  "../../apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx"
);
const movementsClient = readRepoFile("../../apps/cockpit/app/(app)/movements/movements-client.tsx");
const goodsReceiptClient = readRepoFile(
  "../../apps/cockpit/app/(app)/inventory/goods-receipt/goods-receipt-client.tsx"
);
const withdrawalClient = readRepoFile(
  "../../apps/cockpit/app/(app)/inventory/withdrawal/withdrawal-client.tsx"
);
const walkRouteClient = readRepoFile(
  "../../apps/cockpit/app/(app)/kitchen/walk-route/walk-route-client.tsx"
);
const freigabenClient = readRepoFile("../../apps/cockpit/app/(app)/freigaben/freigaben-client.tsx");

describe("cockpit API transport contract", () => {
  it("centralizes bearer auth, organization context, JSON headers, errors, and proxy/direct mode", () => {
    expect(apiFetch).toContain("export async function apiFetch");
    expect(apiFetch).toContain('headers.set("Authorization", `Bearer ${accessToken}`)');
    expect(apiFetch).toContain('headers.set("X-Organization-Id", organizationId)');
    expect(apiFetch).toContain('headers.set("Content-Type", "application/json")');
    expect(apiFetch).toContain("throw await normalizeApiError(response)");
    expect(apiFetch).toContain('transportMode?: ApiFetchMode');
    expect(apiFetch).toContain('return `/api/backend${path}`');
    expect(apiFetch).toContain('return `${getBackendApiBase()}${path}`');
  });

  it("uses AuthProvider organizationId as the source for backend actions", () => {
    expect(authProvider).toContain("organizationId: string | null");
    expect(authProvider).toContain(".select(\"organizationId,role\")");

    for (const source of [
      appShell,
      refillClient,
      movementsClient,
      goodsReceiptClient,
      withdrawalClient,
      walkRouteClient,
      freigabenClient
    ]) {
      expect(source).toContain("organizationId");
      expect(source).toContain("requireOrganization: true");
    }
  });

  it("routes bar refill through the shared helper including fallback create, patch, confirm, and cancel", () => {
    expect(refillClient).toContain('const BAR_REFILL_RUNS_ENDPOINT = "/bar-refill/runs"');
    expect(refillClient).toContain('const BAR_REFILL_TODAY_ENDPOINT = "/bar-refill/runs/today"');
    expect(refillClient).toContain("throwOnError: false");
    expect(refillClient).toContain('method: "PATCH"');
    expect(refillClient).toContain('runItemEndpoint(run.runId, itemId, "confirm")');
    expect(refillClient).toContain('runItemEndpoint(run.runId, itemId, "cancel")');
    expect(refillClient).toContain("Stornieren");
  });

  it("keeps confirm and movement evidence available in local debug events/state", () => {
    expect(refillClient).toContain("type ConfirmEvidence");
    expect(refillClient).toContain("movementId: result.movementId");
    expect(refillClient).toContain("stockAfter: result.stockAfter");
    expect(refillClient).toContain("Letzte Bestätigung: Bewegung");

    expect(movementsClient).toContain("type MovementWriteResponse");
    expect(movementsClient).toContain('window.dispatchEvent(new CustomEvent("bevero:movement-evidence"');
    expect(movementsClient).toContain("movementIds: response.movementIds");
    expect(movementsClient).toContain("stockAfter: response.stockAfter");
  });

  it("moves core movement actions off ad hoc direct fetch transport", () => {
    expect(movementsClient).toContain("apiJson<MovementsResponse>(HISTORY_PATH");
    expect(movementsClient).toContain("apiJson<MovementWriteResponse>(path");
    expect(movementsClient).not.toContain("fetch(`${getBackendApiBase()}${path}`");
    expect(movementsClient).not.toContain("fetch(`${getBackendApiBase()}${HISTORY_PATH}`");

    expect(goodsReceiptClient).toContain('apiJson("/goods-receipts"');
    expect(withdrawalClient).toContain('apiJson<{');
    expect(withdrawalClient).toContain('>("/withdrawals"');
    expect(walkRouteClient).toContain('apiFetch("/correction-requests"');
    expect(freigabenClient).toContain("apiFetch(`/admin/correction-requests/");
  });
});
