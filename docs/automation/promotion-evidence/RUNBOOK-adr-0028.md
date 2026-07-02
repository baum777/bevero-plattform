# RUNBOOK — ADR-0028 Phase B Migration Promotion

**Audience:** Human owner (the only role authorized to type the apply command).
**Author of this runbook:** Mavis (orchestrator).
**Date:** 2026-06-08.
**ADR:** [`docs/DECISIONS.md` §ADR-0028](../../DECISIONS.md#adr-0028-promote-phase-b-migrations-to-a-verified-supabase-snapshot-proposed).
**Target project:** Supabase project `czinchfegtglmrloxlmh` (chosen by the owner; this is the existing live instance, not a fresh dev instance).

## Pre-flight (1 minute)

1. Open a terminal.
2. `cd ~/Schreibtisch/workspace/main_projects/bevero-webapp`
3. `git checkout main && git pull --rebase` (sanity: you're on `main` at SHA `2d25d8f` or later).
4. `npx prisma validate` → expect `The schema at prisma/schema.prisma is valid`.
5. `npx tsc --noEmit -p tsconfig.json` → expect no output, exit 0.
6. `npx vitest run tests/automation.routes.test.ts` → expect `8 passed`.

## Apply (1 minute, owner-typed only)

7. **Set the connection string.** Substitute `<password>` with the Supabase `postgres` role password. The password is a secret; it lives in your terminal session only, never in a file.

   ```bash
   export DATABASE_URL="postgresql://postgres:<password>@db.czinchfegtglmrloxlmh.supabase.co:5432/postgres"
   export DIRECT_URL="$DATABASE_URL"
   ```

8. **Check the current state.** Confirms the 3 pending migrations are what we expect.

   ```bash
   npx prisma migrate status
   ```

   Expected output: `4 migrations found in prisma/migrations ... 4 not yet applied` listing exactly:
   - `20260605110000_extend_procurement_mail_imports_for_graph`
   - `20260608160000_add_automation_phase_b_tables`
   - `20260608161000_add_automation_phase_b_rls`
   - `20260608165159_automation_mutation_policies` (Phase C write policies; same forward-only DDL, applied in the same `migrate deploy` call)

9. **Apply the migrations.** This is the one destructive step. It runs each migration in a transaction; if any fails, all are rolled back.

   ```bash
   npx prisma migrate deploy
   ```

   Expected output: `4 migrations applied` listing the 4 filenames above.

10. **Confirm the state.**

    ```bash
    npx prisma migrate status
    ```

    Expected output: `Database is up to date` with `0 not yet applied`.

## Verify (1 minute)

11. **Run the 12-query gate.** This is the hard verification. Read-only except for two test rows in checks #7 and #8 that are cleaned up at the end of the script.

    ```bash
    npx tsx scripts/verify-automation-phase-b-migrations.ts
    ```

    Expected output: 12 lines, all `PASS`, summary `12/12 passed, 0/12 failed`. If `BLOCKED`, do NOT proceed to Phase C — send the failing check IDs and the actual-vs-expected output to the orchestrator.

## What this runbook does NOT do

- It does not change any environment variable in the shell's persisted state (no `~/.bashrc` edit, no `.env` file write).
- It does not run a `migrate dev` (which would try to reset the schema).
- It does not apply any migration to production unless the project in step 7 IS production (the owner is responsible for naming the right project).

## Cross-references

- ADR-0028 — the gate.
- `docs/DECISIONS.md` §ADR-0022 — the schema being promoted.
- `docs/agent-team/swarm_policy.md` — Tier 3 review required for any DB write slice; this runbook is the Tier 3 evidence record.
- Issue #51 — the tracking issue for the promotion execution.
