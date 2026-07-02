# Bevero Product Vision

> **Historical context:** Bevero grew out of a hospitality pilot in the Rauschenberger
> group (Motorworld Inn / CUBE). Concrete brand/site references in this document are
> pilot / case-study context — not the product core. See
> [`productization/bevero-product-identity-v0.md`](productization/bevero-product-identity-v0.md).

---

## Product Thesis

Bevero is a **mobile operations layer for site-based teams**. It does not replace
planning, POS, ERP, or accounting systems. It complements them exactly where real-time
on-site work happens: refill runs, goods receipt, consumption/withdrawal, stock,
shift notes, deviations, handovers, and proof.

The core is not "yet another inventory system", but:

> **Planning on top, execution below.**
> External planning, POS, and ERP systems plan, calculate, and administer.
> Bevero makes visible what actually happens on site — and turns it into reviewable,
> auditable evidence.

---

## Target Customers

Site-based operations across industries:

- Gastronomie
- Hotellerie
- Catering
- Eventbetriebe
- Filial- und Standortbetriebe

The common shape: distributed physical locations, shift-based teams, stock and
consumption to track, handovers between shifts, and a need for proof — while central
planning/ERP/POS systems already exist and stay authoritative.

---

## Core Job To Be Done

A shift lead or on-site team member, without an office PC, can see and act on:

- What's missing? (refill lists, stock)
- What was refilled / received? (goods receipt)
- What was consumed or corrected? (movements, correction requests)
- What's still open? (operational notes, shift handover)
- What must escalate to purchasing or management? (manager review, alerts)
- Is any of this defensible later? (audit trail / evidence)

---

## What Bevero Replaces / Does Not Replace

**Does not replace:**

- external planning systems (recipes, purchasing, quantities)
- POS systems
- ERP / reporting
- accounting
- central event planning
- CRM / HR / recruiting

**Adds (the execution layer):**

- mobile last mile of site operations
- refill lists, stock, movements, goods receipt
- operational notes, shift handover
- correction requests + manager review (human-gated)
- deviation capture and structured feedback back to leading systems
- audit trail for operational proof

Bevero must never present itself as the main system. It is a deliberately narrow,
complementary layer. Leading systems stay leading; Bevero feeds operational reality
back to them via generic connectors/exports.

---

## MVP Scope

The MVP proves one real daily problem end to end at a single site:

- refill list (e.g. bar / area)
- stock balances
- book consumption
- record goods receipt / delivery
- local quick notes
- shift handover
- controlled error and empty states

**Explicitly not MVP:** full inventory-management suite, full external-planning-system
integration, event costing, accounting, ERP integration.

**MVP gate — production runtime proof:** UI + API deployments reachable, auth login
works, refill run loads/creates, quantity change works, confirmation works, balances
and movements load, no raw technical errors in the mobile UI.

---

## Industry Profile: Hospitality (first profile, from the pilot)

Hospitality is the first industry profile because it is where Bevero was piloted.
It stays a **profile on top of the generic core**, not hard-wired into it.

Generic hierarchy: **Organization → Brand/Operation → Site → Area**.
Hospitality areas map to concepts like Bar, Kitchen, Storage, Service, Event.

Two site profiles emerged in the pilot and generalize well:

- **Standard site** — leaner areas, essential refill/stock/handover flows.
- **Premium site** — higher-value items, more precise stock locations, stronger
  deviation notes, batch/quality notes, split bar/restaurant, higher-quality handover.

> **Pilot / case study (historical):** the first tenant was the Rauschenberger group
> (brands Motorworld — incl. Motorworld Inn Böblingen — and CUBE). Those concrete names
> illustrate the profile; they are not the product identity.

---

## Later Profiles

The same generic core (org/site/area, stock, movements, notes, handover, review,
audit) is intended to extend to additional site-based industries (retail chains,
facility/venue operations, other multi-location operators) via their own profiles —
without changing the core execution model.

---

## Roadmap

Framed as a generic product roadmap; pilot-specific milestones are historical.

1. **Stabilize MVP** — the app runs reliably in production; one active UI (Cockpit),
   controlled error states. Gate: refill list loads or shows a controlled error.
2. **Single-site operations pilot** — solve one real daily problem end to end
   (refill, stock, consumption, goods receipt, quick notes, shift handover).
   *(Pilot: a hospitality site.)*
3. **Multi-site structure** — hardened Organization model, clean site/location
   separation, roles (Owner/Admin/Manager/Staff/Viewer), per-site storage locations,
   central item master with local target quantities, areas modeled cleanly.
4. **Premium-site compatibility** — site profiles, per-site item categories,
   area-based stock views, notes from local device to optional team/shift sync,
   role-based cockpit start pages per site type.
5. **External planning ingestion** — complement (not replace) external planning
   systems: secured mail/export ingestion, parser confidence + trusted senders +
   failure alerts, procurement-order ↔ inventory-item mapping, goods receipts from
   external orders, structured deviation export.
6. **Organization / multi-site management layer** — central cross-site overview,
   site comparison, open refills per site, bottleneck and critical-deviation views,
   consumption/movement history, export for purchasing/controlling, audit trail.
   *Not in scope:* replacing ERP, accounting, HR, or central event planning.
7. **Event / banquet extension** — event pick/commission lists, planned item needs,
   return quantities, consumption vs. plan, mobile event checklists, photo/deviation
   proof, exportable post-costing data.

---

## Implementation Guardrails

**Always avoid (in product identity and positioning):**

- "We replace the external planning system."
- "We replace the ERP."
- "We do your accounting."
- "We run central event planning."
- Framing Bevero as built for one specific customer.

**Always emphasize:**

- mobile last mile
- site reality
- refill · deviation · proof
- simple operation
- leading systems stay leading
- human-gated automation
- Bevero returns operational data to the systems that plan
