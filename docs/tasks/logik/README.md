# Task-Logik: Re-Entry-Punkt für Bevero-Meta-Layer-Architektur

**Erstellt:** 2026-06-08
**Aktualisiert:** 2026-06-09 — ADR-Renumbering in Implementations-Reihenfolge (Task 01..14 → ADR-0034, 0035, 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0057, 0058, 0059). ADR-0036 bleibt CUBE Venue-Layer Spec (akzeptiert). Nummern 0037–0047 sind reserviert/frei.
**Status:** `OPEN` (alle 14 Tasks)
**Quelle:** Aggregiert aus 3 User-Pitches (CUBE-Premium-Org, Motorworld-Inn-Standortlogik, Rauschenberger-Meta-Layer) + bestehende ADRs 0030/0031/0034–0059-Sequenz.

## Zweck

Dieses Verzeichnis bündelt die 14 Implementation Slices, die aus den drei User-Pitches abgeleitet wurden, in **logisch zusammengehörige, kohärent aufeinander aufbauende Tasks**. Jeder Task ist ein eigenständiger Implementation-Slice mit:

- **Working title** (für `git branch` und PR-Titel)
- **Owner-ADR** (Phase A/B/C, Status: proposed bis accepted)
- **Dependencies** (welche vorherigen Tasks/ADRs vorausgehen)
- **File scope** (welche Dateien geändert/neu erstellt werden)
- **Open Questions** (Architektur-Entscheidungen, die der Owner vor Implementation klären muss)
- **Gate** (Definition of Done)
- **Next gate** (welcher Task/ADR folgt)

## Reihenfolge (topologisch sortiert nach `Depends on`-Kanten, 2026-06-09)

```text
Phase A — Substrate (brand-übergreifend):     01 (CUBE) → 02 (CUBE) → 03 (CUBE)
Phase A — Contracts (docs-only, parallel):    04 (Motorworld)
Phase B — Motorworld-Daten:                   05 → 06 (Mother-Read v1)
Phase C — Cockpit:                            07 (Picker) → 08 (CUBE-Dashboard) → 09 (Motorworld-Board)
Phase D — Meta-Layer:                         10 (Contract) → 11 (Data Model) → 12 (Read v2) → 13 (Dashboard)
Phase E — Cross-Cutting (Voraussetzung für alle Folge-ADRs):  14
```

**Erläuterung der Reihenfolge:**

- **01** ist Top-Substrat (root); **02** braucht `OperationalUnit` aus 01; **03** braucht 01+02.
- **04** ist Docs-only-Contract, hängt nur an 01+02 (Substrate-Vorhandensein), läuft parallel zu 03.
- **05** braucht 01+04; **06** braucht 05+03.
- **07** braucht 06+05+03 (Picker braucht Read v1 + beide Brand-Datasets).
- **08** braucht 01+02+03+06 (CUBE-Cockpit); **09** braucht 05+06+07 (Motorworld-Cockpit, hängt am Picker).
- **10** aggregiert 01–09 als Contract; **11** operationalisiert 10; **12** baut auf 11+06 auf; **13** braucht 12+11+07.
- **14** ist cross-cutting Hardening, läuft **nach** allen anderen Slices.

## Nachtrag 2026-06-09: CUBE Venue-Layer Spec-Gap (00x) regiert Sequenz 1

Nach Erstellung dieser README ergab der **User-CUBE-Deepdive (2026-06-09)** eine konzeptionelle Lücke in Sequenz 1. Sie wird in vier **doku-only** Specs geschlossen, die **Vorrang vor der reinen 01→02→03-Lesart haben** (Autorität: 00x):

| # | Datei | Owner-ADR | Inhalt |
|---|---|---|---|
| 00 | [`00-cube-venue-spec-gap.md`](./00-cube-venue-spec-gap.md) | — (Gap, → ADR-0036) | Gap-Analyse Deepdive × Tasks 01/02/03/08; begründet 00a/00b/00c |
| 00a | [`00a-cube-venue-model-spec.md`](./00a-cube-venue-model-spec.md) | ADR-0036-A | Venue-Graph, Slot-Matrix, Decision-Engine, Menü/Beverage/Packages/Intake (Annotation der Substrate aus 01/02/03) |
| 00b | [`00b-cube-source-conflict-validator.md`](./00b-cube-source-conflict-validator.md) | ADR-0036-B | Source-Conflict-Management (Website/PDF-Widersprüche, Manager-Approval) |
| 00c | [`00c-cube-event-economic-rules.md`](./00c-cube-event-economic-rules.md) | ADR-0036-C | Event-Wirtschaftsregeln (Raummiete, Mindestverzehr, After-Midnight-Staff, Non-Food) |

