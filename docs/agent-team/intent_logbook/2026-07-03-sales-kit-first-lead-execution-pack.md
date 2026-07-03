# Intent Memory — Sales Kit Light: First Lead Execution Pack (P1.1)

- id: sales-kit-first-lead-execution-pack-20260703
- timestamp: 2026-07-03T12:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-first-lead-execution-pack.md`
- status: draft

## Core intention

Close the last hard blocker between the kit and the first real lead — capability truth — by replacing checkbox-by-assertion with checkbox-by-repo-evidence, and give the operator a complete, safe path: understand lead → specific hook → honest mail → 20–30-min conversation → prepared pilot offer.

## Logic followed

- O2 was defined as "owner ticks boxes"; this slice replaced that with a truth table where every row cites schema models, services, routes, and tests. A claim without a repo path stays unconfirmed — the rule "kein Beleg = keine Behauptung" applied literally.
- Two evidence thresholds were deliberately separated: code+tests unlock *sending* (the mail describes what the product is); the pending P0 runtime smoke unlocks the *pilot start* (a customer will touch the deployed system). Conflating them would either block outreach on unrelated P0 gates or let a pilot start on unverified runtime.
- Contradictions in non-send-critical files were documented (W1–W5) instead of silently fixed — batch edits across the kit pre-empt an owner decision and risk breaking passages tied to O1/O3.
- The duplicate conversation guide was resolved by supersession, not deletion (deletion needs explicit confirmation per safety rules).

## Design assumptions

- Code + passing CI (754/754, c1b1eb6) is honest evidence for "the product can do X today" in a first mail from a founder.
- Kitchen refill is genuinely absent (checked cockpit routes and API modules), not merely unfound — kitchen has checklist/walk-route instead.
- The recipient of the mail cares about bar refill, handover, and goods receipt as concepts; narrowing "Bar und Küche" to "Bar" costs little credibility and prevents the worst first-demo moment (promised feature missing).

## Tradeoffs

- Accepted:
  - The mail is now slightly narrower ("Bar-Auffülllisten") — honesty over breadth.
  - Five files keep known flaws (documented as W1–W4) until O4 — consistency debt made visible instead of fixed out-of-scope.
- Rejected:
  - Marking O2 "resolved" only after the runtime smoke (rejected: would chain outreach to P0 infra gates that customers never see in a mail).
  - Making pilot-offer-light customer-facing (rejected: price variants must stay internal until O1; the onepager remains the customer artifact).

## Durable memory

- Pattern: capability truth table with columns claim / product capability / repo evidence / status / recommended wording — reusable for every future customer-facing claim review.
- The two-gate rule: evidence class "code+tests" gates communication, evidence class "runtime verified" gates delivery.

## Do not reuse blindly

- Truth table rows reflect repo state at commit c1b1eb6 — re-verify after significant product changes, especially bar-refill and kitchen modules.
- The "sending unlocked" conclusion assumes the mail contains no price and only Stufe-1 data language; if the mail changes, re-run the pre-send checklist logic.

## Relation to Rauschenberger OS / Bevero

- location logic: untouched — single-site pilot logic unchanged.
- role/approval logic: untouched in product; correction/approval flow now cited as evidence (K4), not asserted.
- inventory/procurement/shift-planning logic: unchanged; procurement stays out of sold scope.
- external-system boundary: reinforced — kit repeats POS/Warenwirtschaft stay untouched; no integrations promised.

## Next logic gate

First real Lead-Steckbrief (public sources only) → operator sends first-contact-final.md after pre-send checklist. O1 before the conversation's price moment; O3 before pilot-start data documents; runtime smoke before pilot start.
