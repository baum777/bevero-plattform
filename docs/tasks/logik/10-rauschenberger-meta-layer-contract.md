# Task: Rauschenberger Meta-Layer — BusinessUnit, EventConcept, ExternalCatalog, Inquiry Generalization (Phase A Contract)

**Working title:** `rauschenberger-meta-layer-contract`

**Status:** `OPEN`
**Owner-ADR:** ADR-0055 (proposed) — *(renumbered 2026-06-09: war ADR-0043, jetzt ADR-0055)*
**Depends on:** ADR-0030, ADR-0031, alle vorherigen Tasks (01–09)
**Source spec:** Rauschenberger-Website (customer domain masked, see [productization audit](../../productization/bevero-productization-audit-2026-07-01.md)), User-Pitch "Rauschenberger als operativer Meta-Layer für Bevero", VISION §9 Phase 5
**Target repo state:** docs-only contract, 2 neue Architektur-Dokumente + ADR-Block + MSPR.

## Decision

Rauschenberger ist **kein** einfacher `Organization → Locations`-Baum, sondern ein **Operating Meta Layer** mit 4 Ebenen:
- **Organization** (Mother Concern) — neu, oberhalb `Brand`.
- **BusinessUnit** (Corporate Events, Private Events, Restaurants, Book-the-Concept, Locations) — Workflow-Container.
- **EventConcept** (Feel the Forest, Mysterious Urban Venue, Winter Wonderland, Dine Around the World, Garden Eden, Heaven Seven Eleven, Buena Vida) — Marken-übergreifende Event-Formate.
- **ExternalCatalogEntry** (Partner-/Event-Locations: Goldberg[Werk], Legendenhalle, Carl Benz Arena, ZENITH, Kesselhaus, Hospitalhof, Motorworld Manufaktur, Quader 12, OutOfOffice, ...) — NICHT-eigene Locations.

**Substrate, die NICHT in diese Slice gehören** (eigene ADRs):
- `CulinaryPackage` (Flying Fingerfood, Flying Buffet, Lunch/Dinner/BBQ Buffet, Served Menu, Late-Night-Snack) — wird in Task 11 eingeführt.
- `BeveragePackage` (aus ADR-0048 / Task 03) — bleibt CUBE-Premium-spezifisch, wird NICHT in Meta-Layer generalisiert (Brand-übergreifende Variante in Task 11 / ADR-0056).
- `EventPhase` (setup, arrival, welcome, coffee_break, lunch, afternoon_snack, aperitif, dinner, bar, late_night, teardown) — konzeptionell in diesem Contract, **Schema** in Task 11.
- `EquipmentCategory` + `EquipmentCatalogItem` — Task 11.
- `EventRunSheet` — Task 11.

**Inquiry-Generalisierung (kritischer Architektur-Punkt):**
- `EventInquiry` (aus Task 03, CUBE-Scope) wird **`Inquiry` (brand-übergreifend) + `InquiryRouting` (BU-Routing)**.
- `Inquiry.businessUnitHint` (corporate_events | private_events | restaurants | book_the_concept | locations) entscheidet, an welchen Workflow die Anfrage geht.
- `Inquiry.source` wird erweitert: `rauschenberger_website` | `cube_website` | `motorworld_inn_website` | `manual_entry` | `email_import`.
- `EventInquiry` (CUBE-spezifisch) wird **deprecated**, alle Inquiries gehen über `Inquiry`.
- **Deterministische BU-Routing-Regel:** Schlüsselwort-Match auf `subject` + `rawMessage` (z.B. "Hochzeit" → private_events, "Firmenveranstaltung" → corporate_events). **Keine** LLM-Routing.

