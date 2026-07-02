# Post-Promotion Checklist — ADR-0025 Phase E Shift Handover Drafts

**Audience:** Human owner (`cheikh.witm@proton.me`).
**Author of this checklist:** Mavis (orchestrator). This is the marketing-grade companion to the engineering-grade runbook at `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (128 lines, 15 steps). The runbook is the procedure; this checklist is the quick reference. Both should exist; the runbook is for the meticulous, the checklist is for the time-pressed.
**Date:** 2026-06-09.
**ADR:** [`docs/DECISIONS.md` §ADR-0025](../../DECISIONS.md#adr-0025-adopt-phase-e-shift-handover-draft-endpoints-accepted) (lines 807-940, `Status: accepted`).
**Target project:** Supabase project `czinchfegtglmrloxlmh` (the same project promoted by ADR-0028 on 2026-06-08 and ADR-0029-A on 2026-06-09).
**Migration to apply:** `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` (forward-only; 2 write policies on `ShiftHandoverDraft` + 2 write grants + 1 `DO $$` regression guard).
**Verification script:** `scripts/verify-adr-0025-handover-draft-policies.ts` (12-query gate; read-only; refuses to run against localhost / 127.0.0.1; refuses to run without `DATABASE_URL`).
**Closure source of truth:** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (this checklist's verdict flips to `accepted` only after the 4 conditions at the bottom of that file are met).

**Time budget:** ~5 minutes if the Supabase dev project is already created and the Owner is online. The pre-flight is 1 minute, the apply is 1 minute, the verify is 1 minute, the record is 2 minutes (3 SHAs + 4 docs + 1 MSPR). The Cockpit smoke is 5-10 minutes of manual clicking.

---

## Before the promotion (10 steps, ~1 minute)

The runbook's pre-flight (§Pre-flight, 10 steps) is the engineering-grade procedure. This is the human-readable summary.

1. Open a terminal.
2. `cd /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp`
3. `git checkout phase-b-multistandort && git pull --rebase` (sanity: you're on `phase-b-multistandort` at SHA `d4e6570` or later; HEAD already has the `20260608175159` migration on disk and the 4 new promotion artifacts).
4. `npx prisma validate` → expect `The schema at prisma/schema.prisma is valid`.
5. `npx tsc --noEmit -p tsconfig.json` → expect no output, exit 0.
6. `npx tsc --noEmit -p apps/cockpit-next/tsconfig.json` → expect no output, exit 0.
7. `npx vitest run tests/shift-handover.routes.test.ts` → expect `10 passed`.
8. `npx vitest run tests/automation.routes.test.ts` → expect `8 passed`.
9. `npx vitest run` → expect `518/518 passed` across 63 files (the full suite; no regression introduced by the promotion-prep slice).
10. Compute the 3 SHAs for the artifacts table in the runbook (top of file, lines 13-17):

    ```bash
    sha256sum prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql \
              scripts/verify-adr-0025-handover-draft-policies.ts \
              docs/automation/promotion-evidence/RUNBOOK-adr-0025.md
    ```

    Paste the 3 SHA-256 hex strings into the runbook's artifacts table (lines 15-17). The orchestrator uses the same 3 SHAs in the provenance file `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (lines 21, 27, 33) and in the closure MSPR `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` §SHA pairings block.

---

## Apply (4 owner-typed commands, ~1 minute)

The runbook's apply section (§Apply, 4 steps) is the engineering-grade procedure. This is the human-readable summary. The Owner is the only role authorized to type these commands. The orchestrator does NOT type them.

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

---

## Verify (1 command, ~1 minute)

15. **Run the 12-query gate.** This is the hard verification. Read-only; all 12 queries are pure catalog reads against `pg_catalog`, `pg_policies`, `pg_trigger`, `pg_roles`, and `information_schema.role_table_grants`.

    ```bash
    npx tsx scripts/verify-adr-0025-handover-draft-policies.ts
    ```

    Expected output: 12 lines, all `PASS`, summary `12/12 passed, 0/12 failed`, `VERDICT: PASS. Phase E Shift Handover Draft write policies are correctly applied to the live database.`

    If `VERDICT: FAIL.` with one or more failing check IDs, do NOT proceed to let Cockpit consume the new endpoints. See §Escalate if blocked below.

---

