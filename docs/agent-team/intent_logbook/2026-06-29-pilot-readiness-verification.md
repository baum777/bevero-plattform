# Intent Memory — Pilot Readiness Verification + Path A Decision

- id: 2026-06-29-pilot-readiness-verification
- timestamp: 2026-06-29T09:05:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-pilot-readiness-verification.md`
- status: reviewed

## Core intention

Verify, before any pilot run, that the assumed采购 cockpit wiring actually exists — and if it doesn't, find the shortest honest path to a real manual-mode governance pilot instead of forcing the original concept.

## Logic followed

- Verify-before-run: read the actual cockpit pages and grep for real API usage rather than trusting page names or nav labels.
- Distinguish backend from frontend: a route in `apps/api` proves nothing about cockpit usage; only `rg apps/cockpit` does.
- When the assumed vehicle (Einkauf L3) turned out unwired, identify the closest fully-wired governance loop (Korrektur → Freigabe L2) that proves the same mechanism (Draft → Gate → Effect).
- Reframe rather than abandon: keep the original Einkauf vision as Path B (build), but unblock a real pilot now via Path A (use what's wired).
- Record the finding honestly in the concept, including the gap and both paths, so the decision is auditable.

## Design assumptions

- A pilot's purpose is to prove the governance mechanism end-to-end; the specific vehicle (correction vs purchase) is secondary as long as Draft → Approval → Effect + Evidence is exercised.
- `bevero-ui` being live (sign-in page reachable) is necessary but not sufficient — login, data, and RBAC still need runtime confirmation.
- Inventory corrections creating `InventoryMovement` (append-only) per ADR-0007 is the real stock effect that proves the loop has teeth.

## Tradeoffs

- Accepted:
  - Pilot L2 (correction) instead of L3 (Einkauf) — proves the mechanism now; defers the Einkauf-specific flow to Path B.
  - Hand runtime gates (login/data/RBAC) to the operator since they need browser access.
- Rejected:
  - Proceeding to a pilot run on the unverified Einkauf assumption.
  - Silently editing the concept to hide the gap — recorded it explicitly instead.

## Durable memory

- In this repo, page names mislead: `procurement` = Wareneingang (FoodNotify), `freigaben` = correction approvals. Read the page code, not the label.
- Einkauf (L3) has a backend but no cockpit UI — Path B is a real build item, not a config tweak.
- The wired manual-mode governance loop is Korrektur → Freigabe (L2); this is the pilot vehicle (Path A).
- Always verify cockpit API usage with `rg apps/cockpit` before claiming a workflow is "ready".

## Do not reuse blindly

- Path A is a point-in-time finding; if the cockpit gains a purchase-order UI later, re-evaluate whether Path B is still needed or already satisfied.
- "bevero-ui live" was verified once (2026-06-29); re-check before a real run — deploy state can change.

## Relation to Rauschenberger OS / Bevero

- location logic: pilot stays at Motorworld Inn Böblingen (provisioned location).
- role/approval logic: Path A uses L2 manager-approval (Reviewer + Evidence); the named operator (Cheikh) acts as manager. L3 operator-naming remains relevant for Path B (Einkauf).
- inventory/procurement/shift-planning logic: correction → InventoryMovement (append-only) + snapshot refresh is the real effect; no auto-mutation, hard guardrail preserved.
- external-system boundary: still no writeback, no live connectors; FoodNotify procurement page confirmed import-dependent (empty in manual mode).

## Next logic gate

Operator confirms the 3 runtime gates on `bevero-ui` (Demo-Login, Motorworld data visible, manager can create + approve a correction). If green, execute the two Path-A pilot runs (approve + reject) and capture Evidence + Audit entries.
