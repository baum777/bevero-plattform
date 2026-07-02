# Task: CUBE Event-Economic Rules (Sub-Phase 3.0-C)

**Working title:** `cube-event-economic-rules`
**Status:** `ACCEPTED` (ADR-0036 Owner-Acceptance 2026-06-09)
**Owner-ADR:** ADR-0036-C (proposed, Sub-Section von ADR-0036 in `docs/DECISIONS.md`)
**Depends on:** Task 00 (`00-cube-venue-spec-gap.md`), Task 00a (`00a-cube-venue-model-spec.md`), ADR-0021, ADR-0022, ADR-0023
**Source spec:** User-CUBE-Deepdive vom 2026-06-09, §9 (Exclusive-Rental-Regeln), §10 (Non-Food- & Setup-Logik), §4 (Möbel-Schwellenwert-Konflikt 100 vs. 120)
**Target repo state:** **Keine.** Reine Spec. Implementation-Slice ist `01d-cube-event-economic-impl.md` (ADR-0029-C).

## Zweck

Diese Spec definiert Substrate für die **Event-Wirtschaftsregeln** des CUBE: Exklusivanmietungs-Policen, After-Midnight-Staff-Rates, Non-Food-Komponenten, Möbel-Schwellenwerte. Sie sind **konfigurierbare Display-Daten** (read-only Cockpit-View), keine Berechnungs-Engine. Cockpit zeigt sie als verbindliche Vorgaben; Manager nutzt sie bei der Angebotserstellung.

## Hard-Guardrails

- **Netto-Invariante.** Alle `*Cents`-Felder in `ExclusiveRentalPolicy` und `AfterMidnightStaffRate` sind `net_excluding_vat`. Cockpit zeigt zusätzlich `gross_including_vat` als berechnetes Feld mit `vatRate` aus `Location`, **nur** als Overlay-Display. Persistenz bleibt Netto.
- **Brutto/Netto-Disziplin** wie in `00a §4`: `priceMode = "net_excluding_vat"` für alle Event-/Bankett-/Rental-Substrate. DB-Check-Constraint.
- **Verbatim-Beispiel-Seed.** Deepdive-Werte werden **wortwörtlich** in den Seed übernommen, mit `isActive: false` + `requiresManagerConfirmation: true` Marker. Werte sind **keine** Source-of-Truth — sie sind Eingaben aus Bankettmappe 2026-06-09, Stand vor Verifizierung.
- **Read-only Cockpit-View.** Diese Spec definiert **keinen** Cockpit-Editor. Folge-Task analog Task 08.
- **Kein LLM** in Berechnungs-Engine oder Offer-Kalkulator (ADR-0021 §3).
- **Kein Writeback** an FoodNotify/Gastronovi/Dynamics (ADR-0002, ADR-0021).
- **Multi-Tenant:** CUBE = eigene Organization.
- **Append-only für Werte:** Soft-Aktivierung analog ADR-0009, kein Hard-Delete. Werte-Historie bleibt nachvollziehbar.

## Entscheidungen

### 1. Exclusive-Rental-Policy-Substrat

Deepdive §9 nennt harte Wirtschaftsregeln für Exklusivanmietung. Diese werden in einem Substrat modelliert.

