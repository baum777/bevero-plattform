# MSPR Entry — Sales Kit Light: First Lead Execution Pack (P1.1)

- id: sales-kit-first-lead-execution-pack-20260703
- timestamp: 2026-07-03T12:00:00Z
- runId: baum-os-session-2026-07-03-p1-1-execution-pack
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/sales-kit/sales-kit-index.md
  - docs/sales-kit/outreach-readiness.md
  - docs/sales-kit/first-contact-final.md
  - docs/sales-kit/lead-steckbrief-template.md
  - docs/sales-kit/pilot-conversation-guide.md
  - docs/sales-kit/pilot-offer-light.md
  - docs/sales-kit/sales-call-guide.md (superseded marker only)
- pathsOutOfScope:
  - apps/, packages/, supabase/ (read-only evidence lookups only — no code, no deploy, no DB work)
  - pilot-onepager.md, workflow-audit-template.md, objection-handling.md, sales-positioning.md, first-contact-email.md (inconsistencies documented in index as W1–W4, edits gated on owner decision O4)
- autonomyTier: 1

## Code Change Context

- Trigger/request: P1.1 — turn the Sales Kit into a first-lead execution pack: kit index, resolve O2 via capability truth table with repo evidence, O2-clean the final mail, lead-steckbrief usable, conversation guide, decision-neutral pilot offer.
- Why the change was needed: P1 ended `partial` with hard blocker O2 — the mail claimed capabilities (mobile capture, refill list with status, shift handover, audit trail) that were inventoried but never verified against the product.
- Files read (evidence, read-only):
  - apps/api/prisma/schema.prisma (GoodsReceipt, BarRefillRun/RunItem, ShiftHandoverDraft, InventoryMovement.actorUserId, OperationalNoteAuditEvent)
  - apps/api/src/modules/inventory/{goods-receipt,bar-refill,correction,review-task}.service.ts
  - apps/api/src/modules/shift-handover/shift-handover.types.ts
  - apps/cockpit/app structure: (app)/{shift-handover,movements,freigaben,inventory/bar-refill,kitchen/{checkliste,walk-route}}, mobile-ops.css, components/bottom-nav.tsx
  - apps/api/tests listing (goods-receipt, bar-refill ×2, correction ×2, shift-handover route tests)
- Files changed:
  - docs/sales-kit/sales-kit-index.md (new — inventory, source-of-truth map, contradictions W1–W5, owner decisions O1/O3/O4/O5, lead sequence)
  - docs/sales-kit/outreach-readiness.md (section 2d replaced by Capability Truth Table K1–K7 with repo evidence; O2 marked resolved; header/section 5 updated)
  - docs/sales-kit/first-contact-final.md (claim "Auffülllisten für Bar und Küche" → "Bar-Auffülllisten"; O2 status note; two new never-claim bullets)
  - docs/sales-kit/lead-steckbrief-template.md (section 7 → "Sicherer Mail-Aufhänger" with safety check; new section 10 "Was nicht behauptet werden darf"; new section 11 Quellenliste; use-case wording aligned to K2/K5)
  - docs/sales-kit/pilot-conversation-guide.md (new — canonical guide: time blocks, observation points, fit/no-fit criteria, closing question)
  - docs/sales-kit/pilot-offer-light.md (new — decision-neutral offer template, price ranges only, O1 gate explicit)
  - docs/sales-kit/sales-call-guide.md (superseded marker prepended, content preserved)
- Commands run:
  - Targeted `ls`/`grep` per large-folder rule against apps/api and apps/cockpit → evidence collected, no global scan
  - `npm run check:work-docs` → see Validation
- Validation results:
  - Truth table outcome: K1/K3/K4/K5/K6 `confirmed` (K5/K6 with wording guards), K2 `needs wording change` (bar only — kitchen has checklists, no refill list), K7 `needs wording change` (subjective UX claim)
  - Evidence class: code + schema + tests (CI 2026-07-03: 754/754 green, commit c1b1eb6) — NOT live runtime; UI smoke remains a P0 gate for pilot start, not for sending

## Memory

- newFindings:
  - Kitchen has `checkliste` + `walk-route` in the cockpit but NO refill list — every "Auffüllliste Bar/Küche" phrase in the kit overclaims (W1).
  - InventoryMovement carries a mandatory `actorUserId` — the "wer/was/wann" trail claim is structurally guaranteed, not best-effort.
- reusableRules:
  - Capability claims resolve against code+schema+tests as evidence class for *sending*; live runtime smoke is the stricter gate for *pilot start*. Two gates, two thresholds.
- gotchas:
  - `first-contact-email.md` variants B/C still contain the unbereinigte "Bar und Küche" claim — the variant library must never be sent directly (index status: reference).

## Review

- status: pass
- risks:
  - Runtime behavior of `/inventory/bar-refill` on the deployed UI is unconfirmed (explicitly excluded from the pending P0 UI smoke) — do not demo it live before the smoke passes.
  - Four kit files keep documented contradictions (W1–W4) until owner approves the batch cleanup (O4); send-critical files are clean.
- scorecard:
  - outcomeQuality: 5
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 5
- nextGate: Owner fills first real Lead-Steckbrief (only public sources) → send via first-contact-final.md + pre-send checklist. O1 before any price talk, O3 before pilot-start data docs, O4 for kit-wide cleanup.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-03-sales-kit-first-lead-execution-pack.md`
