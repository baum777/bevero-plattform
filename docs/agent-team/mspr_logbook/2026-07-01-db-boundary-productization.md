# MSPR Entry — Bevero Database Boundary Guardrail

- id: 2026-07-01-db-boundary-productization
- timestamp: 2026-07-01T00:00:00+02:00
- runId: baumos-2026-07-01-db-boundary-productization
- agentRole: builder
- taskType: governance_change

## Scope

- layer: docs_only
- pathsInScope:
  - `docs/productization/bevero-database-boundary-v0.md` (new)
  - MSPR + intent logbook entries (new)
- pathsOutOfScope:
  - Any `.env` files — not opened, not read
  - Any Supabase/DB access — no commands executed
  - Any migration command (`prisma migrate deploy/dev`, `prisma db push`) — none run
  - Any rollback of the Phase 4b-1 `CateringMode` migration already applied to the remote DB — explicitly not attempted
  - Phase 4b-2 (InquirySource rename) — not started
- autonomyTier: 1

## Code Change Context

- Trigger/request: Following the Phase 4b-1 incident (see linked MSPR `2026-07-01-phase-4b-1-catering-mode-enum-rename.md`) where `prisma migrate deploy` connected to a live remote Supabase database instead of a local test DB, the operator decided the existing remote DB must now be treated as the Rauschenberger/Pilot operational database and frozen for all further Bevero productization migrations. A new isolated Bevero DB is required going forward.
- Why the change was needed: Without a documented, explicit DB-role boundary, future Phase 4b/4c patches (InquirySource, LocationProfile, CUBE_* model renames) risk repeating the same incident against a live pilot database.
- Files read:
  - `docs/agent-team/mspr_logbook/2026-07-01-phase-4b-1-catering-mode-enum-rename.md` (own prior entry, for incident reference)
  - `docs/productization/` directory listing (to confirm naming conventions)
- Files changed:
  - `docs/productization/bevero-database-boundary-v0.md` (new) — documents the DB-role split (Rauschenberger/Pilot DB vs. new Bevero Productization DB), the incident note, the required target-classification guard before any future migration command, and the explicit block on Phase 4b-2/4b-3/4b-4 until a new isolated DB exists.
- Commands run:
  - `git status` → confirmed Phase 4b-1 commit already landed cleanly (hash `1a41caf`) before starting this docs-only patch
  - `npm run check:work-docs` → run after this entry + linked intent entry added
- Validation results: docs-only change; no code/schema/migration files touched in this patch.

## Memory

- newFindings:
  - The Phase 4b-1 incident (unintended remote DB write via `prisma migrate deploy`) has now triggered an explicit governance decision: DB target must be classified (`local` / `bevero-dev` / `bevero-staging` / `bevero-production` / `rauschenberger-pilot`) before any future migration-bearing command runs.
- reusableRules:
  - When a migration incident occurs, the safest immediate response is: commit the already-validated local patch (schema/tests/migration file are correct and reviewed), do NOT attempt a rollback (which would add a second uncontrolled write to the same live DB), and instead add a docs-level boundary/guard before continuing.
  - Governance/boundary decisions like this belong in `docs/productization/` as versioned docs (`-v0` suffix pattern), consistent with existing `bevero-product-identity-v0.md` / `bevero-demo-data-policy-v0.md`.
- gotchas:
  - None beyond what was already captured in the Phase 4b-1 MSPR entry.

## Review

- status: pass
- risks:
  - The already-applied Phase 4b-1 migration and the incidentally-deployed `20260620_add_shift_sessions` migration remain live on the Rauschenberger/Pilot DB. No further action was taken on that DB in this patch, per operator instruction.
  - No new Bevero DB exists yet — Phase 4b-2 and later migration-bearing patches remain blocked until the operator provisions one and points migration commands at it explicitly.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Operator must create a new isolated Bevero DB/project (suggested name `bevero-os-dev`) before Phase 4b-2 (InquirySource enum rename) can proceed.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-01-db-boundary-productization.md`