**`ExclusiveRentalPolicy` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | Multi-Tenant |
| `name` | `String` | z.B. "CUBE Standard 2026" |
| `validFrom` | `DateTime?` | Optional, zeitliche Gültigkeit |
| `validUntil` | `DateTime?` | Optional |
| `isActive` | `Boolean @default(true)` | Soft-Aktivierung |
| `requiresManagerConfirmation` | `Boolean @default(false)` | Marker für verbatim-übernommene Werte |
| `minimumGuestCount` | `Int` | z.B. 70 (Exklusivanmietung erst ab 70 Gästen) |
| `dayRentalUntilHourLocal` | `String` | z.B. "16:00" |
| `dayRentalRoomNetCents` | `Int` | z.B. 290000 (= 2.900 €) |
| `dayRentalMinConsumptionNetCents` | `Int` | z.B. 350000 (= 3.500 €) |
| `eveningRentalFromHourLocal` | `String` | z.B. "18:30" |
| `eveningRentalRoomNetCents` | `Int` | z.B. 450000 (= 4.500 €) |
| `eveningRentalMinConsumptionNetCents` | `Int` | z.B. 900000 (= 9.000 €) |
| `seatedMenuMaxGuests` | `Int` | z.B. 170 |
| `standingReceptionMaxGuests` | `Int` | z.B. 250 |
| `notes` | `String?` | z.B. "Quelle: Bankettmappe 2026-06-09, Seite 4" |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |
| `deletedAt` | `DateTime?` | Soft-Delete |

`@@index([organizationId, isActive, validFrom])`, `@@index([organizationId, validUntil])`.

**Beispiel-Seed (verbatim aus Deepdive §9, `isActive: false`, `requiresManagerConfirmation: true`):**

```text
organizationId: <CUBE-Org-ID>
name: "CUBE Standard 2026 (verbatim Bankettmappe)"
minimumGuestCount:           70
dayRentalUntilHourLocal:     "16:00"
dayRentalRoomNetCents:       290000    # 2.900 €
dayRentalMinConsumptionNetCents: 350000  # 3.500 €
eveningRentalFromHourLocal:  "18:30"
eveningRentalRoomNetCents:   450000    # 4.500 €
eveningRentalMinConsumptionNetCents: 900000  # 9.000 €
seatedMenuMaxGuests:         170
standingReceptionMaxGuests:  250
notes: "Quelle: Bankettmappe 2026-06-09. Werte Stand vor Verifizierung."
isActive: false
requiresManagerConfirmation: true
```

**Berechnungs-Formel (Spec, nicht Engine):**

```text
rentalCostNet = (isDay ? dayRentalRoomNetCents : eveningRentalRoomNetCents)
effectiveMinimumConsumptionNet = (isDay ? dayRentalMinConsumptionNetCents : eveningRentalMinConsumptionNetCents)
finalCustomerCostNet = MAX(rentalCostNet, effectiveMinimumConsumptionNet)
finalCustomerCostGross = ROUND(finalCustomerCostNet * (1 + vatRate))
```

`vatRate` ist Konfigurationswert pro `Location` (z.B. `0.19` für Deutschland). Cockpit-Display.

**Open Question 1 (Architektur):** Soll `ExclusiveRentalPolicy` brand-übergreifend (`public`-Schema) sein, oder als CUBE-Spezifikum im ersten Implementation-Slice? **Empfehlung:** brand-übergreifend, weil auch Motorworld Inn Exklusivlogik haben wird. Schema: `public`.

### 2. After-Midnight-Staff-Rate-Substrat

Deepdive §9 nennt Personalstundensätze ab 24:00 Uhr. Diese werden in einem Substrat modelliert.

**`AfterMidnightStaffRate` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | Multi-Tenant |
| `role` | `String` (oder Enum) | `cook`, `service`, `restaurant_manager`, `bartender`, `bar_buffet_staff` |
| `hourlyRateNetCents` | `Int` | z.B. 5990 (= 59,90 €) für Restaurantleiter |
| `fromHourLocal` | `String` | z.B. "00:00" |
| `toHourLocal` | `String` | z.B. "06:00" |
| `validFrom` | `DateTime?` | Optional |
| `validUntil` | `DateTime?` | Optional |
| `isActive` | `Boolean @default(true)` | Soft-Aktivierung |
| `requiresManagerConfirmation` | `Boolean @default(false)` | Marker |
| `notes` | `String?` | Quelle |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

`@@index([organizationId, role, isActive])`, `@@index([validFrom])`.

**Beispiel-Seed (verbatim aus Deepdive §9, `isActive: false`, `requiresManagerConfirmation: true`):**

