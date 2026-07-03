# Bevero Production UI Smoke Runbook

Target: `https://bevero-ui.vercel.app`

Result before execution: `blocked`

Mode: read-only business verification; no shift activation

## Preconditions

- Environment-alignment matrix is complete and names one Supabase project ref.
- A separately approved deployment using that environment exists.
- Operator uses a dedicated smoke account. Credentials remain local and are
  never written to screenshots, logs, shell history, or evidence.
- Owner acknowledges that creating or refreshing an Auth session can update
  Supabase Auth metadata. This is not authorization for business-data writes.
- Browser network capture is enabled before navigation.
- A mutation-blocking harness aborts `POST`, `PUT`, `PATCH`, and `DELETE` calls
  to Bevero business APIs. Without that harness, do not open `/dashboard`.

## Stop Rules

Stop and mark `blocked` if any of the following occurs:

- target URL or network request references an unexpected Supabase project;
- any business mutation request is attempted;
- any shift draft, session, handover, refill run, movement, profile, or alert is
  created or updated;
- login redirects repeatedly, session validation fails, or a 5xx appears;
- customer rows, personal data, tokens, or request headers would enter evidence.

## Checklist

| Step | Check | Expected | Result |
|---|---|---|---|
| 1 | Open `/sign-in` | HTTP 200; form renders; no secret in URL | pending |
| 2 | Authenticate with dedicated smoke account | Redirect succeeds; no credential logged | pending |
| 3 | Verify observed Supabase/API origins | Match approved matrix; no unknown origin | pending |
| 4 | Open `/inventory/items` | Read-only list or valid empty state; no mutation request | pending |
| 5 | Open `/storage` | Read-only list or valid empty state; no mutation request | pending |
| 6 | Open `/movements` | Page renders; do not submit transfer/form | pending |
| 7 | Open `/alerts` | Role-correct list/empty/access-denied state; no action click | pending |
| 8 | Open `/settings/profile` | Page renders; do not save | pending |
| 9 | Open `/shift-handover` | Page shell/empty state only; no typing, start, save, or activation | pending |
| 10 | Open `/dashboard` only behind request blocking | Renders; any attempted mutation is blocked and fails the smoke | pending |
| 11 | Review network/console | No 5xx; no unexpected project; no unblocked business mutation | pending |
| 12 | Sign out if approved | Session ends; no other state change | pending |

`/inventory/bar-refill` is excluded from this P0 read-only smoke until its
runtime behavior is re-confirmed as non-mutating. The 2026-07-02 smoke observed
that dashboard loading could create a refill run; a later code fix exists
locally, but deployed status is not proven in this slice.

## Evidence Template

Record only:

- timestamp and operator;
- deployed commit/deployment ID;
- approved target role and project ref;
- route result: `pass | fail | skipped`;
- HTTP class, console error count, and mutation-attempt count;
- redacted screenshot names if screenshots contain no customer data;
- final result and exact blocker.

Do not record credentials, tokens, keys, cookies, headers, customer rows, or raw
network payloads.

## Pass Rule

This checklist is `pass` only when every non-excluded route passes, no business
mutation is attempted or completed, the observed target matches the approved
environment matrix, and the evidence is reviewed. A UI-smoke pass does not
close Backup/PITR and does not authorize Feature Work by itself.
