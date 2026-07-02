# Intent Memory — Landing Screenshot Ownership

- id: 2026-06-27-landing-screenshot-ownership
- timestamp: 2026-06-27T18:58:50+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-27-landing-screenshot-ownership.md`
- status: reviewed

## Core intention

Make every product screenshot carry one clear semantic job. The page should explain or reference a screen elsewhere instead of repeating the same visual in Hero, Workflow, galleries and secondary tabs.

## Logic followed

- Keep the six KAM screens as the primary proof because they answer the fastest Key-Account questions.
- Make Hero explanatory and screenshot-free.
- Keep the nine-step Workflow as process depth, but give it one canonical `Schichtstart & Heute` proof image.
- Assign mobile operation, detail views, kitchen, Vision and IT only the screens that uniquely belong to those contexts.
- Store metadata and ownership centrally so future copy edits cannot silently recreate duplicate definitions.

## Design assumptions

- Uniqueness applies across all three content tabs, not only within the Pilot tab.
- All 15 screenshot assets must remain available somewhere on the page.
- Modal enlargement is a transient viewer and may temporarily reuse the owning image source.
- Existing 3-tab navigation, KAM copy, CTA and mailto remain unchanged.

## Tradeoffs

- Accepted:
  - Hero becomes visually quieter in exchange for a cleaner explain-then-prove narrative.
  - Workflow is more text-led and less screenshot-led.
  - Vision and IT show one canonical screen each and reference the Pilot proof in prose.
- Rejected:
  - Hiding duplicate markup with CSS.
  - Exporting cosmetic screenshot variants to bypass uniqueness.
  - Removing product assets from the page.

## Durable memory

- One screenshot has one owner section.
- `screenshotRegistry.js` is the canonical screenshot metadata and ownership surface.
- KAM proof owns Dashboard, Auffüllliste, Wareneingang, Bewegungen, Schichtübergabe and Mobile Freigabe.
- Future additions must update the ownership test before adding a new visual placement.

## Do not reuse blindly

- Do not apply global visual uniqueness to logos, icons or decorative graphics; this rule is for Bevero product screenshots.
- Do not interpret the modal viewer as a second content owner.

## Relation to Rauschenberger OS / Bevero

- location logic: KAM proof prioritizes cross-location risk and readiness views; kitchen owns its location-specific storage view.
- role/approval logic: IT owns Team & Rollen; KAM proof owns the operational approval screen.
- inventory/procurement/shift-planning logic: each workflow area is represented once at its most decision-relevant point.
- external-system boundary: no runtime integration, provider, deployment or writeback behavior changed.

## Next logic gate

Does the reduced visual density improve Alexander Tann's first-three-minute comprehension in a human review without making the lower page feel under-evidenced?
