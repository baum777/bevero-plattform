# MSPR Entry — P3: Unsaved-Changes-Guard

- id: p3-unsaved-changes-guard-2026-06-29
- timestamp: 2026-06-29T00:00:00Z
- runId: ux-optimierung-cockpit-session
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - apps/cockpit/hooks/use-unsaved-changes.ts
  - apps/cockpit/app/components/quick-notes-fab.tsx
  - apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx
- pathsOutOfScope:
  - apps/api/
  - apps/landing/
- autonomyTier: 2

## Code Change Context

- Trigger/request: UX-Optimierungskonzept Sprint 1 P3 — guard unsaved changes in modal and form flows
- Why the change was needed: Users could lose text in the Schnellnotiz-Panel by pressing Escape or clicking the backdrop without being warned. ShiftHandoverClient had no beforeunload guard despite being an editable form with debounced autosave.
- Files read:
  - apps/cockpit/app/components/ui/confirm-dialog.tsx
  - apps/cockpit/app/components/quick-notes-fab.tsx
  - apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx
- Files changed:
  - apps/cockpit/hooks/use-unsaved-changes.ts (new)
  - apps/cockpit/app/components/quick-notes-fab.tsx
  - apps/cockpit/app/(app)/shift-handover/shift-handover-client.tsx
- Commands run:
  - `npm run build` → pass
- Validation results:
  - next build exits 0, all routes Dynamic, TypeScript clean

## Memory

- newFindings:
  - isDirty must be scoped to `open && panelView === "editor"` in QuickNotesFab — after persist() closes the panel, text state persists in memory and would incorrectly trigger beforeunload if not gated on `open`
  - lastSavedBodyRef in ShiftHandoverClient initialized with empty object; initializing with initialDraft values prevents false-positive dirty on first load
  - guardAction reads isDirty via ref (isDirtyRef) to stay stable as a useCallback with [] deps — avoids Escape handler re-registering every render
- reusableRules:
  - Unsaved-guard hook pattern: isDirtyRef + stable guardAction + pendingAction ref → dialog flow
  - ConfirmDangerDialog reusable for any destructive-confirmation flow (title, description, confirmLabel, cancelLabel)
- gotchas:
  - Escape key handler must depend on guardAction and closePanel (both stable via useCallback) — not on isDirty directly

## Review

- status: pass
- risks:
  - isDirty for QuickNotesFab uses content-presence heuristic (text.trim() !== "" or items with content); does not compare against the persisted note state. A user editing an existing note back to its original content would still see the dialog.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: commit on feat/ux-optimierung-cockpit

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-p3-unsaved-changes-guard.md`