```text
organizationId: <CUBE-Org-ID>
role:                    "cook"                hourlyRateNetCents: 4590  role:                    "service"             hourlyRateNetCents: 3990  role:                    "restaurant_manager"  hourlyRateNetCents: 5990  role:                    "bartender"           hourlyRateNetCents: 4590  role:                    "bar_buffet_staff"    hourlyRateNetCents: 3990
fromHourLocal:           "00:00"
toHourLocal:             "06:00"
isActive: false
requiresManagerConfirmation: true
notes: "Quelle: Bankettmappe 2026-06-09, Personalstundensätze nach 24:00 Uhr."
```

**Berechnungs-Formel (Spec, nicht Engine):**

```text
staffCostNet = hours × hourlyRateNetCents × staffCount
staffCostGross = ROUND(staffCostNet × (1 + vatRate))
```

Cockpit-Display, kein Backend-Engine.

**Hard-Guardrail:** Es gibt **keinen** automatischen Trigger, der ab 24:00 Uhr diese Sätze anwendet. Manager liest die Tabelle und kalkuliert manuell im Angebot.

**Open Question 2 (Architektur):** Soll `securityHourlyNetCents` (z.B. 26 €/h) auch in `AfterMidnightStaffRate` modelliert werden, oder als eigener `SecurityRate`-Substrat? **Empfehlung:** in `AfterMidnightStaffRate` mit `role = "security"`, weil die Struktur identisch ist (Stundensatz, Zeitfenster). Erweiterung im Implementation-Slice.

### 3. Non-Food-Component-Modell

Deepdive §10 nennt Non-Food-Komponenten, die im Mietpreis inkludiert sind, und optionale Add-Ons. Diese werden in einem Substrat modelliert.

**`NonFoodComponent` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | Multi-Tenant |
| `category` | `String` (oder Enum) | `included_by_default`, `optional_addon`, `cost_driver` |
| `name` | `String` | z.B. "Glasses", "Chair covers", "Setup teardown time" |
| `description` | `String?` | z.B. "Weingläser, Standard-Setup" |
| `defaultIncluded` | `Boolean @default(false)` | Bei `category = "included_by_default"` immer true |
| `extraCostNetCents` | `Int?` | Nur bei `category IN ("optional_addon", "cost_driver")` |
| `notes` | `String?` | Quelle / Kontext |
| `isActive` | `Boolean @default(true)` | |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

`@@index([organizationId, category])`, `@@index([organizationId, isActive])`.

**Beispiel-Seed (verbatim aus Deepdive §10):**

```text
included_by_default (alle isActive: true):
  - glasses               (Weingläser, Standard-Setup)
  - porcelain             (Porzellan, Standard-Setup)
  - cutlery               (Besteck, Standard-Setup)
  - napkins               (Servietten, Standard-Setup)
  - service_equipment     (Service-Equipment)
  - kitchen_equipment     (Küchen-Equipment)

optional_addon (alle extraCostNetCents: null, Preis auf Anfrage):
  - chair_covers          (Hussen)
  - table_decoration      (Tischdekoration)
  - additional_furniture  (Zusatzmobiliar)
  - stage_or_audio        (Bühne / Audio)
  - lighting_effects      (Licht-Effekte)
  - music_acts            (Musik-Acts)

cost_driver (extraCostNetCents: null, nach Aufwand):
  - setup_teardown_time   (Auf-/Abbau-Zeit)
  - after_midnight_staff  (Personal nach 24:00 Uhr, siehe Substrat §2)
  - security              (Sicherheitsdienst, 26 €/h)
  - furniture_rental      (Möbelmiete)
  - custom_seating        (Sonderbestuhlung)
```

**DB-Check-Constraint:** `category = "included_by_default"` ⇒ `extraCostNetCents IS NULL` UND `defaultIncluded = true`. Verletzung → 23514 `check_violation`.

