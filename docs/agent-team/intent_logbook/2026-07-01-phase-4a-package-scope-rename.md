# Intent Memory — Phase 4a Package Scope & Workspace Identity Rename

- id: 2026-07-01-phase-4a-package-scope-rename
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-phase-4a-package-scope-rename.md`
- status: reviewed

## Core intention

Remove the last easily-visible customer-name surface from npm tooling output (install logs, build output, `package.json` metadata, lockfile) without touching anything that requires a migration or a runtime-ID change. This is deliberately the *smallest* Phase 4 slice — a pure metadata rename — so it can land safely ahead of the higher-risk enum/schema/slug work.

## Logic followed

Phase 4 was split by the readiness audit into ordered sub-phases by blast radius: package/workspace names (4a, no migration, no runtime impact) → enum/schema (4b, migration-bearing) → IDs/slugs (4c, runtime-data-bearing) → cosmetic script labels (4d, lowest priority). This slice only executes 4a. The npm `name` field is pure metadata — it does not appear in runtime code paths, database rows, or Prisma schema, so renaming it carries no migration risk and is mechanically reversible via the lockfile.

## Design assumptions

- The workspace `name` fields are not referenced anywhere at runtime (only by npm's own tooling for workspace resolution) — confirmed by grepping active package/workspace files before and after.
- Regenerating `package-lock.json` via `npm install` is safe and won't silently upgrade dependencies, because only the `name` fields changed as input.
- Historical productization docs that describe *why something was deferred at a prior phase* should not be rewritten just because that phase later executes — the record of the decision-at-the-time is itself valuable audit trail.

## Tradeoffs

- Accepted:
  - Leaving the Phase 2/Phase 3 "Future Follow-Ups" / "Deferred" bullets in the productization docs unedited, even though they now describe a completed action, rather than editing history — a short forward note was appended instead.
  - Not touching `docs/productization/bevero-productization-audit-2026-07-01.md`, even though it also mentions `rauschenberger-os` (via a `BEVERO.md` recommendation) — it is a historical audit artifact and explicitly out of the allowed-scope file list.
- Rejected:
  - Rewriting the Phase 2/3 follow-up bullets in place to reflect "done" status — rejected to avoid touching historical decision records; a forward-pointing note was added instead.

## Durable memory

What should future agents or humans remember?

- The npm workspace/package identity is now `bevero-os` / `@bevero-os/*`. Any future tooling, CI config, or scripts that hardcode `@rauschenberger-os/*` import paths or the root package name will break and need updating (none were found in this scope; check again before Phase 4b–4d).
- `npm install` after a scope rename produces lockfile churn that *looks* like dependency changes in npm's terminal summary ("added N, removed N packages") but is actually just workspace symlink relinking. Always verify with `git diff --stat -- package-lock.json`, not the npm CLI summary line.
- Package-scope rename is now the completed baseline for Phase 4b (enum/schema), which is expected to be materially riskier (migration-bearing).

## Do not reuse blindly

What should not be copied into future work without re-checking context?

- The "leave historical follow-up bullets untouched, add a forward note" pattern applies to *productization docs describing prior-phase decisions*. It does not generalize to ADRs, migrations, or logbooks, which must never be rewritten regardless of phase completion.
- The list of "forbidden" areas (Prisma, enums, slugs, IDs, routes) is specific to Phase 4a's charter — Phase 4b will need its own explicit charter for enum/schema renames, since that work is migration-bearing and needs separate gating.

## Relation to Rauschenberger OS / Bevero

- location logic: untouched — no location/site slug or ID changed.
- role/approval logic: untouched — no autonomy-tier or role code touched.
- inventory/procurement/shift-planning logic: untouched — no module/route/table names touched.
- external-system boundary: untouched — no Supabase/Prisma/Vercel config touched; only npm package metadata.

## Next logic gate

Phase 4b: what is the safe order and migration strategy for renaming Prisma enum values (`RAUSCHENBERGER_WEBSITE`, `INHOUSE_RAUSCHENBERGER`, etc.) without breaking existing rows or requiring a backfill under load?
