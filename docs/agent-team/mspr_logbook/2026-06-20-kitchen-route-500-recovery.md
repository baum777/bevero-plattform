# MSPR Entry — Kitchen route 500 recovery

- id: kitchen-route-500-recovery-2026-06-20
- timestamp: 2026-06-20T23:00:00+02:00
- runId: local-codex-session
- agentRole: reviewer
- taskType: bugfix

## Scope

- layer: app_local
- pathsInScope:
  - `apps/cockpit/app/(app)/kitchen/checkliste/checkliste-client.tsx`
  - `assets/Screenshots/screenshot-audit-report.md`
- pathsOutOfScope:
  - backend/API contracts, database schema, authenticated production data
- autonomyTier: 2

## Code Change Context

- Trigger/request: Recover `/schichtplan/maengel` and `/kitchen/walk-route` after the screenshot audit recorded HTTP 500 responses, and document the result.
- Why the change was needed: The previous checklist `TEMPLATE` type attached `[]` to only one side of an intersection. The corrected current-branch declaration in commit `7177d4d` parenthesizes the intersection before applying `[]`, allowing Cockpit type generation to succeed. The route data paths themselves already fail closed to rendered empty/error states.
- Files read:
  - `AGENTS.md`
  - `README.md`
  - `docs/agent-team/work_documentation_rule.md`
  - `apps/cockpit/README.md`
  - `apps/cockpit/package.json`
  - `apps/cockpit/app/(app)/schichtplan/maengel/page.tsx`
  - `apps/cockpit/app/(app)/kitchen/walk-route/page.tsx`
  - `apps/cockpit/lib/backend/shift-planning.ts`
  - `assets/Screenshots/screenshot-audit-report.md`
- Files changed:
  - `assets/Screenshots/screenshot-audit-report.md`
  - `docs/agent-team/mspr_logbook/2026-06-20-kitchen-route-500-recovery.md`
  - `docs/agent-team/intent_logbook/2026-06-20-kitchen-route-500-recovery.md`
- Commands run:
  - `git log --oneline -12` → pass
  - `git show 7177d4d` → pass
  - `npm --workspace=apps/cockpit run typecheck` → pass (`next typegen` and `tsc --noEmit`)
  - local Next dev-server/browser route check → blocked; process exited before serving localhost and emitted no log
- Validation results: The compile-level root cause is fixed and type generation/typecheck pass. Fresh authenticated rendered-route verification remains blocked by the local dev-server environment.

## Memory

- newFindings:
  - A compile error in a newly introduced client module can surface as unrelated route-level 500s in the audit.
  - Both affected pages safely render when their backend/session fetches fail; they were not the defect source.
- reusableRules:
  - Verify global Cockpit compilation before attributing simultaneous 500s to individual route data dependencies.
- gotchas:
  - Do not reuse the pre-`7177d4d` intersection/array type shape; it applies the array modifier to the wrong operand.

## Review

- status: needs_rework
- risks:
  - Browser proof with the authenticated audit state has not been regenerated.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Run the Cockpit dev server in a usable local environment and capture authenticated screenshots of both recovered routes.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-20-kitchen-route-500-recovery.md`
