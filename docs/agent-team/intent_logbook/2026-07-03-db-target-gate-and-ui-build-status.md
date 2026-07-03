# Intent Memory — Bevero DB-Target-Gate Verification & UI-Build Status

- id: 2026-07-03-db-target-gate-and-ui-build-status
- timestamp: 2026-07-03T16:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-db-target-gate-and-ui-build-status.md`
- status: draft

## Core intention

Reaffirm, in current code, that Bevero's DB-target guardrail from `2026-07-02-database-target-guardrail` is still doing its job — failing closed when configuration is ambiguous — and that no silent fix was applied to `.env`, schema, or guard code. Without this verification, the gate could be circumvented by drift between `.env` and `.env.example`, or by a developer unsetting gate vars entirely.

## Logic followed

- **Treat DB targeting as an execution capability**, not as a connection-string check.
- **Read-only audit path first.** Run the gate, the typecheck, and the three production builds; capture stdout/stderr to `sandbox/diagnostics/2026-07-03/*.txt` for evidence.
- **Honor the AGENTS.md rule "Pflicht: Datenbank-Zielgate"**: any DB-bearing task without owner-approved target gates is blocked; this slice is *not* a DB-bearing task, so it stops at verification.
- **Honor the guardrail's fail-closed design**: a non-zero exit from `npm run db:verify-target` is the *correct* outcome when configuration is ambiguous, not a bug.
- **Do not silently rewrite `.env`.** URL/correct-target fixes require owner judgement: was a development ref intended, a local docker ref intended, or a production smoke ref intended?
- **Apply the work-documentation rule**: write both an MSPR record (what was run, what was found) and an Intent record (why it matters, what should be remembered).

## Design assumptions

- The current state of `.env` reflects the developer's last intended target, not necessarily the project's current intended target.
- `czinchfegtglmrloxlmh` (warenwirtschaft / rauschenberger-os) is the production target from a *different* OS layer and is **blocked** as a write target from this repo by `AGENTS.md`. Its appearance in `DATABASE_URL`/`DIRECT_URL` here is consistent with the previous P0 incident and is the reason the guard fails.
- All three production builds (Vite, Next.js, tsc) currently compile clean, so any "UI build error" the operator saw is either historical, environment-specific (different checkout), or referenced a CI signal that does not reproduce locally. The fix report must say so plainly.
- The work-documentation rule is the cheapest durable artifact: it costs nothing to write and is the only thing the next operator will read first.

## Tradeoffs

### Accepted

- Leaving `.env` untouched and *reporting* instead of *fixing*. Reason: the gate-var branch the user should pick (`local` / `development` / `production`) is a policy decision, not a code one.
- Recording only the *exit code and stderr message* of the gate, never URL contents. Reason: even though the script itself redacts secrets, surfacing them in a logbook maximizes blast radius if the file is shared.
- Capturing build/typecheck output in `sandbox/diagnostics/` rather than `evidence/`. Reason: per AGENTS.md, `evidence/` is for verified implementation state, not raw diagnostic noise.

### Rejected

- Applying a "safe default" gate-var combination (e.g., setting `BEVERO_DB_TARGET=development` and `BEVERO_EXPECTED_SUPABASE_REF=ienwshemokpsjwkedmyp` automatically). Reason: the operator asked for a *fix report*, not a silent fix; this also conflates target semantics with .env hygiene.
- Re-running the previous guardrail's 20-test suite today. Reason: the suite's behavior was confirmed by the `2026-07-02` slice; today's question is whether the gate *fails closed under current state*, not whether it passes its tests.
- Treating the failed `db:verify-target` as a defect. Reason: it is the *intended* outcome of the fail-closed design when BEVERO_DB_TARGET is unset; the configuration below the gate is the policy gap.

## Durable memory

- `BEVERO_DB_TARGET`, `BEVERO_EXPECTED_SUPABASE_REF`, `BEVERO_ALLOW_PRODUCTION_MIGRATION` belong in `.env` (per `.env.example`). They are not optional even when working fully locally on docker postgres.
- Current `apps/api/scripts/verify-database-target.ts` honors `process.env` only — it does not look at file contents directly. Therefore `.env` alone is *not* sufficient: any local shell `DATABASE_URL`/`DIRECT_URL` will be detected instead.
- The guard-rail layer (script + tests + `prisma.config.ts` + `db:migrate:deploy` wrapper) was implemented on `2026-07-02` and has not been touched since. The current gate behavior is stable.
- Prisma 6 schema is valid as of `2026-07-03`; the only Prisma CLI noise is an unrelated major-version upgrade notice.

## Do not reuse blindly

- The "detected production" message from the gate is *not* permission to point the local repo at the foreign production ref. Treat the message as a warning, not an authorization.
- The Prisma 6→7 upgrade notice is not a finding. Do not file a follow-up task just for it.
- "All three builds pass" is not "all three apps work in production". Build ≠ runtime smoke; runtime smoke ≠ policy verification. Do not collapse these layers.
- Do not run `db:verify-target` in a tight loop in CI without respecting its fail-closed exit semantics; CI runners that lack `.env` will all fail the same way and that is not the gate's fault.

## Relation to Bevero / Rauschenberger OS

- **location logic**: not applicable to this read-only diagnostic slice.
- **role/approval logic**: this slice respects L1 (auditor/reviewer) limits. Editing `.env`, performing any production migration, or running `prisma migrate deploy` would require L3 (production) or L2 (development) operator confirmation, even after URL correction.
- **inventory/procurement/shift-planning logic**: out of scope.
- **external-system boundary**: Supabase Refs confirmed at concept level (`ienwshemokpsjwkedmyp` bevero-os / dev, `czinchfegtglmrloxlmh` warenwirtschaft / production / pilot). No live Supabase read occurred.

## Next logic gate

Owner decision on the intended target:

1. **`local`** — keep docker postgres on `localhost:5432`; the verifier will accept the same-URL match with `BEVERO_DB_TARGET="local"` and no `BEVERO_EXPECTED_SUPABASE_REF`. No Supabase project is involved.
2. **`development`** (Bevero owned) — switch `.env` DATABASE_URL/DIRECT_URL to the pooler/direct host for `ienwshemokpsjwkedmyp`; set `BEVERO_DB_TARGET="development"` and `BEVERO_EXPECTED_SUPABASE_REF="ienwshemokpsjwkedmyp"`. Verifier then re-runs, expected to print `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development)`.
3. **`production`** — not in scope from this checkout; would require owner approval token, a separate gate, and the L3 approval pathway the previous incident opened.

Only after owner pick → re-run `npm run db:verify-target`; only then may any DB write or migration be considered.