## Record (3 SHAs + 4 docs + 1 MSPR, ~2 minutes)

After the 12-query gate reports `VERDICT: PASS.`, record the evidence.

### 3 SHAs to compute (already done in step 10 above)

- `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` SHA-256
- `scripts/verify-adr-0025-handover-draft-policies.ts` SHA-256
- `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` SHA-256

These 3 SHAs are pasted into 3 places, in this order:
1. The runbook's artifacts table (lines 15-17 of `RUNBOOK-adr-0025.md`).
2. The provenance file's §Migration SHAs at apply time (line 21) + §Verification script SHA (line 27) + §Runbook SHA (line 33) of `2026-06-09-adr-0025.md`.
3. The closure MSPR's §SHA pairings block of `2026-06-09-adr-0025-promotion-closure.md`.

### 4 docs to update (after the 3 SHAs are pasted)

- `docs/automation/promotion-evidence/2026-06-09-adr-0025.md` — fill all `TBD` cells: the 12-row §12-query results table (lines 79-90), the §Pre-apply / apply / post-apply code blocks (lines 37-71), the §Postgres version code block (line 97), the §Sign-off timestamps (lines 117-118), and the §Verdict line (line 121).
- `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` — the 3 SHAs are already in the artifacts table from step 10; no other edit needed in the runbook.
- `docs/automation/implementation-plan.md` — apply the patch from `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md`. Specifically: 2 text edits to lines 36, 37, 134 (Phase E row + Phase E promotion-prep row + §4 Phase E E-2 status note); 7 explicit no-op confirmations.
- `README.md` — update the Active Specs & Roadmap §Phase E row at line 161 from "page shipped (ccf0f50), LLM-synthesized handover draft still pending" to "promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS; LLM-synthesized handover draft remains out of scope for Phase F)".

### 1 MSPR to close (after the 4 docs are updated)

