# Intent Memory — Pilot Go-Live Concept (Manual Mode) + Role Formalization

- id: 2026-06-29-pilot-go-live-concept
- timestamp: 2026-06-29T08:45:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-pilot-go-live-concept.md`
- status: reviewed

## Core intention

Turn "go live with the pilot" into a concrete, honest, immediately executable plan by reframing the pilot as a **Manual Mode governance-process pilot** — proving the OS approval loop without the not-yet-available live data integrations — and by formally naming the pilot operator so the L3 gate has a human.

## Logic followed

- Reframe the biggest blocker as out-of-scope for v0: the operator's decision "use the app without API/live data" converts the data-integration blocker into a v1 concern and lets the governance loop be proven now.
- Anchor on existing surfaces: the cockpit already has `procurement`, `freigaben`, `inventory/*`, and a demo-seed — so the pilot is verification, not construction.
- Formalize the minimum governance truth: name the operator (Cheikh) in `approval-matrix.md` so the L3 "Name + Timestamp" requirement has an answer; keep reviewer as an explicit placeholder rather than fabricating a person.
- Separate process-proof from integration-proof: the pilot proves the governance loop; live connectors and real execution are explicitly v1.
- Carry assumptions visibly: unverified readiness items (bevero-ui live, procurement→freigaben wiring, demo-data visibility) are listed as gates, not assumed true.

## Design assumptions

- "No live data" means no external integrations (FoodNotify/Gastronovi/Dynamics); the app still runs on its own Supabase backend with auth + seed data.
- The cockpit's procurement and freigaben pages are wired to the same PurchaseOrder/approval data model (assumed from page + route presence; not yet confirmed end-to-end).
- A simulated execution (no real supplier send) is sufficient to prove the governance loop and is honest about what is and isn't validated.

## Tradeoffs

- Accepted:
  - Cheikh as operator "bis auf weiteres" — pragmatic for the pilot, with an explicit note that rollout needs a real named operator per site.
  - Reviewer as placeholder — honest about an unfilled role rather than naming a phantom person.
  - Simulated execution — proves process without financial/external risk.
- Rejected:
  - Waiting for live connectors before any pilot — that would delay process validation unnecessarily.
  - Claiming readiness items are done before verifying them.

## Durable memory

- The pilot's purpose is governance-loop validation, not data integration; these are two separate validation surfaces that must not be conflated.
- Pilot operator = Cheikh (named in `governance/approval-matrix.md`); reviewer remains a placeholder pending a real second person.
- Manual Mode = Supabase + seed, no external connectors; v1 adds live data + real execution + more sites.
- The cockpit already exposes the needed surfaces; the next work is verification (does the wiring work end-to-end on `bevero-ui`?).

## Do not reuse blindly

- The "manual mode reframe" is specific to the current state (no live data access yet); once connectors exist, the pilot concept must be revised toward v1.
- Do not assume `procurement → freigaben` works end-to-end just because both pages exist — verify the wiring before any pilot run.

## Relation to Rauschenberger OS / Bevero

- location logic: pilot scoped to Motorworld Inn Böblingen (the one provisioned location).
- role/approval logic: operator named (Cheikh) for L3; reviewer placeholder; author per-run — minimum viable governance for a pilot, with rolltout-role-naming explicitly deferred.
- inventory/procurement/shift-planning logic: the Einkaufsbestellung workflow is the pilot vehicle; inventory surfaces provide the stock context; no automatic mutation (hard guardrail preserved).
- external-system boundary: no writeback, no live connectors in v0; FoodNotify/Gastronovi/Dynamics remain leading and untouched.

## Next logic gate

Verify readiness (concept §4): is `bevero-ui` live with the demo user + Motorworld Inn data, and is the `procurement → freigaben` flow actually wired? If yes, schedule the manual-mode pilot run; if no, the gaps become the next work items.
