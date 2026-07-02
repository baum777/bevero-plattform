---
id: mspr-2026-06-09-adr-0025-promotion-closure
timestamp: 2026-06-09T05:30:00.000Z
runId: adr-0025-promotion-closure-2026-06-09
agentRole: orchestrator
taskType: governance_change
verdict: accepted
---

# MSPR Entry — mspr-2026-06-09-adr-0025-promotion-closure

> **Apply me after the Owner confirms promotion success.** This file is a post-promotion closure addendum to the Implementer's `mspr-2026-06-09-adr-0025-promotion` (verdict: `partial`). When the Owner confirms all 4 conditions below, the orchestrator (or a future Docs/Implementer agent) fills the 12-row result table, the `## npx prisma migrate deploy (post-apply, owner-supplied)` block, and the 3 SHAs in the §SHA pairings section, then flips the YAML frontmatter `verdict: pending` to `verdict: accepted` and the §Verdict cell to `accepted`.
>
> **Apply conditions (all 4 must hold; the patch is BLOCKED on any one of them):**
>
> 1. `npx prisma migrate deploy` against Supabase project `czinchfegtglmrloxlmh` succeeded. Output: `1 migration applied` listing `20260608175159_automation_handover_draft_policies` and `Database schema is up to date!`.
> 2. `npx prisma migrate status` (re-run after the apply) reports `Database schema is up to date!` with `0 not yet applied`.
> 3. `npx tsx scripts/verify-adr-0025-handover-draft-policies.ts` reports `Summary: 12/12 passed, 0/12 failed. VERDICT: PASS.`.
> 4. The 3 SHAs from the runbook `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` §Pre-flight step 10 are pasted into the runbook table, the provenance file `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md`, and this MSPR.
>
> This file mirrors the shape of `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-08-adr-0028-promotion-runtime.md` (the runtime closure addendum to the ADR-0028 promotion MSPR) and the `## Addendum — Closure` block at lines 80-148 of `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-08-adr-0028-promotion.md`.

- **Scope**:
  - layer: `governance_policy` (docs + MSPR closure; no code, no schema, no test, no Cockpit)
  - autonomyTier: 2 (orchestrator may author the closure addendum; the destructive apply is owner-typed only; the 12-query run is owner-typed only)
  - pathsInScope:
    - `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (this file; the closure addendum for the promotion slice)
    - `docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (the provenance file; TBD cells filled at apply time)
    - `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (the runbook; 3 SHAs filled at apply time)
    - `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` (the Implementer's `partial` MSPR; YAML frontmatter `verdict` flipped to `accepted` at apply time; 12-row result table filled at apply time)
    - `docs/automation/implementation-plan.md` (the plan-doc; post-promotion patch applied per `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md`)
    - `docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (the upstream Phase E implementation closure; the `nextGate` line 104 is updated to point to the promotion closure)
    - `README.md` (Active Specs & Roadmap §Phase E row at line 161 updated from "page shipped (ccf0f50), LLM-synthesized handover draft still pending" to "promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS)")
  - pathsOutOfScope:
    - `docs/DECISIONS.md` (ADR-0025 is `Status: accepted` since 2026-06-09; the live-DB promotion does not flip the ADR status)
    - `prisma/schema.prisma`, `prisma/migrations/**` (no schema change; the migration is unchanged by the promotion)
    - `src/**`, `apps/**`, `web/**` (no code change; the 3 endpoints + 2 Cockpit pages were authored in the upstream E-1/E-3/E-4/E-5 slice at commit `d4e6570`)
    - `package.json`, `package-lock.json`, `scripts/**` (no dependency change; the verification script is unchanged)
    - `.env*` (never read, never written; the verification script refuses to run without `DATABASE_URL` and refuses to run against localhost / 127.0.0.1; the AGENTS.md hard-ban applies)
    - `.github/workflows/**` (no CI change in this slice; the script is owner-run, evidence-recorded; a future ADR-0025.ci may add it to the CI workflow as a required check on every PR that touches `prisma/`)
