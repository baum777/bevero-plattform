# Intent Memory — P3: Unsaved-Changes-Guard

- id: p3-unsaved-changes-guard-2026-06-29
- timestamp: 2026-06-29T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-p3-unsaved-changes-guard.md`
- status: reviewed

## Core intention

Prevent accidental data loss in the two main in-app editor flows (Schnellnotiz, Schichtübergabe). Users who type content and then navigate away or close the panel without saving should receive a confirmation dialog, not silent discard.

## Logic followed

- Centralised the guard into a reusable `useUnsavedChanges(isDirty)` hook so the pattern can be applied to any future form without duplicating logic.
- The hook owns two responsibilities: `beforeunload` event (navigation-away guard) and an in-app `ConfirmDangerDialog` flow via `guardAction()`.
- ShiftHandoverClient already has debounced autosave — only `beforeunload` is needed there. The hook handles both transparently; the component simply does not destructure the dialog helpers.
- QuickNotesFab is a panel, not a route — beforeunload guards page-leave, guardAction guards explicit close (X button, backdrop click, Escape key).

## Design assumptions

- `isDirty` in QuickNotesFab uses content-presence heuristic: any non-empty text or item text means dirty. This is intentionally conservative — better to show the dialog once too often than to silently discard.
- `isDirty` is gated on `open` to avoid spurious beforeunload after a note has been saved and the panel closed (text state persists in memory but the note is already persisted).
- ShiftHandoverClient's `lastSavedBodyRef` is now initialized with `initialDraft` values so `isDirty` is false on first load when nothing has changed.

## Tradeoffs

- Accepted:
  - isDirty heuristic (content-presence) instead of deep diff against last-persisted state — simpler, fewer edge cases, consistent with user expectations
  - `guardAction` reads `isDirty` via ref (`isDirtyRef`) rather than closing over the prop — keeps it stable as a `useCallback` with `[]` deps, preventing unnecessary effect re-registrations
- Rejected:
  - Intercepting `next/navigation` router events — not needed for these flows; both QuickNotesFab and ShiftHandoverClient are single-page panels
  - Adding a "Verwerfen" dialog to ShiftHandoverClient — autosave is frequent enough that navigation-away is the only meaningful loss scenario; adding an in-app dialog would add noise without value

## Durable memory

- `ConfirmDangerDialog` is the canonical in-app discard-confirmation surface. Labels convention: `confirmLabel="Verwerfen"` + `cancelLabel="Weiter bearbeiten"`.
- The `useUnsavedChanges` hook is safe to use in any "use client" component that holds unsaved state. It manages both browser beforeunload and in-app dialog state.
- `isDirtyRef.current = isDirty` inside the hook keeps `guardAction` stable while always reading the latest dirty value — no stale closure.

## Do not reuse blindly

- Do not use this hook for server components or layouts — it is client-only ("use client").
- The heuristic `isDirty = content-presence` is appropriate for ephemeral editors. For forms with initial data (e.g. edit-profile), compare against the original field values instead.

## Relation to Rauschenberger OS / Bevero

- location logic: not applicable
- role/approval logic: not applicable
- inventory/procurement/shift-planning logic: Schichtübergabe editor is the primary shift-planning surface; guard ensures PATCH is not lost on accidental navigation
- external-system boundary: not applicable

## Next logic gate

M6 (Abbruch-CTAs in Formularen) is the next logical step: adding explicit cancel buttons to non-modal forms that use the same `useUnsavedChanges` guard pattern.
