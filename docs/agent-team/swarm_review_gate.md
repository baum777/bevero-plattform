# Swarm Review Gate

The Reviewer is the only agent allowed to mark a slice as `pass`. Every other transition between agents is reversible; a `pass` from the Reviewer is the final word **before** the slice can be merged or promoted.

## Verdict vocabulary

| Verdict | Meaning | Next step |
|---|---|---|
| `pass` | Slice meets all criteria. | Builder may finalize (commit, push, or hand off to human merge). |
| `needs_rework` | One or more criteria are weak. | Builder re-runs, Reviewer re-reviews. Loop is bounded (see below). |
| `blocked` | Policy or scope violation that the Builder cannot fix safely. | Escalate to human owner; no further agent work. |
| `approval_required` | Slice is sound but requires human sign-off (e.g. infra, prod, security). | Hand to human; agent work pauses. |

## Scorecard

The Reviewer produces a scorecard with five scores (0-5) and a verdict. A score of 0 on `Safety / Policy Compliance` is an automatic `blocked`. A score of 0 on any other dimension is an automatic `needs_rework`.

| Dimension | What is checked |
|---|---|
| Outcome Quality | Does the slice actually achieve the decision in the TTD frame? |
| Scope Discipline | Are `pathsInScope` respected? Any out-of-scope edits? |
| Safety / Policy Compliance | Are `.env*`, secrets, prod config, destructive ops untouched? Are ADRs cited for governance changes? |
| Evidence Quality | Are tests, typecheck, build, lint outputs present and named? |
| Side Effects | Migration impact, RLS impact, cross-app impact, new dependencies, build size. |

## Required evidence per scope layer

| Scope layer | Minimum evidence before `pass` |
|---|---|
| `docs_only` | Files exist, cross-refs resolve, no broken Markdown links in the changed files. |
| `package_local` | `npm run typecheck` clean for the touched package. |
| `app_local` | App-level typecheck + relevant test suite + no new lint errors. |
| `runtime_core` | `npm test -- --run` for touched modules + `npm run typecheck` + `npm run build` + `npx prisma validate` if Prisma touched. |
| `governance_policy` | ADR reference present + cross-file consistency check + no silent policy edits. |
| `ci_deployment` | Workflow YAML parses + at least one dry-run trigger recorded (PR or `act` run). |
| `infra_database` | Migration forward + rollback rehearsed + RLS sanity check + human sign-off recorded. |
| `production_sensitive` | All of the above + named human approver in the MSPR entry. |

## Bounded rework loop

To prevent infinite review cycles, the rework loop is bounded:

- A slice may be reworked at most **2** times.
- On the **3rd** review with `needs_rework`, the verdict becomes `blocked` and the slice is escalated to a human owner.
- The Reviewer is expected to write the loop counter into the MSPR entry's `progress.validationResults`.

## Verdict recording

Every verdict produces (or updates) a single MSPR entry (see `mspr_logbook.md`). The Reviewer is responsible for:

- Filling `review.scorecard` with the five scores and a one-line justification per score.
- Filling `review.status` with the verdict.
- Filling `review.risks` with named risks, even on `pass` (e.g. "low: doc-only, but adjacent governance may need follow-up").
- Filling `review.nextGate` with the explicit next step.
- Adding reusable findings to `agent_memory.md` **only** if the Reviewer scores `Evidence Quality >= 4` and the finding is durable.

## Reviewer hard limits

- The Reviewer may **not** edit the Builder's diff to fix it. Targeted rework notes only.
- The Reviewer may **not** mark `pass` without `Safety / Policy Compliance >= 4`.
- The Reviewer may **not** override the bounded rework loop, even with a verbal go-ahead.
- The Reviewer may **not** approve a slice whose `pathsInScope` does not match the actual changed files.
