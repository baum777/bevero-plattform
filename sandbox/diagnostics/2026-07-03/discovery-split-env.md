# Diagnostic Discovery — Split-Env (.env vs apps/api/.env)

Date: 2026-07-03
Context: Operator chose Option B (development target = `ienwshemokpsjwkedmyp`),
then chose sub-path B.2 ("operator does URL swaps, agent sets only
gate-vars"). The first attempt at B.2 surfaced the issue below.

## Symptom

- `npx tsx apps/api/scripts/verify-database-target.ts` (direct invocation):
  → `Database target role mismatch: detected development, BEVERO_DB_TARGET is unset.`
- `npm run db:verify-target` (workspaces invocation):
  → `Database target role mismatch: detected production, BEVERO_DB_TARGET is unset.`

Same script, two answers.

## Root Cause

Two `.env` files exist in the repo with conflicting project references.
`dotenv.config({ path: ".env" })` reads relative to the process CWD.
`npm run` (workspaces mode) sets CWD = the workspace package dir, so the
verifier reads `apps/api/.env`, not root `.env`.

| File | Size | mtime | DATABASE_URL ref | NEXT_PUBLIC_SUPABASE_URL |
|---|---|---|---|---|
| `./.env` | 2218 B | 2026-07-03 | `ienwshemokpsjwkedmyp` (owned dev) | owned ref |
| `./apps/api/.env` | 2105 B | 2025-06-19 | `czinchfegtglmrloxlmh` (foreign prod) | old ref |

The `apps/api/.env` is a pre-incident snapshot from before the
2026-07-02 Supabase fresh-DB swap (see
`docs/agent-team/mspr_logbook/2026-07-02-supabase-fresh-db-env-swap.md`).
The URL values were updated inside the root `.env` but never propagated
to the workspace-resolved `apps/api/.env`.

## Probe evidence

Output of `sandbox/diagnostics/2026-07-03/probe-verify-env.ts`,
invoked with PWD = repo root:

```text
DATABASE_URL:
  hostname=aws-1-eu-central-1.pooler.supabase.com
  port=6543
  username_raw="postgres.ienwshemokpsjwkedmyp"
  username_decoded="postgres.ienwshemokpsjwkedmyp"
  derived_ref=ienwshemokpsjwkedmyp
  password_len=16
DIRECT_URL:
  hostname=aws-1-eu-central-1.pooler.supabase.com
  port=5432
  username_raw="postgres.ienwshemokpsjwkedmyp"
  username_decoded="postgres.ienwshemokpsjwkedmyp"
  derived_ref=ienwshemokpsjwkedmyp
  password_len=16
```

Output of the same probe with PWD = `apps/api/`:

```text
DATABASE_URL host=aws-0-eu-west-1.pooler.supabase.com port=6543
  decoded_user="postgres.czinchfegtglmrloxlmh"
  derived_ref=czinchfegtglmrloxlmh
DIRECT_URL host=aws-0-eu-west-1.pooler.supabase.com port=5432
  decoded_user="postgres.czinchfegtglmrloxlmh"
  derived_ref=czinchfegtglmrloxlmh
```

## Implication for Option B

Setting `BEVERO_DB_TARGET` + `BEVERO_EXPECTED_SUPABASE_REF` in only the
root `.env` will not make `npm run db:verify-target` pass: the verifier
loaded by npm reads `apps/api/.env`. Two paths to a coherent Option B:

1. **`apps/api/.env` becomes the source of truth** (matches today's npm
   behavior). Update its URLs + add gate-vars. Root `.env` becomes
   documentation / a snapshot of the same values.
2. **`./.env` becomes the source of truth.** Either delete
   `apps/api/.env` so npm falls back to root, or change the verifier
   to load root `.env` explicitly. Either way, all env reads must
   converge on owned-development values.

Either path requires operator-driven URL/password input for the owned
project, because `apps/api/.env` does not currently have correct
`DATABASE_URL`/`DIRECT_URL` values for `ienwshemokpsjwkedmyp`.

## Schema for change (template, values redacted)

```text
DATABASE_URL="postgresql://postgres.<OWNED_REF>:<DB_PASSWORD>@<POOLER_HOST>:<POOLER_PORT>/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<DB_PASSWORD>@db.<OWNED_REF>.supabase.co:5432/postgres?sslmode=require"
BEVERO_DB_TARGET="development"
BEVERO_EXPECTED_SUPABASE_REF="ienwshemokpsjwkedmyp"
```

## No `.env` edit applied in this slice

Per AGENTS.md fail-closed rule, the slice stopped as soon as the
discrepancy between the two `.env` files was visible, because the
operator-driven URL/password decision is now larger than initially
framed. Awaiting operator decision.
