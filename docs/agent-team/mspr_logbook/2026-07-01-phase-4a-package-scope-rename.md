# MSPR Entry — Phase 4a Package Scope & Workspace Identity Rename

- id: 2026-07-01-phase-4a-package-scope-rename
- timestamp: 2026-07-01T00:00:00+02:00
- runId: baumos-2026-07-01-phase-4a-package-scope-rename
- agentRole: builder
- taskType: implementation

## Scope

- layer: package_local (npm workspace identity + narrative docs)
- pathsInScope:
  - `package.json`
  - `apps/api/package.json`
  - `apps/cockpit/package.json`
  - `apps/landing/package.json`
  - `package-lock.json` (mechanically regenerated via `npm install`)
  - `OS.md`
  - `docs/productization/bevero-product-identity-v0.md`
  - `docs/productization/bevero-demo-data-policy-v0.md`
  - MSPR + intent logbook entries (new)
- pathsOutOfScope:
  - `apps/api/prisma/**` — untouched
  - Prisma enum values (`RAUSCHENBERGER_WEBSITE`, `INHOUSE_RAUSCHENBERGER`, etc.) — kept; Phase 4b
  - Internal seed ids/slugs (`loc-motorworld-*`, `wg-mwbb-*`, `cube-stuttgart`, `mwbb-*`) — kept; Phase 4c
  - Code module/route/table names (`cube`, `mother-concern`, `gastronovi`) — Phase 4d
  - `docs/productization/bevero-productization-audit-2026-07-01.md` — historical audit report, untouched
  - Historical ADRs/logbooks/migrations — untouched
  - Repo directory / Vercel project names — untouched
- autonomyTier: 1

## Code Change Context

- Trigger/request: Operator instruction to run Phase 4a (npm package scope / workspace identity rename), the first safe patch identified in the Phase 4 readiness audit.
- Why the change was needed: The npm workspace root and all three app packages still carried the `rauschenberger-os` / `@rauschenberger-os/*` scope, the last easily-reachable customer-name surface in package metadata, tooling output, and narrative docs.
- Files read:
  - `package.json`, `apps/api/package.json`, `apps/cockpit/package.json`, `apps/landing/package.json`
  - `OS.md`
  - `docs/productization/bevero-product-identity-v0.md`, `docs/productization/bevero-demo-data-policy-v0.md`
  - `docs/agent-team/templates/code_change_context.md`, `docs/agent-team/templates/intent_memory_entry.md`
- Files changed:
  - `package.json` — `name`: `rauschenberger-os` → `bevero-os`
  - `apps/api/package.json` — `name`: `@rauschenberger-os/api` → `@bevero-os/api`
  - `apps/cockpit/package.json` — `name`: `@rauschenberger-os/cockpit` → `@bevero-os/cockpit`
  - `apps/landing/package.json` — `name`: `@rauschenberger-os/landing` → `@bevero-os/landing`
  - `package-lock.json` — regenerated via `npm install`; only name/link-reference fields changed (17 insertions / 17 deletions), no dependency version drift
  - `OS.md` — narrative code-identity note + repo-structure tree + 3 inline package annotations updated to `bevero-os` / `@bevero-os/*`
  - `docs/productization/bevero-product-identity-v0.md` — appended minimal "Package Identity" note; existing Phase 2 "Future Follow-Ups" historical bullet left untouched (documents the pre-rename decision at that point in time)
  - `docs/productization/bevero-demo-data-policy-v0.md` — appended minimal "Package Identity" note; existing Phase 3 "Deferred" historical bullet left untouched (same reasoning)
- Commands run:
  - `git status` / `git log --oneline -6` (pre-check) → clean tree
  - `grep -RIn "rauschenberger-os" ...` (pre-check) → confirmed scope matched expectation
  - `npm install` → pass (3 workspace-symlink packages relinked; 0 dependency version changes)
  - `npm run typecheck` → pass
  - `npm --workspace=apps/api run build` → pass
  - `npm --workspace=apps/cockpit run build` → pass
  - `npm --workspace=apps/landing run build` → pass
  - `npm run check:work-docs` → pass (after this entry + linked intent entry added)
  - Post-change grep for `rauschenberger-os` across `package.json`, `apps/*/package.json`, `package-lock.json`, `OS.md`, `docs/productization/` → only remaining hits are historical bullets in `bevero-product-identity-v0.md` / `bevero-demo-data-policy-v0.md` and the untouched audit report
- Validation results: all green; no old package-scope references remain in active package/workspace files.

## Memory

- newFindings:
  - `npm install` after a workspace-name rename relinks `node_modules/@<scope>/<app>` symlinks (shows as "added N, removed N" in npm's summary) — this is expected symlink churn, not a dependency change. Verify with `git diff --stat -- package-lock.json` before trusting the npm summary line.
- reusableRules:
  - When neutralizing package scope, regenerate the lockfile mechanically (`npm install`) rather than hand-editing it, then diff-review for unexpected version bumps before proceeding.
  - Leave "Future Follow-Ups" / "Deferred" bullets in prior-phase productization docs untouched when they document the historical state-of-decision at that phase; add a small forward-pointing note instead of rewriting history.
- gotchas:
  - `OS.md` contained 4 occurrences of the substring `rauschenberger-os/` (3 inside `@rauschenberger-os/<app>` annotations, 1 as the bare repo-tree root label) — a naive single-string `replace_all` would have needed per-line disambiguation; handled with distinct edits per line.

## Review

- status: pass
- risks:
  - `docs/productization/bevero-productization-audit-2026-07-01.md` still references `rauschenberger-os` (via its `BEVERO.md` recommendation) — intentionally out of scope as a historical audit artifact.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Phase 4b (Prisma enum/schema rename plan), Phase 4c (ID/slug neutralization), Phase 4d (cosmetic script labels).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-01-phase-4a-package-scope-rename.md`
