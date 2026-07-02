# Intent Memory — Commit-Prep Slice: Branch Discrepancy Fix + Open-Task Assignment

- id: 2026-06-29-commit-prep-discrepancy-fix-task-assignment
- timestamp: 2026-06-29T10:15:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-commit-prep-discrepancy-fix-task-assignment.md`
- status: reviewed

## Core intention

Close out the day's work on `feat/ux-optimierung-cockpit` by making the dirty + untracked artifacts safely committable: fix the one factual discrepancy in `context/current-state.md` (Branch claim), assign every remaining open task to a named gate and owner so the operator can resume work without re-deriving the state, and split the commit into logically clean, reviewable units — without losing any existing documentation or scope from the seven paired mspr/intent entries the previous session produced.

## Logic followed

- Verify-before-write: every change is grounded in `Observed` facts already proven in the paired entries (23 branches deleted, 7 preserved, ~122 MB reclaimed, root `.vercel/` git-neutral, `bevero-ui` live via webfetch, `procurement` ≠ Einkauf page, etc.).
- Smallest-safe-write: only the Branch line and the "Offene Entscheidungen & Schleifen" + "Nächste Meilensteine" sections are touched in the two context files; the seven existing mspr/intent pairs are committed verbatim, not rewritten.
- Defer rather than expand: open tasks are *assigned* (gate + owner) but not *executed* — runtime gates (browser, Supabase DB, Vercel dashboard) cannot be cleared from this session and must not be silently marked done.
- Split commits by scope, not by file: chore(repo) for hygiene + guardrail + context-state; feat(pilot) for pilot concept + roles + Path A; chore(cockpit) for the unrelated build-artifact regen — three small commits instead of one mixed one, so the operator can review/revert any unit independently.
- Preserve dual tracks: every completed hygiene action stays in the mspr/intent logbook as evidence; the commit prep itself gets its own pair so this slice is auditable like any other.

## Design assumptions

- The seven today's mspr/intent pairs (agents-guardrail-automation-status, hygiene-batch2, hygiene-branch-zip-deletion, hygiene-root-vercel, pilot-go-live-concept, pilot-readiness-verification, repo-context-refresh) are `status: pass` and complete as committed by the previous session — no content rewrites needed, only inclusion in this commit batch.
- `feat/ux-optimierung-cockpit` is the correct destination branch (the previous session did all the work here; switching branches mid-dirty-worktree is unsafe). The user did not pick Plan A (new branch), so we commit on the branch where the work lives.
- The dirty `apps/cockpit/next-env.d.ts` is a Next.js-generated build artifact from the UX sprint that landed here; it is semantically cockpit-scope, not hygiene/pilot, and deserves its own commit.
- The 7 ungemergte remote branches were intentionally preserved by the operator-authorized 2026-06-29 deletion batch; we do not relitigate that decision.

## Tradeoffs

- Accepted:
  - Three commits instead of one — slightly more logbook noise, much better reviewability and revertibility.
  - `priorities.md` refactored from a bullet list to a table with Gate / Owner / Stand columns — more structured but requires the reader to scan a table; the row content is identical to the bullets it replaces.
  - Reviewer-Person stays a placeholder until the operator names a real second person — honest about an organizational gap rather than fabricating one.
  - Live-Connector for Bevero-Ingestion stays in the priorities list but moved to "v1 / zurückgestellt" — the pilot proves the governance loop without it.
- Rejected:
  - Silently correcting the Branch line without flagging it — making the contradiction visible in this entry is more honest than a quiet edit.
  - Bundling `apps/cockpit/next-env.d.ts` into Commit 1 to "save a commit" — keeps the cockpit artifact separate so the hygiene commit stays scope-clean.
  - Auto-running the vitest suite or the pilot runs from this session — no Supabase DB, no browser, no credentials; would be theater.
  - Reverting to `main` and cherry-picking — irreversible risk; user did not authorize that route.

## Durable memory

- When the previous session's dirty work contains a factual claim that contradicts observed reality, fix the claim in-place and document the discrepancy in a fresh mspr/intent pair — never let a wrong fact propagate to `main`.
- Every open task in `context/` should have a Gate and an Owner column, not a bare checkbox — a `[ ]` without a gate is a hidden blocker, a `[ ]` with a gate is an assignable next step.
- "Commit-prep" is itself a Work Slice and must produce mspr + intent — the rule that excludes "trivial" work does not exclude commit hygiene, because commit hygiene carries the previous slice's evidence forward.

## Do not reuse blindly

- The three-commit split is correct for the *current* set of artifacts; if the working tree contains different files later, re-derive the commit split from scope, do not copy the pattern.
- The priorities table format is suitable when there are 5–10 named open milestones; for longer lists, fall back to a bullet structure with inline `→ Gate:` annotations.
- Re-verify the Branch line before any future `current-state.md` commit — the discrepancy was easy to miss because the line sits inside a bullet list.

## Relation to Rauschenberger OS / Bevero

- location logic: unchanged (Motorworld Inn Böblingen remains the pilot site).
- role/approval logic: the Pilot-Placeholder for reviewer is intentionally preserved; operator = Cheikh stays the L2/L3 named person. No new role invented.
- inventory/procurement/shift-planning logic: unchanged; the pilot vehicle remains Inventory-Korrektur → Freigabe (L2).
- external-system boundary: Vercel project deletion remains an L3 operator dashboard action; no auto-delete from this session.

## Next logic gate

Operator reviews the three commits (`git log feat/ux-optimierung-cockpit -3`), confirms the scope split is acceptable, and decides whether to (a) push the branch directly, (b) push to a review branch first, or (c) `git reset --soft HEAD~3` and re-commit onto a fresh `chore/housekeeping-2026-06-29` branch off `main` to keep the UX-cockpit branch scope-clean. Then the open-loop table in `context/priorities.md` drives the next session.