**Open Question 3 (Architektur):** Soll `extraCostNetCents` als fixer Preis (z.B. "Hussen 8 €/Stück") oder als `null` (= auf Anfrage) modelliert werden? **Empfehlung:** Beides zulassen. DB-Constraint: wenn gesetzt, `> 0`. Cockpit zeigt `null` als "auf Anfrage".

### 4. Furniture-Threshold-Konflikt (Deepdive §4)

Website nennt "Mobiliar inkludiert bis 100 Gäste"; Bankettmappe nennt "Zusatzmobiliar ab 120 Personen". Konflikt wird **parallel** gespeichert mit `isActive Boolean` + `effectiveFrom DateTime`.

**`FurniturePolicy` (Substrat, neu):**

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | `String @id @default(cuid())` | PK |
| `organizationId` | `String` | Multi-Tenant |
| `name` | `String` | z.B. "CUBE Website 2026", "CUBE Bankettmappe 2026" |
| `includedUntilGuestCount` | `Int` | z.B. 100 oder 120 |
| `additionalFromGuestCount` | `Int` | z.B. 120 (gleich wie `includedUntil` oder höher) |
| `effectiveFrom` | `DateTime?` | Optional |
| `effectiveUntil` | `DateTime?` | Optional |
| `isActive` | `Boolean @default(true)` | |
| `sourceUrl` | `String?` | Read-only URL-Register (kein Connector) |
| `requiresManagerConfirmation` | `Boolean @default(false)` | Marker für verbatim-Werte |
| `notes` | `String?` | z.B. "Bankettmappe widerspricht Website" |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

`@@index([organizationId, isActive])`, `@@index([organizationId, effectiveFrom])`.

**Beispiel-Seed (verbatim aus Deepdive §4):**

```text
name: "CUBE Website 2026"
includedUntilGuestCount: 100
additionalFromGuestCount: 120
sourceUrl: "https://www.cube-restaurant.de/de/events/"
isActive: false
requiresManagerConfirmation: true
notes: "Konflikt mit Bankettmappe; Manager-Klärung ausstehend."

name: "CUBE Bankettmappe 2026"
includedUntilGuestCount: 100
additionalFromGuestCount: 120
sourceUrl: null  # PDF, nicht öffentlich
isActive: false
requiresManagerConfirmation: true
notes: "Bankettmappe Seite 7."
```

**Cockpit-Display:** Beide Policies werden parallel gelistet mit `isActive` Badge und `sourceUrl` Link. Manager-Indikator ("Konflikt erkannt — bitte Quelle klären") sichtbar.

**Open Question 4 (Architektur):** Gehört `FurniturePolicy` in `00b` (Source-Conflict-Validator) oder in `00c` (Event-Economics)? **Empfehlung:** in `00c`, weil der Substrat-Inhalt (Schwellenwert, Gästezahl) Event-Wirtschaftsdaten sind. Source-Conflict-Logik aus `00b` kann optional darauf zeigen.

### 5. Out-of-Scope

- **Live-Berechnung von Gesamtangeboten.** Offer-Kalkulator ist ADR-0080+. Diese Spec definiert nur Substrate und Formeln; Engine kommt später.
- **Cockpit-Editor für diese Policies.** Read-only Cockpit-View. Editor ist eigener Folge-Task (analog Task 08 + Cockpit-Audit-Workplan Task 14).
- **PDF-Export der Regeln.** Angebots-Builder ist ADR-0080+.
- **Connector zu FoodNotify/Gastronovi.** ADR-0070+.
- **LLM-Resolver für Werte-Widersprüche.** ADR-0021 §3 verbietet.
- **Automatische Währungsumrechnung.** Nur EUR in v1. Multi-Currency ist Phase-3.4-Folge.

## Beispiel-Workflow (End-to-End)

