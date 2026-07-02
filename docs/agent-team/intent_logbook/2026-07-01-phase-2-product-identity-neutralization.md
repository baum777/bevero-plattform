# Intent Memory — Phase 2 Product Identity Neutralization

- id: 2026-07-01-phase-2-product-identity-neutralization
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-phase-2-product-identity-neutralization.md`
- status: reviewed

## Core intention

Move the *product identity* of this repo from an internal "Rauschenberger OS / Konzern-OS"
to a neutral, sellable **Bevero — Mobile Operations Layer** — on the documentation and
visible-copy surface only. The goal is that anyone reading the top-level docs sees a
product, not one customer's internal system, while all governance logic and all factual
history stay intact.

## Logic followed

Followed the productization cleanup plan's Phase 2. The dividing line: neutralize
**identity surfaces** (README, BEVERO.md, IDENTITY.md, OS.md, VISION.md, summary,
architecture note, landing) and create a single product-identity source of truth; keep
**history** (ADRs, migration record, logbooks, dated audit summary) as clearly-marked
case study; do **not** touch **code/schema/package identity** (that is later, riskier,
separately-gated work).

## Design assumptions

- Governance (L0–L4, three pillars, authority chain, human-gated execution) is
  product-neutral and valuable as-is — only its *branding* was Rauschenberger-specific,
  not its logic.
- A concrete customer reference is acceptable on an identity surface **iff** it is
  explicitly framed as pilot / case study / history — so those references were kept but
  quarantined inside marked blockquotes rather than deleted.
- The generic domain model is already `Organization → Brand → Site → Area`; the product
  identity should speak in those terms, with Motorworld/CUBE as an illustration of the
  hospitality profile.

## Tradeoffs

- Accepted:
  - Product identity (docs) now diverges from code identity (`@rauschenberger-os/*`
    packages, `RAUSCHENBERGER_WEBSITE`/`CUBE_WEBSITE` enums, brand-named migrations).
    This divergence is deliberate and documented as follow-ups; renaming now would break
    tooling/migrations and violate the phase's hard limits.
  - `docs/RAUSCHENBERGER-OS-SUMMARY.md` keeps its filename (referenced elsewhere); only
    content was neutralized + marked historical.
  - `context/current-state.md` and `priorities.md` keep "Rauschenberger OS" titles —
    they are live operational/pilot state, not product-identity surfaces.
- Rejected:
  - Renaming npm scopes / repo / Prisma enums / migrations — explicitly forbidden this
    phase and would be a large, risky change.
  - Deleting Rauschenberger/Motorworld/CUBE history — violates the "keep as history"
    policy.
  - Rewriting `MIGRATION.md` — it is a factual historical migration event and its
    `rauschenberger-os` references are the accurate repo/package name.

## Durable memory

- The product is **Bevero**; "Rauschenberger OS" is retired as product identity but
  survives (correctly) as code/package identity and as pilot history.
- The single source of truth for allowed/forbidden identity language is
  `docs/productization/bevero-product-identity-v0.md` — future README/landing/deck/copy
  work should conform to its Approved Vocabulary / Words To Avoid.
- Vendor names (FoodNotify, Gastronovi, Dynamics, DATEV) are only ever *examples* of
  generic integration categories, never product dependencies or product core.

## Do not reuse blindly

- Do not treat this phase as license to rename code/schema/package identity — that is a
  separate, later, gated phase with migration implications.
- Do not "clean" the marked historical blockquotes in the identity docs — those
  Rauschenberger/Motorworld/CUBE mentions are intentionally retained as case study.
- Do not assume `context/` docs are product surfaces; they are operational state.

## Relation to Rauschenberger OS / Bevero

- location logic: generalized in identity docs to Organization → Brand → Site → Area;
  Motorworld/CUBE demoted to hospitality-profile illustration.
- role/approval logic: unchanged — governance L0–L4 and authority chain preserved.
- inventory/procurement/shift-planning logic: unchanged (no code touched).
- external-system boundary: reframed to generic categories (external planning system,
  POS source connector, ERP export, accounting) with vendors as examples only.

## Next logic gate

Phase 3 (generic demo tenants replacing real location/venue seed data) and Phase 4
(code/schema/package identity rename). Each needs its own explicit gate; neither is
started here.
