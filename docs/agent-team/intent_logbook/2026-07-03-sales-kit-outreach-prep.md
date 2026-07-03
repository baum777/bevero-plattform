# Intent Memory — Sales Kit Validation & First Outreach Prep (P1)

- id: sales-kit-outreach-prep-20260703
- timestamp: 2026-07-03T06:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-outreach-prep.md`
- status: draft

## Core intention

Prevent the first real customer contact from carrying a single unbacked promise — while keeping the mail itself sendable now. Separate what blocks *sending* (capability truth) from what blocks *the deal* (pricing, DSGVO evidence).

## Logic followed

- Every claim in the kit was classified: sayable today / owner decision / evidence required. The register (`outreach-readiness.md`) is the single gate document.
- Data-protection language is two-tiered: Stufe 1 promises only own business decisions (no resale, no cross-customer analysis) plus a process (documents before pilot start); Stufe 2 (EU hosting, DPA, export/delete) unlocks only with checkbox evidence.
- Pricing is a decision template, not a price list — three variants with honest risk sections, recommendation = Variante 2 (faire Pilotpauschale mit voller Anrechnung).
- Final mail is built on variant C because the founder's operative gastro background is real; the self-built-tool line replaces any AI pitch.

## Design assumptions

- Founder biography confirmed: operative gastro background + self-built workflow tool → variant C conditions met.
- Vercel region `fra1` is documented; Supabase DB region is NOT documented anywhere in the repo.
- No cost-basis calculation exists yet; pricing ranges are market-plausible proposals.

## Tradeoffs

- Accepted:
  - The mail contains no price and no data details — less complete, but immune to later correction.
  - Existing kit files were NOT edited (pricing/DSGVO passages stay as marked assumptions) to avoid pre-empting owner decisions O1/O3.
- Rejected:
  - Claiming "EU-Hosting Frankfurt" now (rejected: DB region unproven — half-true claims are worse than vague ones).
  - A single blended pilot price (rejected: owner needs the variant decision consciously, per lead exactly one variant).

## Durable memory

- The readiness gate: O1 = pricing variant, O2 = capability checkboxes (hard blocker for sending), O3 = DSGVO Stufe 2 evidence.
- Two-tier claim pattern (sayable now vs. evidence-unlocked) is reusable for every future customer-facing document.

## Do not reuse blindly

- The capability claim inventory (Abschnitt 2d) reflects kit wording as of 2026-07-03 — re-derive after any kit edit.
- Variante-3 pricing includes a 12-month term that contradicts "keine Mindestlaufzeit" in pilot-onepager.md — the consistency checklist must run after O1.

## Relation to Rauschenberger OS / Bevero

- location logic: untouched — single-site pilot logic unchanged.
- role/approval logic: untouched in product; sales claims about Freigabe/Korrektur listed as capability claims pending O2.
- inventory/procurement/shift-planning logic: unchanged; procurement stays out of sold scope.
- external-system boundary: reinforced — mail and kit repeat that POS/Warenwirtschaft stay untouched, no integrations promised.

## Next logic gate

Owner resolves O1–O3 in `docs/sales-kit/outreach-readiness.md`. After O2: first Lead-Steckbrief for a real target, then first send using `first-contact-final.md` + pre-send checklist.
