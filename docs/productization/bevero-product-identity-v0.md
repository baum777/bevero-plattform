# Bevero Product Identity v0

**Status:** v0 (updated) · **Stand:** 2026-07-02 · **Owner:** Productization
**Related:** [`VISION.md`](../VISION.md) · [`bevero-productization-audit-2026-07-01.md`](bevero-productization-audit-2026-07-01.md)

This document is the source of truth for how Bevero is described in product-identity
surfaces (README, BEVERO.md, IDENTITY.md, OS.md, landing, vision, decks, external copy).
Historical/pilot references may remain in ADRs, logs, migrations, and audit reports as
clearly marked history.

---

## One-Liner

> Bevero ist ein mobiler Operations Layer für Standortbetriebe. Bestehende Systeme
> planen; Bevero macht Ausführung, Abweichungen, Übergaben und Nachweise vor Ort sichtbar.

English:

> Bevero is a mobile operations layer for site-based teams. Existing systems plan;
> Bevero makes on-site execution, deviations, handovers, and proof visible.

---

## Category

**Mobile Operations Layer** — a complementary execution/proof layer, not an ERP, POS,
planning, or accounting system.

---

## Target Customers

- Gastronomie
- Hotellerie
- Catering
- Eventbetriebe
- Filial- und Standortbetriebe

Common shape: distributed physical sites, shift-based teams, stock/consumption to track,
handovers between shifts, and a proof requirement — alongside existing planning/POS/ERP.

---

## Core Use Cases

- Auffülllisten (refill lists)
- Bestände (stock)
- Wareneingang (goods receipt)
- Verbrauch / Entnahme (consumption / withdrawal)
- Korrekturanfragen (correction requests)
- Schichtnotizen (shift notes)
- Schichtübergabe (shift handover)
- Manager Review
- Audit Trail

---

## Non-Goals

- kein ERP-Ersatz
- kein Ersatz für externes Planungssystem / POS / DATEV / Dynamics
- keine zentrale Eventplanung
- keine Buchhaltung
- kein CRM / HR / Recruiting
- keine autonome Ausführung ohne menschliche Freigabe (human-gated)

---

## Approved Vocabulary

```yaml
approved_vocabulary:
  - "Bevero"
  - "Bevero Ops"
  - "Mobile Operations Layer"
  - "site operations"
  - "location"
  - "area"
  - "stock location"
  - "external planning system"
  - "POS source connector"
  - "ERP export"
  - "human-gated automation"
  - "audit trail"
  - "shift handover"
  - "manager review"
```

---

## Words To Avoid

Avoid in product-identity surfaces (allowed only as clearly-marked history/case study):

```yaml
avoid_in_product_identity:
  - "Rauschenberger OS"
  - "Motorworld OS"
  - "Konzern-OS"
  - "Mother Concern"
  - "built for Rauschenberger"
  - "FoodNotify replacement"
  - "ERP replacement"
```

Naming a concrete vendor (FoodNotify, Gastronovi, Dynamics, DATEV) is acceptable only
as an **example** of a generic integration category (e.g. "external planning system
(e.g. FoodNotify)"), never as a hard product dependency or product core.

---

## Historical Context Policy

- **Keep, don't delete:** ADRs, migration history, old work logs, audit reports, and
  logbook entries may keep Rauschenberger / Motorworld / CUBE / Mother Concern
  references — they are factual history.
- **Mark it:** where such references sit near product-identity framing, add a short
  "historical / pilot / case study" marker pointing here.
- **Pilot framing:** the Rauschenberger group (Motorworld Inn / CUBE) was the first
  tenant / pilot / case study — a customer, not the product identity or authority chain.

---

## Demo Data Policy

Active demo data must use generic tenants, sites, venues, users, suppliers, and integration labels. Real customer names, real venue names, real email domains, and real operational structures belong only in explicitly marked historical case-study material, never in active seeds, fixtures, screenshots, or onboarding demos.

The full approved demo vocabulary (tenant, sites, areas, venues, integration labels, and forbidden terms) is maintained in [`bevero-demo-data-policy-v0.md`](bevero-demo-data-policy-v0.md).

---

## Future Follow-Ups

These are intentionally **out of scope for Phase 2** (identity neutralization) and left
for later, separately-gated work:

- ~~**Package scope rename**~~ — done 2026-07-02: npm workspace root renamed
  `bevero-os` → `bevero-platform`, app packages `@bevero-os/*` → `@bevero-platform/*`.
  See "Package Identity" below.
- **Prisma enum/migration names** — e.g. `RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`,
  `INHOUSE_RAUSCHENBERGER`, and migration names containing `cube_*` / `motorworld_inn_*`
  / `mother_concern_*` (require migrations; Phase 4).
- **Demo tenant refactor** — real location/venue seed data (`motorworld_inn_standorte.sql`,
  `multi_location.sql`, remaining real venue names) → generic demo tenants (Phase 3).
- **Repo directory / Vercel project names** — not renamed (would break deploy routing).
- **context/current-state.md & priorities.md** — operational/pilot state documents; kept
  as live operational context, not product-identity surfaces.

## Package Identity

**Update 2026-07-02:** npm workspace identity renamed from `bevero-os` / `@bevero-os/*`
(Phase 4a) to `bevero-platform` / `@bevero-platform/*`. Historical references to
`rauschenberger-os` or `bevero-os` may remain only in audit, migration, ADR, or logbook
material.

## Public Product Naming (additive, 2026-07-02)

```yaml
brand:
  system_or_company_level: "Bevero"
  public_product_name: "Bevero Ops"
  technical_platform_name: "bevero-platform"
  package_scope: "@bevero-platform/*"

product_modules:
  cockpit: "Bevero Cockpit"       # apps/cockpit
  audit_trail: "Bevero Audit Trail"   # feature name, not a separate app
  handover: "Bevero Handover"         # feature name, not a separate app
  connect: "Bevero Connect"          # integration-layer feature name, not yet built
```

`Bevero` bleibt die Marken-/Systemebene (siehe `IDENTITY.md`). `Bevero Ops` ist der
öffentliche Produktname für dieselbe Plattform. `Bevero Audit Trail`, `Bevero Handover`
und `Bevero Connect` sind Feature-/Modulnamen für bestehende bzw. geplante
Funktionsbereiche — keine zusätzlichen Apps oder Repos.