```text
1. Manager öffnet CUBE-Cockpit (Location: cube_stuttgart, Profile: CUBE_PREMIUM).
2. Navigiert zu "Event-Wirtschaftsregeln" (Folge-Task, read-only).
3. Cockpit zeigt:
   - ExclusiveRentalPolicy: 1 Eintrag, isActive=false, requiresManagerConfirmation=true
   - AfterMidnightStaffRate: 5 Einträge (5 Rollen), isActive=false
   - NonFoodComponent: 17 Einträge (6 included, 6 optional, 5 cost_drivers)
   - FurniturePolicy: 2 Einträge (Website + Bankettmappe), Konflikt-Indikator
4. Manager prüft Werte gegen aktuelle Bankettmappe, korrigiert falls nötig
   (Cockpit-Editor ist out-of-scope dieser Slice).
5. Manager setzt isActive=true auf den verifizierten Eintrag.
6. Cockpit-Read-Endpoint zeigt jetzt:
   - Raummiete Abend: 4.500 € netto
   - Mindestverzehr Abend: 9.000 € netto
   - Personalstundensatz Restaurantleiter nach 24:00: 59,90 € netto
   - Inkludierte Non-Food: Gläser, Porzellan, Besteck, Servietten, Equipment
   - Möbelschwellen: 100 inkludiert, 120 Zusatz (mit Konflikt-Indikator)
7. Manager nutzt diese Werte als Grundlage für Angebotserstellung
   (in eigenem Tool, ADR-0080+).
```

## Bindings

- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime`)
- ADR-0021 (Phase A Hard-Guardrails: kein LLM, kein Writeback, kein Service-Role in User-Path)
- ADR-0022, ADR-0023 (Automation-Surface)
- ADR-0030 (Profile-Discriminator)
- ADR-0034 (Substrate: OperationalUnit, ServiceSlot, GroupRule) — *Stand 2026-06-09: bleibt ADR-0034*
- ADR-0048 (Substrate: EventPackage) — *Stand 2026-06-09 renumbered: war ADR-0035*
- Task 00 (`00-cube-venue-spec-gap.md`)
- Task 00a (`00a-cube-venue-model-spec.md`)
- Task 00b (`00b-cube-source-conflict-validator.md`)

## Gate (Definition of Done)

- Diese Datei existiert mit `Status: OPEN`.
- Owner-Acceptance von ADR-0036-C (Sub-Section von ADR-0036).
- 4 Entscheidungs-Sections dokumentiert (Exclusive-Rental, After-Midnight-Staff, Non-Food, Furniture-Threshold).
- 4 Open Questions dokumentiert.
- Beispiel-Seed ist verbatim aus Deepdive §9/§10 übernommen mit Marker `isActive: false` + `requiresManagerConfirmation: true`.
- Brutto/Netto-Disziplin ist als DB-Check-Constraint-Spec formuliert.
- Kein Code, kein Schema, keine Migration geschrieben.

## Next gate

ADR-0029-C Implementation-Slice (`01d-cube-event-economic-impl.md`) mit:

- Migration `prisma/migrations/<ts>_add_cube_event_economics/migration.sql` (4 Substrate: `ExclusiveRentalPolicy`, `AfterMidnightStaffRate`, `NonFoodComponent`, `FurniturePolicy`)
- RLS-Plan: org-scoped SELECT, manager+ UPDATE, app_runtime INSERT, kein DELETE
- 4 Read-Endpoints:
  - `GET /admin/cube/economic/exclusive-rental` (active policy)
  - `GET /admin/cube/economic/staff-rates` (5 Rollen)
  - `GET /admin/cube/economic/non-food` (alle Komponenten)
  - `GET /admin/cube/economic/furniture` (alle Policies mit Konflikt-Indikator)
- 9 Vitest-Cases (CRUD, RLS, Brutto/Netto-Invariante, Furniture-Konflikt-Display, Soft-Aktivierung)
- 14-Query Supabase-Promotion-Script
- MSPR-Logbook-Eintrag `2026-06-09-cube-event-economic-impl.md`