**Anti-Things (Hard Non-Goals):**
- Kein Connector-Build (FoodNotify/Gastronovi-API).
- Kein LLM-Event-Draft-Generator (ADR-0021 §3).
- Keine Auto-Offer-Erstellung.
- Keine Offerflow-Mutation-Surface (eigenes ADR nach Phase 5).
- Kein HR-/Recruiting-Modul.
- Keine Rezeptur-/Kalkulations-Engine.
- Keine Hotel-PMS-Integration (eviivo bleibt ExternalSystemLink).
- Kein Live-Wetter-API.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `docs/architecture/rauschenberger-meta-layer.md` | new | ~500–600 Zeilen: Meta-Layer-Architektur, Decision-Tree, BU-Routing-Regel, External-Catalog-Konzept, Cross-Reference zu allen vorherigen Tasks |
| `docs/architecture/inquiry-routing.md` | new | ~250 Zeilen: Inquiry-Generalisierung, BU-Routing-Algorithmus (deterministisch, kein LLM), Status-Workflow, Open Questions |
| `docs/DECISIONS.md` | edit | ADR-0055 Block (Status: proposed) — *(war ADR-0043, renumbered 2026-06-09)* |
| `docs/agent-team/agent_teamplan.md` | edit | WS-007 Pointer |
| `docs/agent-team/mspr_logbook/2026-06-08-rauschenberger-meta-layer-contract.md` | new | closure MSPR |

## Open Questions

1. Soll `Organization` als **neues** Top-Level-Modell eingeführt werden, oder `Brand` zur Mother-Concern-Hierarchie aufgewertet werden? — **Empfehlung: neues `Organization`-Modell**, weil Brand und Organization semantisch unterschiedlich sind (Brand = operatives Markenlabel, Organization = rechtliche Mutter).
2. Soll `BusinessUnit` als Enum oder Tabelle modelliert werden? — **Empfehlung: Tabelle**, weil BU-Liste wachsen kann (z.B. Catering-Subsidiary, Pop-up-Konzepte).
3. Soll `EventConcept` an `BusinessUnit` oder an `Organization` gehängt werden? — **Empfehlung: an `Organization`**, weil Konzepte brand-übergreifend sind.
4. Soll `ExternalCatalogEntry` parallel zu `Location` existieren oder als Sub-Typ von `Location` (`Location.ownOrPartner = PARTNER`)? — **Empfehlung: parallel als eigene Tabelle**, weil Partner-Locations keine `Area`/`StorageLocation`/`LocationInventoryConfig` brauchen.
5. Soll `Inquiry` (generalisiert) eine **eigene** Tabelle sein, oder `EventInquiry` zu `Inquiry` umbenannt werden? — **Empfehlung: neue `Inquiry`-Tabelle + `EventInquiry` als deprecated-View oder via DB-View**, damit bestehende CUBE-Calls weiterlaufen während Migrationsfenster.
6. Soll die deterministische BU-Routing-Regel als `BusinessUnitRoutingRule`-Tabelle oder als Hardcoded-Map in `inquiry-routing.service.ts` modelliert werden? — **Empfehlung: Tabelle**, damit Manager die Regeln pflegen können ohne Code-Deploy.
7. Soll `Inquiry` einen `assignedToUserId`-FK auf `auth.users` haben (analog ADR-0019)? — **Empfehlung: `String?` ohne FK-Constraint in v1**, FK-Promotion als Phase-5.4-Folge.

## Bindings

- ADR-0021 §3 (read-only, no LLM-approval, no writeback)
- ADR-0030 (Multi-Standort-Vertrag)
- ADR-0031 (Brand/Location/Area-Substrate)
- ADR-0034, ADR-0035, ADR-0048 (CUBE-Substrate) — *(renumbered 2026-06-09)*
- ADR-0050, ADR-0051, ADR-0052 (Motorworld-Substrate + Mother-Read v1) — *(renumbered 2026-06-09)*
- VISION §3 (Nicht-Scope), §9 (Phase 5), §11 (Guardrails)

## Gate (Definition of Done)

- `git diff --stat` zeigt nur `docs/architecture/` + `docs/DECISIONS.md` + `docs/agent-team/*`
- `prisma validate` / `typecheck` / `vitest` unverändert grün
- Owner-Review

## Next gate

Task 10 (`10-mother-concern-data-model.md`) operationalisiert den Contract in Schema + Migration + Seed.
