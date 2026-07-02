# Intent Memory — Bevero Database Boundary Guardrail

- id: 2026-07-01-db-boundary-productization
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-db-boundary-productization.md`
- status: reviewed

## Core intention

Prevent a repeat of the Phase 4b-1 incident — where a validation command (`prisma migrate deploy`) silently connected to and wrote against a live remote Supabase database instead of a local sandbox — by drawing an explicit, documented boundary between the existing Rauschenberger/Pilot operational database and a future, isolated Bevero productization database. Preserve the pilot's operational integrity while unblocking safe continuation of Phase 4b schema work on a separate, disposable/controlled database.

## Logic followed

The core problem was not the migration content (the `CateringMode` rename itself was safe and correct) but the *target ambiguity*: nothing in the repo or the task instructions forced an explicit check of which database a migration command would actually reach before running it. Rather than trying to retrofit safety into every future migration command's execution, the fix is structural: declare the existing DB out-of-bounds for productization work by policy, and require a brand-new DB before any further migration-bearing patch proceeds. This shifts the safety burden from "hope the command is safe" to "there is no live-pilot-connected credential available to point productization migrations at."

## Design assumptions

- The existing remote Supabase database currently serves the Rauschenberger pilot in production or near-production capacity, and any further schema experimentation on it carries real operational risk to that pilot — this was the operator's explicit framing, not something independently verified against `.env`, per the instruction not to open it.
- A new, isolated Supabase project is a low-cost way to fully decouple productization/demo work from pilot operations; the exact provisioning is a human/operator action, not something to be automated in this patch.
- Attempting a rollback of the already-applied `CateringMode` rename would introduce a second uncontrolled write to the live pilot DB and is explicitly worse than leaving the (harmless, correct) rename in place.

## Tradeoffs

- Accepted:
  - Leaving the Phase 4b-1 migration's effects live on the pilot DB rather than attempting a rollback — the rename is semantically correct and low-risk; a rollback write is not clearly safer than doing nothing.
  - Blocking all further Phase 4b progress (4b-2 InquirySource, 4b-3 LocationProfile, 4b-4 CUBE model rename) on an external dependency (operator provisioning a new DB) rather than trying to find a workaround (e.g., dry-run-only patches) that would keep momentum but risk another target-ambiguity incident.
- Rejected:
  - Continuing Phase 4b-2 in "schema + code only, skip migrate deploy" mode — rejected because the operator's instruction was to fully halt migration-bearing work until the DB boundary exists, not to selectively skip the risky step while still editing schema/enum values.

## Durable memory

What should future agents or humans remember?

- **The existing remote Supabase database (`aws-0-eu-west-1.pooler.supabase.com`, as observed during Phase 4b-1) is now classified as the Rauschenberger/Pilot operational database and is off-limits for Bevero productization migrations.** Any future migration-bearing patch must first confirm the `DATABASE_URL`/`DIRECT_URL` target is the new Bevero DB (once it exists) — see `docs/productization/bevero-database-boundary-v0.md` for the required guard.
- Before this new DB exists, Phase 4b-2/4b-3/4b-4 (and any Phase 4c work) are explicitly blocked, not just "proceed with caution."
- The pattern for handling a migration-target incident: commit the already-correct local patch, do not roll back on the live system, document a structural boundary, and require an explicit new environment before continuing similar work.

## Do not reuse blindly

What should not be copied into future work without re-checking context?

- This boundary decision assumes the *existing* database keeps serving the Rauschenberger pilot. If the operator later confirms the pilot has fully migrated off that database, this boundary document must be revisited/updated — it should not be treated as a permanent fact independent of the pilot's actual lifecycle.
- The specific suggested DB names (`bevero-os-dev`, `bevero-os-staging`, `bevero-os-production`) are suggestions only; the operator may choose different naming when actually provisioning — don't hardcode these into scripts/tooling without confirming the operator's actual choice.

## Relation to Rauschenberger OS / Bevero

- location logic: unaffected by this patch — docs-only.
- role/approval logic: unaffected.
- inventory/procurement/shift-planning logic: unaffected; note the incidentally-deployed `shift_sessions` migration from Phase 4b-1 remains live on the pilot DB, which is exactly the kind of pilot-database state this boundary is meant to protect going forward.
- external-system boundary: this patch is the direct governance response to the first Phase 4 patch that touched a live external system (Phase 4b-1). It formalizes that pilot-vs-productization DB separation as a standing rule.

## Next logic gate

Once the operator provisions a new isolated Bevero DB/project and provides its target explicitly, Phase 4b-2 (InquirySource enum rename) can resume — with a hard pre-check that aborts if `DATABASE_URL`/`DIRECT_URL` does not explicitly resolve to the new Bevero DB.
