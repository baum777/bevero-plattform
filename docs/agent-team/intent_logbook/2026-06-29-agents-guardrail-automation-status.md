# Intent Memory — AGENTS.md Automation Guardrail Status Correction

- id: 2026-06-29-agents-guardrail-automation-status
- timestamp: 2026-06-29T08:25:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-agents-guardrail-automation-status.md`
- status: reviewed

## Core intention

Align the `apps/api/AGENTS.md` automation frontdoor with already-accepted ADR truth, so agents are no longer told to treat migrated, accepted models as "proposed / do-not-implement" — without weakening any hard guardrail.

## Logic followed

- Authority-first: read ADR-0021/0022/0023 in `docs/DECISIONS.md` and confirmed the five automation tables were promoted to `accepted` (ADR-0022, 2026-06-08) with the mutation surface authorized (ADR-0023, 2026-06-08).
- Minimal, surgical edit: change only the status wording and the phase label; leave the six hard guardrails byte-identical.
- Preserve boundaries: offline sync, shift-handover write, and external writeback remain explicitly ADR-gated (no over-claim that the whole automation surface is open).
- Cite, don't paraphrase authority: the new wording names ADR-0022 and ADR-0023 by number and acceptance date.

## Design assumptions

- ADRs in `docs/DECISIONS.md` are the binding authority; a frontdoor doc that contradicts an accepted ADR is the stale artifact, by definition.
- The hard guardrails (no auto-mutation, no writeback, RLS authoritative, append-only) remain correct regardless of migration status — they describe permanent operating limits, not phase state.

## Tradeoffs

- Accepted:
  - Edit the governance frontdoor directly (user-scoped, L2) rather than only flag it.
  - Use a phase label "spec adopted; Phase B/C landed" instead of a single phase number, because the implementation-plan is internally inconsistent on the exact current phase.
- Rejected:
  - Weakening or rewording any hard guardrail.
  - Asserting the status of ADR-0024/0025/0026 (not verified) — kept as "their own ADRs".

## Durable memory

- The five automation tables (`AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft`) are accepted + migrated under ADR-0022; mutation surface under ADR-0023.
- When a frontdoor doc and `docs/DECISIONS.md` disagree, the ADR wins; the frontdoor is the thing to fix.
- The permanent hard guardrails are separate from phase status and must never be edited as part of a "status refresh".

## Do not reuse blindly

- The "cite ADR-0022/0023" fix is specific to the automation tables; other "proposed" wording in the repo may correspond to surfaces that are genuinely still un-gated — verify each against its ADR before changing wording.
- Do not copy the phase label "Phase B/C landed" elsewhere without re-checking the implementation-plan; phase numbering is nuanced.

## Relation to Rauschenberger OS / Bevero

- location logic: unaffected.
- role/approval logic: the correction keeps the human-gating posture fully intact (suggestions only, operator approves) — it changes migration status, not approval authority.
- inventory/procurement/shift-planning logic: the no-auto-mutation and append-only audit guardrails for inventory movements and automation suggestions/decisions are preserved verbatim.
- external-system boundary: the no-writeback guardrail (FoodNotify / Dynamics / DATEV) is preserved; writeback remains ADR-gated.

## Next logic gate

Decide whether to back-propagate the same status correction to other frontdoors that still quote "proposed" (README, `docs/features/item-image-service.md`), or treat the `apps/api/AGENTS.md` fix as sufficient for now.
