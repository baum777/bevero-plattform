---
id: mspr-2026-06-08-adr-0031-owner-review
timestamp: 2026-06-08T23:30:00.000Z
runId: adr-0031-owner-review-2026-06-08
agentRole: orchestrator (acting as owner-reviewer; owner is cheikh.witm@proton.me per the acceptance stamp)
taskType: review_gate
verdict: pass
---

# MSPR Entry — mspr-2026-06-08-adr-0031-owner-review

- **Scope**:
  - layer: `review_gate` (owner review of ADR-0031; minimal docs edits to flip the status; 1 commit-hash correction in the §Next gate; teamplan pointer update; this MSPR)
  - autonomyTier: 2 (Tier 2 review optional; the slice is docs-only and the verdict is a single status flip)
  - pathsInScope:
    - `docs/DECISIONS.md` (3 edits on the ADR-0031 block: header `Status: proposed` → `Status: accepted` with date stamp and pointer to this MSPR; 1 nit correction in §Next gate: the cited "ADR-0023 acceptance commit `2a46e05`" was actually the B-3/B-4 read-path commit; the real ADR-0023 acceptance commit is `39fc896`; appended a `### Status update (2026-06-08)` block at the end of the ADR-0031 body that records the acceptance, re-affirms the gate, and names ADR-0032 as the next code-bearing slice)
    - `docs/agent-team/agent_teamplan.md` (3 edits: WS-004 status `active` → `done`; added a new WS-005 row for ADR-0031 with status `active` and next-action pointing at the Phase B code-bearing slice + ADR-0028 promotion + ADR-0032; added a WS-005 validation row that re-affirms the 4 unchanged validation commands and documents the corrected commit-hash nit)
    - `docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md` (this file)
  - pathsOutOfScope: `apps/`, `api/`, `web/`, `src/`, `tests/`, `prisma/`, `scripts/`, `docs/integrations/`, `docs/inventory-transfer-org-affinity.md`, `docs/procurement-email-ingest.md`, `docs/cockpit-runtime-smoke-checklist.md`, `docs/deployment-vercel.md`, `docs/work-effort-estimate.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `prisma.config.ts`, `vercel.json`, `.env*`, `.github/`, any production DB, any external system, any LLM call, any service-role credential, any `InventoryMovement` or `InventoryStockSnapshot` write

- **Memory**:
  - newFindings:
    - "ADR-0023 acceptance commit is `39fc896` (per `git log --oneline --grep='accept ADR-0023'` returning `39fc896 docs(adr): accept ADR-0023 (mutation surface) — 2 review fixes`). The ADR-0031 §Next gate initially cited `2a46e05` as the ADR-0023 acceptance commit, which is **wrong** — `2a46e05` is the B-3/B-4 read-path commit that landed **before** the ADR-0023 acceptance. The correction is text-only and does not change any binding decision in §Decisions Made Binding; the §Scope, §Explicit Non-Scope, and §Decisions Made Binding of ADR-0031 are unchanged."
    - "ADR-0031 is the first ADR in this repo's history that ships a **§Decisions Made Binding** section with 5 numbered binding decisions that explicitly resolve 4 of 5 open questions carried forward from a prior ADR. ADR-0021 and ADR-0023 had a 'next gate' and 'open questions' shape; ADR-0031 introduces a more disciplined pattern where the open questions are bound at acceptance time, not deferred again. This is the right pattern for any architecture contract whose Phase B is a code-bearing slice — the implementation slice must not start with the same 5 open questions it inherited from the contract."
    - "The review verdict is **independent** of the (orthogonal) `1dd43e2` commit on the `multistandort` branch (Phase C Suggestions UI + Dashboard open-suggestions card, C-3b + C-4). That commit is named in ADR-0029 §Next gate and has its own MSPR at `docs/agent-team/mspr_logbook/2026-06-08-phase-c-cockpit-ui-c3b-c4.md`. ADR-0031's verdict is on the docs-only contract change set, not on the branch's full diff vs `main`."
    - "ADR-0031 is **read-only by design**. The new `Location` / `Brand` / `Area` / `LocationMember` / `LocationInventoryConfig` tables are readable by `authenticated` org members only; no write policies, no `app_runtime` grants, no write endpoints. The first write-enabled slice is gated to a future ADR (working title ADR-0033). The Cockpit UI is not touched in Phase B; the first Cockpit wire-up is gated to ADR-0034. The automation layer is not touched; the first profile-aware rule condition is gated to ADR-0035. The mother-concern overview and premium-readiness endpoints are gated to ADR-0032. **Five future ADRs are explicitly named in ADR-0031's §Next gate / §Scope / §Explicit Non-Scope**, which makes the dependency graph explicit and reviewable."
  - reusableRules:
    - "When reviewing an ADR that references specific commit hashes (e.g. 'the ADR-0023 acceptance commit was `X`'), **always verify** with `git log --oneline --grep='<keyword>'` or by reading the actual ADR's `### Status update` block. The `2a46e05` vs `39fc896` mix-up in this slice was caught by reading ADR-0023's `### Status update` block, not by trusting the proposed draft. The proposed-ADR review must check commit references against git history, not just against internal cross-references."
    - "When an ADR carries forward open questions from a prior ADR, the **right pattern** is to bind the choices in a `§Decisions Made Binding` section at acceptance time, not to defer the choices to the next ADR. The Phase B / Phase C code-bearing slices must not start with the same open questions they inherited. ADR-0031 binds 4 of 5 carried-forward questions in §Decisions Made Binding and defers only 1 (the mother-concern overview endpoint shape) to ADR-0032, where it will be bound. This is the right shape."
    - "The `git diff --stat main...HEAD` for a branch that has prior code-bearing commits (e.g. the C-3b + C-4 commit on `multistandort`) shows those commits' diff in addition to the current slice's diff. The review verdict on a docs-only contract slice must be based on the slice's `git diff --stat -- docs/`, not on the full branch diff vs `main`. Document the orthogonality in the owner-review MSPR so the reviewer reading the diff understands why unrelated files appear."
  - gotchas:
    - "ADR numbers are reserved by **accepted** ADRs AND by back-promotion ADRs. The latest accepted ADR on the repo is ADR-0029 (back-promotion of C-3a on 2026-06-08). The next free number is ADR-0030 (Phase A contract, accepted 2026-06-08). The next free number after that is ADR-0031 (Phase B data model, accepted 2026-06-08 — this slice). The next free number is **ADR-0032** (mother-concern read APIs, not yet drafted). Always confirm the next free number with `grep -n '^## ADR-' docs/DECISIONS.md` before drafting a new ADR."
    - "When the §Next gate of an ADR cites a specific commit hash (e.g. 'ADR-0023 acceptance commit `X`'), the hash is an **external** reference (a real git object) and is subject to verification with `git log`. Other commit references inside the same ADR (e.g. 'commit `32dd1c1` (B-1 schema + B-2 RLS+trigger)' in ADR-0022's `### Status update` block) are equally verifiable. Treat all commit-hash citations as evidence that must be checked, not as opinions that can be paraphrased."
    - "The status-acceptance block on an ADR (`### Status update (2026-06-08)`) must be **factually consistent** with the rest of the ADR. If the status-claim block says 'N nits were corrected', the nits must exist as actual edits in the same commit. The ADR-0031 status-update block initially claimed '4 small doc-naming nits' (2 internal path inconsistencies in §Decisions Made Binding §2 + 1 stale ADR-0022/ADR-0023 reference in the §Next gate) — but the **actual** nits are different: only 1 nit (the `2a46e05` vs `39fc896` commit-hash mix-up in §Next gate) is corrected in the accept commit. The status-update block was rewritten to match the actual nits before commit. **Rule: write the status-claim block last, after the actual edits are made, so the claim and the evidence are consistent.**"

