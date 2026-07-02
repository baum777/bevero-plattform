# Task: CUBE Venue-Layer Spec-Gap (Sub-Phase 3.0)

**Working title:** `cube-venue-spec-gap`
**Status:** `ACCEPTED` (ADR-0036 Owner-Acceptance 2026-06-09)
**Owner-ADR:** keiner (Gap-Analyse; verweist auf ADR-0036 als gemeinsame Hauptautorität der drei Folgespecs)
**Depends on:** User-CUBE-Deepdive (Stand 2026-06-09), Task 01 (`cube-sub-units-data-model.md`), Task 02 (`cube-menu-matrix.md`), Task 03 (`cube-event-intake-read-apis.md`), Task 08 (`cockpit-cube-service-slot-dashboard.md`)
**Source spec:** `docs/architecture/cube-premium-compatibility.md`, User-CUBE-Deepdive (Restaurant, o.T. Bar, Terrasse, Empfangsflächen, Bankett, Packages, Exklusivanmietung)
**Target repo state:** **Keine Code-/Schema-/Migrations-Änderung.** Reine Plan-Datei, die den Slice aus drei Folgespecs (`00a`, `00b`, `00c`) begründet.

## Zweck

Dieser Task dokumentiert die **Lücke** zwischen dem User-CUBE-Deepdive vom 2026-06-09 (Restaurant, o.T. Bar, Terrasse, Spange, Bankett, Packages, Exklusivanmietung, Non-Food, Intake) und den bereits geplanten Substraten in den Tasks 01/02/03/08. Er begründet die Notwendigkeit von drei Folgespecs, die jeweils eine bestimmte **konzeptionelle Lücke** schließen, ohne dass in diesem Slice Code, Schema oder Migrations entstehen.

Die drei Lücken-Cluster sind:

- **Cluster A — Source-Conflict-Management** (Deepdive §4): kein `SourceVersion`, kein `Conflict`-Substrat, kein Manager-Approval-Pfad für Website/PDF-Widersprüche. Wird in `00b-cube-source-conflict-validator.md` (ADR-0036-B) adressiert.
- **Cluster B — Event-Wirtschaftsregeln** (Deepdive §9, §10): Exclusive-Rental-Raummieten, Mindestverzehr, After-Midnight-Staff, Non-Food-Komponenten, Möbel-Schwellenwerte. Wird in `00c-cube-event-economic-rules.md` (ADR-0036-C) adressiert.
- **Cluster C — Operations-Spec-Layer** (Deepdive §1, §2, §3, §5, §6, §7, §8, §11 als konzeptioneller Überbau über 01/02/03/08): Venue-Graph inkl. `parentContext`, Spange, Service-Slot-Spezifika, Beverage-Berechnungs-Engine-Spec, o.T. Bar Dayparts + Weather-Sensitivity, Private-Packages-Modell, Intake-Confirmation-Fallback. Wird in `00a-cube-venue-model-spec.md` (ADR-0036-A) adressiert.

## Cross-Reference-Tabelle (Deepdive × existierende Tasks × neue Specs)

