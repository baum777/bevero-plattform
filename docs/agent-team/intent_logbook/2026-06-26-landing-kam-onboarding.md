# Intent Memory — Landing Page KAM-Onboarding Reframe

- id: 2026-06-26-landing-kam-onboarding
- timestamp: 2026-06-26T22:10:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-26-landing-kam-onboarding.md`
- status: reviewed

## Core intention

Make the Bevero landing page work as a guided 3-minute briefing for a Key Account Manager, not as a product/IT demo. The reader (Alexander Tann) should immediately understand *why he received the link*, what customer-promise and location-quality relevance Bevero might have, and that he is being asked for an honest assessment — explicitly not a sign-off.

## Logic followed

- Positioning shift: from "Bevero = operative webapp for stock/refill/goods-flow" to "Bevero = transparency layer between customer promise, location operations and repeatable execution".
- Page flow now answers, in order: Why this link? (Hero) → Which operational fields could it touch? (5 crucial points) → How does a day look? (existing Ist-Zustand + Workflow) → What's already visible? (curated 6 screens, then full gallery) → What is NOT claimed? (Trust) → Please give an assessment or route me on (CTA).
- The 5 crucial points are deliberately framed as automation hypotheses derived from the publicly visible Rauschenberger structure (catering, events, locations, restaurants, multi-site), not as asserted internal problems. This shows understanding of relevant process surfaces without overclaiming.

## Design assumptions

- The operator wants the smallest honest intervention: 3-tab skeleton stays, only copy + 3 new sections + nav relabel.
- KAM relevance is communicated more by framing and order than by new features or visuals.
- Existing warm-paper / green-accent design system is the right container; orange marks the "strategic" points and the "not yet claimed" honesty column.

## Tradeoffs

- Accepted:
  - Kept the existing "Ist-Zustand" problem cards even though they are generic-gastronomy framed; rewriting them was out of scope.
  - No full 5-anchor single-flow navigation (the concept's body proposed it) — operator chose to keep the 3-tab skeleton.
  - Visual QA via build + Playwright screenshot rather than full manual cross-device testing.
- Rejected:
  - Full design/architecture rewrite (explicitly out of scope).
  - Asserting Rauschenberger problems as fact (would damage trust with a KAM).

## Durable memory

- This landing page addresses a real, named external Key-Account contact. Honesty framing ("noch nicht behauptet", "ich suche keine Freigabe") is a feature, not filler — preserve it.
- The KAM section's value is the *question framing* ("Was fehlt? / Was bleibt offen? / Ist alles bereit? / Was gefährdet das Kundenversprechen? / Was läuft wo anders?"). Keep the questions if this section is ever restyled.

## Do not reuse blindly

- The `pilot@bevero.de` mailto and the "Pilot · Motorworld Inn Böblingen" framing are project-specific placeholders — re-confirm before any external distribution.
- The "5 crucial points" copy is tuned to Rauschenberger's public structure; do not transplant verbatim to another client without re-deriving the hypotheses.

## Relation to Rauschenberger OS / Bevero

- location logic: Pilot = Motorworld Inn Böblingen; strategic point "Standortvergleich" anticipates multi-site comparability without asserting a rollout.
- role/approval logic: CTA reframed to invite assessment/routing, not approval; "Freigaben/Übergabe" remain the operational anchors shown in curated screens.
- inventory/procurement/shift-planning logic: surfaced as hypotheses (Warenfluss & Auffülllogik, Schichtübergabe, Event-Readiness) rather than implemented claims.
- external-system boundary: TrustSection explicitly states "kein produktiver Writeback", "keine automatische Bestellung" — keeps existing-systems-lead-boundary intact.

## Next logic gate

Should the page get a dedicated, shareable preview deployment for Tann (Vercel), and who owns the real assessment inbox? Conceptually: is "operational transparency layer" the right altitude for a KAM conversation, or should the entry point be event-readiness specifically?