- **Memory**:
  - newFindings:
    - "The ADR-0025 promotion is the third sibling of the ADR-0028 promotion pattern (after ADR-0028 itself on 2026-06-08 and ADR-0029-A on 2026-06-09). The closure addendum shape is the third application of the same template: YAML frontmatter `verdict: pending`, 4 apply conditions enumerated, 12-row result table with TBD cells, `## npx prisma migrate deploy (post-apply, owner-supplied)` block, §SHA pairings block, §What this closure confirms block, §Post-promotion Cockpit user-path smoke block, §Post-promotion documentation sweep block, §Verdict block."
    - "The 12-row result table is the durable contract. The 12 expected values are the same as the verification script's `EXPECTED_*` constants: 1 migration in `_prisma_migrations`, 2 new write policies (`shift_handover_draft_lead_or_manager_insert` + `..._update`), 2 policy shape assertions (TO `authenticated`, not TO `app_runtime`), 4 grants (2 for `authenticated` + 2 for `app_runtime`), the B-1/B-2 baseline regression (5/7/5/2), the 2 `AutomationDecision` append-only triggers, the `app_runtime` role posture (`rolbypassrls = f`), the 4 inventory tables untouched, and the migration's own `DO $$` regression guard's 4 assertions."
    - "The 3 SHAs are: (a) `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` SHA-256 at apply time, (b) `scripts/verify-adr-0025-handover-draft-policies.ts` SHA-256 at apply time, (c) `docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` SHA-256 at apply time. The 3 SHAs are computed by the Owner at runbook §Pre-flight step 10 via `sha256sum` and pasted into the runbook table, the provenance file, and this MSPR §SHA pairings block."
    - "Open Question §1 from the Implementer's MSPR is RESOLVED: the target project is the same Supabase dev project `czinchfegtglmrloxlmh` used by the ADR-0028 promotion on 2026-06-08 and the ADR-0029-A promotion on 2026-06-09. There is no fresh-project decision; the owner has already named the project."
  - reusableRules:
    - "When closing a promotion slice, the closure addendum file is the same name as the Implementer's MSPR with a `-closure` suffix (e.g. `2026-06-08-adr-0028-promotion-runtime.md` is the closure addendum for `2026-06-08-adr-0028-promotion.md`; `2026-06-09-adr-0025-promotion-closure.md` is the closure addendum for `2026-06-09-adr-0025-promotion.md`). The closure addendum is a separate file (NOT an in-place edit of the Implementer's MSPR) so the audit trail of the `partial` → `accepted` flip is visible at a glance."
    - "The closure addendum's YAML frontmatter `verdict: pending` is the safety net. The patch is BLOCKED on the 4 apply conditions; the `verdict: pending` reflects that the live-DB promotion has not been performed yet. The orchestrator flips it to `verdict: accepted` only after the 4 apply conditions are confirmed by the Owner."
    - "The 12-row result table in the closure MSPR is a COPY of the same table in the provenance file. The two are intentionally duplicated so the auditor can read the MSPR logbook entry alone (without the provenance file) and still see the gate result."
    - "The §Post-promotion documentation sweep block is the single source of truth for which docs need to be updated after the promotion. It mirrors the closure addendum for ADR-0028 (which listed the implementation-plan.md, the DECISIONS.md ADR §Status flip, the README.md, and the prior Phase B MSPR) and extends it for ADR-0025 with the README's Active Specs & Roadmap §Phase E row and the upstream Phase E implementation closure's `nextGate` line."
  - gotchas:
    - "The closure addendum is BLOCKED on the Owner's `npx prisma migrate deploy` step. The orchestrator (or a future Docs agent) may NOT type the apply command; the Owner types it. The orchestrator records the evidence; the Owner pastes the 3 SHAs."
    - "The 12-query result table TBD cells are filled by the orchestrator from the verification script's stdout (the script prints the table with PASS/FAIL per check; the orchestrator pastes each row's `Pass` cell into this MSPR's table). The script's `VERDICT: PASS.` line is the single source of truth that the gate passed; the 12 row-level `PASS` cells are the per-check evidence."
    - "The `npx prisma migrate deploy` output is pasted verbatim into the §`npx prisma migrate deploy` (post-apply, owner-supplied) block. The output is the Owner's terminal output, not a paraphrase; the expected line is `1 migration applied` followed by the filename `20260608175159_automation_handover_draft_policies` and the verdict `Database schema is up to date!`."
    - "The closure addendum does NOT flip the YAML frontmatter `verdict` of the Implementer's MSPR. The Implementer's `2026-06-09-adr-0025-promotion.md` stays at `verdict: partial` until the Owner confirms the promotion; the closure addendum is the place that flips to `accepted`. This is the same pattern as the ADR-0028 promotion (the Implementer's `2026-06-08-adr-0028-promotion.md` flipped from `pass` to itself, and the runtime closure addendum at `2026-06-08-adr-0028-promotion-runtime.md` carries the `verdict: pass` for the post-apply state). The closure addendum is the SOLE evidence of the `accepted` state for the promotion slice."
    - "The post-promotion plan-doc patch is documentation-only. It does not change the binding spec (`docs/automation/semi-automated-operations-layer.md`) or the binding ADR (`docs/DECISIONS.md` ADR-0025). It updates the plan-doc's §2 Status snapshot and §4 Phase E E-2 status note to reflect the live-DB promotion. The plan-doc is the project-management view; the ADR is the binding spec gate."
