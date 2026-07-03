# MSPR Entry — Bevero Sales Kit Light (docs/sales-kit)

- id: sales-kit-light-20260703
- timestamp: 2026-07-03T05:00:00Z
- runId: baum-os-session-2026-07-03-bevero-sales-kit
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/sales-kit/lead-steckbrief-template.md
  - docs/sales-kit/workflow-audit-template.md
  - docs/sales-kit/first-contact-email.md
  - docs/sales-kit/follow-up-email.md
  - docs/sales-kit/pilot-onepager.md
  - docs/sales-kit/sales-call-guide.md
  - docs/sales-kit/objection-handling.md
  - docs/sales-kit/sales-positioning.md
- pathsOutOfScope:
  - apps/
  - packages/
  - supabase/
  - any database, deployment, or code paths
- autonomyTier: 1

## Code Change Context

- Trigger/request: Baum-OS session prompt "Bevero Sales Kit Light" — create a compact markdown sales kit for outreach mails, first calls, and pilot offers.
- Why the change was needed: Bevero needs a usable sales entry point (mails, call guide, pilot one-pager, objection handling) that sells the MVP pilot scope only, without AI-hype or CoreOS/Company-Brain vision.
- Files read:
  - docs/sales-kit/ (existing four files from interrupted first run)
  - docs/agent-team/templates/code_change_context.md
  - docs/agent-team/templates/intent_memory_entry.md
- Files changed:
  - docs/sales-kit/pilot-onepager.md (new)
  - docs/sales-kit/sales-call-guide.md (new)
  - docs/sales-kit/objection-handling.md (new)
  - docs/sales-kit/sales-positioning.md (new)
  - (lead-steckbrief-template.md, workflow-audit-template.md, first-contact-email.md, follow-up-email.md created in the interrupted first run of the same session)
- Commands run:
  - none (content-only work; no build/test applicable) → not_run
- Validation results:
  - Manual review against the session's 8-point quality checklist (gastro realism, pilot smallness, immediate usability, clear Bevero explanation, human language, no invented sensitive data, no overblown AI vision) — recorded in session output.

## Memory

- newFindings:
  - The sales kit consistently positions Bevero as the layer *between* existing systems (POS, Warenwirtschaft) — never as a replacement. This framing defuses the two biggest objections (tool fatigue, existing systems).
- reusableRules:
  - All customer-facing pricing and data-protection statements are marked with `> Annahme:` until a real price list and AVV/hosting evidence exist.
- gotchas:
  - Email variant C (personal operative experience) is only usable if the sender's operative background claim is literally true — flagged inline in the file.

## Review

- status: pass
- risks:
  - Pricing ranges in pilot-onepager.md are placeholders; must be replaced before first real offer.
  - Data-protection answer in objection-handling.md assumes EU hosting + DSGVO AVV; must be verified before first pilot contract.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Operator review of pricing logic and DSGVO claims before first outbound mail.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-03-sales-kit-light.md`
