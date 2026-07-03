# Intent Memory — Bevero B.2c Verification Pass

- id: 2026-07-03-bevero-b2c-verification-pass
- timestamp: 2026-07-03T18:30:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-bevero-b2c-verification-pass.md`
- status: reviewed

## Core intention

Close the B.2c handoff by independently verifying that the operator's
`.env` edits produced a configuration state which satisfies Bevero's
DB-target gate from every known invocation path. The convergence of
five independent checks is the deliverable, not the single
`npm run db:verify-target` exit code alone — because the original
problem was *not* a flaky verifier, but a CWD-relative `.env` lookup
that silently hid a split-brain.

## Logic followed

- Verify from two CWDs (root and `apps/api/`) directly, plus verify from
  the npm-workspaces invocation (`npm run`). The three together cover
  the CI/CD path, the local development path, and the monorepo-design
  path.
- Probe both `.env` files independently to confirm the URLs themselves
  resolve to the owned ref, not just that the verifier is satisfied.
- Treat `pass` as *target verification*, mirroring the
  `2026-07-02-database-target-guardrail` distinction between a passing
  guard and standing approval to migrate.

## Design assumptions

- The operator edited both `.env` files to align URLs and gate-vars on
  the owned development target. Both probes confirm gate-vars are
  present and the URL-derived ref matches.
- Pooler region in `apps/api/.env` is now `aws-1-eu-central-1`, matching
  root `.env`. The two files are structurally in sync.
- `SUPABASE_JWT_SECRET` and `SUPABASE_SECRET_KEY` were not part of this
  verification slice; their alignment with the owned project is a
  separate question that the operator already handled (the value
  lengths are identical to before, and the `2026-07-02-supabase-fresh-db-env-swap`
  logbook noted that they had not been re-issued for the new project —
  but this slice is not in scope to revisit that decision).

## Tradeoffs

### Accepted

- Verifier exit 0 from the npm-workspaces path is necessary but not
  sufficient; convergence is only proven when the same answer comes
  from the direct `npx tsx` invocation in both CWDs.
- The probe script in `sandbox/` reads `.env` via `dotenv.config({path:
  ".env"})`; this is CWD-relative like the verifier, so the dual-probe
  design mirrors the dual-verifier design.
- Not running a live connection test. The verifier is structural; a
  full `prisma migrate status` or smoke query is a *runtime* test
  belonging to a future, separately-approved slice.

### Rejected

- Auto-patching `apps/api/scripts/verify-database-target.ts` to also
  load root `.env` so a missing gate-var in `apps/api/.env` would
  still pass. Reason: that would hide the next regression instead of
  surfacing it; current convergence is real, not faked.
- Treating `npm run db:verify-target` exit 0 as license to immediately
  run `prisma migrate deploy`. Reason: per the
  `2026-07-02-database-target-guardrail` intent, a passing guard is
  target verification, not standing approval. Schema or data migrations
  remain under L2/L3 approval.

## Durable memory

- When investigating DB-gate failures, *always* probe the verifier from
  both the npm invocation and a direct invocation from each relevant
  CWD; the discrepancy itself is the diagnostic.
- The owned development pooler region for `ienwshemokpsjwkedmyp` is
  `aws-1-eu-central-1` in this checkout. If a future checkout has a
  different region, the *function* of the verifier is unchanged but
  the literal hostname will differ; do not hard-code the hostname.
- Two `.env` files agreeing is itself a durable artifact of this slice;
  future env changes must update both atomically or collapse to one.

## Do not reuse blindly

- Do not assume both `.env` files stay in sync automatically; treat any
  new divergence as a new finding, not a routine edit consequence.
- Do not extend `verify-database-target.ts` with a fallback to a
  different `.env` path; that masks drift instead of surfacing it.
- Do not collapse the verification pattern to a single path under the
  rationale that "npm is what CI uses"; the dual-probe is what catches
  the next split-brain.

## Relation to Bevero / Rauschenberger OS

- **location logic**: N/A.
- **role/approval logic**: this slice stays at L0 (read-only
  verification); DB operations remain L2/L3-gated.
- **inventory/procurement/shift-planning logic**: N/A.
- **external-system boundary**: `ienwshemokpsjwkedmyp` (bevero-os /
  development) is the verified target. `czinchfegtglmrloxlmh`
  (warenwirtschaft / production / pilot) remains the foreign target
  and is unchanged.

## Next logic gate

Future migrations, seeds, or deployments against the verified target.
Each such step requires its own MSPR/intent slice with explicit
L2/L3 approval per the existing guardrail. The next occasion that
*adds a new Supabase project* to the registry must also revisit the
owner's documented projections and add a corresponding guard entry.
