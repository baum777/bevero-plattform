# Intent Memory — Hygiene: Branch + Zip Deletion (Operator-Authorized)

- id: 2026-06-29-hygiene-branch-zip-deletion
- timestamp: 2026-06-29T08:10:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-hygiene-branch-zip-deletion.md`
- status: reviewed

## Core intention

Execute the two operator-authorized destructive hygiene actions — delete 23 fully-merged remote branches and remove ~122 MB of local `.zip` dumps — precisely and reversibly-free for the merged branches, while preserving every unmerged branch.

## Logic followed

- Authorization-gated: act only after explicit operator instruction ("schliesse 1 & 2"); destructive/remote ops are never autonomous.
- Merge-status as safety boundary: only branches whose tips are reachable from `origin/main` (`--merged`) were deleted, guaranteeing no unique commit loss; unmerged branches were explicitly excluded.
- Batch efficiency: a single `git push origin --delete <list>` for all 23 to minimize remote round-trips.
- Verify-after-act: `git fetch --prune` + `git branch -r` to confirm the surviving set is exactly `main` + 7 unmerged.
- Local hygiene: `.zip` dumps deleted with plain `rm` (no `-rf`, which is denied); gitignored, so git-neutral.

## Design assumptions

- `origin/HEAD -> origin/main` means `main` is the GitHub default; therefore deleting non-default `master` is permitted and safe.
- All branches classified `--merged origin/main` contain no commits absent from `main`; their deletion loses no history.
- The 3 `.zip` files were transient dumps (build/screenshot archives), not inputs referenced by code or build config.

## Tradeoffs

- Accepted:
  - Irreversible remote deletion of 23 merged branches — acceptable because all commits live on in `main`.
  - Physical removal of the `.zip` dumps — acceptable because they were untracked, gitignored, and not referenced.
- Rejected:
  - Deleting any of the 7 unmerged branches — they may contain unmerged work and require case-by-case review.
  - Touching `apps/cockpit/*` parallel user work — out of scope.

## Durable memory

- The repo's GitHub default branch is `main`; `master` no longer exists (deleted 2026-06-29) — the "dual main/master" issue is resolved.
- Safe branch-deletion recipe: `git branch -r --merged origin/main` → build deletion list → `git push origin --delete <list>` → `git fetch --prune` → verify remainder.
- 7 unmerged branches remain and are the next review surface, not a deletion queue.

## Do not reuse blindly

- The "23 safe" classification was point-in-time; re-run `--merged` before any future deletion batch — branch state changes.
- Do not assume `.zip` files are always safe to delete in other contexts; here they were verified unreferenced and gitignored first.

## Relation to Rauschenberger OS / Bevero

- location logic: unaffected.
- role/approval logic: destructive remote + file operations are operator-authorized (L3-equivalent); documented with full evidence for audit.
- inventory/procurement/shift-planning logic: unaffected.
- external-system boundary: GitHub remote (`baum777/rauschenberger-os`) mutated only by branch ref deletion; no app/deploy/DB impact.

## Next logic gate

Owner reviews the 7 surviving unmerged branches (`codex/*`, `feat/*`) — merge into `main` or delete case-by-case after confirming no unmerged work is lost.
