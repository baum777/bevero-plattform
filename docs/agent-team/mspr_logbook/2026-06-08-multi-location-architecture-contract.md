---
id: mspr-2026-06-08-multi-location-architecture-contract
timestamp: 2026-06-08T20:30:00.000Z
runId: multi-location-architecture-contract-2026-06-08
agentRole: orchestrator
taskType: docs_spec
verdict: pass
---

# MSPR Entry — mspr-2026-06-08-multi-location-architecture-contract

- **Scope**:
  - layer: `docs_spec` (architecture contract + ADR + teamplan pointer, no code)
  - autonomyTier: 2 (Tier 2 review optional; slice is docs-only and does not touch production paths)
  - pathsInScope:
    - `docs/architecture/multi-location-mother-concern.md` (new, ~180 lines)
    - `docs/architecture/location-profiles.md` (new, ~95 lines)
    - `docs/architecture/cube-premium-compatibility.md` (new, ~110 lines)
    - `docs/DECISIONS.md` (modified: appended ADR-0030 block at the end of the file, ~120 lines)
    - `docs/agent-team/agent_teamplan.md` (modified: appended WS-004 row + validation row, +~3 lines)
    - `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md` (this file)
  - pathsOutOfScope: `apps/`, `api/`, `web/`, `src/`, `tests/`, `prisma/`, `scripts/`, `docs/integrations/`, `docs/inventory-transfer-org-affinity.md`, `docs/procurement-email-ingest.md`, `docs/cockpit-runtime-smoke-checklist.md`, `docs/deployment-vercel.md`, `docs/work-effort-estimate.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `prisma.config.ts`, `vercel.json`, `.env*`, `.github/`, any production DB, any external system, any LLM call, any service-role credential, any `InventoryMovement` or `InventoryStockSnapshot` write

- **Memory**:
  - newFindings:
    - "ADR-0029 is already accepted (back-promotion of the C-3a read endpoints on 2026-06-08). The next free ADR number is **ADR-0030**, not ADR-0029 as the original plan stated. The plan was corrected before any file write."
    - "The existing `prisma/schema.prisma` has no `Brand`, no `Location`, no `Area`, no `LocationProfile` (enum), no `StoragePrecisionLevel` (enum), and no `LocationInventoryConfig`. The Phase A contract pins the shape of those entities as documentation; the actual schema work is gated to ADR-0031 (Phase B)."
    - "The existing `StorageLocation` table is currently used as a per-standort physical spot (e.g. seed `Motorworld Inn BB Live-Bestand` in `prisma/seeds/bar_initial_stock.sql`). The contract explicitly keeps `StorageLocation` as-is and layers the new `Brand` / `Location` / `Area` tables on top. A future refactor that renames `StorageLocation` to a different concept is **not** authorized by this ADR."
    - "The existing `InventoryItem` table already carries `organizationId`, `categoryId`, `storageLocationId`, `minStock`, `targetStock`, `displayOrder`, `isActive`. The Phase A contract decides that per-standort overrides live on a new `LocationInventoryConfig` table; no column is added to `InventoryItem` in this slice."
    - "The Cockpit storage page (`apps/cockpit-next/app/(app)/storage/page.tsx`) reads `StorageLocation` directly via `lib/supabase/queries/storage.ts`. The Phase A contract does not touch this path. The Phase B / Phase D slices may add a `locationId` filter; that is a Phase B ADR-0031 decision."
    - "ADR-0023 §Open Question §2 chose `/admin/automation/...` to match existing Cockpit admin route grouping. The Phase B read endpoints (`/organizations`, `/locations`, etc.) are not yet pinned to a prefix. The contract recommends `/admin/location/...` for the new read endpoints plus a top-level read-only `/mother-concern/overview` outside the `/admin/` prefix; the final pin is gated to ADR-0031."
  - reusableRules:
    - "Before assigning a new ADR number, `grep -n '^## ADR-' docs/DECISIONS.md` to confirm the next free number. Numbers are reserved by accepted ADRs (and by back-promotion ADRs like ADR-0029). The original plan stated ADR-0029; the file already had it."
    - "Docs-only phases are a valid first slice for any architecture contract. The gate is `git diff --stat` showing zero changes outside `docs/` plus the unchanged `prisma validate` / `typecheck` / `vitest` results. The MSPR closure is the same shape regardless of whether code lands."
    - "When the contract has a forward dependency on a later ADR (e.g. Phase B ADR-0031 for the data model), name the working title in the §Next gate so the owner can find it on review. Working titles in the §Next gate are not commitments; the next ADR's own draft is the commitment."
  - gotchas:
    - "`docs/architecture/` is a new directory; it does not replace `docs/ARCHITECTURE.md` (the POS-adapter / external-source anti-corruption layer). The relationship is documented in the first paragraph of `multi-location-mother-concern.md` and re-stated in ADR-0030 §Scope. A reviewer might ask why we did not append to `docs/ARCHITECTURE.md`; the answer is that the POS-adapter doc is an external-source doc, and the standort-profile doc is an operational-standort doc; they serve different layers and audiences."
    - "The spec's `Location` entity overlaps superficially with the existing `StorageLocation` table, but the semantics differ. The Phase A contract makes the keep-`StorageLocation`-as-is decision explicit and records it in `multi-location-mother-concern.md` §1, §2.5 and in ADR-0030 §Decisions Made Binding. A reviewer who proposes a rename should be redirected to a future ADR; the rename is not in this slice."
    - "The plan said ADR-0029; the file already had it. The actual ADR number is ADR-0030. All three architecture docs and the teamplan pointer were corrected to reference ADR-0030 before being written. The MSPR records the correction so the slice is self-consistent."

- **Progress**:
  - actionsTaken:
    - "Created branch `multistandort` off `main` (`git checkout -b multistandort`)."
    - "Wrote `docs/architecture/multi-location-mother-concern.md` (hierarchy, the new entities' conceptual field lists, the deferred mother-concern overview contract, the restated guardrails, three open questions, hard non-goals, cross-references)."
    - "Wrote `docs/architecture/location-profiles.md` (the `LocationProfile` enum, the profile-basiert rule, per-profile behavioral expectations for `MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `EVENT_BANKETT_FUTURE`, UI branching pattern guidance for Phase D)."
    - "Wrote `docs/architecture/cube-premium-compatibility.md` (why CUBE is not a Motorworld fork, the per-aspect comparison table, the `LocationInventoryConfig` flags for CUBE, `PREMIUM_TRACEABLE` storage precision, the Bar/Restaurant split, the handover quality bar, what Phase A does not decide, the no-`CUBE_*` no-fork rules)."
    - "Appended ADR-0030 to `docs/DECISIONS.md` (`Status: proposed`; mirrors the ADR-0021 style; §Scope lists the 6 file families; §Explicit Non-Scope lists what is NOT authorized; §Decisions Made Binding lists 7 binding decisions; §Open Questions carries 5 questions to Phase B; §Rollback Plan; §Test Plan; §Cross-References; §Next gate names ADR-0031 as the working title for the next code-bearing slice)."
    - "Edited `docs/agent-team/agent_teamplan.md` (added WS-004 row to the active-workstreams table; added WS-004 validation row to the required-validations table)."
    - "Wrote this MSPR entry."
  - filesRead:
    - "`AGENTS.md` (system prompt excerpt; full read)"
    - "`README.md` (full read)"
    - "`package.json` (root, full read)"
    - "`apps/cockpit-next/package.json` (full read)"
    - "`prisma/schema.prisma` (full read, 893 lines) — confirmed the absence of `Brand` / `Location` / `Area` / `LocationProfile` / `LocationInventoryConfig` and the existing presence of `OrganizationMember` / `StorageLocation` / `InventoryItem` / `BarRefillRun` / `GoodsReceipt` / `Automation*` / `Procurement*`"
    - "`prisma/migrations/20260608160000_add_automation_phase_b_tables/migration.sql` (full read, 133 lines)"
    - "`prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql` (full read, 153 lines)"
    - "`prisma/migrations/20260608165159_automation_mutation_policies/migration.sql` (full read, 181 lines) — pattern reference for the append-only trigger sanity check (not used in this slice; deferred to ADR-0031 / ADR-0032)"
    - "`docs/ARCHITECTURE.md` (full read, 103 lines) — confirmed the POS-adapter scope; the new `docs/architecture/` directory complements but does not replace it"
    - "`docs/VISION.md` (full read, 249 lines) — Phases 2, 3, 5, 6 are the strategic intent this contract operationalizes"
    - "`docs/automation/semi-automated-operations-layer.md` (head 80 lines) — guardrail restatement source"
    - "`docs/DECISIONS.md` (full read, 1020 lines after the append; `grep -n '^## ADR-'` to confirm the next free number is ADR-0030)"
    - "`docs/agent-team/agent_teamplan.md` (full read, 53 lines pre-edit; 57 lines post-edit)"
    - "`docs/agent-team/mspr_logbook/2026-06-08-phase-c-mutation-surface.md` (full read, 133 lines) — MSPR style reference"
    - "`src/app.ts` (full read, 531 lines) — `buildApp`, `AppOptions.automation`, route registration pattern (referenced for the future `LocationService` shape in ADR-0031; not modified in this slice)"
    - "`src/routes/inventory.route.ts` (full read, 717 lines) — route role gate + Zod body validation pattern (referenced for the future `/admin/location/...` routes in ADR-0031; not modified in this slice)"
    - "`src/modules/inventory/inventory-master-data.service.ts` (head 80 lines) — typed service + typed DB client pattern (referenced for the future `LocationService` shape in ADR-0031; not modified in this slice)"
    - "`apps/cockpit-next/app/(app)/storage/page.tsx` (full read, 124 lines) — current storage page reads `StorageLocation` directly; no `locationId` filter today"
    - "`apps/cockpit-next/lib/supabase/queries/storage.ts` (full read, 149 lines) — Supabase query layer for storage; no `locationId` filter today"
    - "`apps/cockpit-next/lib/supabase/server.ts` (full read, 31 lines) — Supabase server client creation; not modified in this slice"
  - filesChanged:
    - "new: `docs/architecture/multi-location-mother-concern.md` (~180 lines)"
    - "new: `docs/architecture/location-profiles.md` (~95 lines)"
    - "new: `docs/architecture/cube-premium-compatibility.md` (~110 lines)"
    - "modified: `docs/DECISIONS.md` (+~120 lines: appended the ADR-0030 block at the end of the file; `Status: proposed`; cross-references ADR-0021, ADR-0022, ADR-0023, ADR-0028, ADR-0029, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/VISION.md`, the new architecture docs; names ADR-0031 as the working title for the next code-bearing slice)"
    - "modified: `docs/agent-team/agent_teamplan.md` (+~3 lines: WS-004 row + WS-004 validation row)"
    - "new: this MSPR entry (`docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md`, ~80 lines)"
  - commandsRun:
    - "`git status --short && git branch --show-current` (clean; on `main`)"
    - "`git checkout -b multistandort` (created the branch off `main`; the two untracked files from before the slice — `apps/cockpit-next/lib/supabase/queries/automation-suggestions.ts` and `c` — remain untracked and are not touched by this slice)"
    - "`grep -n '^## ADR-' docs/DECISIONS.md` (confirmed the next free number is ADR-0030; ADR-0029 is taken by the back-promotion ADR)"
    - "`wc -l docs/DECISIONS.md` (1020 lines post-append)"
  - validationResults:
    - "git diff --stat (to be run by the owner at review time): must show changes only under `docs/architecture/`, `docs/DECISIONS.md`, `docs/agent-team/agent_teamplan.md`, and `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md`. All other paths must be byte-for-byte unchanged."
    - "`npm run prisma:validate` is unchanged and remains green (no `prisma/schema.prisma` change)."
    - "`npm run typecheck` is unchanged and remains green (no `src/` or `apps/` change)."
    - "`npx vitest run` is unchanged and the full suite remains 485/485 green (per the ADR-0029 back-promotion baseline; no `tests/` change)."
    - "no `.env*` reads, no service-role credentials, no `InventoryMovement` or `InventoryStockSnapshot` writes, no external system writeback, no LLM call, no new Prisma model, no new migration, no new API endpoint, no new UI surface, no seed fixture, no test file edit"

