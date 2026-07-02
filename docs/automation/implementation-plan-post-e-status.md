# Implementation Plan — Post-Promotion Status Patch (ADR-0025 / Phase E)

**Purpose:** This file is a **draft patch** the Owner (or a future Docs/Implementer agent) applies to `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/implementation-plan.md` **after** the live-DB promotion of `prisma/migrations/20260608175159_automation_handover_draft_policies/migration.sql` succeeds against the Supabase dev project `czinchfegtglmrloxlmh` and the 12-query verification gate reports `VERDICT: PASS.`

**Do NOT apply this patch before the promotion succeeds.** All edits below assume the closure MSPR `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (the post-promotion addendum to the Implementer's `2026-06-09-adr-0025-promotion.md`) has been authored with `verdict: accepted` and the 3 SHAs are pasted into the runbook, the provenance file, and the closure MSPR.

**Apply authority:** the Owner (`cheikh.witm@proton.me`) is the only role authorized to flip the on-disk plan-doc to the post-promotion state. The orchestrator may not apply this patch without explicit owner instruction.

**Pre-flight before applying this patch:**

1. `cd /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp`
2. `npx prisma migrate status` → expect `Database schema is up to date!` with `0 not yet applied`.
3. `npx tsx scripts/verify-adr-0025-handover-draft-policies.ts` → expect `Summary: 12/12 passed, 0/12 failed. VERDICT: PASS.`.
4. `cat /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` → expect `verdict: accepted` in the YAML frontmatter and the 12-row result table fully filled (no `TBD` cells).
5. `grep -c "TBD" /home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` → expect `0`.

If any of the 5 pre-flight checks fail, **do NOT apply this patch.** Escalate per the runbook `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` §BLOCKED escalation.

## Edits

The edits below are described as `(line number in current implementation-plan.md) — before — after`. Apply them in order. The line numbers are correct against the file on disk at commit `d4e6570` on `phase-b-multistandort` (the Implementer's 1-line update is already on disk; this patch does not change that line, it changes adjacent lines).

### Edit 1 — §2 Status snapshot, Phase E row (line 36)

The Phase E row is at line 36. Its `Status` cell currently ends with the phrase `live-DB promotion of the new \`20260608175159\` migration is a separate named step gated on a verified Supabase snapshot)`. Change that phrase to `promoted 2026-06-09 to Supabase \`czinchfegtglmrloxlmh\` (12/12 verification queries PASS; see the closure MSPR \`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md\` and the provenance file \`docs/automation/promotion-evidence/2026-06-09-adr-0025.md\`)`.

- **Before** (end of line 36): `... the 3 mutation endpoints + the 2 write policies + the Cockpit rewrite are forward-only on disk; live-DB promotion of the new \`20260608175159\` migration is a separate named step gated on a verified Supabase snapshot) |`
- **After**: `... the 3 mutation endpoints + the 2 write policies + the Cockpit rewrite are forward-only on disk; **promoted 2026-06-09** to Supabase \`czinchfegtglmrloxlmh\` (12/12 verification queries PASS; see the closure MSPR \`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md\` and the provenance file \`docs/automation/promotion-evidence/2026-06-09-adr-0025.md\`) |`

### Edit 2 — §2 Status snapshot, Phase E promotion-prep row (line 37)

The Phase E live-DB promotion-prep row is at line 37. Its `Status` cell currently ends with the phrase `the owner runs the runbook)`. Change the entire cell to flip from "done (promotion-prep on disk; ... owner-typed, BLOCKED until the owner runs the runbook)" to "done (promoted 2026-06-09; 12/12 verification PASS; closure addendum at `docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md`)".

- **Before** (line 37, full cell text): `| Phase E — live-DB promotion prep (3 governance artifacts) | ✓ | ADR-0025 (sibling of ADR-0028 / ADR-0029-A) | \`scripts/verify-adr-0025-handover-draft-policies.ts\` (12-query read-only gate), \`docs/automation/promotion-evidence/RUNBOOK-adr-0025.md\` (15-step procedure), \`docs/automation/promotion-evidence/2026-06-09-adr-0025.md\` (provenance / evidence file, TBD until apply) | **done** (promotion-prep on disk; \`prisma validate\` clean, backend + Cockpit \`tsc --noEmit\` clean, 518/518 vitest cases green; the actual \`npx prisma migrate deploy\` + 12-query verify are owner-typed, BLOCKED until the owner runs the runbook) |`
- **After** (line 37, full cell text): `| Phase E — live-DB promotion prep (3 governance artifacts) | ✓ | ADR-0025 (sibling of ADR-0028 / ADR-0029-A) | \`scripts/verify-adr-0025-handover-draft-policies.ts\` (12-query read-only gate), \`docs/automation/promotion-evidence/RUNBOOK-adr-0025.md\` (15-step procedure), \`docs/automation/promotion-evidence/2026-06-09-adr-0025.md\` (provenance / evidence file, fully filled) | **done** (promoted 2026-06-09 to Supabase \`czinchfegtglmrloxlmh\`; \`npx prisma migrate deploy\` succeeded; 12/12 verification queries PASS via \`npx tsx scripts/verify-adr-0025-handover-draft-policies.ts\`; closure addendum at \`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md\`; the 3 SHAs are recorded in the runbook §Pre-flight table, the provenance file, and the closure MSPR) |`