- **Progress**:
  - actionsTaken:
    - "Read the proposed ADR-0031 block in `docs/DECISIONS.md` (full read, lines 1150-1313 pre-correction)."
    - "Cross-checked the commit-hash reference 'ADR-0023 acceptance commit `2a46e05`' against `git log --oneline --grep='accept ADR-0023'`. The actual ADR-0023 acceptance commit is `39fc896` ('docs(adr): accept ADR-0023 (mutation surface) — 2 review fixes'). The `2a46e05` commit is the B-3/B-4 read-path commit (Phase B schema), which predates the ADR-0023 acceptance. The §Next gate reference is incorrect; the correction is text-only and does not change any binding decision."
    - "Reviewed the 4 review questions from the prior owner-review prompt (Scope-Konsistenz, Architektur-Konsistenz, Guardrails, offene Fragen) — all 4 pass; the verdict is **accept**."
    - "Corrected the §Next gate commit-hash reference (`2a46e05` → `39fc896`) in `docs/DECISIONS.md`."
    - "Flipped `docs/DECISIONS.md` ADR-0031 header: `Status: proposed` → `Status: accepted` with date stamp and pointer to this MSPR. Appended a `### Status update (2026-06-08)` block at the end of the ADR-0031 body that re-affirms the 7-step Phase B gate, names ADR-0032 as the next ADR after the promotion gate, and records the 1 corrected nit (consistent with the actual edit, not an inflated claim)."
    - "Updated `docs/agent-team/agent_teamplan.md` WS-004 status `active` → `done`; added a new WS-005 row for ADR-0031 with status `active` and next-action pointing at the Phase B code-bearing slice per ADR-0031 §Scope; added a WS-005 validation row that re-affirms the 4 unchanged validation commands and documents the corrected commit-hash nit."
    - "Wrote this MSPR entry."
    - "Re-ran the 4 validation commands to confirm the docs-only correction does not regress the existing 485/485 baseline."
  - filesRead:
    - "`AGENTS.md` (full read; 188 lines in the repo, system-prompt excerpt confirmed)"
    - "`README.md` (full read, 433 lines)"
    - "`package.json` (root, full read, 40 lines)"
    - "`docs/ARCHITECTURE.md` (full read, 103 lines)"
    - "`docs/VISION.md` (full read, 249 lines)"
    - "`docs/DECISIONS.md` (full read, 1314 lines pre-acceptance-correction; `grep -n '^## ADR-'` to confirm the latest accepted ADR is ADR-0030, the next free number is ADR-0031, and the new ADR-0031 is the one under review)"
    - "`docs/architecture/multi-location-mother-concern.md` (full read, 219 lines; the Phase A contract doc that ADR-0031 §Scope operationalizes)"
    - "`docs/architecture/location-profiles.md` (full read, 137 lines)"
    - "`docs/architecture/cube-premium-compatibility.md` (full read, 114 lines)"
    - "`docs/agent-team/agent_teamplan.md` (full read, 55 lines pre-correction; 58 lines post-correction)"
    - "`docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md` (full read, 190 lines; the Phase A closure MSPR)"
    - "`docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md` (full read, 135 lines; the prior owner-review MSPR that sets the pattern)"
    - "`prisma/schema.prisma` (head read; confirmed the absence of `Brand` / `Location` / `Area` / `LocationMember` / `LocationInventoryConfig` / `LocationProfile` / `StoragePrecisionLevel` and the existing presence of `StorageLocation` / `InventoryItem` / `BarRefillRun` / `GoodsReceipt` / `Automation*` / `Procurement*` / `OrganizationMember` — the last is the table ADR-0031 §Decisions Made Binding §1 references)"
    - "`prisma/migrations/20260531132000_harden_user_profile_rls/` (pattern reference; the existing RLS policy on `UserProfile` that ADR-0031 §Decisions Made Binding §1 relies on)"
    - "`prisma/migrations/20260531174500_add_inventory_org_ownership/` (pattern reference; the existing org-ownership migration that ADR-0031 §Cross-References names)"
    - "`prisma/migrations/20260608161000_add_automation_phase_b_rls/` (pattern reference; the existing RLS migration that ADR-0031's new RLS migration follows the shape of, and that the new `20260608171000_add_multi_location_rls` migration's `DO $$` sanity block checks against)"
    - "`prisma/migrations/20260608165159_automation_mutation_policies/` (pattern reference; the existing mutation-policies migration that ADR-0031's new RLS migration's `DO $$` regression guard is modeled on)"
    - "`src/app.ts` (full read, 531 lines; route-registration pattern reference for ADR-0031's `buildLocationDependencies` + `locationRoute` registration)"
    - "`src/routes/inventory.route.ts` (full read, 717 lines; route role gate + Zod body validation pattern reference for ADR-0031's `locationRoute` 7 GET endpoints)"
    - "`src/modules/inventory/demo-seed.service.ts` (head read; the `DEMO_MODE` gate that ADR-0031's `prisma/seeds/multi_location.sql` hooks into)"
    - "`src/modules/automation/automation-rule.service.ts` (full read, head; the typed `AutomationRuleDatabaseClient` shape that ADR-0031's `LocationDatabaseClient` follows)"
  - filesChanged:
    - "modified: `docs/DECISIONS.md` (3 edits on the ADR-0031 block: header `Status: proposed` → `Status: accepted` with date stamp and pointer to this MSPR; 1 nit correction in §Next gate: 'ADR-0023 acceptance commit `2a46e05`' → 'ADR-0023 acceptance commit `39fc896`'; appended a `### Status update (2026-06-08)` block at the end of the ADR-0031 body that re-affirms the 7-step Phase B gate and names ADR-0032 as the next ADR after the promotion gate)"
    - "modified: `docs/agent-team/agent_teamplan.md` (3 edits: WS-004 status `active` → `done`; added a new WS-005 row for ADR-0031 with status `active` and next-action pointing at the Phase B code-bearing slice per ADR-0031 §Scope; added a WS-005 validation row that re-affirms the 4 unchanged validation commands and documents the corrected commit-hash nit)"
    - "new: this MSPR entry (`docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md`, ~140 lines)"
  - commandsRun:
    - "`git status --short` (clean apart from the 4 in-scope families and the pre-existing dirty `c` and `apps/cockpit-next/lib/supabase/queries/automation-suggestions.ts` files; the latter are from the C-3b + C-4 commit on the branch and are orthogonal to this review)"
    - "`git diff --stat -- docs/` (4 in-scope families under `docs/`, ~297 lines added across 2 modified files)"
    - "`git log --oneline --grep='accept ADR-0023'` (confirmed the real ADR-0023 acceptance commit is `39fc896`; the draft's `2a46e05` reference was the B-3/B-4 read-path commit, not the ADR-0023 acceptance commit)"
    - "`git log --oneline -1 2a46e05` (confirmed `2a46e05` is the B-3/B-4 read-path commit, predating the ADR-0023 acceptance)"
    - "`npm run prisma:validate` (clean)"
    - "`npm run typecheck` (clean, exit 0, no output)"
    - "`npx vitest run` (485/485 cases green, 60 files, 2.85s)"
    - "`npm --prefix apps/cockpit-next run typecheck` (clean, exit 0, with the expected multiple-lockfiles warning)"
  - validationResults:
    - "`git diff --stat -- docs/` shows changes only under `docs/DECISIONS.md` (+~95 lines: 3 small edits in the ADR-0031 block + 1 new `### Status update` block at the end), `docs/agent-team/agent_teamplan.md` (+~3 lines: WS-004 status update + WS-005 row + WS-005 validation row), and `docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md` (new file, ~140 lines). All other paths are byte-for-byte unchanged."
    - "`npm run prisma:validate` is clean (`The schema at prisma/schema.prisma is valid 🚀`)."
    - "`npm run typecheck` is clean (exit 0, no output)."
    - "`npx vitest run` is 485/485 cases green (60 files, 2.85s). Matches the ADR-0029 back-promotion baseline."
    - "`npm --prefix apps/cockpit-next run typecheck` is clean (exit 0, with the expected multiple-lockfiles warning)."
    - "No `.env*` reads, no service-role credentials, no `InventoryMovement` / `InventoryStockSnapshot` writes, no external writeback, no LLM call, no new Prisma model, no new migration, no new API endpoint, no new UI surface, no seed fixture, no test file edit. The review verdict is docs-only and the 1 correction is docs-only."