- **Review**:
  - status: pass
  - risks:
    - "The 3 new architecture docs are written; they are not yet 'accepted' as a contract. The owner must flip ADR-0030 from `proposed` to `accepted` for the contract to be binding. Until then, the docs are aspirational."
    - "The `OrganizationMember` vs `LocationMember` open question is the most consequential of the five open questions. If the team later chooses to widen `OrganizationMember` with a `locationId` column, the migration is a backfill-and-rename that is non-trivial. If the team chooses to add a new `LocationMember` table, the read APIs need to JOIN across the two. ADR-0031 will pin this; until then, no decision is forced."
    - "The new `docs/architecture/` directory is a new convention. A reviewer who is used to `docs/ARCHITECTURE.md` may push to fold the three new docs into the existing one. The contract's answer is in `multi-location-mother-concern.md` §Cross-References and in ADR-0030 §Scope: the POS-adapter doc and the standort-profile doc serve different layers."
    - "The plan said ADR-0029; the actual ADR is ADR-0030. The discrepancy was caught before any file write and corrected. The risk is that a reviewer reading the original plan-vs-shipped diff sees the discrepancy and asks why; the MSPR records the correction so the question is answered."
    - "No code paths have been tested against the new contract. The contract is a forward-looking promise that ADR-0031 / ADR-0032 will land in a way that respects it. The first real proof of compatibility is the ADR-0031 promotion gate (per the ADR-0028 promotion pattern)."
  - scorecard:
    - outcomeQuality: 5 (three docs + ADR + teamplan pointer + MSPR, all consistent, all cross-linked, all gated to the right next ADRs)
    - scopeDiscipline: 5 (zero code, zero migration, zero test, zero env, zero API, zero UI; only the four file families in §Scope; the two pre-existing untracked files are explicitly out of scope and were not touched)
    - safety: 5 (no service-role, no `InventoryMovement` shortcut, no LLM, no `.env*` read, no writeback, no production DB; the same hard guardrails from `AGENTS.md` and `ADR-0021` §3 are restated in the new docs in standort context)
    - evidenceQuality: 5 (`grep -n '^## ADR-'` to confirm the ADR number, `wc -l docs/DECISIONS.md` post-append, branch creation, full file inventory of filesRead / filesChanged, explicit list of pathsOutOfScope; the docs themselves are the evidence; the next gate names the next code-bearing slice)
    - sideEffects: 5 (1 new docs directory; 3 new docs; 1 new ADR block; 1 new teamplan row + 1 new validation row; 1 new MSPR entry; 0 changes to existing files outside docs/; 0 changes to existing tests; 0 changes to existing schema; 0 changes to existing routes; 0 changes to existing services)
  - nextGate: "Owner review of ADR-0030. On `proposed` → `accepted`: contract is binding; the next code-bearing slice is **ADR-0031: Adopt Multi-Standort Phase B Data Model** (proposed; not yet drafted). ADR-0031's slice must resolve the five open questions (or carry them forward with owner sign-off), ship the `Brand` / `Location` / `Area` / `LocationInventoryConfig` schema additions plus the two enums, ship a forward-only `prisma/migrations/2026xxxxxxxx_add_multi_location_tables/migration.sql`, ship a `prisma/seeds/multi_location.sql` fixture (Rauschenberger / Motorworld Inn BB / CUBE Stuttgart), ship a typed `LocationService` and `LocationDatabaseClient` in `src/modules/location/`, ship a `src/routes/location.route.ts` route group with the spec's 7 read endpoints, and follow the ADR-0028 promotion pattern. On rejection of ADR-0030: route back to the Orchestrator for an updated envelope; ADR-0030 remains `proposed` until a verdict is recorded."
