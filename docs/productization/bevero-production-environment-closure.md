# Bevero Production Environment Closure

Date: 2026-07-03

Result: `partial`

Mode: guardrail-only / read-only verification

Feature work: `blocked`

## Decision

The incident is not closed. The local split-brain changed shape, but Production
alignment is not proven:

- The repository root `.env` now resolves `DATABASE_URL`, `DIRECT_URL`, and
  `NEXT_PUBLIC_SUPABASE_URL` to the Bevero Development project
  `ienwshemokpsjwkedmyp`.
- `apps/api/.env` and `apps/cockpit/.env.local` resolve their project-bearing
  variables to the foreign Rauschenberger/Pilot Production project
  `czinchfegtglmrloxlmh`.
- The required variable names exist in the `bevero-api` and `bevero-ui` Vercel
  Production scopes. Their encrypted values cannot be retrieved by the current
  read-only CLI session, so their project binding is unverified.
- The canonical boundary defines `ienwshemokpsjwkedmyp` as Bevero Development,
  not Bevero Production. No separate Bevero Production Supabase project is
  documented.

The remaining split-brain risk is therefore an explicit P0 Owner decision, not
an implementation task. The Owner must first declare whether the deployed
Vercel Production apps are a Rauschenberger/Pilot consumer or a future isolated
Bevero Production environment. No secret may be copied into this file.

## Closure Status Matrix

| Gate | Required state | Observed state | Status |
|---|---|---|---|
| Deployment role | One named owner, role, and Supabase ref | `czinch...` is foreign Pilot Production; `ienws...` is Bevero Development; no Bevero Production ref exists | `blocked` — P0 Owner decision |
| `DATABASE_URL` | Pooled URL for the declared API project | Present in Vercel Production; value/ref not retrievable | `blocked` |
| `DIRECT_URL` | Direct URL for the same ref as `DATABASE_URL` | Present in Vercel Production; value/ref not retrievable | `blocked` |
| `SUPABASE_JWT_SECRET` | Auth verifier material for the same declared project and current API implementation | Present in Vercel Production; binding not retrievable | `blocked` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL for the same declared project | Present in `bevero-ui` Production; value/ref not retrievable | `blocked` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key belonging to that URL | Present in `bevero-ui` Production; pairing not verifiable | `blocked` |
| Legacy anon key | Used only as an explicitly recorded compatibility exception | No `NEXT_PUBLIC_SUPABASE_ANON_KEY` contract in cockpit code | `pass` — not required |
| Local root env | All project-bearing values use one ref | Three derivable values use `ienws...`; secret/key binding remains opaque | `partial` |
| App-local env | Each app-local set uses one declared ref | API and Cockpit app-local values use `czinch...`; they drift from root | `partial` |
| UI smoke | Current deployment checked without business mutations or shift activation | Not run in this slice; 2026-07-02 evidence is stale and its dashboard visit caused a POST | `blocked` |
| Backup/PITR | Enabled and verified, or explicit Owner risk acceptance | Prior evidence reports no visible backups; no current proof | `blocked` — P0 Owner gate |
| Feature work | Allowed only after all P0 gates close | Env, smoke, and backup/PITR gates remain open | `blocked` |

## Safe Operator Runbook — Environment Alignment

This runbook authorizes no changes by itself. Use a separate Owner-approved
Production configuration window. Do not run migrations, seeds, Prisma write
commands, deploys, or Production data writes while executing it.

### Gate 1 — Declare the target

Choose exactly one target and record the decision without credentials:

1. **Pilot Production consumer:** all API/Auth/Cockpit values bind to
   `czinchfegtglmrloxlmh`; ownership remains `rauschenberger-os`; Bevero
   productization migrations remain forbidden.
2. **Bevero Development:** all values bind to `ienwshemokpsjwkedmyp`; this is
   not a Production closure and must not be represented as one.
3. **Isolated Bevero Production:** stop until a separately owned Production
   Supabase project, backup/PITR posture, and project ref are approved.

Do not mix these roles. If the target is not explicit, stop.

### Gate 2 — Prepare one coherent value set

Retrieve values directly from the selected Supabase project's Dashboard. Keep
them only in the secret manager/Vercel UI.

| Variable | Required binding |
|---|---|
| `DATABASE_URL` | Selected project, pooled/runtime connection |
| `DIRECT_URL` | Same project ref, direct connection |
| `SUPABASE_JWT_SECRET` | Same Auth project and compatible with the API's current legacy-secret verifier |
| `NEXT_PUBLIC_SUPABASE_URL` | Same project ref |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key created by the same project |

Prefer the current Supabase publishable key. A legacy `anon` key may be used
only as a documented compatibility exception and only in the browser-safe
variable consumed by the Cockpit. Never place a secret key, `service_role` key,
database password, or JWT secret in any `NEXT_PUBLIC_*` variable.

If the selected project has migrated to asymmetric JWT signing keys, stop: the
current API contract still requires `SUPABASE_JWT_SECRET`. Auth-verifier
modernization is a separate implementation/security slice, not an env hotfix.

### Gate 3 — Apply under separate Owner approval

- In Vercel `bevero-api` Production, update the three backend variables as one
  change set.
- In Vercel `bevero-ui` Production, update URL and publishable key as one change
  set.
- Do not change Preview or Development implicitly.
- Do not retain duplicate legacy/public variables unless a named consumer uses
  them.
- Record only variable names, target role, project ref, operator, timestamp, and
  Vercel project IDs. Never record values.

Environment changes do not prove the currently deployed bundle/runtime. A
separate deploy authorization is required before the new values can be called
active. No deploy is authorized by this closure document.

### Gate 4 — Verify without revealing values

The operator must return a secret-free result for each variable:

- present/missing;
- selected project ref or `binding-unverifiable`;
- URL pair same/different;
- publishable-key/URL probe pass/fail;
- JWT verifier compatibility pass/fail;
- Production scope confirmed yes/no.

Any mismatch is `blocked`. Do not repair it by running a migration or seed.

### Gate 5 — Runtime and recovery

After a separately approved deployment:

1. Execute the read-only UI checklist in
   `docs/productization/bevero-production-ui-smoke-runbook.md`.
2. Resolve the Backup/PITR Owner gate: enable and verify recovery coverage, or
   sign an explicit P0 risk acceptance with owner and expiry/review date.
3. Reissue this matrix. Only then may Feature Work be reconsidered.

## Next Allowed Work Block

**P0 Owner Env Alignment + protected UI smoke + Backup/PITR decision.**

Until all three are evidenced, allowed work is limited to read-only verification
and guardrail/evidence documentation. Feature work, migrations, seeds,
Production writes, deploys, and shift-flow activation remain blocked.
