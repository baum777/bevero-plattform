# Intent Memory — Bevero Onepager Final KAM Polish

- id: 2026-06-29-bevero-onepager-final-kam-polish
- timestamp: 2026-06-29T02:53:30+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-29-bevero-onepager-final-kam-polish.md`
- status: reviewed

## Core intention

Make the existing Bevero onepager faster to understand for a Key Account Manager without rebuilding its structure, visual language or technical stack.

## Logic followed

- Replace the repeated defensive section after the hero with a compact executive summary.
- Keep non-claims and boundaries concentrated in the lower high-contrast Trust block.
- Translate the hero from a text-heavy explanation into a direct systems-to-hub-to-execution diagram.
- Turn screenshot narratives into labeled facts that can be scanned before the reader opens a modal.
- Use `Anbindung` in executive copy and reserve `Adapterlogik` for technical contexts.

## Design assumptions

- The existing warm editorial palette and green hub accent already provide the correct tone.
- KAM scanability improves through stronger labels and hierarchy, not more content.
- The current screenshot dimensions must remain intact because they are the primary product evidence.

## Tradeoffs

- Accepted:
  - Screenshot KAM narratives stay local to `App.jsx` rather than expanding the central registry with audience-specific copy.
  - The hub diagram uses inline SVG lines and plain CSS, avoiding dependencies and asset management.
- Rejected:
  - Repeating the full Trust argument directly below the hero.
  - Introducing animation, a component library or a broader style rewrite for a final-polish slice.

## Durable memory

- The top of this page should answer what Bevero is, where value comes from and how it can be tested; caveats remain important but should not dominate the second section.
- The six KAM screens use a stable three-part narrative: `Frage`, `Hebel`, `KAM-Relevanz`.
- `Anbindung` is the preferred executive term; `Adapterlogik` is appropriate in Vision, IT and Trust detail.

## Do not reuse blindly

- The exact six narratives and Rauschenberger framing are customer-specific.
- The three-source hub geometry assumes exactly three source nodes; changing the source count requires responsive revalidation.

## Relation to Rauschenberger OS / Bevero

- location logic: Operational results remain tied to goods flow, approval, handover and location quality.
- role/approval logic: The Trust block continues to rule out uncontrolled writeback, automatic ordering and unsupported rollout claims.
- inventory/procurement/shift-planning logic: The proof cards expose critical status, refill, receipt, movements, handover and approvals as pilot surfaces.
- external-system boundary: FoodNotify and Gastronovi remain leading systems; Bevero is presented as their operational connection layer.

## Next logic gate

Does the rendered hierarchy remain immediately legible at 375 px, 768 px and desktop width, and is the assessment inbox approved for external sharing?
