# MSPR Entry — AGENTS.md Automation Guardrail Status Correction

- id: 2026-06-29-agents-guardrail-automation-status
- timestamp: 2026-06-29T08:25:00+02:00
- runId: baumos-2026-06-29-agents-guardrail-automation-status
- agentRole: builder
- taskType: governance_change

## Scope

- layer: governance_policy
- pathsInScope:
  - `apps/api/AGENTS.md` (§"Active Specs & Authority" → item 1, status wording only)
  - `context/current-state.md`, `context/priorities.md` (status sync)
  - `docs/agent-team/mspr_logbook/2026-06-29-agents-guardrail-automation-status.md`
  - `docs/agent-team/intent_logbook/2026-06-29-agents-guardrail-automation-status.md`
- pathsOutOfScope:
  - the 6 hard guardrails in `apps/api/AGENTS.md` (no-auto-mutation, no-writeback, no-LLM-approval, RLS-authoritative, snapshot-read-only, append-only suggestions/decisions) — UNTOUCHED
  - `IDENTITY.md`, `OS.md`, root `AGENTS.md`, `docs/DECISIONS.md` (ADRs are the authority; not edited)
  - `docs/automation/*`, prisma, routes, deploy, `.env*`, `apps/cockpit/*`
- autonomyTier: 2

## Code Change Context

- Trigger/request: User: "3 guardrail aktualisieren" — fix the stale automation guardrail text identified in hygiene-batch2.
- Why the change was needed: `apps/api/AGENTS.md` still labelled the five automation tables "proposed, not yet migrated" and said "do not implement before the spec leaves Phase A and the ADR is accepted" — but that promotion happened via ADR-0022 (accepted 2026-06-08) and ADR-0023 (accepted 2026-06-08). The text was factually wrong and would misdirect agents away from already-accepted, already-migrated models.
- Authority verified before edit:
  - `ADR-0021` (Phase A spec adoption) — `accepted`. Explicitly states each later phase needs its own ADR to promote proposed tables.
  - `ADR-0022` (Phase B Rules Engine MVP) — `accepted` 2026-06-08. Promotes `AutomationRule`, `AutomationSuggestion`, `AutomationDecision`, `OfflineActionQueue`, `ShiftHandoverDraft` + read/dry-run endpoints to `accepted`, authorizes the migrations; B-1/B-2 landed.
  - `ADR-0023` (Automation Mutation Surface) — `accepted` 2026-06-08. Authorizes write-side RLS + mutation endpoints.
  - Models confirmed present in `prisma/schema.prisma` (`Observed`, 89 models total).
- Files read:
  - `apps/api/AGENTS.md` (§1 + surrounding)
  - `docs/DECISIONS.md` ADR-0021 (L263), ADR-0022 (L365), ADR-0023 (L660)
- Files changed:
  - `apps/api/AGENTS.md` — (a) header `(in flight, Phase A)` → `(spec adopted; Phase B/C landed)`; (b) "New data model (proposed, not yet migrated) … Do not implement …" → accurate "migrated + accepted" status citing ADR-0022/0023; (c) "New API surface (proposed)" → read/mutation accepted + offline/handover/writeback still ADR-gated.
  - `context/current-state.md` — Spec-Spannung → "behoben"
  - `context/priorities.md` — guardrail bullet → `[x]`
  - this MSPR + its intent entry
- Commands run:
  - `rg DECISIONS.md ADR-0021/0022/0023` → statuses confirmed (all `accepted`)
  - read-back of edited `apps/api/AGENTS.md` lines 79–113 → verified
- Validation results:
  - The 6 hard guardrails (lines 86–98) are byte-identical to before the edit (only status wording + header changed).
  - New wording cites the exact accepting ADRs and preserves the boundary that offline sync / shift-handover write / external writeback remain separately ADR-gated.
  - No claim fabricated about ADR-0024/0025/0026 (only named as "their own ADRs", status not asserted).

## Memory

- newFindings:
  - `apps/api/AGENTS.md` item-1 status text lagged behind `docs/DECISIONS.md` — a recurring risk when ADRs advance but frontdoor docs are not back-propagated.
  - ADR-0022 is the single authoritative promotion event for the five automation tables; citing it is sufficient to refute "proposed".
- reusableRules:
  - When correcting a governance frontdoor, cite the accepting ADR by number and date; never weaken the hard guardrails; preserve the "still out of scope" boundary for not-yet-gated surfaces.
- gotchas:
  - The implementation-plan doc is internally somewhat inconsistent on the exact current phase ("late Phase A entering Phase B" vs "Phase C done"); the header label therefore says "spec adopted; Phase B/C landed" rather than pinning a single phase number.

## Review

- status: pass
- risks:
  - None material. The change aligns a frontdoor doc with already-accepted ADRs; hard guardrails are preserved verbatim.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Optionally back-propagate the same status fix to any other frontdoor that still says "proposed" (e.g. README, item-image-service.md quote) — separate slice if desired.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-agents-guardrail-automation-status.md`
