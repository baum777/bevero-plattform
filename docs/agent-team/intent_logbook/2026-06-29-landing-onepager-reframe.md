# Intent Memory — Landing Page Onepager Reframe

- id: 2026-06-29-landing-onepager-reframe
- timestamp: 2026-06-29T01:41:30+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-landing-onepager-reframe.md`
- status: reviewed

## Core intention

Turn the Bevero landing page into one continuous, evidence-led KAM briefing. A reader should understand the economic lever, inspect product proof, see a bounded pilot method and recognize technical and commercial limits without switching contexts.

## Logic followed

- Lead with the hub positioning and economic friction, then move from short summary to ROI levers and the gap-to-result matrix.
- Use the existing screenshot registry as product evidence and connect every KAM screen to an operative question, economic lever and KAM relevance.
- Follow proof with measurable pilot criteria, location scope, explicit trust boundaries, a phased vision and IT controls.
- End with a request for assessment rather than approval or rollout.

## Design assumptions

- The existing warm paper, green accent and editorial visual language remains the correct brand direction.
- A sticky anchor bar and linear sections are more suitable for a shareable three-minute briefing than top-level tabs.
- The page remains a static React/Vite presentation with no network-backed states.

## Tradeoffs

- Accepted:
  - Anchor links are hidden below 1120 px while the primary assessment CTA remains visible; all content remains available by scrolling.
  - The hub visual uses CSS geometry to avoid a new asset or dependency.
  - The current contact email is retained from repository state pending owner confirmation.
- Rejected:
  - Mock screenshot data and placeholder image paths.
  - A new dependency, component library or shared-core abstraction for app-local presentation logic.
  - Claims of official rollout, automatic writeback or guaranteed ROI.

## Durable memory

- Screenshot metadata remains owned by `apps/landing/src/screenshotRegistry.js`; the landing page should select groups and add narrative, not duplicate paths.
- The preferred external argument order is benefit → hub logic → visible proof → pilot measurement → trust boundary → vision/IT → assessment CTA.
- Honesty copy is part of the product positioning and must survive future visual redesigns.

## Do not reuse blindly

- The Rauschenberger-specific KAM narratives, FoodNotify/Gastronovi references and contact email require re-validation for another customer or public distribution.
- The CSS hub diagram is tailored to this page width and content; additional nodes require a new responsive check.

## Relation to Rauschenberger OS / Bevero

- location logic: The page treats kitchen, bar/service, storage, goods receipt, transfer points and shift handover as distinct operational rooms.
- role/approval logic: Productive writeback, ordering and external action remain controlled; the CTA requests assessment, not authorization.
- inventory/procurement/shift-planning logic: Goods flow, refill, receiving, movements and handover are presented as measurable pilot surfaces.
- external-system boundary: FoodNotify and Gastronovi remain leading systems; Bevero is positioned as an adapter-backed operational hub.

## Next logic gate

Does a rendered preview at 375 px and desktop width preserve the intended reading order and screenshot legibility, and is `twim.baum@proton.me` the approved assessment inbox?
