# MSPR Entry — Hygiene Batch 2: zip-ignore, test-correction, branch analysis, automation-spec

- id: 2026-06-29-hygiene-batch2
- timestamp: 2026-06-29T07:55:00+02:00
- runId: baumos-2026-06-29-hygiene-batch2
- agentRole: builder
- taskType: ci_build_change

## Scope

- layer: ci_deployment
- pathsInScope:
  - `.gitignore`
  - `context/current-state.md`, `context/priorities.md`
  - `docs/agent-team/mspr_logbook/2026-06-29-repo-context-refresh.md` (correction)
  - `docs/agent-team/intent_logbook/2026-06-29-repo-context-refresh.md` (correction)
  - `docs/agent-team/mspr_logbook/2026-06-29-hygiene-batch2.md`
  - `docs/agent-team/intent_logbook/2026-06-29-hygiene-batch2.md`
- pathsOutOfScope:
  - `apps/cockpit/*` (active parallel user work: toast.tsx, use-toast.ts, globals.css, UX_OPTIMIERUNGSKONZEPT — NOT touched)
  - remote branch deletion (`git push --delete` = operator gate)
  - `apps/api/AGENTS.md` edit (L2 governance, needs review — only documented)
  - Vercel dashboard, `.env*`, prisma, deploy
- autonomyTier: 1

## Code Change Context

- Trigger/request: User: "fahre mit den nächsten hygiene items fort" — work through remaining Repo-Hygiene items.
- Why the change was needed: (1) ~122 MB of untracked `.zip` dumps polluting `git status`; (2) prior "no test files" finding needed verification; (3) branch sprawl (~30 remote) + dual main/master; (4) automation spec/schema tension flagged.
- Files read:
  - `.gitignore`, `apps/api/package.json`, `docs/DECISIONS.md`, `docs/automation/implementation-plan.md`, `docs/features/item-image-service.md`
  - remote branch state via `git branch -r --merged/--no-merged`, `git for-each-ref`, `git ls-tree origin/main`
- Files changed:
  - `.gitignore` — added `*.zip` (kept existing `bevero\ zip.zip`)
  - `context/current-state.md` — test-coverage corrected (85 files/22.842 lines), `.zip` done, branch analysis, automation-spec resolved
  - `context/priorities.md` — Repo-Hygiene checkboxes updated (zip `[x]`, test `[~]`, branch + automation refined)
  - `docs/agent-team/mspr_logbook/2026-06-29-repo-context-refresh.md` — 4 corrections (commands, validation, newFindings, gotchas) for the glob false-negative
  - `docs/agent-team/intent_logbook/2026-06-29-repo-context-refresh.md` — 1 correction (durable memory)
  - this MSPR + its intent entry
- Commands run:
  - `find apps/api/tests -name '*.test.ts'` → 85 files (`glob` had false-negatived earlier)
  - `find ... -exec wc -l` → 22.842 total test lines
  - `git branch -r --merged origin/main` → 23 branches safe to delete (incl. `origin/master`)
  - `git branch -r --no-merged origin/main` → 7 branches need review
  - `git for-each-ref ... committerdate` → last-activity per branch (oldest 2026-05-26)
  - `git ls-tree -r origin/main | rg test` → confirmed tests on origin/main
  - `rg DECISIONS.md automation/ADR` → ADR-0021/0022/0023 accepted, Phase C done
- Validation results:
  - `git status --short` after `.gitignore` edit: the 3 `.zip` files no longer appear (ignore effective).
  - Test metric reproducible via `find`+`wc` (not via `glob`): 85 / 22.842.
  - Branch analysis reproducible; 23 merged / 7 unmerged.
  - Automation-spec tension resolved as doc-staleness (not a violation): models legitimately migrated per accepted ADRs.

## Memory

- newFindings:
  - **glob tool false-negative in this repo**: `apps/api/**/*.test.ts` returned "No files found" while 85 files exist. `find`/`git ls-tree` are authoritative here. Earlier "no tests" finding was wrong and has been corrected in `context/`, the repo-context-refresh MSPR, and its intent entry.
  - `origin/master` (last 2026-06-05, tip `a0af00f` PR #25 merge) is fully merged into `main` → safe to delete; it is the source of the "dual main/master" noise.
  - `.gitignore` previously listed only `bevero\ zip.zip`; `*.zip` now covers all dump artifacts.
  - `apps/api/AGENTS.md` automation guardrail text ("proposed, not yet migrated") is stale — implementation-plan shows Phase C done; models migrated under ADR-0021/0022/0023.
- reusableRules:
  - For any file-existence/count claim in this repo, verify with `find` or `git ls-tree`, not the glob tool.
  - Before deleting remote branches, classify via `--merged`/`--no-merged`; only the operator runs `git push origin --delete`.
- gotchas:
  - Parallel user work appeared mid-session in `apps/cockpit/` (toast, globals.css, use-toast) and `docs/UX_OPTIMIERUNGSKONZEPT_COCKPIT.md` — left untouched; do not include in this slice's changeset.

## Review

- status: pass
- risks:
  - 7 unmerged branches may contain unmerged work (notably `feat/kitchen-phase-g-issues-signoff` 2026-06-24, `feat/landing-workflow-narrative` 2026-06-19) — must NOT be deleted without owner review.
  - vitest suite not actually run (green/red unconfirmed); may need Supabase DB per `apps/api/AGENTS.md` Validation Gate.
  - ~122 MB of `.zip` dumps remain on disk (now ignored, not deleted).
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Operator decides branch-deletion batch (23 merged → safe) and whether to physically remove the `.zip` dumps. Then optionally run `npm test` (apps/api) to confirm the 85-file suite is green.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-hygiene-batch2.md`
