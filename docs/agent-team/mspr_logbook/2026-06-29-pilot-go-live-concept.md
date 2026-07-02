# MSPR Entry — Pilot Go-Live Concept (Manual Mode) + Role Formalization

- id: 2026-06-29-pilot-go-live-concept
- timestamp: 2026-06-29T08:45:00+02:00
- runId: baumos-2026-06-29-pilot-go-live-concept
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: governance_policy
- pathsInScope:
  - `docs/pilot/pilot-go-live-concept.md` (new)
  - `governance/approval-matrix.md` (named roles section only)
  - `context/priorities.md` (focus update)
  - `docs/agent-team/mspr_logbook/2026-06-29-pilot-go-live-concept.md`
  - `docs/agent-team/intent_logbook/2026-06-29-pilot-go-live-concept.md`
- pathsOutOfScope:
  - `IDENTITY.md`, `OS.md`, `docs/DECISIONS.md` (authority — not edited)
  - `workflows/einkauf-bestellung.md` (workflow definition — referenced, not changed)
  - `apps/cockpit/*` (parallel user work + readiness verification is a separate slice)
  - runtime provisioning of RBAC roles (needs app/DB — listed as readiness item, not executed)
- autonomyTier: 1

## Code Change Context

- Trigger/request: User — "starte mit der planung für konzept finalisierung um mit dem pilot live zu gehen", then answered 5 scoping decisions.
- Why the change was needed: The hygiene blockers were resolved, but the real pilot blockers were reframed by the operator's key decision — pilot runs in **Manual Mode without API/live data**. This removes the live-connector blocker and makes a governance-process pilot immediately feasible; it required a concrete go-live concept and formalized pilot roles.
- Operator decisions captured (2026-06-29):
  1. L3-Operator = Cheikh (bis auf weiteres)
  2. Reviewer = role created (pilot placeholder, `reviewer ≠ author`)
  3. Demo-User + Motorworld Inn Böblingen standort exist in Supabase
  4. Deploy target = `bevero-ui` (deployed)
  5. Execution = simulated (no real supplier send)
  + North star: use the app **without** API/live data for now.
- Files read:
  - `governance/approval-matrix.md`, `workflows/einkauf-bestellung.md`, `workflows/standard.md`
  - `apps/cockpit/app/**/page.tsx` glob → procurement, freigaben, inventory surfaces confirmed present
  - `apps/api/src/modules/inventory/demo-seed.{service,data}.ts` confirmed (seed data exists)
- Files changed:
  - `docs/pilot/pilot-go-live-concept.md` — new Track-B pilot concept (goal, scope, roles, readiness checklist, run-plan, go/no-go, path-to-v1)
  - `governance/approval-matrix.md` — added "Benannte Rollen (Pilot — Manual Mode)" section (operator=Cheikh, reviewer=placeholder, author=per-run)
  - `context/priorities.md` — focus rewritten to "Pilot Go-Live (Manual Mode)"
  - this MSPR + its intent entry
- Commands run:
  - `glob apps/cockpit/app/**/page.tsx` → 47 pages incl. `procurement`, `freigaben`, `inventory/*`, `settings/roles`, `settings/team` (manual-mode surfaces present)
  - `glob demo-seed` → `demo-seed.service.ts` + `demo-seed.data.ts` exist
- Validation results:
  - Concept covers all 5 operator decisions; run-plan maps 1:1 to `workflows/einkauf-bestellung.md` steps 1–9 (with execution marked simulated).
  - Roles formalized consistently between `approval-matrix.md` and the concept §3.
  - Readiness checklist explicitly carries the unverified items (`bevero-ui` live status, procurement→freigaben wiring, demo-data visibility) — not claimed as done.

## Memory

- newFindings:
  - The cockpit already exposes the采购 governance surfaces (`procurement`, `freigaben`, `inventory/*`, `settings/roles`) — the pilot is a **verification + concept** task, not a build project.
  - Manual Mode reframes the pilot: prove the governance loop (Draft → Review → Freigabe → Evidence → Audit), not data integration. Live-connector work is deferred to v1.
  - `bevero-ui` prod-alias status is still unverified locally (SOT 2026-06-18 said `target: null`) — first readiness gate.
- reusableRules:
  - When a blocker is reframed away by an operator decision (here: "no live data"), update the readiness checklist rather than silently dropping the item; carry the new assumption explicitly.
- gotchas:
  - The operator decision "app ohne api/live data" still requires Supabase (auth + seed) — "no live data" means no **external** integrations, not no backend.

## Review

- status: pass
- risks:
  - `bevero-ui` may not be live or may lack the demo user/data → readiness gate §4 must be verified before any run.
  - `procurement → freigaben` wiring is assumed from page presence, not yet confirmed end-to-end in code.
  - Reviewer is a placeholder; real reviewer naming still open for rollout.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Execute the readiness verification (concept §4), starting with `bevero-ui` live status + `procurement→freigaben` code wiring. Track A (product concept) is a follow-up slice.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-pilot-go-live-concept.md`
