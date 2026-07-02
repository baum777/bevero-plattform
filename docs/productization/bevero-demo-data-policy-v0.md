# Bevero Demo Data Policy v0

**Status:** v0 · **Stand:** 2026-07-01 · **Owner:** Productization
**Related:** [`bevero-product-identity-v0.md`](bevero-product-identity-v0.md) · [`bevero-productization-audit-2026-07-01.md`](bevero-productization-audit-2026-07-01.md)

## Purpose

Active demo data must be generic and product-neutral. Real customer names, real
venue names, real email domains, real branded articles, and real operational
structures must never appear in active seeds, fixtures, screenshots, or onboarding
demos — only in explicitly marked historical case-study material.

This policy defines the approved generic demo vocabulary established in Phase 3
(demo tenant & seed data neutralization).

## Approved Demo Tenant

| Field | Value |
|---|---|
| Organization name | `ExampleCo Hospitality Group` (a.k.a. `ExampleCo Catering & Restaurants`) |
| Organization id | `org-examplecogroup` |
| Group grouping label | `Group Operations` |
| Contact email | `info@example.com` / `demo@example.com` |
| Contact phone | `+49 000 0000000` |

## Approved Demo Sites

| Display name | Note |
|---|---|
| `Demo Site Alpha` | standard site (maps to enum `MOTORWORLD_STANDARD`) |
| `Demo Site Beta` | standard site |
| `Demo Site Gamma` | standard site |
| `Demo Site Delta` | standard site |
| `Demo Site Premium` | premium site (maps to enum `CUBE_PREMIUM`) |

## Approved Demo Areas

`Bar` · `Kitchen` (Küche) · `Storage` (Lager) · `Service` · `Event` · `Restaurant`
· `Premium-Lager`. These are generic hospitality area names, not customer-specific.

## Approved Demo Venues

| Display name |
|---|
| `Demo Venue One` |
| `Demo Venue Two` |
| `Demo Venue Three` |
| `Demo Venue Four` |
| `Demo Venue Five` |

Demo event spaces use generic labels (e.g. `Demo Event Hall Alpha`, `Demo Cinema
Hall`, `Demo Terrace Delta`). Demo cities use `Demo City A` / `Demo City B`.

## Approved Integration Labels

| Generic label | Example vendor (illustration only) |
|---|---|
| External Planning System | FoodNotify |
| POS Source Connector | Gastronovi |
| ERP Export | Microsoft Dynamics |
| Accounting Export | DATEV |

Vendor names may appear only as parenthetical examples of a category, never as a
hard product dependency or active-demo customer identity.

## Forbidden Active Demo Data

Never in active seeds, fixtures, screenshots, or onboarding demos:

- `Rauschenberger`, `Rauschenberger Gruppe`, `Rauschenberger Catering`
- `Motorworld`, `Motorworld Inn`, `MW Inn`
- `CUBE Stuttgart` (as a customer site display name)
- `Mother Concern` (as active tenant label)
- Real venues: `Goldberg[Werk]`, `Legendenhalle`, `Carl Benz Arena`, `ZENITH`, `Kesselhaus`
- Real cities as customer sites: `Böblingen`, `Stuttgart`, `München`, `Warthausen`, `Mallorca`
- Real branded articles (e.g. house-brand sparkling wine)
- Real email domains, real phone numbers, real person names

## Historical Context Policy

- **Keep, don't delete:** ADRs, migration history, migration file names, old work
  logs, audit reports, and logbooks may retain these references as factual history.
- **Enum values and code identifiers are not display data:** values such as
  `MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `RAUSCHENBERGER_WEBSITE`, `INHOUSE_RAUSCHENBERGER`,
  and internal ids/slugs (`loc-motorworld-*`, `brand-motorworld`, `cube-stuttgart`) are
  kept as-is in Phase 3 — renaming them requires migrations and is Phase 4 work.

## Phase 4 Follow-Ups

Deferred (require schema/migration/package changes — out of Phase 3 scope):

- Prisma enum renames: `MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `RAUSCHENBERGER_WEBSITE`,
  `CUBE_WEBSITE`, `MOTORWORLD_INN_WEBSITE`, `INHOUSE_RAUSCHENBERGER`.
- Seed/fixture internal ids & slugs still containing brand tokens
  (`loc-motorworld-*`, `brand-motorworld`, `loc-cube-stuttgart`, `cube-stuttgart`,
  `motorworld-*` slugs, `org-*` where applicable, `mwbb-*` script ids,
  `ORGANIZATION_ID = "motorworld-inn-boeblingen"` in `apps/api/scripts/seed/mwbb-live-stock.ts`).
- Migration directory names containing `cube_*` / `motorworld_inn_*` / `mother_concern_*`.
- npm package scope `@rauschenberger-os/*` and root workspace name `rauschenberger-os`.
- Module / route / table names containing `cube` / `mother-concern` / `gastronovi`
  (code identity, not demo data).
- Verification scripts (`apps/api/scripts/verify-adr-*`) with cosmetic brand labels in
  console output — historical ADR-verification tooling, low priority.

## Package Identity

**Update 2026-07-02:** npm workspace identity renamed from `bevero-os` / `@bevero-os/*`
(Phase 4a) to `bevero-platform` / `@bevero-platform/*`. Historical references to
`rauschenberger-os` or `bevero-os` may remain only in audit, migration, ADR, or logbook
material.
