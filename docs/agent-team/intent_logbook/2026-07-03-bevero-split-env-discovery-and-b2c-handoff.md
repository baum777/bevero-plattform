# Intent Memory — Bevero Split-Env Discovery & B.2c Handoff

- id: 2026-07-03-bevero-split-env-discovery-and-b2c-handoff
- timestamp: 2026-07-03T16:30:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-bevero-split-env-discovery-and-b2c-handoff.md`
- status: draft

## Core intention

Lock in two durable lessons learned in this slice:

1. **`dotenv.config({ path: ".env" })` is CWD-relative, not repo-root-relative.**
   Two `.env` files with the same key but different values is a real risk
   in a monorepo with npm workspaces, and the divergence is invisible
   unless someone compares both `npx` and `npm run` invocation paths.
2. **Bevero's guardrail correctly *fails closed* across this divergence.**
   The same script reported `detected development` from the root and
   `detected production` from the workspace. Neither was wrong — each
   honestly reported what it saw. The lesson is in the user's
   reaction: if you ever see one verifier see `development` and another
   see `production`, you have a *split target*, not a flaky test.

The B.2c path preserves operator authority over `.env` (which is the
only file holding real secrets) while still letting the agent supply
verifiable evidence on the other side of the change.

## Logic followed

- Honor AGENTS.md fail-closed: the moment the two-verifier discrepancy
  became visible, stop and surface the structural problem; do not apply
  partial `.env` edits that would only mask half of it.
- Per B.2c: the operator owns all `.env` content changes. The agent
  owns verification, documentation, and the gate at the end.
- Per the work-documentation rule: every non-trivial step is a slice with
  both MSPR (execution evidence) and Intent (durable memory) entries.

## Design assumptions

- The operator's local `.env` already contains correct, owned-ref URLs
  for the `bevero-os` development project (verified during this slice).
  No new secrets need to be generated.
- The split-env is a side-effect of the 2026-07-02 swap, not an active
  policy. Aligning `apps/api/.env` to root `.env` (Option B.2a) is the
  smallest correct change.
- The agent's re-verification is the trigger for closing this slice.
  Until then, the slice stays at `status: needs_operator_action`.

## Tradeoffs

### Accepted

- Verifier returns different roles for the same data depending on CWD.
  This is a feature, not a bug — it makes the CWD-relative `.env` lookup
  a property the agent can probe and explain.
- Root `.env` and `apps/api/.env` are kept as two files (collapsed
  Source-of-truth is a separate, larger refactor; not in scope).
- `apps/api/.env` is the npm-resolved file under workspaces; the
  boundary doc's recommended `.env.bevero-dev`-style separation is
  deferred to a separate environment-cleanup slice.

### Rejected

- Patching `verify-database-target.ts` to also load root `.env`. Reason:
  the CWD-relative load is consistent with how the project ships; a
  one-off patch here would not generalize, and the boundary doc's
  long-term direction is to split envs cleanly rather than overload one.
- Symlinking `apps/api/.env` to root `.env`. Reason: tooling like
  Vercel/Supabase/Vault users sometimes read by name; a symlink would
  surprise them. Better to keep two files and ensure they agree.
- Setting `BEVERO_DB_TARGET` only in root `.env` and expecting a pass.
  Reason: that would mask half of the split (URL-only in apps/api/.env
  would still point at production) and the verify-target run would
  still fail with a different message, leaving the same divergence
  visible next time.

## Durable memory

- Two `.env` files can quietly disagree in npm-workspaces monorepos;
  always probe the verifier from both invocations when investigating
  gate failures.
- `npx tsx <script>` and `npm run <script>` are not equivalent in
  workspaces mode — only the latter sets CWD to the workspace package.
- `ienwshemokpsjwkedmyp` (bevero-os / dev) is the only correct owned ref
  for this repo. Anything else is either local (`local`) or foreign
  (`czinchfegtglmrloxlmh`).
- A passing `db:verify-target` is a *target verification*, not standing
  approval to migrate. The previous `2026-07-02` rule still applies.

## Do not reuse blindly

- Do not collapse root `.env` and `apps/api/.env` by hardcoding one path
  in the verifier; that would hide future divergences instead of
  surfacing them.
- Do not treat a single `db:verify-target` run as proof that all paths
  work; run both the npm invocation and a direct `npx` invocation when
  investigating.
- Do not assume any of the URLs is up to date based on a recent commit;
  the operator may have rolled the urls back to a backup.

## Relation to Bevero / Rauschenberger OS

- **location logic**: N/A.
- **role/approval logic**: B.2c keeps env-side changes under operator
  authority; the agent's role remains read-only / verification-only.
  Production operations still require the L3 approval pathway from
  prior slices.
- **inventory/procurement/shift-planning logic**: N/A.
- **external-system boundary**: Supabase refs unchanged from prior
  intent entries (`ienwshemokpsjwkedmyp` owned, `czinchfegtglmrloxlmh`
  foreign). No live Supabase read occurred in this slice.

## Next logic gate

The operator's `.env` edits. After operator signals done, the agent's
next slice will:

1. Re-run both invocations (`npx tsx` and `npm run`) of
   `verify-database-target` and confirm both yield
   `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development).`
2. Update the fix-report Appendix A from "Pending" to "Resolved",
   attaching the fresh transcripts and any `.env.example` deltas.
3. Mark this slice's MSPR status as `pass` and link the follow-up
   entry.

Only after that should any DB write, schema migration, or deployment
be considered.