| Deepdive-§ | Inhalt | Existierender Task | Deckt ab | Lücke | Adressiert in |
|---|---|---|---|---|---|
| §1 | Venue-Graph (4 Units, parentContext Kunstmuseum) | Task 01 (`OperationalUnit` + 3 CUBE-Units im Seed) | `cube_restaurant_top_floor`, `ot_bar_lounge_terrace`, Exklusiv Events | `spange_ground_floor` fehlt im Seed; `parentContext: kunst_museum_stuttgart` nicht modelliert; `requiresManualConfirmation` fehlt | 00a §1 |
| §2 | Service-Slot-Matrix (Lunch/Kaffee/Dinner/After-Work, Wochentag-Varianten) | Task 01 (`ServiceSlot` mit `daysOfWeekMask`) + Task 08 (Timeline-View) | generisches `ServiceSlot`-Substrat | Slot-Override-Listen (z.B. "So–Do 19 Uhr, Fr/Sa 20 Uhr") für Konflikte wie o.T. So–Do-Zeiten; explizite Slot-Art (Lunch-Weekday vs. Lunch-Weekend) | 00a §2 |
| §3 | Reservierungs-Logic 1–7/8–19/20+ | Task 01 (`GroupRule.alaCarteMaxGuests`, `groupMenuRequiredFrom`) | 1–7 à la carte, 8–19 Menüpflicht, 20+ Bankett | 70+ Exklusivanmietung und 171–250 Stehempfang nicht in `GroupRule` | 00a §3 |
| §4 | Source-Konflikte (o.T.-Zeiten, Menüanzahl, Möbelschwellen) | nicht abgedeckt | — | komplette Lücke: kein `SourceVersion`, kein `Conflict`, kein Manager-Approval-Pfad | **00b** |
| §5 | Menüarchitektur (8 Scopes, 6 Order-Modi, 6 Price-Modi) | Task 02 (`Menu` + `MenuItem`) + Task 03 (`EventPackage`) | Lunch/Dinner/Group + Wine-Flight-Andeutung | 8 Scopes nicht vollständig; `priceMode` als Brutto-vs-Netto-Invariante fehlt | 00a §4 |
| §6 | Beverage-Packages (6 Pakete) | Task 03 (`BeveragePackage` mit `durationHours`, `pricePerPersonCents`) | 6 Pakete (Aperitif, Classic, Exklusiv, Kids, Digestif, Cocktails) | Berechnungs-Engine `Gäste × Dauer × Phase` fehlt | 00a §5 |
| §7 | o.T. Bar als eigener Layer | Task 01 (Unit) + Task 02 (Menü) | Unit + Tagesmenü | Dayparts (morning/daytime/afterWork) fehlen; `weatherSensitive` fehlt; `inventoryScopes` fehlt | 00a §6 |
| §8 | Private Packages (Wedding Bells etc.) | Task 03 (`EventPackage` generisch) | generisches Paket | `requiredLeadTimeDays`, `paymentMode`, `cancellationPolicy`, `windowSeat`, `includedItems`, `addOns` fehlen | 00a §7 |
| §9 | Exclusive-Rental-Regeln | nicht abgedeckt | — | komplette Lücke: `roomRentalNet`, `minimumConsumptionNet`, `afterMidnightStaffRatesNet`, Kapazitäten 170/250 | **00c** |
| §10 | Non-Food- & Setup-Logik | nicht abgedeckt | — | komplette Lücke: `includedByDefault`, `optionalAddOns`, `costDrivers` | **00c** |
| §11 | Intake-Schema (Kontaktformular, 10-Min-Confirmation-Fallback) | Task 03 (`EventInquiry`) | Felder + Status-Pipeline | `confirmationEmailExpectedWithinMinutes: 10` als Read-Indikator fehlt | 00a §8 |
| §12 | Aggregat-Architektur-Spec | nicht direkt | — | konzeptioneller Überbau | 00a + 00b + 00c |
| §13 | Bevero-Fokus-Argumentation | nicht direkt | — | konzeptioneller Überbau | 00a (Präambel) |

## Authority-Anker

- `AGENTS.md` §"Active Specs & Authority" — Authority-Order ADR > Automation-Spec > Vision > Agent-Team > README.
- `docs/DECISIONS.md` ADR-0014 (Org aus Supabase Auth), ADR-0017 (`app_runtime` enforce RLS), ADR-0021 (Phase A Hard-Guardrails), ADR-0022/0023 (Automation-Surface).
- `docs/tasks/logik/README.md` §"Handling Rules" — "Kein Code-Slice ohne akzeptiertes Owner-ADR."
- `docs/tasks/logik/01/02/03/08` — existierende Substrate, die **nicht** verändert werden, nur annotiert.

## Hard-Guardrails (aus ADR-0021 §3, hier verschärft für CUBE-Spec)