### Edit 3 — §3 Sequencing, Phase E node (line 59)

The Phase E sequencing line at line 59 currently reads `Phase E (Shift Handover Drafts) ── ADR-0025`. The node is already correct as a sequencing label; no change is required to the ASCII graph itself. **No edit applied to line 59.** (This entry is here only to document that the review confirmed line 59 does not need a change.)

### Edit 4 — §4 Phase E E-1 entry (line 133)

The §4 Phase E E-1 bullet at line 133 is a paragraph describing the E-1 slice scope. It currently ends with the phrase `E-1: ADR-0025 — \`ShiftHandoverDraft\` schema (already proposed in ADR-0022 §Schema Additions) + RLS (staff+ for own shift, manager+ for team).`. This bullet does not carry a status badge and its text is unchanged by the promotion; it is forward-pointing. **No edit applied to line 133.** (Confirmed: the E-1 bullet is scope, not status.)

### Edit 5 — §4 Phase E E-2 entry (line 134)

The §4 Phase E E-2 bullet at line 134 currently reads `E-2: \`GET /shift-handover/draft\` (current draft for the caller's shift) + \`PATCH /shift-handover/draft\` (autosave) + \`POST /shift-handover/draft/:id/confirm\` (manager+ only).`. Per the prior MSPR `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (Review risks, line 96), E-2 (DTOs / Public-API-Erweiterung) was merged into E-1, and the plan-doc should be updated to reflect that. After the promotion, this becomes a status note rather than a forward-pointing scope line.

- **Before** (line 134): `- **E-2:** \`GET /shift-handover/draft\` (current draft for the caller's shift) + \`PATCH /shift-handover/draft\` (autosave) + \`POST /shift-handover/draft/:id/confirm\` (manager+ only).`
- **After** (line 134): `- **E-2:** \`GET /shift-handover/draft\` (current draft for the caller's shift) + \`PATCH /shift-handover/draft\` (autosave) + \`POST /shift-handover/draft/:id/confirm\` (manager+ only). **done** by E-1 (per MSPR-2026-06-09-phase-e-handover-drafts.md Review risks line 96); promoted to Supabase \`czinchfegtglmrloxlmh\` on 2026-06-09 (see closure MSPR \`docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md\`).`

### Edit 6 — §4 Phase E E-3 entry (line 135)

The §4 Phase E E-3 bullet at line 135 currently reads `E-3: Cockpit integration: replace localStorage with the new endpoints, keep the existing UX (Normal/Wichtig/Kritisch priority, last 10 history, delete).`. The bullet is scope; it does not carry a status. **No edit applied to line 135.** (Confirmed: E-3 is forward-pointing scope, not status.)

### Edit 7 — §4 Phase E E-4 entry (line 136)

The §4 Phase E E-4 bullet at line 136 currently reads `E-4: Auto-populate from open items, alerts, and recent \`WorkflowEvent\`s. **Open question:** the auto-populate logic is not specified in the spec beyond "open items and alerts". Pin down before E-4.`. The bullet is scope and carries an open-question marker. **No edit applied to line 136.** (Confirmed: E-4 is forward-pointing scope, not status.)

### Edit 8 — §4 Phase E E-5 entry (line 137)

