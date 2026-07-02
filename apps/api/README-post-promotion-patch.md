# README.md — Post-Promotion Patch (ADR-0025 / Phase E)

**Purpose:** This file is a **draft patch** the Owner (or a future Docs/Implementer agent) applies to `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/README.md` **after** the live-DB promotion of `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` succeeds against the Supabase dev project `czinchfegtglmrloxlmh` and the 12-query verification gate reports `VERDICT: PASS.`

**Do NOT apply this patch before the promotion succeeds.** All edits below assume the closure MSPR `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (the post-promotion addendum to the Implementer's `2026-06-09-adr-0025-promotion.md`) has been authored with `verdict: accepted` and the 3 SHAs are pasted into the runbook, the provenance file, and the closure MSPR.

**Apply authority:** the Owner (`cheikh.witm@proton.me`) is the only role authorized to flip the on-disk README to the post-promotion state. The orchestrator may not apply this patch without explicit owner instruction.

**Pre-flight before applying this patch (all 5 must hold; the patch is BLOCKED on any one of them):**

1. `cd /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp`
2. `npx prisma migrate status` → expect `Database schema is up to date!` with `0 not yet applied`.
3. `npx tsx scripts/verify-adr-0025-handover-draft-policies.ts` → expect `Summary: 12/12 passed, 0/12 failed. VERDICT: PASS.`.
4. `cat /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` → expect `verdict: accepted` in the YAML frontmatter and the 12-row result table fully filled (no `TBD` cells).
5. `grep -c "TBD" /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` → expect `0`.

If any of the 5 pre-flight checks fail, **do NOT apply this patch.** Escalate per the runbook `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` §BLOCKED escalation.

## Edit

The edit is a single-line change to the `Phase plan (from spec)` table at line 161 of `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/README.md`. The table itself spans lines 155-163; the §Phase E row is at line 161. The line numbers are correct against the file on disk at commit `d4e6570` on `phase-b-multistandort`.

### Edit 1 — §Phase E row (line 161)

- **Before** (line 161, full row text): `| E | Shift Handover Drafts | Shift lead can draft, confirm, hand over | page shipped (ccf0f50), LLM-synthesized handover draft still pending |`
- **After** (line 161, full row text): `| E | Shift Handover Drafts | Shift lead can draft, confirm, hand over | promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS; LLM-synthesized handover draft remains out of scope for Phase F) |`

The edit is a single cell change in the §Status column. The §Phase, §Scope, and §Gate columns are unchanged. The §Status cell text is updated to reflect the post-promotion state; the parenthetical "12/12 verification PASS" is the same wording used in the closure MSPR `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` §What this closure confirms block and the provenance file `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` §Verdict line.

### What this edit does NOT change

- The table header at lines 155-156 (`| Phase | Scope | Gate | Status |` and the `|---|---|---|---|` separator) is unchanged.
- The §Phase A row (line 157), §Phase B row (line 158), §Phase C row (line 159), §Phase D row (line 160), §Phase F row (line 162), §Phase G row (line 163) are all unchanged.
- The §Phase E row's §Phase, §Scope, and §Gate columns (the first 3 cells) are unchanged. Only the §Status cell is updated.
- The rest of the README (lines 1-154 and 164-433) is unchanged by this patch.
- The patch is a single-line documentation-only update; it does NOT change the binding spec (`docs/automation/semi-automated-operations-layer.md`) or the binding ADR (`docs/DECISIONS.md` ADR-0025).

## Summary of edits applied

| Edit | Line(s) | Type | Reason |
|---|---|---|---|
| 1 | 161 | single-cell status text | flip §Phase E row from "page shipped (ccf0f50), LLM-synthesized handover draft still pending" to "promoted 2026-06-09 to czinchfegtglmrloxlmh (12/12 verification PASS; LLM-synthesized handover draft remains out of scope for Phase F)" |

One of one edit is a text change. The patch is a single documentation-only commit.

## Cross-references (apply me, then confirm these match)

- ADR-0025 — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/DECISIONS.md` lines 807-940 (`Status: accepted (2026-06-09)`).
- ADR-0028 — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/DECISIONS.md` lines 942-1140 (the analog precedent; the §Phase B row at line 158 of the README is unchanged by this patch).
- Closure MSPR (the source of truth for this patch) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (YAML frontmatter `verdict: pending` until the Owner applies the patch; flips to `verdict: accepted` once the 5 pre-flight checks pass and the edit is applied).
- Provenance file (the audit anchor) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (12-query result table and 3 SHAs must be fully filled before this patch is applied).
- Runbook — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (the 15-step procedure the Owner follows; 3 SHAs are pasted at §Pre-flight step 10).
- Post-promotion plan-doc patch — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan-post-e-status.md` (the 9-enumerated-edit patch for `docs/automation/implementation-plan.md`; applied in the same commit as this README patch, in either order).
- Post-promotion checklist (marketing-grade) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/post-promotion-checklist-adr-0025.md` (the Owner-facing quick reference; this README patch is the 4th of 4 docs in the checklist §Record section).
- Implementer's promotion-prep MSPR (the partial entry this addendum flips) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` (YAML frontmatter `verdict: partial`; closure addendum at the same path's `## Addendum — Closure` section after the Owner applies this patch).
- Upstream Phase E implementation closure — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (line 104 `nextGate` names the live-DB promotion as the open item; the closure MSPR's §Post-promotion documentation sweep names this file as one of the docs to update).

## What this patch does NOT change

- `docs/DECISIONS.md` — ADR-0025 is `Status: accepted` since 2026-06-09; the live-DB promotion does not flip the ADR status. No edit.
- `prisma/schema.prisma` — the schema is unchanged by the promotion; the 12-query check #11 asserts the 4 inventory tables (`InventoryItem`, `InventoryMovement`, `InventoryStockSnapshot`, `WorkflowTask`) are untouched. No edit.
- `src/**`, `apps/**`, `web/**` — no code change. The 3 endpoints + the 2 Cockpit pages were authored in the upstream E-1/E-3/E-4/E-5 slice (commit `d4e6570`).
- `prisma/migrations/**` — the migration `20260608175159_automation_handover_draft_policies/migration.sql` is unchanged by the promotion; the 12-query check #1 asserts it is in `_prisma_migrations` post-apply.
- `package.json`, `package-lock.json` — no dependency change. The verification script uses `prisma.$queryRawUnsafe` like the 2 sibling scripts; it does NOT add the `postgres` npm package.
- `.env*` — never read, never written. The patch is documentation-only.

## Evidence language (per AGENTS.md)

- **Observed:** the current `README.md` on disk at commit `d4e6570` contains the §Phase E row at line 161 with the text "page shipped (ccf0f50), LLM-synthesized handover draft still pending". The 1 edit above is the only change required to flip the README to the post-promotion state.
- **Inferred:** the Owner will type `npx prisma migrate deploy` and the verification command in their own terminal; the orchestrator (or a future Docs agent) will apply this patch and author the closure MSPR.
- **Recommended:** apply this patch AFTER the 5 pre-flight checks pass. Do NOT apply before. Do NOT split the patch across multiple commits; it is a single documentation-only edit. Apply this patch IN THE SAME COMMIT as the post-promotion plan-doc patch (`docs/automation/implementation-plan-post-e-status.md`); the two are documentation-only follow-ups to the same promotion event.
- **Applied:** the patch file itself is on disk; the on-disk README is UNCHANGED by this patch.
- **Verified:** the cross-references in the §Cross-references (apply me, then confirm these match) section are correct against the on-disk file inventory at commit `d4e6570` on `phase-b-multistandort`.
- **BLOCKED:** the patch is BLOCKED on the 5 pre-flight checks. If any check fails, do NOT apply the patch; escalate per the runbook §BLOCKED escalation.
