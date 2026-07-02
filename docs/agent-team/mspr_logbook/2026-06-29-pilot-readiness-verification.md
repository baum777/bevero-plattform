# MSPR Entry — Pilot Readiness Verification + Path A Decision

- id: 2026-06-29-pilot-readiness-verification
- timestamp: 2026-06-29T09:05:00+02:00
- runId: baumos-2026-06-29-pilot-readiness-verification
- agentRole: builder
- taskType: read_only_audit

## Scope

- layer: docs_only
- pathsInScope:
  - `docs/pilot/pilot-go-live-concept.md` (§4 readiness, §4.1 gap, §4.2 paths, header, §2, §5 reframe)
  - `governance/approval-matrix.md` (pilot roles → Path A)
  - `context/priorities.md` (focus → Path A)
  - `docs/agent-team/mspr_logbook/2026-06-29-pilot-readiness-verification.md`
  - `docs/agent-team/intent_logbook/2026-06-29-pilot-readiness-verification.md`
- pathsOutOfScope:
  - runtime/login verification on `bevero-ui` (needs browser/credentials)
  - `apps/cockpit/*` and `apps/api/*` code changes (Path B build, deferred)
  - `IDENTITY.md`, `OS.md`, `docs/DECISIONS.md`
- autonomyTier: 1

## Code Change Context

- Trigger/request: User — "readiness-verify starten" (concept §4 checklist).
- Why the change was needed: Verify the assumed `procurement → freigaben` wiring before any pilot run; the concept's run-plan depended on it.
- Files read:
  - `apps/cockpit/app/(app)/procurement/page.tsx`, `procurement/[id]/page.tsx`, `freigaben/page.tsx`
  - `apps/api/src/routes/inventory.route.ts` (purchase-order routes L255–329)
  - `rg apps/cockpit` for purchase-order / Einkauf UI usage
  - `rg apps/cockpit` for CorrectionRequest creation + all POST/mutate calls
  - `logs/` (evidence/audit paths)
  - webfetch `https://bevero-ui.vercel.app` (liveness)
- Files changed:
  - `docs/pilot/pilot-go-live-concept.md` — §4 verified statuses; new §4.1 (gap + alternative vehicle); §4.2 (two paths); header → Path A decided; §2 scope → correction vehicle; §5 run-plan → correction flow
  - `governance/approval-matrix.md` — pilot-roles section → Path A (L2, manager-approval)
  - `context/priorities.md` — focus → Path A
  - this MSPR + its intent entry
- Commands run:
  - `webfetch bevero-ui.vercel.app` → pass (sign-in page returned; site live)
  - `rg "purchase-orders|PurchaseOrder" apps/cockpit` → **0 Treffer** (cockpit never calls PO API)
  - `rg "Einkauf|Bestellung|Lieferant" apps/cockpit/app` → only FoodNotify-wareneingang + a goods-receipt placeholder
  - `rg correction-requests / POST apps/cockpit` → confirmed full create→approve wiring via movements + freigaben
- Validation results:
  - `bevero-ui` LIVE confirmed (`Observed`).
  - Evidence/audit/session-log paths exist (`Observed`).
  - **Critical gap confirmed**: Einkauf has backend PO API but **no cockpit UI**; `procurement` is FoodNotify-import-dependent (empty in manual mode); `freigaben` is CorrectionRequest (L2), not purchase-order (L3).
  - **Alternative vehicle confirmed wired**: Inventory-Korrektur → Freigabe (movements → `/correction-requests` → freigaben → `approve|reject`), manual-mode-ready.

## Memory

- newFindings:
  - Page-name ≠ workflow-name trap: `procurement` page is **Wareneingang** (FoodNotify inbound), not purchase-order drafting; `freigaben` is correction approvals, not purchase approvals. Always read the page, not the nav label.
  - Backend ≠ Frontend: the PurchaseOrder API (`POST /admin/purchase-orders`) exists but the cockpit calls it 0 times — a wired backend with no UI consumer.
  - The fully-wired manual-mode governance loop is Inventory-Korrektur → Freigabe (L2), not Einkauf (L3).
- reusableRules:
  - For any pilot readiness claim, grep the cockpit for actual API usage (`rg "<endpoint>" apps/cockpit`) — route presence in `apps/api` does not prove the UI calls it.
  - Verify liveness with a real request (`webfetch`), not by trusting the SOT's deploy metadata.
- gotchas:
  - Remaining runtime gates (Demo-Login, Motorworld data visibility, RBAC manager role) cannot be verified without browser/credentials — must be handed to the operator.

## Review

- status: pass
- risks:
  - Runtime gates unverified: Demo-User login, Motorworld-Inn data visibility, manager RBAC role on `bevero-ui` — any of these could still block the actual run.
  - Path A proves the L2 governance mechanism but not the L3 Einkauf loop; Path B (PO UI build) is still required for the original Einkauf vision.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Operator verifies the 3 runtime gates on `bevero-ui` (login → see Motorworld data → manager can create correction + approve in freigaben). If green, execute the 2 Path-A pilot runs.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-pilot-readiness-verification.md`
