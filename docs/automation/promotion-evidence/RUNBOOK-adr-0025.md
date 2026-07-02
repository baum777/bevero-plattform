# RUNBOOK — ADR-0025 Phase E Shift Handover Draft Policy Promotion

**Audience:** Human owner (the only role authorized to type the apply command).
**Author of this runbook:** Mavis (orchestrator).
**Date:** 2026-06-09.
**ADR:** [`docs/DECISIONS.md` §ADR-0025](../../DECISIONS.md#adr-0025-adopt-phase-e-shift-handover-draft-endpoints-accepted).
**Target project:** Supabase project `czinchfegtglmrloxlmh` (the same project promoted by ADR-0028 on 2026-06-08).
**Migration to apply:** `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` (forward-only; 2 write policies on `ShiftHandoverDraft` + 2 write grants + 1 `DO $$` regression guard).
**Verification script:** `scripts/verify-adr-0025-handover-draft-policies.ts` (12-query gate; the sibling of the ADR-0028 12-query script; reads-only).

**On-disk SHA-256 placeholders (filled at apply time by the owner):**

| Artifact | Path | SHA-256 at apply time |
|---|---|---|
| On-disk migration | `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` | `b438f400c0d9045fb66aa16ff488026eb2b54af1c6b46158667ecaff89c39202` |
| Verification script | `scripts/verify-adr-0025-handover-draft-policies.ts` | `ac438ca1dce0f5198ad3c43114b1f03fb3cdcd98c47ab99e355b684279385315` |
| This runbook | `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` | `847f318d9efb96f31f48ad43923643a9ace3a8a5f6ab42cb6374f469436cfc56` |

## Pre-flight (1 minute)

1. Open a terminal.
2. `cd ~/Schreibtisch/workspace/main_projects/bevero-webapp`
3. `git checkout phase-b-multistandort && git pull --rebase` (sanity: you're on `phase-b-multistandort` at SHA `d4e6570` or later; HEAD already has the `20260608175159` migration on disk and the 4 new promotion artifacts).
4. `npx prisma validate` → expect `The schema at prisma/schema.prisma is valid`.
5. `npx tsc --noEmit -p tsconfig.json` → expect no output, exit 0.
6. `npx tsc --noEmit -p apps/cockpit-next/tsconfig.json` → expect no output, exit 0.
7. `npx vitest run tests/shift-handover.routes.test.ts` → expect `10 passed`.
8. `npx vitest run tests/automation.routes.test.ts` → expect `8 passed`.
9. `npx vitest run` → expect `518/518 passed` across 63 files (the full suite; no regression introduced by this promotion-prep slice).
10. Compute the 3 SHAs for the artifacts table above:

    ```bash
    sha256sum prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql \
              scripts/verify-adr-0025-handover-draft-policies.ts \
              docs/automation/promotion-evidence/RUNBOOK-adr-0025.md
    ```

    Paste the 3 SHA-256 hex strings into the table above. The orchestrator uses the same 3 SHAs in the provenance file `docs/automation/promotion-evidence/2026-06-09-adr-0025.md` and in the closure MSPR `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md`.

## Apply (1 minute, owner-typed only)

11. **Set the connection string.** Substitute `<password>` with the Supabase `postgres` role password. The password is a secret; it lives in your terminal session only, never in a file.

    ```bash
    export DATABASE_URL="postgresql://postgres:<password>@db.czinchfegtglmrloxlmh.supabase.co:5432/postgres"
    export DIRECT_URL="$DATABASE_URL"
    ```

12. **Check the current state.** Confirms the 1 pending migration is what we expect.

    ```bash
    npx prisma migrate status
    ```

    Expected output: `30+ migrations found in prisma/migrations ... 1 not yet applied` listing exactly:
    - `20260608175159_automation_handover_draft_policies`

13. **Apply the migration.** This is the one destructive step. It runs the migration in a transaction; if any statement fails, the whole transaction is rolled back.

    ```bash
    npx prisma migrate deploy
    ```

    Expected output: `1 migration applied` listing the filename above. The migration's own `DO $$` regression guard (line 80-120 of `migration.sql`) will raise an exception and roll back the apply if the `ShiftHandoverDraft` table, the 2 new write policy names, or the `app_runtime` role are missing. The expected verdict is `Database schema is up to date!`.

14. **Confirm the state.**

    ```bash
    npx prisma migrate status
    ```

    Expected output: `Database is up to date!` with `0 not yet applied`.

## Verify (1 minute)

15. **Run the 12-query gate.** This is the hard verification. Read-only; all 12 queries are pure catalog reads against `pg_catalog`, `pg_policies`, `pg_trigger`, `pg_roles`, and `information_schema.role_table_grants`.

    ```bash
    npx tsx scripts/verify-adr-0025-handover-draft-policies.ts
    ```

    Expected output: 12 lines, all `PASS`, summary `12/12 passed, 0/12 failed`, `VERDICT: PASS. Phase E Shift Handover Draft write policies are correctly applied to the live database.`. If `VERDICT: FAIL.` with one or more failing check IDs, do NOT proceed to let Cockpit consume the new endpoints — send the failing check IDs, the expected-vs-actual lines, and the `npx prisma migrate status` post-apply output to the orchestrator and BLOCK per §Rollback / re-run.

## Hard guardrails reaffirmed

- No `npx prisma migrate dev` is run at any point (the dev variant would try to reset the schema or prompt for a new migration name; the deploy variant is the only one authorized for a shared environment).
- No `.env*` file is written. The `DATABASE_URL` lives in the owner's shell session only.
- No service-role credential is introduced in any user-path code (the same posture as ADR-0028 and ADR-0025 §RLS / Grant Plan).
- No destructive `DROP TABLE` / `DROP POLICY` is applied to the existing B-1 schema (the new migration `DROP POLICY IF EXISTS` lines 25 and 43 are idempotent guards; they target only the 2 new policy names and would be no-ops if the policies do not exist).
- No impersonation of the `authenticated` role for row-level RLS testing. The 12-query gate asserts policy existence + grant existence + role posture (`rolbypassrls = f`); row-level behavior (User A reads Org B's `ShiftHandoverDraft` returns 0) is deferred to a follow-up slice because it requires a JWT-aware connection pool.

## Rollback / re-run

The slice is one forward-only migration. To roll back:

1. `git revert` the commit that added the migration and the 4 promotion artifacts.
2. Run the manual cleanup against the database (mirror of `migration.sql`'s `DO $$` prerequisites in reverse):

    ```sql
    DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_insert" ON "ShiftHandoverDraft";
    DROP POLICY IF EXISTS "shift_handover_draft_lead_or_manager_update" ON "ShiftHandoverDraft";
    REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM authenticated;
    REVOKE INSERT, UPDATE ON TABLE "ShiftHandoverDraft" FROM app_runtime;
    ```

3. `npx prisma generate` to refresh the client.
4. Confirm the 8 existing automation read-route tests + the 10 new shift-handover tests still pass (the B-5 + E-1/E-3/E-4 gates are unaffected by the rollback; the 10 shift-handover tests will fail at the route layer with 401/403/404 because the write policies are gone, but the `tests/automation.routes.test.ts` 8/8 will remain green).

### BLOCKED escalation

If any of the 12 verification queries fails (`VERDICT: FAIL.`), the promotion is BLOCKED. The owner does NOT proceed to let Cockpit consume the new endpoints. The orchestrator reviews the failing check IDs and either:
- Files a forward-only correction migration (additive; never destructive), OR
- Files a new ADR documenting the discrepancy and the corrective path.

### Forward-only correction path

If a query fails because the migration is partially applied (e.g. only 1 of the 2 policies is present), the fix is a new forward-only migration that brings the catalog to the expected state. It is NEVER a `DROP` of the existing policies + `CREATE` (that is destructive and would also drop the new `app_runtime` grants). The new migration is the additive sibling.

## Cross-references

- ADR-0025 (accepted) — the gate; defines the 2 new write policies and the 3 endpoints.
- ADR-0028 (accepted) — the Phase B live-DB promotion that this slice is the sibling of. The 12-query shape, the human-in-the-loop split, and the provenance file template are all inherited.
- `docs/DECISIONS.md` §ADR-0025 — the 2 write policies (`shift_handover_draft_lead_or_manager_insert` + `shift_handover_draft_lead_or_manager_update`) and the 2 grants (`GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO authenticated, app_runtime`).
- `docs/automation/promotion-evidence/2026-06-09-adr-0025.md` — the durable evidence / provenance file (to be filled by the orchestrator after the apply).
- `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` — the closure MSPR for this promotion slice.
- `scripts/verify-adr-0025-handover-draft-policies.ts` — the 12-query verification script.
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for any DB write slice; this runbook is the Tier 3 evidence record.
- MSPR-2026-06-09-phase-e-handover-drafts.md — the upstream E-1/E-3/E-4/E-5 closure entry that introduced the on-disk migration.