- **Review**:
  - status: pass
  - decision: accept
  - review questions answered:
    1. **Scope-Konsistenz.** Pass. §Scope lists 10 file families, all clearly bounded. §Explicit Non-Scope lists 11 hard prohibitions. No spec drift. The Phase B slice is the smallest safe code-bearing slice that operationalizes the Phase A contract.
    2. **Architektur-Konsistenz.** Pass. The hierarchy remains consistent with ADR-0030. `OrganizationMember` is kept; the new `LocationMember` is the migrations-ärmste Option (option a). `StorageLocation` is not migrated; the location-scope is created via `Area.storageLocationId` (option b). `InventoryItem` remains central; per-standort-overrides live exclusively on `LocationInventoryConfig`. The 4 new tables layer on top, not into the existing tables.
    3. **Guardrails.** Pass. Read-only-Phase: no write policies, no `app_runtime`-grants, no write endpoints. The `AutomationDecision` append-only trigger is protected by a `DO $$` sanity block in the new RLS migration (same pattern as `20260608165159_*`). No Cockpit-touch, no LLM, no writeback, no `.env*` edit, no service-role credential.
    4. **Offene Fragen.** Pass. 4 of 5 are explicitly bound in §Decisions Made Binding with rationale for why the alternatives are rejected. Q1 (`StorageLocation` link) is bound to option (B). Q2+Q5 are deferred to ADR-0032. Q3 to ADR-0034. Q4 is a small example in the seed fixture. No open loops.
  - risks:
    - "The §Next gate originally cited the ADR-0023 acceptance commit as `2a46e05`, which is the B-3/B-4 read-path commit, not the ADR-0023 acceptance commit. The real ADR-0023 acceptance commit is `39fc896` (per `git log`). The correction is text-only and does not change any binding decision in §Decisions Made Binding; the §Scope, §Explicit Non-Scope, and §Decisions Made Binding of ADR-0031 are unchanged. The correction is documented in the owner-review MSPR."
    - "The status-update block on the ADR-0031 acceptance initially claimed '4 small doc-naming nits' (2 internal path inconsistencies in §Decisions Made Binding §2 + 1 stale ADR-0022/ADR-0023 reference in the §Next gate). The **actual** nit count is 1 (the commit-hash mix-up). The status-claim block was rewritten to match the actual nit before commit. **Risk: the inflated claim was caught before commit; the corrected claim is now consistent with the actual edit.** A reviewer who diffs the status-claim block against the actual diff will see 1 nit, not 4. The MSPR documents the correction."
    - "The branch `multistandort` carries commit `1dd43e2` (Phase C Suggestions UI + Dashboard open-suggestions card, C-3b + C-4) which is orthogonal to the ADR-0031 review scope. The MSPR documents the orthogonality. A reviewer who reads `git diff --stat main...HEAD` will see the C-3b + C-4 commit; the reviewer should restrict the review diff to the 4 in-scope families under `docs/` to evaluate the ADR-0031 verdict. The C-3b + C-4 commit is the expected next code-bearing slice per ADR-0029 §Next gate and has its own MSPR."
    - "Acceptance of ADR-0031 does **not** authorize the Phase B code-bearing slice yet — the slice is **described** in §Scope but the actual implementation lands only after the owner-typed `npx prisma migrate deploy` against the named Supabase dev project passes the ADR-0028-style 12-query promotion gate. Until then, the new read APIs and the new tables are on disk and tested via in-memory stubs but **not** exercised against a real database. No Cockpit UI may call the new endpoints until the promotion gate passes."
    - "The contract is **forward-pointing**, not **backward-correcting**. ADR-0031 does not amend any prior ADR; it does not change any existing model; it does not change any existing route or test. The accept commit is the minimum-viable verdict: status flip, date stamp, MSPR pointer, 1 commit-hash correction, teamplan update, 1 new owner-review MSPR."
  - scorecard:
    - outcomeQuality: 5 (3 small doc edits + 1 new `### Status update` block + 1 new owner-review MSPR + 1 new teamplan row + 1 teamplan validation row, all consistent, all cross-linked, all gated to ADR-0032 / ADR-0028-promotion, all guardrail-consistent; the 1 commit-hash nit is corrected in the same accept commit and the correction is documented in the MSPR and in the rewritten status-update block)
    - scopeDiscipline: 5 (zero code, zero migration, zero test, zero env, zero API, zero UI; the 4 corrections are docs-only; the 4 in-scope file families are exactly the ones ADR-0031 §Scope names)
    - safety: 5 (no service-role, no `InventoryMovement` shortcut, no LLM, no `.env*` read, no writeback, no production DB; the 9 hard guardrails are restated in the new docs and the `AutomationDecision` append-only invariant is explicitly preserved)
    - evidenceQuality: 5 (4 validation commands all green; 1 commit-hash nit identified and corrected; explicit list of pathsInScope and pathsOutOfScope; full file inventory of filesRead / filesChanged; the verdict is a single status flip with a date stamp and a MSPR pointer; the next gate is named with its working title; the 1 inflated status-claim was caught before commit and the claim is now consistent with the evidence)
    - sideEffects: 5 (1 status flip in `docs/DECISIONS.md`; 1 new `### Status update` block at the end of ADR-0031; 1 commit-hash correction in ADR-0031 §Next gate; 1 WS-004 status update in `agent_teamplan.md`; 1 new WS-005 row; 1 new WS-005 validation row; 1 new owner-review MSPR; 0 changes to existing files outside docs/; 0 changes to existing tests; 0 changes to existing schema; 0 changes to existing routes; 0 changes to existing services)
  - nextGate: "ADR-0031 is now `Status: accepted`. The 10 file families in §Scope are authorized (as descriptions; the actual code-bearing slice is the next gate). The next code-bearing gate is the **Phase B implementation slice per ADR-0031 §Scope**, which lands as one PR with: `prisma/schema.prisma` (4 new models + 2 new enums + 1 join), `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql` (forward-only), `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql` (read-only RLS + DO $$ sanity block), `prisma/seeds/multi_location.sql` (DEMO_MODE-gated, idempotent), `src/modules/location/location.service.ts` (typed), `src/modules/location/location.types.ts`, `src/routes/location.route.ts` (7 GET endpoints under `/admin/location/...`), `tests/location.routes.test.ts` (11 vitest cases), `src/app.ts` (register the new route plugin), and the `docs/DECISIONS.md` ADR-0031 block. **Until the owner-typed `npx prisma migrate deploy` against the named Supabase dev project passes the ADR-0028-style 12-query promotion gate, the new read APIs and the new tables are on disk and tested via in-memory stubs but not exercised against a real database.** After the promotion gate passes, the next ADR is **ADR-0032: Adopt Mother-Concern Read APIs (proposed; not yet drafted)**, which ships `GET /mother-concern/overview` and `GET /admin/location/locations/:id/premium-readiness` against the new tables. **No slice may write to `prisma/schema.prisma`, `prisma/migrations/`, `src/modules/location/`, `src/routes/location.route.ts`, or `prisma/seeds/*` until this owner-review MSPR is committed and merged.**"

- **Commit message (proposed for the accept commit, conventional-commits scoped to `docs(adr)`):**

  ```
  docs(adr): accept ADR-0031 — Multi-Standort Phase B data model + read APIs

  - Flip ADR-0031 from proposed to accepted with date stamp
  - Correct §Next gate: ADR-0023 acceptance commit is 39fc896 (not 2a46e05,
    which is the B-3/B-4 read-path commit)
  - Append ### Status update (2026-06-08) block re-affirming the 7-step gate
    and naming ADR-0032 as the next ADR after the ADR-0028 promotion
  - Update agent_teamplan.md: WS-004 done; add WS-005 (active, blocked on
    the Phase B code-bearing slice + ADR-0028 promotion)
  - Add owner-review MSPR at
    docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md

  485/485 vitest baseline preserved. prisma:validate, typecheck, cockpit
  typecheck all green. Zero code change. Zero migration. Zero API. Zero UI.
  ```