- `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` — flip the YAML frontmatter `verdict: pending` (line 7) to `verdict: accepted`; fill the 12 `TBD` cells in the §12-query result table (lines 117-128 of the Implementer's `2026-06-09-adr-0025-promotion.md`); paste the `npx prisma migrate deploy` output into the §Addendum — Slice state (closure, promotion-prep only) block at line 109. The 1 closure addendum is the SOLE evidence of the `accepted` state for the promotion slice.
- `docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` — the upstream Phase E implementation closure. The `nextGate` section at line 104 names the live-DB promotion as the open item; update it to point to `2026-06-09-adr-0025-promotion-closure.md` as the resolution. The 1-line edit is a documentation-only follow-up.

---

## Smoke (6 expected status codes, ~5-10 minutes of manual clicking)

The post-promotion Cockpit user-path smoke is the follow-up gate. A real user logs into Cockpit and exercises the new backend-backed draft page. The 6 expected status codes are:

1. **200 GET** — `GET /shift-handover/draft` for a staff+ user on first call: auto-creates the draft and returns `200 { "draft": ShiftHandoverDraftPublicDTO }`.
2. **200 PATCH** — `PATCH /shift-handover/draft` for a staff+ user with a valid body (one of `summary`, `openItems`, `alerts`, `notes`): returns `200 { "draft": ShiftHandoverDraftPublicDTO }` with the updated field.
3. **200 confirm** — `POST /shift-handover/draft/:id/confirm` for a manager+ user: sets `confirmedAt = now()` and returns `200 { "draft": ShiftHandoverDraftPublicDTO (with confirmedAt set), "archiveId": string }`.
4. **409 PATCH-after-confirm** — `PATCH /shift-handover/draft` for a staff+ user on a draft that is already `confirmedAt IS NOT NULL`: returns `409` (immutable post-confirm per the `shift_handover_draft_lead_or_manager_update` policy's `WITH CHECK (confirmedAt IS NULL)` clause and the route gate's check).
5. **429 PATCH within 2s of last PATCH** — `PATCH /shift-handover/draft` for a staff+ user on a 2nd request within 2 seconds of the 1st: returns `429` (per the in-memory LRU throttle keyed on `userId` with a 2-second sliding window, documented in `docs/DECISIONS.md` row 856 as "defense in depth, not the primary correctness gate").
6. **404 unknown id** — `POST /shift-handover/draft/:id/confirm` for a manager+ user with an unknown `:id`: returns `404` (per the route gate's `findFirst` check; the 12-query gate does not exercise row-level behavior, so this is the manual path).

A future slice (ADR-0025.ci or similar) may add a Playwright-based browser smoke to the CI workflow that automates these 6 status codes. For this slice, the smoke is owner-run, evidence-recorded.

**Smoke runner:** `scripts/smoke-cockpit-shift-handover.ts` (sibling of `scripts/smoke-inventory-api.ts`; runnable via `npx tsx scripts/smoke-cockpit-shift-handover.ts`; refuses localhost; refuses missing `DATABASE_URL`; uses 1 seeded smoke `OrganizationMember` with `role: 'manager'` mapped to route role `shift_lead`; records the 6 outcomes in a structured result table; exits 0 on pass, 1 on fail, 2 on config error). The 6 outcomes and the verdict are recorded in the closure MSPR `docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md` (YAML frontmatter `verdict: blocked` at author time; flips to `accepted` after the Owner runs the smoke and pastes the 6 outcomes into the §6 status codes block).

---

## Escalate if blocked

If any of the 12 verification queries fails (`VERDICT: FAIL.`), the promotion is BLOCKED. The Owner does NOT proceed to let Cockpit consume the new endpoints. The orchestrator reviews the failing check IDs and either:

- Files a forward-only correction migration (additive; never destructive), OR
- Files a new ADR documenting the discrepancy and the corrective path.

The escalation path mirrors the ADR-0028 runbook §BLOCKED escalation. The Owner sends the failing check IDs, the expected-vs-actual lines, and the `npx prisma migrate status` post-apply output to the orchestrator. The orchestrator decides between the 2 options above.

### Rollback (if a forward-only correction is not possible)

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

### Forward-only correction path (if the catalog is partially drifted)

If a query fails because the migration is partially applied (e.g. only 1 of the 2 policies is present), the fix is a new forward-only migration that brings the catalog to the expected state. It is NEVER a `DROP` of the existing policies + `CREATE` (that is destructive and would also drop the new `app_runtime` grants). The new migration is the additive sibling.

---

## Cross-references

- **Runbook (engineering-grade):** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (128 lines, 15 steps).
- **Provenance file (audit anchor):** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (122 lines; 12-row result table at lines 79-90; 3 SHA placeholders at lines 21, 27, 33).
- **Implementer's `partial` MSPR:** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` (138 lines; flips to `accepted` after the 4 apply conditions are met).
- **Closure addendum (post-promotion):** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (the file this checklist cross-references; YAML frontmatter `verdict: pending`).
- **Post-promotion plan-doc patch:** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md` (the 9-enumerated-edit patch; 2 of 9 are text changes to lines 36, 37, 134).
- **Upstream Phase E implementation closure:** `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (104 lines; the `nextGate` at line 104 names the live-DB promotion as the open item; updated to point to the closure addendum after the promotion succeeds).
- **ADR-0025 (accepted, the gate):** `docs/DECISIONS.md` lines 807-940.
- **ADR-0028 (accepted, the analog precedent):** `docs/DECISIONS.md` lines 942-1140.
- **Verification script:** `scripts/verify-adr-0025-handover-draft-policies.ts` (448 lines; 12-query read-only gate).
- **Migration on disk:** `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` (122 lines; 2 policies + 2 grants + 1 `DO $$` regression guard).

## Hard guardrails reaffirmed

- No `npx prisma migrate dev` is run at any point (the dev variant would try to reset the schema or prompt for a new migration name; the deploy variant is the only one authorized for a shared environment).
- No `.env*` file is written. The `DATABASE_URL` lives in the Owner's shell session only.
- No service-role credential is introduced in any user-path code (the same posture as ADR-0028 and ADR-0025 §RLS / Grant Plan).
- No destructive `DROP TABLE` / `DROP POLICY` is applied to the existing B-1 schema (the new migration `DROP POLICY IF EXISTS` lines 25 and 43 are idempotent guards; they target only the 2 new policy names and would be no-ops if the policies do not exist).
- No impersonation of the `authenticated` role for row-level RLS testing. The 12-query gate asserts policy existence + grant existence + role posture (`rolbypassrls = f`); row-level behavior (User A reads Org B's `ShiftHandoverDraft` returns 0) is deferred to a follow-up slice because it requires a JWT-aware connection pool.