- **CUBE = eigene Organization, eigene RLS-Scopes, eigene Members.** Multi-Tenant-Trennung gemäß ADR-0014. Standort-Hierarchie (`parentContext: kunst_museum_stuttgart`) ist Konfiguration, nicht Authority.
- **Kein `InventoryMovement`-Shortcut.** Event-/Package-/Rental-Regeln erzeugen `AutomationSuggestion` (ADR-0022/0023), niemals direkte Stock-Mutation. Workflow-Pfad bleibt `WorkflowTask → InventoryMovement` (ADR-0006).
- **Kein Auto-Resolve für Source-Konflikte.** Manager-Freigabe via `POST /admin/automation/suggestions/:id/approve` (ADR-0023) ist der einzige Pfad.
- **Kein Writeback an FoodNotify / Gastronovi / Dynamics 365 / DATEV.** Bridges sind read-only (ADR-0002, ADR-0021).
- **Kein LLM** in Decision Engine, Source-Conflict-Resolution, Beverage-Berechnung oder Offer-Kalkulation (ADR-0021 §3).
- **Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`.** Harte Invariante, DB-Check-Constraint im Implementation-Slice.
- **After-Midnight-Staff-Rates, Rental-Fees, Minimum-Consumption** sind **Netto-Display** mit optionalem Brutto-Overlay zur Anzeige.
- **Wetter-Sensitivität** ist client-side Cockpit-Logik, kein externes API (ADR-0021 §3 verbietet Auto-Wetter).

## Out-of-Scope (für diesen und alle Folgespecs)

- Schema-Implementierung (`prisma/schema.prisma`-Änderungen)
- Migrationen (`prisma/migrations/`)
- Read-Endpoints (`src/routes/...`)
- Cockpit-Views (`apps/cockpit-next/...`)
- Service-Worker (Phase D bleibt ADR-0051+)
- LLM-Resolver (ADR-0021 §3 verbietet)
- Connector-Logik zu FoodNotify/Gastronovi/Dynamics (ADR-0070+)
- PDF-Ingest der Bankettmappe (Open Question, kein Architektur-Beschluss in dieser Phase)
- Live-Wetter-API (ADR-0021 §3 verbietet)
- Rezeptur-/Kalkulations-Engine (VISION §3 out-of-scope)
- Hotel-PMS-Integration (VISION §6 out-of-scope)

## Reihenfolge (für den Implementation-Pfad nach Owner-Acceptance)

```text
Slice 1 (dieser Task + 00a + 00b + 00c, Doku-only):
  00 (Gap)  →  00a (Venue-Model-Spec)  →  00b (Source-Conflict)  →  00c (Event-Economics)  →  ADR-0036 (proposed)  →  MSPR-Logbook

Slice 2 (Implementation, nur nach ADR-0036-Acceptance):
  ADR-0029-A: Venue-Model-Impl      (Migration + Substrat-Erweiterungen für 00a + 3 Read-Endpoints + 11 Vitest-Cases)
  ADR-0029-B: Source-Conflict-Impl  (2 neue Substrate + 2 Read-Endpoints + 1 Suggestion-Bridge + 7 Vitest-Cases)
  ADR-0029-C: Event-Economic-Impl   (4 neue Substrate + 4 Read-Endpoints + 14 Supabase-Promotion-Queries + 9 Vitest-Cases)

Slice 3 (Cockpit, nur nach Slice 2):
  Task 08a: Cockpit-Source-Conflict-Review-Tab
  Task 08b: Cockpit-Event-Economic-Rules-View
  Task 08c: Cockpit-Venue-Model-Erweiterung
```

## Bindings

- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime`)
- ADR-0021 (Phase A Hard-Guardrails)
- ADR-0022 (Phase B Schema + Read-Endpoints)
- ADR-0023 (Mutation-Surface)
- ADR-0030 (Profile-Discriminator)
- ADR-0034 (Substrate: OperationalUnit, ServiceSlot, GroupRule) — *bleibt ADR-0034 nach Renumbering 2026-06-09*
- ADR-0048 (Substrate: EventInquiry, EventPackage, BeveragePackage) — *renumbered 2026-06-09, war ADR-0035*
- ADR-0053 (Cockpit: Service-Slot-Dashboard, Event-Inquiry-Drawer) — *renumbered 2026-06-09, war ADR-0037*
- `AGENTS.md` §"Active Specs & Authority"
- `docs/tasks/logik/README.md` §"Handling Rules"

## Gate (Definition of Done)

- Diese Datei existiert.
- Drei Folgespecs (`00a`, `00b`, `00c`) sind erstellt mit `Status: OPEN`.
- ADR-0036 (mit Sub-Sections A/B/C) ist in `docs/DECISIONS.md` als `proposed` eingefügt.
- MSPR-Logbook-Eintrag `2026-06-09-cube-venue-spec-gap.md` ist geschrieben.
- Authority-Order ist in jeder Folgespec explizit zitiert.
- Owner-Review steht aus.

## Next gate

Owner-Acceptance der drei ADR-0036-Sub-Sections; danach Implementation-ADR (vermutlich ADR-0029-A/B/C), jeweils analog ADR-0022/0023 mit eigenem Schema-Slice + RLS-Plan + Read-Endpoints + Vitest-Gate.