The §4 Phase E E-5 bullet at line 137 currently reads `E-5: MSPR logbook entry.`. The bullet is scope. **No edit applied to line 137.** (Confirmed: E-5 is forward-pointing scope. The E-5 MSPR closure entry itself is `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` and was already on disk at commit `d4e6570`. The closure of the **promotion** (as opposed to the closure of Phase E) is the new file `2026-06-09-adr-0025-promotion-closure.md` that this patch's Edit 1 and Edit 2 cross-reference.)

### Edit 9 — §4 Phase E gate line (line 138)

The §4 Phase E gate line at line 138 currently reads `- **Gate:** shift lead can draft a handover from mobile, see open items and notes, confirm, and move to the next shift; the audit trail reconstructs "this handover came from rule X firing on inputs Y at time Z" per ADR-0021 §3.`. The gate describes the user-visible outcome, not a slice-status badge. **No edit applied to line 138.** (Confirmed: the gate text is unchanged; the gate is now met by the live-DB promotion + the Cockpit user-path smoke that the closure MSPR §Post-promotion Cockpit user-path smoke names.)

## Summary of edits applied

| Edit | Line(s) | Type | Reason |
|---|---|---|---|
| 1 | 36 | status text | flip Phase E row from "live-DB promotion is a separate named step" to "promoted 2026-06-09" |
| 2 | 37 | status text | flip Phase E promotion-prep row from "BLOCKED until the owner runs the runbook" to "promoted 2026-06-09; 12/12 verification PASS" |
| 3 | 59 | (no change) | §3 sequencing ASCII graph is correct as-is; Phase E node already names ADR-0025 |
| 4 | 133 | (no change) | §4 E-1 bullet is forward-pointing scope; status is implicit by the §2 row |
| 5 | 134 | status text | E-2 status updated from "merged into E-1" (per the prior MSPR) to "done by E-1 (promoted 2026-06-09)" |
| 6 | 135 | (no change) | §4 E-3 bullet is forward-pointing scope |
| 7 | 136 | (no change) | §4 E-4 bullet is forward-pointing scope; open question still open |
| 8 | 137 | (no change) | §4 E-5 bullet is forward-pointing scope; the E-5 closure entry is on disk |
| 9 | 138 | (no change) | §4 Phase E gate text is forward-pointing; the gate is now met by the live-DB promotion |

Two of nine edits are text changes (lines 36, 37, 134); seven are explicit no-ops that document the review.

## Cross-references (apply me, then confirm these match)

- ADR-0025 — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/DECISIONS.md` lines 807-940 (`Status: accepted (2026-06-09)`).
- ADR-0028 — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/DECISIONS.md` lines 942-1140 (the analog precedent; the §3 sequencing and §4 Phase B gate patterns are the source for the Phase E closure).
- Closure MSPR (the source of truth for this patch) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion-closure.md` (new file authored by the Docs agent in this slice; YAML frontmatter `verdict: pending` until the Owner applies the patch; flips to `accepted` once the 5 pre-flight checks pass and the edits are applied).
- Provenance file (the audit anchor) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/2026-06-09-adr-0025.md` (12-query result table and 3 SHAs must be fully filled before this patch is applied).
- Runbook — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/automation/promotion-evidence/RUNBOOK-adr-0025.md` (the 15-step procedure the Owner follows; 3 SHAs are pasted at §Pre-flight step 10).
- Implementer's promotion-prep MSPR (the partial entry this addendum flips) — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-adr-0025-promotion.md` (YAML frontmatter `verdict: partial`; closure addendum at the same path's `## Addendum — Closure` section after the Owner applies this patch).
- Upstream Phase E implementation closure — `/home/baum/Schreibtisch/workspace/main_projects/bevero-webapp/docs/agent-team/mspr_logbook/2026-06-09-phase-e-handover-drafts.md` (line 104 `nextGate` names the live-DB promotion as the open item; the closure MSPR's §Post-promotion documentation sweep names this file as one of the docs to update).

## What this patch does NOT change

- `docs/DECISIONS.md` — ADR-0025 is `Status: accepted` since 2026-06-09; the live-DB promotion does not flip the ADR status. No edit.
- `prisma/schema.prisma` — the schema is unchanged by the promotion; the 12-query check #11 asserts the 4 inventory tables (`InventoryItem`, `InventoryMovement`, `InventoryStockSnapshot`, `WorkflowTask`) are untouched. No edit.
- `src/**`, `apps/**`, `web/**` — no code change. The 3 endpoints + the 2 Cockpit pages were authored in the upstream E-1/E-3/E-4/E-5 slice (commit `d4e6570`).
- `prisma/migrations/**` — the migration `20260608175159_automation_handover_draft_policies/migration.sql` is unchanged by the promotion; the 12-query check #1 asserts it is in `_prisma_migrations` post-apply.
- `package.json`, `package-lock.json` — no dependency change. The verification script uses `prisma.$queryRawUnsafe` like the 2 sibling scripts (`scripts/verify-automation-phase-b-migrations.ts` + `scripts/verify-adr-0029a-operational-units.ts`); it does NOT add the `postgres` npm package.
- `.env*` — never read, never written. The patch is documentation-only.

## Evidence language (per AGENTS.md)

- **Observed:** the current `docs/automation/implementation-plan.md` on disk at commit `d4e6570` contains the line ranges and the 1-line update the Implementer added. The 9 edits above are the only changes required to flip the plan-doc to the post-promotion state.
- **Inferred:** the Owner will type `npx prisma migrate deploy` and the verification command in their own terminal; the orchestrator (or a future Docs agent) will apply this patch and author the closure MSPR.
- **Recommended:** apply this patch AFTER the 5 pre-flight checks pass. Do NOT apply before. Do NOT split the patch across multiple commits; it is a single documentation-only edit.
- **Applied:** the patch file itself is on disk; the on-disk plan-doc is UNCHANGED by this patch.
- **Verified:** the cross-references in the §Cross-references (apply me, then confirm these match) section are correct against the on-disk file inventory at commit `d4e6570` on `phase-b-multistandort`.
- **BLOCKED:** the patch is BLOCKED on the 5 pre-flight checks. If any check fails, do NOT apply the patch; escalate per the runbook §BLOCKED escalation.