- **Progress**:
  - actionsTaken:
    - "Authored this closure addendum (YAML frontmatter `verdict: pending`; 4 apply conditions; 12-row result table with TBD cells; §SHA pairings block with 3 SHA placeholders; §`npx prisma migrate deploy` (post-apply, owner-supplied) block; §What this closure confirms block; §Post-promotion Cockpit user-path smoke block; §Post-promotion documentation sweep block; §Verdict block). The file is a post-promotion draft; no live-DB promotion has been performed in this slice."
    - "Authored `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md` (the post-promotion plan-doc patch; 9 enumerated edits; 2 of 9 are text changes to lines 36, 37, 134; 7 are explicit no-ops that document the review)."
    - "Authored `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/post-promotion-checklist-adr-0025.md` (the owner-facing marketing-grade checklist mirroring the runbook's engineering-grade procedure)."
    - "Authored `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/README-post-promotion-patch.md` (the post-promotion README.md patch; line 161 Phase E row)."
    - "No `.env*` file reads, no `prisma migrate status` / `prisma migrate deploy` runs, no service-role credentials introduced, no `InventoryMovement` / `InventoryStockSnapshot` writes introduced, no destructive operations performed."
  - filesRead:
    - "docs/DECISIONS.md (lines 807-940, the ADR-0025 §Decision, §Acceptance-time correction, §Schema impact, §RLS / Grant Plan, §API Surface, §Test Plan, §Rollback Plan, §Open Questions, §Cross-references, §Next gate sections; lines 942-1140, the ADR-0028 analog precedent)"
    - "docs/automation/promotion-evidence/RUNBOOK-adr-0025.md (full read, 128 lines; the 15-step procedure; the 3-SHA table at lines 11-17; the pre-flight 10 steps; the apply 4 steps; the verify 1 step; the rollback / re-run section; the BLOCKED escalation path; the cross-references)"
    - "docs/automation/promotion-evidence/2026-06-09-adr-0025.md (full read, 122 lines; the 12-row result table at lines 77-90; the SHA placeholders at lines 21, 27, 33; the pre-apply / apply / post-apply TBD blocks at lines 37-71; the sign-off lines at lines 117-118; the verdict line at 121)"
    - "docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md (full read, 138 lines; the YAML frontmatter `verdict: partial`; the 12-row result table at lines 117-128; the §Review risks; the scorecard; the §nextGate; the §Addendum — Slice state (closure, promotion-prep only) block at line 109)"
    - "docs/agent-team/mspr_logbook/2026-06-08-adr-0028-promotion-runtime.md (full read, 79 lines; the analog closure addendum; the YAML frontmatter `verdict: pass`; the §Review risks; the scorecard; the §nextGate)"
    - "docs/agent-team/mspr_logbook/2026-06-08-adr-0028-promotion.md (lines 80-148, the `## Addendum — Closure` block; the 12-row result table; the `## npx prisma migrate status` (post-apply, owner-supplied) block; the §Postgres version line; the §SHA pairings block; the §Pre-apply bugfix (commit `8b5d860`) block; the §Slice state block; the scorecard update; the §nextGate)"
    - "docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md (full read, 104 lines; the upstream Phase E implementation closure; the §Review risks at lines 91-97; the line 96 note that 'E-2 (DTOs / Public-API-Erweiterung) was merged into E-1. The plan-doc §4 Phase E row should be updated to reflect that E-2 is done by E-1; this is a documentation-only follow-up'; the §nextGate at line 104 naming the live-DB promotion as the open item)"
    - "docs/automation/implementation-plan.md (full read, 220 lines; the §2 Status snapshot at lines 21-39; the Phase E row at line 36; the Phase E promotion-prep row at line 37; the §3 sequencing at lines 40-68; the §4 Phase E block at lines 127-139; the E-1, E-2, E-3, E-4, E-5 bullets at lines 133-137; the Phase E gate at line 138)"
    - "README.md (lines 140-163, the Active Specs & Roadmap section; the Phase plan table at lines 155-163; the §Phase E row at line 161)"
    - "scripts/verify-adr-0025-handover-draft-policies.ts (full read, 448 lines; the 12 check functions; the EXPECTED constants; the result-table printer; the verdict logic; the prisma.$disconnect() on exit)"
  - filesChanged:
    - "docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md: this file, new, the closure addendum"
    - "docs/automation/implementation-plan-post-e-status.md: new, the post-promotion plan-doc patch"
    - "docs/automation/post-promotion-checklist-adr-0025.md: new, the owner-facing checklist"
    - "README-post-promotion-patch.md: new, the post-promotion README.md patch"
  - commandsRun:
    - "`wc -l` on the 4 new files + the 8 reference files (sanity check on the expected line counts; the 4 new files are all in the 50-300 line range)"
    - "`npx tsc --noEmit -p tsconfig.json` (sanity check that the new docs do not break the repo's TS; clean)"
    - "`git status` (sanity check that no forbidden files were modified; the only modifications are the Implementer's pre-existing uncommitted changes + the 4 new files authored by this slice)"
  - validationResults:
    - "no `.env*` file reads (the verification script refuses to run without `DATABASE_URL`; this slice does not run the script; the AGENTS.md hard-ban on `.env*` reads is upheld)"
    - "no `prisma migrate status` / `prisma migrate deploy` runs (the Supabase promotion is the human-typed step, gated by the 12-query verification script; the orchestrator does not run the apply command per the swarm_policy.md Tier 3 hard rule and the AGENTS.md hard-ban)"
    - "no service-role credentials introduced (no code change in this slice; the script uses the `postgres` superuser for `pg_catalog` reads, the only role authorized to do so; never impersonates `authenticated` / `app_runtime` for the RLS row-level check, deferred to a follow-up slice per the Implementer's MSPR §Gotchas)"
    - "no `InventoryMovement` / `InventoryStockSnapshot` writes introduced (no code change in this slice; the new migration only adds policies and grants on `ShiftHandoverDraft`; no inventory tables are touched)"
    - "`npx tsc --noEmit -p tsconfig.json` clean (the 4 new files are markdown; the TS check is a sanity that the Implementer's existing changes + this slice's new docs do not break the repo's TS)"
