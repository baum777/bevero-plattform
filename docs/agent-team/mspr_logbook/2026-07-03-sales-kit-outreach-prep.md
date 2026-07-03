# MSPR Entry — Sales Kit Validation & First Outreach Prep (P1)

- id: sales-kit-outreach-prep-20260703
- timestamp: 2026-07-03T06:00:00Z
- runId: baum-os-session-2026-07-03-p1-outreach-prep
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/sales-kit/outreach-readiness.md
  - docs/sales-kit/pricing-pilot-decision.md
  - docs/sales-kit/first-contact-final.md
- pathsOutOfScope:
  - apps/, packages/, supabase/ (no code, no deploy, no DB work)
  - existing sales-kit files (audited, deliberately not edited — pricing/DSGVO edits gated on owner decisions O1/O3)
- autonomyTier: 1

## Code Change Context

- Trigger/request: Arbeitsblock P1 — make the Bevero Sales Kit Light ready for first real outreach: validate assumptions, list all pricing/DSGVO/hosting/scope/capability claims, pricing decision template (3 variants), safe DSGVO sentence, final mail matched to the founder's real biography, pre-send checklist.
- Why the change was needed: The kit contained marked assumptions (`> Annahme:`) for pricing and data protection plus unverified capability claims; sending mails without a gate risks unbacked promises.
- Files read:
  - docs/sales-kit/*.md (all 8 kit files, grep-audited for Annahme/Preis/DSGVO/Hosting/Daten)
  - docs/deployment-vercel.md (hosting evidence: Vercel region `fra1`, line 20)
- Files changed:
  - docs/sales-kit/outreach-readiness.md (new — assumptions register, claim inventory, two-tier DSGVO statement, pre-send checklist, owner decisions O1–O3)
  - docs/sales-kit/pricing-pilot-decision.md (new — 3 pricing variants with decision form and consistency checklist)
  - docs/sales-kit/first-contact-final.md (new — final mail based on variant C, placeholders only)
- Commands run:
  - `grep -n "Annahme|DSGVO|Hosting|Preis|..." docs/sales-kit/*.md` → pass (all claim locations inventoried)
  - `grep -rn -i "region|frankfurt|hosting" docs/deployment-vercel.md` → pass (fra1 documented; Supabase region NOT documented anywhere)
- Validation results:
  - All `> Annahme:` markers resolved to a status (2 confirmed via founder biography, 2 open as owner decisions).
  - Hosting claim split into provable (Vercel fra1) vs. unproven (Supabase region, DPAs, export/delete capability); customer-facing sentence tiered accordingly.

## Memory

- newFindings:
  - Supabase DB region is not documented in the repo — the "EU hosting" claim is only half-backed (Vercel fra1 yes, DB unknown). Must be checked in the Supabase dashboard before any Stufe-2 data statement.
- reusableRules:
  - Customer-facing claims get a two-tier structure: Stufe 1 = sayable today without evidence risk; Stufe 2 = unlocked only after checkbox evidence.
- gotchas:
  - "Keine Mindestlaufzeit" appears in pilot-onepager.md but pricing variant 3 proposes a 12-month term — consistency checklist in pricing-pilot-decision.md guards this.

## Review

- status: pass
- risks:
  - Capability claims (mobile capture, refill list status, shift handover, audit trail) are inventoried but not verified against runtime state — owner decision O2 is the hard blocker before first send.
  - Pricing ranges remain proposals; any customer-named number before O1 would violate the boundary "kein Preis als fix".
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Owner resolves O1 (pricing variant), O2 (MVP capability checkboxes), O3 (DSGVO Stufe 2 evidence or stay at Stufe 1).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-03-sales-kit-outreach-prep.md`
