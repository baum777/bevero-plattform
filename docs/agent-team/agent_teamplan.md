# Agent Team Plan

The team plan is the live dashboard of active workstreams. It is **append-friendly**: rows are added, status is updated, and the next gate is the source of truth for "what should I work on next".

## Active workstreams

| ID | Title | Owner | Task type | Scope | Autonomy | Status | Next action | Review | Human approval |
|---|---|---|---|---|---|---|---|---|---|
| WS-001 | Swarm contract bootstrap (this slice) | Orchestrator | `docs_spec` | `docs/agent-team/` | Tier 2 | active | Land files, request human review | Optional | No |
| WS-002 | CI workflow fix (`checkout@v6` → `v4`) | Orchestrator + Builder | `ci_build_change` | `.github/workflows/ci.yml` | Tier 3 | **blocked** | PAT lacks `workflow` scope; needs human to extend scope or apply locally | Required | No (after scope fixed) |
| WS-003 | Semi-Automated Operations Layer (PR #31) | Orchestrator | `docs_spec` | `docs/automation/` | Tier 2 | **done** (PR #31 merged) | Translate spec into implementation plan (separate decision) | n/a | No |
| WS-004 | Multi-Standort & CUBE Premium Architecture (Phase A — contract only) | Orchestrator | `docs_spec` | `docs/architecture/`, `docs/DECISIONS.md` (ADR-0030), `docs/agent-team/agent_teamplan.md`, `docs/agent-team/mspr_logbook/2026-06-08-multi-location-architecture-contract.md`, `docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md` | Tier 2 | **done** (ADR-0030 accepted 2026-06-08) | n/a — superseded by WS-005 | n/a | No |
| WS-005 | Multi-Standort Phase B Data Model (ADR-0031) | Orchestrator | `docs_spec` | `docs/DECISIONS.md` (ADR-0031), `docs/agent-team/agent_teamplan.md`, `docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md` | Tier 2 | **active** (ADR-0031 accepted 2026-06-08) | Land the Phase B code-bearing slice per ADR-0031 §Scope (10 file families: prisma schema, 2 migrations, 1 seed, 1 module, 1 types, 1 route, 1 test, 1 app.ts edit, 1 ADR); next gate after the slice is the ADR-0028-style Supabase promotion; the next ADR after promotion is ADR-0032 | Optional | Yes (post-acceptance: code-bearing slice PR) |
| WS-007 | Rauschenberger Meta-Layer Phase A Contract (ADR-0055 / Task 10) | Orchestrator | `docs_spec` | `docs/architecture/rauschenberger-meta-layer.md`, `docs/architecture/inquiry-routing.md`, `docs/DECISIONS.md` (ADR-0055), `docs/agent-team/agent_teamplan.md`, `docs/agent-team/mspr_logbook/2026-06-09-rauschenberger-meta-layer-contract.md` | Tier 2 | **active** (ADR-0055 proposed 2026-06-09) | Owner review → accept ADR-0055 → gate Task 11 (ADR-0056 data model) | Required | Yes (post-acceptance: code-bearing slice Task 11) |

## Role assignments

- **Orchestrator**: scope, classification, envelope creation, policy enforcement, escalation.
- **Builder**: bounded execution inside the envelope, code/docs/tests.
- **Reviewer**: scope/policy/evidence check, scorecard, verdict, memory distillation.

A single agent (in a single human-driven session) may play multiple roles **only** if it logs the role-switch in the MSPR entry. A pure orchestrator run is allowed; a pure builder run without an envelope is not.

## Workstream lifecycle

```text
draft  -> active  -> awaiting_review  -> pass | needs_rework | blocked | approval_required
                              ^                              |
                              |______________________________|
                              (rework loop, max 2 iterations)
```

A workstream is closed when:

- `pass` is reached **and** the slice is merged or handed off, **or**
- `blocked` is reached and the blocker is recorded as a human-owned item.

## Current blockers

- **WS-002** (CI workflow fix): PAT scope gap. GitHub blocks any push that touches `.github/workflows/*` when the token does not carry the `workflow` scope. Resolution: human extends the token scope, or the diff is applied locally.

## Required validations per workstream

| Workstream | Required validation |
|---|---|
| WS-001 | Markdown files parse, JSON Schemas parse, no cross-refs to non-existent files, no `.env*` / `prisma/` / `src/` / `web/` / `apps/` references in changed files. |
| WS-002 | (after scope unblock) PR opens, `actions/checkout@v4` and `actions/setup-node@v4` resolve on first run, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npx prisma validate` all pass. |
| WS-003 | PR #31 merged with merge-commit, no squash, history preserved. (Confirmed: `6184cd2`.) |
| WS-004 | `git diff --stat` shows zero changes outside `docs/`; `npm run prisma:validate`, `npm run typecheck`, `npx vitest run`, and `npm --prefix apps/cockpit run typecheck` remain green (485/485 baseline per the ADR-0029 back-promotion); three new architecture docs parse, cross-link correctly, and reference the new ADR-0030; the owner-review MSPR at `docs/agent-team/mspr_logbook/2026-06-08-adr-0030-owner-review.md` records the gate verdict; ADR-0030 has been flipped from `proposed` to `accepted` with date stamp. |
| WS-005 | `git diff --stat -- docs/` shows changes only under `docs/DECISIONS.md`, `docs/agent-team/agent_teamplan.md`, and `docs/agent-team/mspr_logbook/2026-06-08-adr-0031-owner-review.md`; the `### Status update (2026-06-08)` block on ADR-0031 records the acceptance, re-affirms the gate, and names ADR-0032 as the next ADR; the 1 corrected nit (the `2a46e05` → `39fc896` commit-hash fix in the §Next gate) is documented in the owner-review MSPR; the 4 unchanged validation commands remain green (prisma:validate, typecheck, vitest 485/485, cockpit typecheck). |

## Next gate

The next smallest safe step after the human review of this directory:

1. Decide whether to pre-implement a runtime stub for the envelope (TS types) — default is **no**, per the Spec.
2. Decide whether to add a CI bot that auto-appends a stub MSPR entry on PR open — default is **no**, until the swarm has a real consumer.
3. Begin translating `docs/automation/semi-automated-operations-layer.md` into a concrete implementation plan, **if** the user confirms a preferred format (Phase A MVP vs full phased plan, issues vs single doc, etc.).