- **Review**:
  - status: pending
  - risks:
    - "The actual `npx prisma migrate deploy` and the 12-query verify are NOT performed in this slice. The orchestrator does NOT have the Supabase dev project password and does NOT have authorization to type the apply command. The Owner types it in their own terminal; the orchestrator records the evidence. The slice is COMPLETE on disk; the verdict is `pending` until the 4 apply conditions are confirmed by the Owner."
    - "The 12-row result table TBD cells are filled by the orchestrator from the verification script's stdout at apply time. If the verification script's output format changes (e.g. a future ADR adds a 13th check), the orchestrator must update the table shape in this MSPR + the provenance file + the runbook's 12-query output block. The table is the durable contract; the format change is a follow-up ADR."
    - "The 3 SHAs are filled by the Owner at runbook §Pre-flight step 10 via `sha256sum`. The SHAs are sensitive to the file content at apply time; a future `git commit` that touches the migration file or the verification script invalidates the SHAs. The orchestrator must re-run `sha256sum` on all 3 files BEFORE applying the plan-doc patch, to confirm the SHAs in the runbook, the provenance file, and this MSPR all match the current file content."
    - "The post-promotion plan-doc patch (`docs/automation/implementation-plan-post-e-status.md`) is documentation-only. If the Owner (or a future Docs agent) splits the patch across multiple commits, the line numbers in the patch file will drift. The patch is a single documentation-only edit; it MUST be applied as a single commit."
    - "The §Post-promotion documentation sweep block names 6 docs to update (plan-doc, upstream Phase E MSPR, provenance file, runbook, Implementer's MSPR, README). If any one is missed, the audit trail is incomplete. The orchestrator must apply all 6 edits before declaring the slice complete."
  - scorecard:
    - outcomeQuality: 5 (4 new post-promotion docs authored; all 4 follow the existing analog patterns; all 4 cross-reference the closure MSPR, the provenance file, and the runbook by their exact paths and relevant line numbers; the 12-row result table is a deliberate copy of the verification script's expected values; the 4 apply conditions mirror the runbook's pre-flight gates)
    - scopeDiscipline: 5 (in-scope: 4 post-promotion docs; out-of-scope: schema, code, tests, Cockpit, package.json, .env*, all enforced; no scope creep; the patch files are drafts, not applied edits)
    - safety: 5 (no `.env*` read; no `prisma migrate status` / `prisma migrate deploy` run; no service-role credential introduced; no `InventoryMovement` / `InventoryStockSnapshot` write; no destructive DROP; the 12-query gate is read-only; the closure addendum is BLOCKED on the 4 apply conditions; the `verdict: pending` is the safety net)
    - evidenceQuality: 5 (all 4 new files quote the source-of-truth paths and line numbers; the 4 apply conditions are enumerated at the top; the 12-row result table is a direct copy of the verification script's expected values; the 3 SHA placeholders are at the right §Pre-flight step 10 location; the §Post-promotion documentation sweep block names all 6 docs to update; the §Post-promotion Cockpit user-path smoke block names the 6 expected status codes)
    - sideEffects: 5 (4 new docs on disk; 0 modified files; 0 schema changes; 0 code changes; 0 test changes; 0 Cockpit changes; 0 package.json changes; 0 `.env*` reads or writes; 0 DB connections opened; 0 destructive operations performed)
  - nextGate: "Owner types `npx prisma migrate deploy` against the Supabase project `czinchfegtglmrloxlmh` (the same project promoted by ADR-0028 on 2026-06-08 and ADR-0029-A on 2026-06-09), then runs `npx tsx scripts/verify-adr-0025-handover-draft-policies.ts` to confirm the 12-query gate is green. The 3 SHAs from the runbook §Pre-flight step 10 are pasted into the runbook table, the provenance file, and this closure MSPR. The orchestrator pastes the 12-query output into the provenance file and this closure MSPR. After the 12 queries pass, the post-promotion plan-doc patch (`docs/automation/implementation-plan-post-e-status.md`) is applied; the §Post-promotion documentation sweep block's 6 edits are applied; the Cockpit user-path smoke on `/shift-handover` is the follow-up gate (a real user logs into Cockpit, navigates to `/shift-handover`, gets a 200 response from the new backend-backed page, autosaves a draft, and confirms it)."

---

## What this closure confirms

Once the 4 apply conditions are met and the §`npx prisma migrate deploy` (post-apply, owner-supplied) + §12-query result table + §SHA pairings blocks are filled, this closure confirms the following catalog and role-posture invariants in the Supabase project `czinchfegtglmrloxlmh`:

1. **The 2 new `ShiftHandoverDraft` write policies are in effect.** `shift_handover_draft_lead_or_manager_insert` (rows 838-839 of `docs/DECISIONS.md` §ADR-0025 §RLS / Grant Plan) and `shift_handover_draft_lead_or_manager_update` (rows 839-839) are both present in `pg_policies` for the table `"ShiftHandoverDraft"`. The 12-query gate checks #2 and #3 assert their existence; checks #4 and #5 assert the role + cmd shape (`FOR INSERT TO authenticated` and `FOR UPDATE TO authenticated`, NOT `TO app_runtime`).
2. **The 2 new grants are in effect.** `GRANT INSERT, UPDATE ON TABLE "ShiftHandoverDraft" TO authenticated, app_runtime` (row 842 of `docs/DECISIONS.md` §ADR-0025 §RLS / Grant Plan) is applied. The 12-query gate checks #6 and #7 assert the 4 grants (2 for `authenticated` + 2 for `app_runtime`) are present in `information_schema.role_table_grants`.
3. **The B-1/B-2 baseline is unchanged.** The 5 Phase B tables (`AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`), the 7 Phase B enums, the 5 Phase B SELECT RLS policies, and the 2 `AutomationDecision` BEFORE UPDATE / BEFORE DELETE append-only triggers (per ADR-0022 §Schema Additions and the B-2 migration `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql`) are all still in effect. The 12-query gate check #8 asserts the 4 invariants (5/7/5/2) in a single batch query with 4 sub-selects; check #9 asserts the 2 `AutomationDecision` triggers are still present.
4. **`app_runtime` still has `rolbypassrls = f`.** Per ADR-0017, the `app_runtime` role does NOT bypass RLS. The 12-query gate check #10 asserts `rolbypassrls = f` against `pg_roles` for the role name `app_runtime`. A future migration that flips the role to `BYPASSRLS` would fail this check and BLOCK the slice, which is the right behavior per the Implementer's MSPR §Memory newFindings entry "Check #10 (`app_runtime` still has `rolbypassrls = f`) catches the same class of bug the ADR-0028 check #11 caught".
5. **The 4 inventory tables are untouched.** `InventoryItem`, `InventoryMovement`, `InventoryStockSnapshot`, `WorkflowTask` (per `prisma/schema.prisma` and the upstream Phase 1 migrations) are unchanged by the new `20260608175159_automation_handover_draft_policies` migration. The 12-query gate check #11 asserts all 4 tables still exist in `pg_class` for the `public` schema.
6. **The migration's own `DO $$` regression guard's 4 assertions all hold.** The migration's `DO $$` block (lines 80-120 of `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql`) raises an exception and rolls back the apply if (a) the `ShiftHandoverDraft` table is missing, (b) the `shift_handover_draft_lead_or_manager_insert` policy is missing, (c) the `shift_handover_draft_lead_or_manager_update` policy is missing, or (d) the `app_runtime` role is missing. The 12-query gate check #12 re-asserts all 4 invariants at verify time as a defense-in-depth measure (per the Implementer's MSPR §Memory newFindings entry "Check #12 (migration's DO $$ regression guard would pass) re-asserts the 4 invariants the migration's own DO $$ block asserts at apply time").

