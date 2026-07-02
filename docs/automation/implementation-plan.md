# Implementation Plan — Semi-Automated Operations Layer

**Status:** proposed (companion to ADR-0021)
**Author:** Mavis (orchestrator)
**Date:** 2026-06-08
**Binding doc:** `docs/automation/semi-automated-operations-layer.md` (1805 lines, adopted via ADR-0021)
**Runtime anchor:** `docs/agent-team/runtime-design.md` + `src/agent-team/` (ADR-0020 accepted, PR #34)
**MSPR logbook:** `docs/agent-team/mspr_logbook/`

## 1. Why this plan exists

The spec defines seven phases (A → G) over ~7–8 months. A minimum viable subset (A–C) is ~3 months. The repo is currently in **late Phase A** (spec adopted, runtime infrastructure landed) and is about to enter **Phase B** (Rules Engine MVP). This plan exists to:

1. Convert the 1805-line spec into a sequenced set of concrete, reviewable slices.
2. Tie each slice to a verifiable gate, an owner class, and a T-shirt estimate.
3. Make the dependency graph between phases explicit so parallel tracks do not collide.
4. Surface the open questions that need a human owner answer before the next gate opens.

It is **not** an implementation. No code, no migration, no endpoint. Slices land via their own ADR-gated commits, each accompanied by an MSPR entry per `docs/agent-team/mspr_logbook.md`.

## 2. Status snapshot

| Slice | Spec | ADR | Code | Status |
|---|---|---|---|---|
| Phase A meta-deliverables (spec, ADR-0021, drafted contracts) | ✓ | ADR-0021 accepted | none | **done** |
| MiniMax-3 Swarm Runtime (ADR-0020 + 5 modules + 142 tests + MSPR entry) | infra | ADR-0020 accepted | `src/agent-team/`, `tests/agent-team/` | **done** (parallel workstream, not a spec phase) |
| CI workflow (v4 actions, concurrency, scoped trigger) | infra | — | `.github/workflows/ci.yml` | **done** (PR #35) |
| Cockpit `/automation/suggestions` stub (planning only) | Phase C preview | — | `apps/cockpit/app/(app)/automation/suggestions/page.tsx` | **3% done** (placeholder only; replaced in the C-3b+C-4 slice) |
| **Phase C — Cockpit UI (C-3b list+detail+actions + C-4 dashboard card + C-5 bar-refill banner)** | ✓ | spec+plan-doc authority (the read backend was back-promoted in ADR-0029; C-5 is the last Phase C slice) | C-3b + C-4: `apps/cockpit/app/(app)/automation/suggestions/page.tsx` (rewritten server component), `apps/cockpit/app/(app)/automation/suggestions/suggestions-client.tsx` (new, ~280 lines), `apps/cockpit/app/(app)/dashboard/page.tsx` (added the "Automation-Vorschläge" card), `apps/cockpit/lib/supabase/queries/automation-suggestions.ts` (new query helper), `apps/cockpit/lib/supabase/queries/dashboard.ts` (extended with `openSuggestions: number \| null` field). C-5: `apps/cockpit/app/(app)/inventory/bar-refill/page.tsx` (added `<RefillSuggestionsBannerLoader />`), `apps/cockpit/app/(app)/inventory/bar-refill/refill-suggestions-banner.tsx` (new server component, ~70 lines), `apps/cockpit/lib/supabase/queries/automation-suggestions.ts` (added `countRefillSuggestions`). | **done** (Cockpit `tsc --noEmit` clean, `next build` clean with `/automation/suggestions` at 2.94 kB and `/inventory/bar-refill` at 4.72 kB, backend `tsc` clean, 485/485 vitest cases green, `prisma validate` clean; C-3b prior 112-line `suggestions-stub.tsx` deleted; Phase C is functionally complete per the plan-doc §Phase C gate) |
| **Phase C — Read endpoints (GET list + GET detail for suggestions)** | ✓ | spec+plan-doc authority (no ADR; see MSPR-2026-06-08-phase-c-read-suggestions for the gap and the recommended back-promotion ADR-0029) | `src/modules/automation/automation-suggestion.service.ts` (added `listSuggestions` + `getSuggestion` + Zod query schema), `src/routes/automation-suggestion.route.ts` (added 2 GET handlers, `suggestionReadRoles` constant), `src/modules/automation/automation-rule.service.ts` (extended `AutomationRuleDatabaseClient.automationSuggestion` with `findMany` + `count` + `findUnique`), `tests/automation-suggestion.routes.test.ts` (6 new cases; total 11/11 in the file) | **done** (no schema change, no RLS change, no migration; the B-2 SELECT RLS policy `automation_suggestion_org_member_select` is the org-scope gate; 485/485 vitest cases green, typecheck clean, prisma validate clean; the role-aware filter from the plan-doc §C-2 hint is deferred — spec text implemented as-is) |
| Cockpit Phase-1 Slice 2+3 (Wareneingang + Schichtübergabe) | out of spec scope | — | `apps/cockpit/app/(app)/inventory/goods-receipt/`, `apps/cockpit/app/(app)/shift-handover/` | **done** (separate workstream, NOT the spec's Phase E) |
| **Phase B Schema (5 tables, 7 enums, 2 migrations: tables + RLS+trigger)** | ✓ | ADR-0022 accepted (2026-06-08) | `prisma/migrations/20260608160000_add_automation_phase_b_tables/`, `prisma/migrations/20260608161000_add_automation_phase_b_rls/`, `prisma/schema.prisma` | **done** (commits `32dd1c1`, `811b383`; migrations not yet applied to a Supabase env — promotion is a separate named step) |
| **Phase B Endpoints (2 read-only, B-3 + B-4) + Integration Tests (B-5, 8 cases)** | ✓ | ADR-0022 accepted | `src/modules/automation/automation-rule.service.ts`, `src/routes/automation.route.ts`, `src/app.ts`, `tests/automation.routes.test.ts` | **done** (commit `2a46e05`; 8/8 vitest cases green, typecheck clean) |
| **Phase B-6: MSPR closure + ADR-0023 (mutation surface, accepted)** | ✓ | ADR-0023 accepted (2026-06-08) | `docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md`, `docs/DECISIONS.md` | **done** (PR #49; ADR-0023 includes 2 text-bug fixes caught during the review) |
| **Phase C — Implementation of mutation surface (4 endpoints, 1 migration, 11 tests)** | ✓ | ADR-0023 accepted | `src/modules/automation/automation-suggestion.service.ts`, `src/modules/automation/automation-rule-write.service.ts`, `src/routes/automation-suggestion.route.ts`, `src/routes/automation-rule-write.route.ts`, `src/app.ts`, `prisma/migrations/20260608165159_automation_mutation_policies/migration.sql`, `tests/automation-suggestion.routes.test.ts`, `tests/automation-rule-write.routes.test.ts` | **done** (locally on disk; 479/479 vitest cases green, typecheck clean, prisma validate clean; the 2 Phase B migrations + this new mutation-policies migration are forward-only on disk; promoted to Supabase `czinchfegtglmrloxlmh` via ADR-0028 on 2026-06-08, 12/12 verification queries PASS) |
| **Phase E — Shift Handover Drafts (3 endpoints, 1 migration, 10 tests, Cockpit integration, MSPR closure)** | ✓ | ADR-0025 accepted (2026-06-09; OQ §1 verdict: discarded, OQ §5 variant (a) chosen at the boundary; §Decision and §RLS / Grant Plan corrected at acceptance to reflect the new migration ships the 2 write policies) | `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` (2 policies + 2 grants + DO $$ guard), `src/modules/shift-handover/shift-handover.types.ts` (~140 lines), `src/modules/shift-handover/shift-handover.service.ts` (~370 lines, auto-create + autosave throttle + confirm + auto-populate), `src/routes/shift-handover.route.ts` (GET + PATCH), `src/routes/shift-handover-confirm.route.ts` (POST confirm), `src/app.ts` (wiring), `tests/shift-handover.routes.test.ts` (10 cases), `apps/cockpit/lib/types/shift-handover.ts`, `apps/cockpit/lib/backend/shift-handover.ts`, `apps/cockpit/app/(app)/shift-handover/page.tsx` (rewritten Server-Component), `apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx` (rewritten, ~340 lines), `docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (E-5 closure), `docs/DECISIONS.md` (ADR-0025 inserted between ADR-0023 and ADR-0028) | **done** (locally on disk; 518/518 vitest cases green across 63 files, backend + Cockpit typecheck clean, `prisma validate` clean, `next build` clean with `/shift-handover` at 2.83 kB / 105 kB First-Load; E-2 (DTOs / Public-API) merged into E-1; the 3 mutation endpoints + the 2 write policies + the Cockpit rewrite are forward-only on disk; **promoted 2026-06-09** to Supabase `czinchfegtglmrloxlmh` (12/12 verification queries PASS; see the closure MSPR `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` and the provenance file `docs/automation/promotion-evidence/2026-06-09-adr-0025.md`) |
| Phase E — live-DB promotion prep (3 governance artifacts) | ✓ | ADR-0025 (sibling of ADR-0028 / ADR-0029-A) | `scripts/verify-adr-0025-handover-draft-policies.ts` (12-query read-only gate), `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (15-step procedure), `docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (provenance / evidence file, fully filled) | **done** (promoted 2026-06-09 to Supabase `czinchfegtglmrloxlmh`; `npx prisma migrate deploy` succeeded; 12/12 verification queries PASS via `npx tsx scripts/verify-adr-0025-handover-draft-policies.ts`; closure addendum at `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`; the 3 SHAs are recorded in the runbook §Pre-flight table, the provenance file, and the closure MSPR) |
| Phase D/E/F/G | partial | none | none | **0% done** |

## 3. Sequencing

Phases are ordered by **dependency**, not duration. A phase may begin before the previous phase is fully closed, as long as its **dependencies** are met and it does not collide with an open scope in the previous phase.

```text
Phase A (done)
   │
   ▼
Phase B ─────────────────────── ADR-0022 gates schema + 2 read endpoints
   │                                  │
   │   ┌──────────────────────────────┴────────┐
   │   ▼                                       ▼
   │  Phase C (UI Suggestions)               ADR-0023 (mutation endpoints)
   │   │                                          │
   │   │   ┌──────────────────────────────────────┘
   │   ▼   ▼
   │  Phase D (Offline Queue) ──────── ADR-0024
   │   │
   │   ▼
   │  Phase E (Shift Handover Drafts) ── ADR-0025
   │   │
   │   ▼
   │  Phase F (LLM Summaries, optional) ── gated, only if LLM budget exists
   │
   ▼
Phase G (Export/Writeback prep, no automatic writeback)
```

The mutation surface is deliberately split out of Phase B into **ADR-0023** (so a single ADR does not bundle "schema is right" with "approve/reject endpoints are right"). The same split applies to Phase D (ADR-0024) and Phase E (ADR-0025).

## 4. Per-phase plan

### Phase A — Read-Only Spec & ADR (done)

- **Status:** ✓
- **Delivered:** spec doc (PR #31), ADR-0021 (accepted), API contract draft (in spec lines 741–1123), data-model sketch (in spec lines 545–740), risk assessment (in spec lines 1584+).
- **Gate met:** ADR-0021 is the gate-output. Team (product, engineering, ops) agreed via the ADR-0021 acceptance.

### Phase B — Rules Engine MVP (No LLM)

- **Spec duration:** 4–5 weeks (per spec text)
- **Realistic for this repo:** 1–2 weeks if the team is parallel; longer if sequential. The first slice is small (schema + 2 read endpoints, per ADR-0022).
- **Hard guardrails from ADR-0021 (must hold across the entire phase):**
  - No automatic stock mutation.
  - No writeback to external systems (FoodNotify, Dynamics, DATEV, Rauschenberger).
  - No LLM-driven approval, ordering, or stock mutation.
  - No service-role credentials in user-facing request paths.
  - `AutomationDecision` is append-only, enforced at the database trigger level, not just the backend.
- **Slices (each becomes a separate Issue / PR):**
  - **B-1:** Phase B schema only (5 tables, 6 enums, 1 forward-only migration, `prisma validate` clean) — see ADR-0022 §Schema Additions.
  - **B-2:** Phase B RLS policies (5 tables organization-scoped, `AutomationDecision` append-only trigger, `OrganizationMember` row check, `app_runtime` role from ADR-0017).
  - **B-3:** `GET /automation/rules` (admin+, read-only, list for current org) + Zod request/response schemas in the Fastify route module.
  - **B-4:** `POST /automation/rules/:id/test-dry-run` (admin+, no side effects, no `AutomationSuggestion` written, no PII logged). **Open question:** the `condition` / `action` evaluation language is not pinned down in ADR-0022. Resolved before B-4 starts (see §6 Open Questions).
  - **B-5:** Phase B integration tests covering the 7 gates from ADR-0022 §Test Plan, plus a regression run of the existing inventory smoke (`npm run smoke:inventory-api`).
  - **B-6:** MSPR logbook entry `2026-06-XX-phase-b-rules-engine-mvp` after all of B-1 through B-5 are green, with scorecard and memory distillation.
- **Gate:** all 7 ADR-0022 test-plan gates green; MSPR entry written; ADR-0023 drafted (mutation surface, even if its implementation is deferred).
- **T-shirt estimate:** M (per slice, each slice is small; cumulative ~M-S).

### Phase C — UI Suggestions MVP

- **Spec duration:** 3–4 weeks
- **Depends on:** Phase B schema + ADR-0023 (mutation endpoints).
- **Slices:**
  - **C-1:** `POST /automation/suggestions/:id/approve` + `POST /automation/suggestions/:id/reject` (manager+, append-only `AutomationDecision` row created, `WorkflowTask` created on approve per ADR-0021 §3).
  - **C-2:** `GET /automation/suggestions` (list, role-aware: staff sees own; manager+ sees all in org) + `GET /automation/suggestions/:id` (detail).
  - **C-3:** Cockpit `/automation/suggestions` page: replace existing stub with real data source, list + detail layout, approve/reject UI with reason/notes.
  - **C-4:** Dashboard card "Open suggestions" count on `/dashboard`.
  - **C-5:** Bar refill page: surface a refill suggestion if the low-stock rule matched (per spec §C deliverable).
  - **C-6:** MSPR logbook entry.
- **Gate:** staff can see suggestions and approve/reject from mobile; approve triggers a `WorkflowTask`; no false positives in staging (dry-run only on production data, not live fire).
- **T-shirt estimate:** M (C-1, C-2) + L (C-3, C-4) + S (C-5).

### Phase D — Offline Queue MVP

- **Spec duration:** 4–6 weeks
- **Depends on:** Phase B schema (`OfflineActionQueue` table), ADR-0024 (sync endpoint), `app_runtime` role, IndexedDB availability in the Cockpit target browsers.
- **Slices:**
  - **D-1:** `OfflineActionQueue` schema (already proposed in ADR-0022 §Schema Additions) + RLS (row owner only).
  - **D-2:** ADR-0024 — `POST /offline-actions/sync` (idempotency-key based, conflict resolution, `app_runtime` only).
  - **D-3:** Cockpit Service Worker: intercept POST/PATCH on offline, queue locally, retry on reconnect with exponential backoff. Existing `/shift-handover` (Phase-1 localStorage) and `/inventory/goods-receipt` are first candidates.
  - **D-4:** IndexedDB caching for bar refill list and stock snapshots (per spec §Local Data Cache).
  - **D-5:** Offline UI badges (local, pending, synced, conflict) on each cached entity, per spec §Offline UI States.
  - **D-6:** Browser smoke test (Playwright with offline simulation) covering offline → online → sync without lost data.
  - **D-7:** MSPR logbook entry.
- **Gate:** staff can work offline, queue actions, sync on reconnect without conflicts; no lost data; conflict path produces a UI prompt, not silent overwrite (per spec §Sync Strategy).
- **T-shirt estimate:** L (D-1, D-2) + XL (D-3, D-4) + M (D-5, D-6).

### Phase E — Shift Handover Drafts

- **Spec duration:** 2–3 weeks
- **Depends on:** ADR-0025 (draft + confirm + LLM-summarize endpoints), optional Phase F if LLM is available.
- **Caveat:** the existing `/shift-handover` Cockpit page (PR ccf0f50) is localStorage-based and **not** the spec's Phase E deliverable. Phase E replaces the localStorage-backed page with a backend-backed draft model; the localStorage page either becomes a thin client of the new draft API, or is documented as a separate Phase-1 feature and kept.
- **Slices:**
  - **E-1:** ADR-0025 — `ShiftHandoverDraft` schema (already proposed in ADR-0022 §Schema Additions) + RLS (staff+ for own shift, manager+ for team).
  - **E-2:** `GET /shift-handover/draft` (current draft for the caller's shift) + `PATCH /shift-handover/draft` (autosave) + `POST /shift-handover/draft/:id/confirm` (manager+ only). **done** by E-1 (per MSPR-2026-06-09-phase-e-handover-drafts.md Review risks line 96); promoted to Supabase `czinchfegtglmrloxlmh` on 2026-06-09 (see closure MSPR `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`).
  - **E-3:** Cockpit integration: replace localStorage with the new endpoints, keep the existing UX (Normal/Wichtig/Kritisch priority, last 10 history, delete).
  - **E-4:** Auto-populate from open items, alerts, and recent `WorkflowEvent`s. **Open question:** the auto-populate logic is not specified in the spec beyond "open items and alerts". Pin down before E-4.
  - **E-5:** MSPR logbook entry.
- **Gate:** shift lead can draft a handover from mobile, see open items and notes, confirm, and move to the next shift; the audit trail reconstructs "this handover came from rule X firing on inputs Y at time Z" per ADR-0021 §3.
- **T-shirt estimate:** M.

### Phase F — Agentic Summaries (LLM Optional)

- **Spec duration:** 3–4 weeks
- **Depends on:** Phase E (handover drafts), LLM provider selection (Claude API assumed per spec), budget approval.
- **Gating decision:** only build if (a) the LLM budget is approved, (b) the prompt design is reviewable, (c) the audit trail meets the spec's "no PII, no secrets, sanitized inputs" rule.
- **Slices:**
  - **F-1:** `POST /shift-handover/draft/:id/synthesize` (LLM call, response cache, graceful fallback if LLM unavailable).
  - **F-2:** Prompt design + red-team suite: input sanitization, output schema validation, refusal-on-bad-input behavior.
  - **F-3:** Cost estimation + rate limiting (per org, per user, per day).
  - **F-4:** Audit logging: inputs/outputs, sanitized, no PII, no secrets.
  - **F-5:** MSPR logbook entry.
- **Gate:** shift lead taps "Generate Handover", gets a text synthesis, can edit and confirm. Feature works without LLM (graceful degradation per ADR-0021).
- **T-shirt estimate:** L.
- **Skip path:** if LLM budget is not approved, F-1 through F-5 are skipped; Phase G follows directly.

### Phase G — Export / Writeback Compatibility (No Automatic Writeback)

- **Spec duration:** 4–6 weeks
- **Depends on:** Phases B–E (need real data to export), ADR-0026 (export format spec for FoodNotify, Dynamics, DATEV).
- **Hard guardrail:** no automatic writeback. All exports are manual, reviewed, logged. The Phase G deliverable is a dry-run export builder, not a write path.
- **Slices:**
  - **G-1:** ADR-0026 — export format spec (CSV/JSON, schema for movements, anomalies, handover confirmations, suggestion decisions).
  - **G-2:** `GET /export/movements` + `GET /export/summary` (admin+, dry-run, returns the payload without writing anywhere).
  - **G-3:** Cockpit payload review UI: preview the export, confirm, then download as a file. Email export (SMTP) optional.
  - **G-4:** Audit logging: who exported what, when, with what filter.
  - **G-5:** MSPR logbook entry.
- **Gate:** Bevero can export movement summary and anomaly report, manually, with review. No automatic mutations to external systems. Future writeback (FoodNotify API) is a separate ADR-gated phase.
- **T-shirt estimate:** L.

## 5. Cross-references

- **Spec:** `docs/automation/semi-automated-operations-layer.md` (binding)
- **ADRs:**
  - ADR-0015 — role order (owner > admin > manager > staff > viewer) — applies to all role-based authorization in this plan
  - ADR-0017 — `app_runtime` role, RLS pattern — applies to every Phase B+ route
  - ADR-0018 / ADR-0019 — multi-schema Prisma (`public`, `auth`) — applied to all new tables
  - ADR-0020 — Swarm Runtime Surface — every Phase B+ implementation that mutates `WorkflowTask` or `InventoryMovement` should be wrapped in a `SwarmTaskEnvelope` for governance
  - ADR-0021 — Phase A spec adoption (binding)
  - ADR-0022 — Phase B schema + 2 read endpoints (proposed, next gate)
  - ADR-0023 — Phase B mutation surface (not yet drafted, blocker for Phase C)
  - ADR-0024 — Phase D sync endpoint (not yet drafted)
  - ADR-0025 — Phase E handover endpoints (not yet drafted)
  - ADR-0026 — Phase G export format (not yet drafted)
- **Runtime:** `docs/agent-team/runtime-design.md`, `src/agent-team/` (MiniMax-3 swarm, the governed execution surface)
- **MSPR logbook:** `docs/agent-team/mspr_logbook/` (one entry per slice)
- **Cockpit:**
  - `apps/cockpit/app/(app)/automation/suggestions/page.tsx` — Phase C stub (placeholder; replaced in C-3)
  - `apps/cockpit/app/(app)/inventory/goods-receipt/` — Phase-1 Wareneingang UI (separate workstream; not the spec's offline-queue)
  - `apps/cockpit/app/(app)/shift-handover/` — Phase-1 shift handover UI (localStorage; replaced or wrapped in Phase E)
- **AGENTS.md:** workspace authority, evidence language (`Observed` / `Inferred` / `Recommended` / `Applied` / `Verified` / `BLOCKED`)

## 6. Open questions (need a human owner before the next gate)

1. **`condition` / `action` evaluation language (Phase B-4)** — the dry-run endpoint must evaluate a rule's `condition` JSON against the current `InventoryStockSnapshot`. The language is not pinned in ADR-0022. Options: (a) SQL predicate with a whitelist of allowed operations, (b) JSONLogic blob, (c) a small custom AST. **Recommendation:** option (a), because it composes with the existing Prisma queries and keeps the rule engine testable without an LLM. **Needs an owner decision before B-4 starts.**

2. **Actor columns as `String?` vs relations (Phase B-1)** — ADR-0022 proposes nullable `String?` for `createdBy` / `approvedBy` / `rejectedBy`, with a follow-up slice to promote them to relations. **Recommendation:** keep `String?` for the Phase B slice, schedule the promotion as Phase C-7 (a small refactor). **Needs an owner decision before B-1 starts.**

3. **`GET /automation/rules` authorization (Phase B-3)** — ADR-0022 §Test Plan says staff / manager get 403. The spec is silent on whether managers should be able to view rules. **Recommendation:** admin+ only for now (rule editing is admin+ in the spec's Roles & Permissions matrix). If managers need read access, add a `GET /automation/rules?scope=team` in Phase C. **Needs an owner decision before B-3 starts.**

4. **Phase E auto-populate logic (Phase E-4)** — "open items and alerts" is vague. **Recommendation:** auto-populate = `WorkflowTask where assignee = caller and status = 'open'` + `AutomationSuggestion where status = 'open' and (assignee = caller or caller is manager+)`. **Needs an owner decision before E-4 starts.**

5. **Cockpit `/shift-handover` migration path (Phase E-3)** — the Phase-1 localStorage page is a separate workstream, not the spec. **Options:** (a) keep the localStorage page as a separate feature, build Phase E alongside it; (b) replace the localStorage page with the new draft API. **Recommendation:** option (a) for now, decide in E-3 based on user feedback. **Needs an owner decision before E-3 starts.**

## 7. Risk register

1. **Rules fire too often (false positives).** Mitigation: Phase B ships dry-run only. Phase C requires no-false-positives-in-staging gate before suggesting-rule-fire is enabled. Rules can be disabled per-org with a feature flag.
2. **Service Worker scope creep (Phase D).** Mitigation: D-3 starts with intercepting only the routes we already know (goods-receipt POST, shift-handover PATCH). The Service Worker registration is opt-in per org.
3. **LLM cost overrun (Phase F).** Mitigation: per-org rate limit, per-user rate limit, response cache. Skip F entirely if budget not approved.
4. **External system writeback (Phase G and beyond).** Mitigation: explicit ADR-0026 gates the export format, no automatic writeback. A future FoodNotify API integration requires its own ADR and human approval per write per ADR-0021 §3.
5. **Schema drift between Prisma and `app_runtime` RLS policies.** Mitigation: every migration that adds a table also adds an RLS test in the integration test suite, run on a Supabase snapshot, not just locally.

## 8. What this plan is not

- **Not an implementation.** No code, no migration, no endpoint. Slices land via their own ADR-gated commits.
- **Not a contract.** Slices may shift in scope as the corresponding ADRs are drafted. The plan is a starting point, not a binding schedule.
- **Not a commitment.** The owner-class and T-shirt estimates are best guesses from the spec text; actual effort depends on team capacity, parallel work, and the answers to §6.

## 9. Next gate

The next gate is the **ADR-0022 acceptance**, gated by the four open questions in §6 being answered (or explicitly deferred to the corresponding slice's ADR). Once those are settled, the Phase B slices can be picked up in order: B-1 (schema), B-2 (RLS), B-3 (list endpoint), B-4 (dry-run endpoint, with the evaluation language fixed), B-5 (integration tests), B-6 (MSPR entry).
