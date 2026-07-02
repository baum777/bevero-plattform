# MSPR Entry — Repository map

- id: 2026-06-20-repository-map
- timestamp: 2026-06-20T23:07:37+02:00
- runId: codex-repository-map
- agentRole: researcher
- taskType: read_only_audit

## Scope

- layer: cross_package
- pathsInScope:
  - `README.md`
  - `OS.md`
  - `IDENTITY.md`
  - `governance/`
  - `context/`
  - `workflows/`
  - targeted frontdoors and entry points under `apps/api`, `apps/cockpit`, and `apps/landing`
  - `.understand-anything/` generated graph artifacts for `apps/api` and `apps/cockpit`
- pathsOutOfScope:
  - runtime execution, deployments, database access, secrets, production configuration
  - pre-existing dirty files not created by this slice
- autonomyTier: 0

## Code Change Context

- Trigger/request: `map this repo` using the Understand Anything plugin.
- Why the change was needed: provide an evidence-backed repository map while preserving the explicit prohibition on a global recursive scan of `apps/`.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `IDENTITY.md`
  - `OS.md`
  - `package.json`
  - `context/current-state.md`
  - `context/priorities.md`
  - `governance/rules.md`
  - `governance/approval-matrix.md`
  - `governance/evidence-contract.md`
  - `workflows/standard.md`
  - `docs/ARCHITECTURE.md`
  - `docs/RAUSCHENBERGER-OS-SUMMARY.md`
  - `apps/api/AGENTS.md`
  - `apps/api/README.md`
  - `apps/api/package.json`
  - `apps/api/src/server.ts`
  - `apps/api/api/index.ts`
  - `apps/api/src/app.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/cockpit/README.md`
  - `apps/cockpit/package.json`
  - `apps/cockpit/app/layout.tsx`
  - `apps/cockpit/app/page.tsx`
  - `apps/cockpit/lib/supabase/server.ts`
  - `apps/cockpit/lib/backend/review-tasks.ts`
  - `apps/landing/package.json`
  - `apps/landing/src/main.jsx`
  - `apps/landing/src/App.jsx`
- Files changed:
  - `.understand-anything/.understandignore`
  - `.understand-anything/knowledge-graph.json`
  - `.understand-anything/meta.json`
  - `.understand-anything/intermediate/scan-result.json`
  - `.understand-anything/intermediate/fingerprint-input.json`
  - `docs/agent-team/mspr_logbook/2026-06-20-repository-map.md`
  - `docs/agent-team/intent_logbook/2026-06-20-repository-map.md`
- Commands run:
  - targeted `rg --files` inventories and entry-point reads → pass
  - `git diff --check` before documentation entries → pass
  - `npm run check:work-docs` → pass
  - `git diff --check` after documentation entries → pass
  - Understand Anything runtime build after explicit operator authorization → pass
  - `scan-project.mjs` for scoped apps → pass (508 files)
  - `extract-import-map.mjs` → pass (850 internal edges)
  - `compute-batches.mjs` → partial (28 batches; high-degree and large-community warnings)
  - graph structural validation → pass (508 nodes, 850 edges, no dangling references)
  - `build-fingerprints.mjs` → pass (508 files)
- Validation results:
  - Targeted structural evidence collected without globally scanning `apps/`.

## Memory

- newFindings:
  - The root is an npm workspace with three independently deployable applications: API, Cockpit, and Landing.
  - Cockpit uses Supabase session/auth helpers and calls the Fastify API for selected protected operational flows.
  - The generated graph is restricted to `apps/api` and `apps/cockpit` by explicit operator authorization.
- reusableRules:
  - For repo-wide orientation, inspect each app through targeted frontdoors and entry points rather than recursively scanning `apps/`.
- gotchas:
  - Existing dirty files were preserved and excluded from this slice.

## Review

- status: needs_rework
- risks:
  - This is a structural map, not a runtime, deployment, database, or security audit.
  - The graph is deterministic at file/import level; it does not yet contain semantic function/class nodes or LLM-generated file summaries.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Run semantic batch analysis if function/class-level architecture exploration is required.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-20-repository-map.md`