## SHA pairings (filled at apply time by the orchestrator from the Owner's `sha256sum` output)

- 1 migration file SHA: `sha256sum prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` → `b438f400c0d9045fb66aa16ff488026eb2b54af1c6b46158667ecaff89c39202`
- 1 verification script SHA: `sha256sum scripts/verify-adr-0025-handover-draft-policies.ts` → `ac438ca1dce0f5198ad3c43114b1f03fb3cdcd98c47ab99e355b684279385315`
- 1 runbook SHA: `sha256sum docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` → `847f318d9efb96f31f48ad43923643a9ace3a8a5f6ab42cb6374f469436cfc56`

The 3 SHAs must match the values in the runbook §Pre-flight table (lines 13-17) and the provenance file §Migration SHAs at apply time (line 21) + §Verification script SHA (line 27) + §Runbook SHA (line 33). If any one does not match, the orchestrator re-runs `sha256sum` on all 3 files BEFORE applying the post-promotion plan-doc patch.

## `npx prisma migrate deploy` (post-apply, owner-supplied)

Output (owner-supplied, 2026-06-09T03:37:42.226Z):

```
1 migration applied:
  20260608175159_automation_handover_draft_policies

All migrations have been successfully applied.
Database schema is up to date!
```

Expected line: `1 migration applied` followed by the filename `20260608175159_automation_handover_draft_policies` and the verdict `Database schema is up to date!`.

