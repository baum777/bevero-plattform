# Bevero Product Vision

> **Historical context:** Bevero grew out of a hospitality pilot in the Rauschenberger
> group (Motorworld Inn / CUBE). Concrete brand/site references in this document are
> pilot / case-study context — not the product core. See
> [`productization/bevero-product-identity-v0.md`](productization/bevero-product-identity-v0.md).

---

## Product Thesis

Bevero is an **operations cockpit for hospitality and site-based teams**.

It does not replace planning, POS, ERP, or accounting systems. It answers the
question that matters most in daily operations:

> **Is the station ready for the next service phase — and if not, what needs to happen right now?**

The core is not "yet another inventory system", but:

> **Bevero makes shift readiness visible.**
> External planning, POS, and ERP systems plan, calculate, and administer.
> Bevero makes station-level readiness, tasks, refill, production, HACCP, and
> handovers visible, actionable, and audit-proof.

---

## Target Customers

Site-based hospitality operations:

- Gastronomie (Küche, Bar, Service)
- Hotellerie
- Catering
- Eventbetriebe
- Filial- und Standortbetriebe mit Schichtbetrieb

The common shape: distributed physical locations, shift-based teams, station-level
prep and refill, handovers between shifts, HACCP requirements, and a proof
need — while central planning/ERP/POS systems already exist and stay authoritative.

---

## Core Job To Be Done

A shift lead or on-site team member opens Bevero and sees:

- **Is my station ready?** What is prepped, refilled, produced, cleaned?
- **What's critical?** Which tasks need immediate attention before service?
- **What's open?** What was not completed from the previous shift?
- **What must be produced?** Production needs for the next shift/day.
- **What must be documented?** HACCP checks, temperatures, MHD, cleaning.
- **What must be handed over?** Open tasks, notes, deviations for the next shift.

---

## What Bevero Replaces / Does Not Replace

**Does not replace:**

- external planning systems (recipes, purchasing, quantities)
- POS / cash register systems
- ERP / reporting / accounting
- inventory management systems
- central event planning
- CRM / HR / recruiting

**Adds (the operations cockpit layer):**

- station readiness per area (Kitchen, Bar, Service, Goods Receipt)
- prep, refill, production, cleaning, HACCP task types
- role-based views (staff sees their station; shift lead sees all stations)
- shift handover with open-task synthesis
- HACCP checkpoints and temperature documentation
- goods receipt capture
- deviation capture and structured task generation
- audit trail for operational proof

Bevero must never present itself as the main system. It is a deliberately narrow,
complementary cockpit. Leading systems stay leading; Bevero feeds operational
readiness back to them via generic connectors/exports.

---

## MVP Scope

The MVP proves one real daily shift cycle end to end at a single site:

- station readiness view (e.g. Gardemanger / Saladette, Bar, Production Kitchen)
- prep and refill task creation and completion
- production task request (station → production kitchen)
- HACCP checkpoint (temperature, MHD, cleaning)
- shift handover with open tasks
- role-based views (Staff, Shift Lead)
- controlled error and empty states

**Explicitly not MVP:** full inventory management, external planning integration,
event costing, accounting, ERP integration, multi-site rollup.

**MVP gate — production runtime proof:** UI + API deployments reachable, auth login
works, station readiness loads, tasks can be created and completed, handover
generates open-task summary, HACCP checkpoint can be logged.

---

## Industry Profile: Hospitality (first profile, from the pilot)

Hospitality is the first industry profile because it is where Bevero was piloted.
It stays a **profile on top of the generic core**, not hard-wired into it.

Generic hierarchy: **Organization → Brand/Operation → Site → Area**.
Hospitality areas map to stations: Kitchen stations (Saucier, Entremetier,
Gardemanger/Saladette, Production Kitchen), Bar, Service, Goods Receipt.

Two site profiles emerged in the pilot and generalize well:

- **Standard site** — leaner areas, essential prep/refill/handover flows.
- **Premium site** — more stations, higher prep complexity, stronger HACCP
  requirements, split bar/restaurant, richer handover.

> **Pilot / case study (historical):** the first tenant was the Rauschenberger group
> (brands Motorworld — incl. Motorworld Inn Böblingen — and CUBE). Those concrete names
> illustrate the profile; they are not the product identity.

---

## Later Profiles

The same generic core (org/site/station, tasks, readiness, HACCP, handover, audit)
is intended to extend to additional site-based industries (retail chains,
facility/venue operations, other multi-location operators) via their own profiles —
without changing the core operations cockpit model.

---

## Roadmap

Framed as a generic product roadmap; pilot-specific milestones are historical.

1. **Stabilize MVP** — the app runs reliably in production; one active UI (Cockpit),
   controlled error states. Gate: station readiness loads or shows a controlled error.
2. **Single-site operations pilot** — solve one real daily shift cycle end to end
   (station readiness, prep/refill tasks, HACCP, handover).
   *(Pilot: a hospitality site.)*
3. **Multi-station structure** — hardened station/area model, per-station task types,
   roles (Shift Lead, Staff, Manager, Admin), per-station readiness criteria.
4. **Premium-site compatibility** — site profiles, per-site station layout,
   area-based task views, role-based cockpit start pages per site type.
5. **External planning integration** — complement (not replace) external planning
   systems: secured ingestion of planned quantities, menu/recipe data → station prep
   needs, structured deviation export back to planning.
6. **Multi-site operations view** — central cross-site readiness overview,
   open tasks per site, bottleneck views, HACCP compliance per site, audit trail.
   *Not in scope:* replacing ERP, accounting, HR, or central event planning.
7. **Event / banquet extension** — event prep lists, planned station needs,
   return quantities, consumption vs. plan, mobile event checklists, photo/deviation
   proof, exportable post-costing data.

---

## Implementation Guardrails

**Always avoid (in product identity and positioning):**

- "We replace the external planning system."
- "We replace the ERP."
- "We are an inventory management system."
- "We do your accounting."
- "We run central event planning."
- Framing Bevero as built for one specific customer.

**Always emphasize:**

- station readiness
- shift operations
- task · HACCP · handover
- role-based views
- leading systems stay leading
- human-gated automation
- Bevero feeds operational readiness data to the systems that plan