**Status:** ADR-0036 (Sub-Sections A/B/C) liegt als `proposed` in `docs/DECISIONS.md`; MSPR-Logbook `2026-06-09-cube-venue-spec-gap.md` geschrieben. **Code ist nicht autorisiert** — Implementation läuft über die Folge-ADRs **ADR-0029-A/B/C** (je Migration + Read-Endpoints + Vitest + Supabase-Promotion), jeweils erst nach Owner-Acceptance von ADR-0036.

**Konsequenz für Sequenz 1:** Tasks 01/02/03 bleiben als Substrat-Definition gültig, werden aber durch 00a/00b/00c annotiert/erweitert (z.B. `priceMode`, `parentContext`, `requiresManualConfirmation`, Beverage-Berechnungs-Spec). Bei Konflikt gewinnt 00x. Re-Entry für den CUBE-Pfad: [`00-cube-venue-spec-gap.md`](./00-cube-venue-spec-gap.md).

## Task-Verzeichnis (renumbered 2026-06-09: Implementations-Reihenfolge 1..14)

| # | Working Title | Owner-ADR (neu) | Owner-ADR (alt) | Datei | Status |
|---|---|---|---|---|---|
| 01 | cube-sub-units-data-model | **ADR-0034** | ADR-0034 | [`01-cube-sub-units-data-model.md`](./01-cube-sub-units-data-model.md) | OPEN |
| 02 | cube-menu-matrix | **ADR-0035** | ADR-0034-B | [`02-cube-menu-matrix.md`](./02-cube-menu-matrix.md) | OPEN |
| 03 | cube-event-intake-read-apis | **ADR-0048** | ADR-0035 | [`03-cube-event-intake-read-apis.md`](./03-cube-event-intake-read-apis.md) | OPEN |
| 04 | motorworld-inn-standortlogik-contract | **ADR-0049** | ADR-0038 | [`04-motorworld-inn-standortlogik-contract.md`](./04-motorworld-inn-standortlogik-contract.md) | OPEN |
| 05 | motorworld-inn-data-model | **ADR-0050** | ADR-0039 | [`05-motorworld-inn-data-model.md`](./05-motorworld-inn-data-model.md) | OPEN |
| 06 | mother-concern-read-apis | **ADR-0051** | ADR-0040 | [`06-mother-concern-read-apis.md`](./06-mother-concern-read-apis.md) | OPEN |
| 07 | cockpit-standort-picker-kontext | **ADR-0052** | ADR-0041 | [`07-cockpit-standort-picker-kontext.md`](./07-cockpit-standort-picker-kontext.md) | OPEN |
| 08 | cockpit-cube-service-slot-dashboard | **ADR-0053** | ADR-0037 | [`08-cockpit-cube-service-slot-dashboard.md`](./08-cockpit-cube-service-slot-dashboard.md) | OPEN |
| 09 | cockpit-motorworld-event-space-board | **ADR-0054** | ADR-0041-B | [`09-cockpit-motorworld-event-space-board.md`](./09-cockpit-motorworld-event-space-board.md) | OPEN |
| 10 | rauschenberger-meta-layer-contract | **ADR-0055** | ADR-0043 | [`10-rauschenberger-meta-layer-contract.md`](./10-rauschenberger-meta-layer-contract.md) | OPEN |
| 11 | mother-concern-data-model | **ADR-0056** | ADR-0044 | [`11-mother-concern-data-model.md`](./11-mother-concern-data-model.md) | OPEN |
| 12 | mother-concern-read-apis-v2 | **ADR-0057** | ADR-0045 | [`12-mother-concern-read-apis-v2.md`](./12-mother-concern-read-apis-v2.md) | OPEN |
| 13 | cockpit-mother-concern-dashboard | **ADR-0058** | ADR-0046 | [`13-cockpit-mother-concern-dashboard.md`](./13-cockpit-mother-concern-dashboard.md) | OPEN |
| 14 | cockpit-audit-hardening | **ADR-0059** | ADR-0048 | [`14-cockpit-audit-hardening.md`](./14-cockpit-audit-hardening.md) | OPEN |

**Nicht in der 14er-Liste:**

- **ADR-0036** (CUBE Venue-Layer Spec, akzeptiert 2026-06-09) — bindende Spec-ADR für Tasks 01/02/03/08, **nicht** Teil des Implementation-Sequenz.
- **Nummern 0037–0047, 0060+** — reserviert/frei für Folge-ADRs (z.B. ADR-0042 Mutation-Surface, ADR-0047 PII-Vollzugriff, ADR-0050+ Mobile, etc., siehe Tabelle unten).

## Coverage-Schätzung (Total)

- **14 Implementation-ADRs** (0034, 0035, 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0057, 0058, 0059) + 1 bindender Spec-ADR (0036)
- **~35 neue Prisma-Modelle** + **~12 neue Enums**
- **~99 neue vitest cases** (Gesamt ~689 von aktuell ~590)
- **~15 neue Cockpit-Routen** (in `apps/cockpit-next/app/(app)/...`)
- **~30+ neue Read-Endpoints** (in `src/routes/...`)
- **~14 Supabase-Promotion-Scripts** (analog ADR-0028 12-Query-Pattern)