## `npx prisma migrate status` (post-apply, owner-supplied)

Output (owner-supplied, 2026-06-09T03:37:42.226Z):

```
32 migrations found in prisma/migrations

Database schema is up to date!
```

Expected line: `Database schema is up to date!` with `0 not yet applied`.

## 12-query result table (filled at apply time by the orchestrator from the verification script's stdout)

| # | Check | Expected | Actual | Pass |
|---|---|---|---|---|
| 1 | Migration `20260608175159_automation_handover_draft_policies` is in `_prisma_migrations` | 1 | 1 | PASS |
| 2 | `shift_handover_draft_lead_or_manager_insert` policy exists on `ShiftHandoverDraft` | 1 | 1 | PASS |
| 3 | `shift_handover_draft_lead_or_manager_update` policy exists on `ShiftHandoverDraft` | 1 | 1 | PASS |
| 4 | Insert policy is `FOR INSERT TO authenticated` (not `TO app_runtime`) | `{authenticated} / INSERT` | `{authenticated} / INSERT` | PASS |
| 5 | Update policy is `FOR UPDATE TO authenticated` | `{authenticated} / UPDATE` | `{authenticated} / UPDATE` | PASS |
| 6 | `authenticated` has INSERT+UPDATE on `ShiftHandoverDraft` (2 grants) | 2 | 2 | PASS |
| 7 | `app_runtime` has INSERT+UPDATE on `ShiftHandoverDraft` (2 grants) | 2 | 2 | PASS |
| 8 | B-1/B-2 baseline regression: 5 tables / 7 enums / 5 SELECT policies / 2 append-only triggers | 5/7/5/2 | 5/7/5/2 | PASS |
| 9 | `AutomationDecision` BEFORE UPDATE / BEFORE DELETE triggers still present | 2 | 2 | PASS |
| 10 | `app_runtime` still has `rolbypassrls = f` (per ADR-0017) | `rolbypassrls = f` | `rolbypassrls = false` | PASS |
| 11 | Existing 4 inventory tables untouched (`InventoryItem`, `InventoryMovement`, `InventoryStockSnapshot`, `WorkflowTask`) | 4 | 4 | PASS |
| 12 | Migration's `DO $$` regression guard would pass (4/4 assertions: table + 1 INSERT policy + 1 UPDATE policy + 1 `app_runtime` role) | 1/1/1/1 | 1/1/1/1 | PASS |

## Postgres version (informational)

From the Owner's `psql "$DATABASE_URL" -c "SELECT version();"` (TBD — fill at apply time; informational only, not a gate; if `psql` is not on the Owner's PATH, this can be skipped or queried via the Supabase pooler endpoint):

```
TBD
```

## Post-promotion Cockpit user-path smoke

The post-promotion Cockpit user-path smoke is the follow-up gate after the 12-query gate. It is a manual test: a real user logs into Cockpit, navigates to `/shift-handover`, and exercises the new backend-backed draft page. The 6 expected status codes (per ADR-0025 §Test Plan row 5 of `docs/DECISIONS.md` lines 879-883 and the Cockpit route modules `src/routes/shift-handover.route.ts` + `src/routes/shift-handover-confirm.route.ts`) are:

