# Intent Memory — Hygiene Batch 2: zip-ignore, test-correction, branch analysis, automation-spec

- id: 2026-06-29-hygiene-batch2
- timestamp: 2026-06-29T07:55:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-hygiene-batch2.md`
- status: reviewed

## Core intention

Reduce repo noise and correct a self-introduced error: stop `.zip` dumps from polluting git, retract the false "no tests" claim, and convert vague hygiene flags (branches, automation spec) into evidence-based, actionable operator decisions — without performing any destructive or remote action.

## Logic followed

- Smallest-safe-write first: `*.zip` to `.gitignore` removes noise without deleting potentially-wanted artifacts.
- Verify own assumptions before propagating: the earlier "no test files" finding was re-checked with `find`/`git ls-tree` and found to be a glob false-negative; all affected docs were corrected transparently rather than silently edited.
- Classify before acting: split branches into merged (safe) vs unmerged (review), and delegate the destructive `git push --delete` to the operator.
- Resolve, don't re-flag: the automation spec/schema "tension" was investigated against ADRs and the implementation plan and downgraded from risk to doc-staleness.

## Design assumptions

- `find` and `git ls-tree` reflect true working-tree/committed state; the glob tool does not reliably do so in this repo.
- `--merged origin/main` is a sufficient safety signal for branch deletion (reachable tips), supplemented by a date check for recency.
- Parallel user work in `apps/cockpit/` is intentionally out of scope and must be preserved.

## Tradeoffs

- Accepted:
  - Ignore `.zip` files rather than delete them — reversible, preserves artifacts, still achieves a clean `git status`.
  - Document the stale `apps/api/AGENTS.md` guardrail instead of editing it (governance file, L2, needs review).
- Rejected:
  - Running `git push origin --delete` for any branch — remote mutation, operator gate.
  - Editing `apps/cockpit/*` or `docs/UX_OPTIMIERUNGSKONZEPT_COCKPIT.md` — not owned by this slice.

## Durable memory

- In this repo, assert file existence/counts with `find`/`git ls-tree`, never `glob`.
- Canonical branch truth: `origin/main` is current; `origin/master` is a stale fully-merged duplicate and safe to delete.
- Automation models are legitimately migrated (ADR-0021/0022/0023, Phase C done); the "proposed" wording in `apps/api/AGENTS.md` is the stale part, not the schema.
- `.zip` dumps (~122 MB) are now ignored but still occupy disk; physical deletion is an operator call.

## Do not reuse blindly

- The "23 merged / 7 unmerged" split is a point-in-time snapshot; re-run `git branch -r --merged origin/main` before any real deletion batch.
- Do not generalize the glob false-negative to other repos — it is specific to this repo/checkout; just verify with `find` here.

## Relation to Rauschenberger OS / Bevero

- location logic: unaffected.
- role/approval logic: branch deletion and dashboard project deletion are L3 operator actions; doc staleness fix is L2 (review).
- inventory/procurement/shift-planning logic: unaffected — automation models and Phase B/C status confirmed aligned with accepted ADRs.
- external-system boundary: untouched.

## Next logic gate

Operator picks the next action: (a) delete the 23 merged remote branches, (b) physically remove the ~122 MB `.zip` dumps, (c) run `npm test` to confirm the 85-file suite is green, or (d) refresh the stale `apps/api/AGENTS.md` guardrail text under review.