**Geschätzte Sprint-Dauer:** 6–8 Sprints à 2 Wochen, abhängig von Owner-Review-Geschwindigkeit.

## Bewusst NICHT in diesem Verzeichnis (separate ADRs/Tasks)

Diese Themen sind in den 14 Tasks explizit als **out-of-scope** markiert, brauchen aber separate ADRs/Tasks, wenn sie reifen:

| Thema | Grund für out-of-scope | Vermutlicher Owner-ADR |
|---|---|---|
| ExceptionRule / EventInquiry Mutation Surface | eigenes Mutations-ADR nach Task 06/12 | ADR-0061 (reserviert, nach Renumbering) |
| PII-Vollzugriff für zugewiesene Manager (Rollen-Scope) | eigenes RLS-Scope-ADR | ADR-0062 (reserviert, nach Renumbering) |
| Mobile Event-Execution (Phase 6) | VISION §10, später | ADR-0050+ |
| Service-Worker-Registration (Phase D) | ADR-0021 §Service-Worker-Strategy | ADR-0051+ |
| LLM-Event-Draft-Generator / AI-Strategie | ADR-0021 §3 verbietet | ADR-0060+ |
| Connector-Build (FoodNotify/Gastronovi/gastronaut) | ADR-0002 + ADR-0021 | ADR-0070+ |
| Angebots-Kalkulator / PDF-Builder | VISION §3 out-of-scope | ADR-0080+ |
| Hotel-PMS-Integration (eviivo) | VISION §6 Phase 1 out-of-scope | ADR-0090+ |
| Live-Wetter-API für Outdoor-Standorte | ADR-0021 §3 verbietet | ADR-0100+ |
| Rezeptur-/Kalkulations-Engine | VISION §3 out-of-scope (FoodNotify bleibt) | ADR-0110+ |
| Multi-Language Cockpit-UI | VISION §3 out-of-scope | ADR-0120+ |

## Handling Rules

- **Pro Task ein Implementation Slice.** Tasks 01–13 sind so geschnitten, dass sie in **1 PR** landen können.
- **ADR-Discipline.** Kein Code-Slice ohne akzeptiertes Owner-ADR. Pattern: ADR-Proposal → Owner-Acceptance → Code-Slice → Supabase-Promotion → Cockpit-Read.
- **Profile-Discriminator.** Alle Tasks 04–13 beachten ADR-0030 §Decisions §1: keine Hardcoded-Name-Matches, immer über `LocationProfile` + `OperationalUnitType` + `EventSpaceSupport` + `BusinessUnitName` + `EventConceptName` filtern.
- **PII-Sanitization.** Tasks 03, 06, 11, 12, 13 beachten ADR-0021 §5: `rawMessage`, `contactEmail`, `contactPhone` werden vor Export/Retention sanitisiert. Cockpit-Read zeigt nur Header + Indikator-Badges.
- **Read-only by default.** Tasks 01–13 sind explizit read-only. Mutations kommen in ADR-0042 (separat).
- **No LLM-driven approval.** Tasks 01–13 verwenden deterministische Rule-Engines (z.B. `InquiryRoutingRule` mit Keyword-Match). LLM ist explizit out-of-scope.
- **No external writeback.** Tasks 01–13 bauen keine Connector-Logik. `ExternalSystemLink` ist read-only URL-Register, kein API-Connector.
- **Supabase-Promotion.** Jeder Task hat ein eigenes Verify-Script analog ADR-0028 12-Query-Pattern. Code-Slice darf erst nach Supabase-Promotion von Cockpit konsumiert werden.

## Bindings

- `AGENTS.md` §Active Specs & Authority
- `docs/VISION.md` (Phases 0–6, Guardrails §11)
- `docs/automation/semi-automated-operations-layer.md` (Phase A spec, Guardrails §Critical Boundaries)
- `docs/architecture/multi-location-mother-concern.md` (Phase A contract, ADR-0030)
- `docs/architecture/location-profiles.md` (3 Profile)
- `docs/architecture/cube-premium-compatibility.md` (CUBE-Premium-Vertrag)
- ADR-0002, 0011, 0014, 0016, 0017, 0021, 0022, 0023, 0028, 0029, 0030, 0031 (alle accepted)

## Cross-Reference

- `docs/tasks/README.md` (übergeordnetes Task-Workplan-Verzeichnis)
- `docs/tasks/cockpit-audit-workplan.md` (vorhandene Cockpit-Audit-Items, in Task 14 konsolidiert)
- `docs/agent-team/agent_teamplan.md` (Workstreams WS-001 bis WS-007+)