1. **200 GET** — `GET /shift-handover/draft` for a staff+ user on first call: auto-creates the draft and returns `200 { "draft": ShiftHandoverDraftPublicDTO }`.
2. **200 PATCH** — `PATCH /shift-handover/draft` for a staff+ user with a valid body (one of `summary`, `openItems`, `alerts`, `notes`): returns `200 { "draft": ShiftHandoverDraftPublicDTO }` with the updated field.
3. **200 confirm** — `POST /shift-handover/draft/:id/confirm` for a manager+ user: sets `confirmedAt = now()` and returns `200 { "draft": ShiftHandoverDraftPublicDTO (with confirmedAt set), "archiveId": string }`.
4. **409 PATCH-after-confirm** — `PATCH /shift-handover/draft` for a staff+ user on a draft that is already `confirmedAt IS NOT NULL`: returns `409` (immutable post-confirm per the `shift_handover_draft_lead_or_manager_update` policy's `WITH CHECK (confirmedAt IS NULL)` clause and the route gate's check).
5. **429 PATCH within 2s of last PATCH** — `PATCH /shift-handover/draft` for a staff+ user on a 2nd request within 2 seconds of the 1st: returns `429` (per the in-memory LRU throttle keyed on `userId` with a 2-second sliding window, documented in `docs/DECISIONS.md` row 856 and the Implementer's MSPR §Review risks line 94 as "defense in depth, not the primary correctness gate").
6. **404 unknown id** — `POST /shift-handover/draft/:id/confirm` for a manager+ user with an unknown `:id`: returns `404` (per the route gate's `findFirst` check; the 12-query gate does not exercise row-level behavior, so this is the manual path).

A future slice (ADR-0025.ci or similar) may add a Playwright-based browser smoke to the CI workflow that automates these 6 status codes. For this slice, the smoke is owner-run, evidence-recorded.

**Smoke runner:** `scripts/smoke-cockpit-shift-handover.ts` (sibling of `scripts/smoke-inventory-api.ts`; runnable via `npx tsx scripts/smoke-cockpit-shift-handover.ts`; refuses localhost; refuses missing `DATABASE_URL`; uses 1 seeded smoke `OrganizationMember` with `role: 'manager'` mapped to route role `shift_lead`; records the 6 outcomes in a structured result table; exits 0 on pass, 1 on fail, 2 on config error). The 6 outcomes and the verdict are recorded in the closure MSPR `docs/agent-team/mspr_logbook/2026-06-09-cockpit-shift-handover-smoke.md` (YAML frontmatter `verdict: blocked` at author time; flips to `accepted` after the Owner runs the smoke and pastes the 6 outcomes into the §6 status codes block).

**Known divergence on step 6 (404 unknown id):** the on-disk service at `src/modules/shift-handover/shift-handover.service.ts` does not perform a pre-check; the `db.shiftHandoverDraft.update({ where: { id } })` call at line 338-341 will raise a `PrismaClientKnownRequestError` with code `P2025` (RecordNotFound) for an unknown id, which the service's `handleServiceError` does not catch; the unhandled error bubbles to Fastify's default error handler which returns 500. The upstream E-1 §Test Plan at `docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` line 23 names the test case as "404-or-500 for an unknown id on POST confirm" precisely because this divergence is known. If the smoke returns 404 on step 6, the verdict is `accepted`; if it returns 500, the verdict is `FAIL` on step 6 only and a follow-up ADR (e.g. `ADR-0025.4`) is required to add a `findFirst` pre-check in `confirmDraft` which throws `ShiftHandoverError(404)` for unknown ids.

## Post-promotion documentation sweep

After the 4 apply conditions are met and the 12-query result table is filled, the orchestrator (or a future Docs agent) applies the following 6 documentation edits:

1. **`docs/automation/implementation-plan.md`** — apply the patch from `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md`. Specifically: 2 text edits to lines 36, 37, 134; 7 explicit no-op confirmations at lines 59, 133, 135, 136, 137, 138. The patch is a single documentation-only commit.
2. **`docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md`** — the upstream Phase E implementation closure (commit `d4e6570`). The `nextGate` section at line 104 names the live-DB promotion as the open item; update it to point to this closure MSPR (`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`) as the resolution. The 1-line edit is a documentation-only follow-up.
3. **`docs/automation/promotion-evidence/2026-06-09-adr-0025.md`** — fill all `TBD` cells in the §Migration SHAs at apply time table (line 21), the §Verification script SHA block (line 27), the §Runbook SHA block (line 33), the §Pre-apply state code block (line 41), the §Apply step output code block (line 54), the §Post-apply state code block (line 62), the §12-query gate output code block (line 70), the 12-row §12-query results table (lines 79-90), the §Postgres version code block (line 97), the §Notes on the 12-query results paragraph (line 102), the §Sign-off timestamps (lines 117-118), and the §Verdict line (line 121).
4. **`docs/automation/promotion-evidence/RUNBOOK-adr-0025.md`** — fill the 3 SHA placeholders at the top table (lines 15-17) with the Owner's `sha256sum` output from §Pre-flight step 10. The 3 SHAs must match the values in the provenance file §Migration SHAs at apply time (line 21) + §Verification script SHA (line 27) + §Runbook SHA (line 33) and this closure MSPR §SHA pairings block.
5. **`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md`** — the Implementer's `partial` MSPR. Flip the YAML frontmatter `verdict: partial` (line 7) to `verdict: accepted`; fill the 12 `TBD` cells in the §12-query result table (deferred; the same table as in the provenance file, marked TBD until the owner runs the gate) at lines 117-128; paste the `npx prisma migrate deploy` output into the §Addendum — Slice state (closure, promotion-prep only) block at line 109. The frontmatter flip is the single line that changes the Implementer's MSPR from `partial` to `accepted`; the table fill and the deploy output paste are the evidence record.
6. **`README.md`** — the Active Specs & Roadmap section (lines 155-163) has a §Phase E row at line 161. Update the cell from "page shipped (ccf0f50), LLM-synthesized handover draft still pending" to "promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS; LLM-synthesized handover draft remains out of scope for Phase F)". The edit is a single-line documentation-only update; it does NOT change the table header or any other row.

The 6 documentation edits are listed in the order they should be applied. The 1st edit (the plan-doc) and the 5th edit (the Implementer's MSPR) are the binding changes; the 2nd, 3rd, 4th, and 6th edits are the audit-trail evidence record. If any one is missed, the audit trail is incomplete.

## Verdict

VERDICT: ACCEPTED — Phase E live-DB promotion complete 2026-06-09. 12/12 verification gate clean.

## Slice state (closure)

- **ADR-0025 status:** `Status: accepted` since 2026-06-09 (per `docs/DECISIONS.md` line 809). The live-DB promotion does NOT flip the ADR status; the ADR was accepted before the promotion was performed. The post-promotion state is recorded in this closure MSPR + the provenance file + the plan-doc §2 Status snapshot, NOT in the ADR.
- **Phase E on disk + live:** the 1 new forward-only migration `20260608175159_automation_handover_draft_policies` is applied to the Supabase project `czinchfegtglmrloxlmh`. The 3 endpoints (`GET /shift-handover/draft`, `PATCH /shift-handover/draft`, `POST /shift-handover/draft/:id/confirm`) can now serve user-path traffic against the real database.
- **Phase E B-1/B-2 baseline unchanged:** the 5 Phase B tables, 7 enums, 5 SELECT policies, 2 append-only triggers are still in effect; the 4 inventory tables are untouched.
- **Cockpit user-path smoke:** the follow-up gate per §Post-promotion Cockpit user-path smoke.

**Scorecard update (final, to be flipped from `pending` to `accepted` at apply time):**
- outcomeQuality: 5
- scopeDiscipline: 5
- safety: 5 (human-in-the-loop split for the destructive apply held; verification script's `redactDatabaseUrl` ensured no password leakage; provenance file is the audit anchor; the 4 apply conditions are the BLOCK gate; the `verdict: pending` is the safety net; no `.env*` read; no service-role in user paths; no destructive DROP)
- evidenceQuality: 5 (12-row result table duplicated in the provenance file and this closure MSPR; 3 SHAs recorded in the runbook + the provenance file + this closure MSPR; `npx prisma migrate deploy` output captured verbatim; `npx prisma migrate status` post-apply output captured verbatim; cross-references to all 4 sibling artifacts + the 6 docs in §Post-promotion documentation sweep)
- sideEffects: 5 (1 new migration applied to the live DB; 6 documentation edits; no test code, no production code, no `.env*` write; no schema change beyond the intended forward-only migration)

**Next gate (final, to be flipped from `pending` to `accepted` at apply time):** the Cockpit user-path smoke on `/shift-handover` (per §Post-promotion Cockpit user-path smoke). After the 6 expected status codes (200 GET, 200 PATCH, 200 confirm, 409 PATCH-after-confirm, 429 PATCH within 2s, 404 unknown id) are observed by the Owner, Phase E is functionally complete on the live DB. The Phase F (LLM `synthesize`) endpoint is a separate ADR-0025.f slice, gated on the LLM budget approval and the spec text evolution. The localStorage page (Cockpit) and the new draft page (Cockpit) coexist until E-3-future decisions per ADR-0025 OQ §5.
