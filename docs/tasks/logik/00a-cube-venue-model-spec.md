# Task: CUBE Venue-Model Spec (Sub-Phase 3.0-A)

**Working title:** `cube-venue-model-spec`
**Status:** `ACCEPTED` (ADR-0036 Owner-Acceptance 2026-06-09)
**Owner-ADR:** ADR-0036-A (proposed, Sub-Section von ADR-0036 in `docs/DECISIONS.md`)
**Depends on:** Task 00 (`00-cube-venue-spec-gap.md`), Task 01 (`OperationalUnit`/`ServiceSlot`/`GroupRule`), Task 02 (`Menu`/`MenuItem`), Task 03 (`EventInquiry`/`EventPackage`/`BeveragePackage`), ADR-0021, ADR-0022, ADR-0023
**Source spec:** User-CUBE-Deepdive vom 2026-06-09, §1 (Venue-Graph), §2 (Service-Slot-Matrix), §3 (Reservierungs-Logik), §5 (Menüarchitektur), §6 (Beverage-Packages), §7 (o.T. Bar), §8 (Private Packages), §11 (Intake-Schema)
**Target repo state:** **Keine.** Reine Spec-Annotation der existierenden Substrate aus Tasks 01/02/03. Kein Code, kein Schema, keine Migration.

## Zweck

Diese Spec ist der **konzeptionelle Layer über den existierenden Substraten** in Tasks 01/02/03/08. Sie annotiert diese Substrate, ohne sie zu duplizieren oder zu überschreiben. Sie schlägt Feld-Erweiterungen, Berechnungs-Formeln und Invarianten vor, die im Implementation-Slice `01b-cube-venue-model-impl.md` (ADR-0029-A) als Migration + Read-Endpoints landen werden.

## Hard-Guardrails

- **Annotation, nicht Ersetzung:** Bestehende `OperationalUnit`-, `ServiceSlot`-, `GroupRule`-, `Menu`-, `MenuItem`-, `EventPackage`-, `BeveragePackage`-, `EventInquiry`-Substrate werden erweitert, nicht ersetzt.
- **Kein LLM** in Decision Engine, Beverage-Berechnung, Daypart-Auflösung, Wetter-Sensitivität, Intake-Confirmation (ADR-0021 §3).
- **Brutto/Netto-Invariante:** Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`. Harte Invariante, DB-Check-Constraint im Implementation-Slice.
- **Multi-Tenant:** CUBE = eigene Organization, eigene RLS-Scopes (ADR-0014).
- **Wetter-Sensitivität** ist client-side Cockpit-Logik; kein externes API (ADR-0021 §3).
- **No writeback** an FoodNotify/Gastronovi/Dynamics 365/DATEV (ADR-0002, ADR-0021).
- **No service-role in user-facing request paths** (ADR-0017, ADR-0021 §3).

## Entscheidungen

### 1. Venue-Graph (Deepdive §1)

CUBE ist ein **mehrstufiges Hospitality-System** im Kunstmuseum Stuttgart. Der Deepdive nennt vier funktionale Einheiten:

- `cube_restaurant_top_floor` — Fine-Dining, Lunch/Kaffee/Dinner/Group/Exklusiv
- `ot_bar_lounge_ground_floor` — Bar/Terrasse, Tagesgeschäft/After-Work/Aperitif-Empfang
- `spange_ground_floor` — Erdgeschoss-Event-Übergangsfläche, Aperitif/Reception
- `terrace_schlossplatz` — Outdoor-Terrasse, wettersensitiv

**Annotationen für `OperationalUnit` (Task 01):**

- `parentContext: String?` — z.B. `kunst_museum_stuttgart`. Konfiguration, keine Authority-Beziehung.
- `requiresManualConfirmation: Boolean @default(false)` — true für `spange_ground_floor` und ähnliche Event-Übergangsflächen. Cockpit zeigt Bestätigungs-Indikator.
- `weatherSensitive: Boolean @default(false)` — true für `terrace_schlossplatz` und ggf. Teile von `ot_bar_lounge_ground_floor`.
- `inventoryScopes: String[]` — z.B. `["patisserie", "coffee_tea", "breakfast_items", "bar_drinks", "aperitif", "snack_kitchen", "terrace_stock"]` für o.T. Bar.

**Open Question 1 (Architektur):** `spange_ground_floor` ist im aktuellen Task-01-Seed nicht enthalten. **Empfehlung:** Seed-Erweiterung in einem Folge-Task `01.1-cube-spange-seed-impl.md`, nicht hier. Diese Spec annotiert nur, implementiert nicht.

**Open Question 2 (Architektur):** Soll `parentContext` ein freier String sein oder ein FK auf einen neuen `LocationContext`-Master? **Empfehlung:** freier String in v1, Härtung als Phase-3.4-Folge. Begründung: Anzahl Kontexte ist klein und stabil; Lookup-Tabelle wäre Overhead.

### 2. Service-Slot-Matrix (Deepdive §2)

Deepdive-spezifische Slot-Typen:

```text
restaurant_lunch_weekday      (11:45-14:00, Mo-Fr)
restaurant_lunch_weekend      (11:45-15:00, Sa-So)
restaurant_coffee_cake        (14:00-16:45, Mo-Fr)
restaurant_dinner             (17:45-23:00, alle; Küche 18:00-22:00)
ot_bar_breakfast              (morgens)
ot_bar_daytime                (ganztägig)
ot_bar_after_work             (abends, wettersensitiv)
event_aperitif                (Aperitif-Empfang)
event_reception               (Stehempfang)
exclusive_event_day           (Tagsüber bis 16:00)
exclusive_event_evening       (Abends ab 18:30)
```

**Annotationen für `ServiceSlot` (Task 01):**

- `slotKind: String` (oder Erweiterung zu Enum in Implementation-Slice) — siehe Liste oben.
- `daysOfWeekMask: Int` (Bitmask Mo..So) bleibt unverändert aus Task 01.
- `kitchenTimeLocal: String?` (HH:mm-HH:mm) — z.B. `18:00-22:00` für `restaurant_dinner`. Optional, da nicht alle Slots eine separate Küchenzeit haben.
- `inventoryImpact: String[]` — z.B. `["fish", "vegetarian_menu", "dessert", "wine_optional"]` für Lunch-Weekday. Cockpit-Display, nicht Engine.

**Open Question 3 (Architektur):** Soll die Slot-Auflösung **pro Wochentag** (`daysOfWeekMask`) bleiben, oder bekommt sie zusätzliche **Slot-Override-Listen** (z.B. "So–Do 19 Uhr, Fr/Sa 20 Uhr" für o.T. Bar)? **Empfehlung:** Override-Liste ist Phase-3.4-Folge. Aktueller Konflikt (o.T. So–Do 19 vs. 20 Uhr) wird in `00b` als Source-Conflict-Validation gelöst, nicht in `ServiceSlot`.

### 3. Reservierungs-Decision-Engine (Deepdive §3)

Deepdive-spezifische Gästezahl-Buckets:

| Range | Path | Allowed | Blocked | Owner |
|---|---|---|---|---|
| 1–7 | online_reservation | à la carte, Menü optional | — | Restaurant |
| 8–19 | online_group_reservation | Menüpflicht (Lunch oder Dinner) | à la carte | Restaurant |
| 20–69 | bankett_inquiry | Individual-Menü, kleine Auswahlkarte | — | Eventmanagement |
| 70–170 | exclusive_event_possible | Gesetztes Menü | — | Eventmanagement |
| 171–250 | exclusive_event_possible | Stehempfang, Flying Buffet, Fingerfood | Gesetztes Menü | Eventmanagement |

**Annotationen für `GroupRule` (Task 01):**

- `alaCarteMaxGuests: Int` (z.B. 7) — bereits in Task 01.
- `groupMenuRequiredFrom: Int` (z.B. 8) — bereits in Task 01.
- `bankettInquiryFrom: Int` (z.B. 20) — bereits in Task 01, explizit benannt.
- `exclusiveRentalFrom: Int?` (z.B. 70) — **neu**, optional. Wenn gesetzt, triggert die `GroupRule` einen Pfad zu Exklusivanmietung. Cockpit zeigt "Exklusiv möglich" Indikator.
- `standingReceptionMax: Int?` (z.B. 250) — **neu**, optional. Kapazitätsgrenze für Stehempfang. Wenn Gästezahl > Schwelle, Block-Hinweis.
- `seatedMenuMax: Int?` (z.B. 170) — **neu**, optional. Kapazitätsgrenze für gesetztes Menü.

**Open Question 4 (Architektur):** Gehören `exclusiveRentalFrom`, `standingReceptionMax`, `seatedMenuMax` in `GroupRule` (gleicher Substrat-Typ) oder in einen neuen `CapacityPolicy`-Substrat (analog `00c`)? **Empfehlung:** in `GroupRule` belassen in v1, weil Decision Engine deterministisch auf einem Substrat-Typ laufen soll. Auslagerung in `CapacityPolicy` ist Phase-3.4-Folge, falls Substrat zu groß wird.

### 4. Offer-Catalog / Menüarchitektur (Deepdive §5)

Acht Scopes, sechs Order-Modi, sechs Price-Modi.

**Scopes:**

- `restaurant_lunch`, `restaurant_dinner`, `group_lunch`, `group_dinner`, `corporate_event`, `exclusive_rental`, `private_package`, `ot_bar`

**Order-Modi:**

- `a_la_carte`, `fixed_menu`, `group_menu_required`, `buffet`, `flying_buffet`, `package`

**Price-Modi:**

- `gross_including_vat` (Restaurant, Bar)
- `net_excluding_vat` (Event, Bankett, Rental, After-Midnight-Staff)
- `per_person`, `for_two_persons`, `minimum_consumption`, `rental_fee`

**Annotationen für `Menu` und `EventPackage` (Tasks 02/03):**

- `Menu.priceMode: String` (oder Enum in Implementation-Slice) — Default `gross_including_vat`. DB-Check-Constraint: `priceMode IN ('gross_including_vat', 'net_excluding_vat')`.
- `EventPackage.priceMode: String` — Default `net_excluding_vat`. DB-Check-Constraint: identisch.
- `Menu.scope: String` (oder Enum) — Default `restaurant_lunch`. Werte siehe Scopes-Liste.
- `EventPackage.scope: String` — Default `corporate_event`. Werte siehe Scopes-Liste.

**Invariante (DB-Check-Constraint):** `scope IN ('restaurant_*', 'ot_bar')` ⇒ `priceMode = 'gross_including_vat'`. `scope IN ('corporate_event', 'exclusive_rental', 'private_package')` ⇒ `priceMode = 'net_excluding_vat'`. Verletzung → 23514 `check_violation` mit klarer Fehlermeldung.

**Lücke im aktuellen Task 02:** `Menu` hat `pricePerPersonCents` ohne `priceMode`-Feld. **Lücke im aktuellen Task 03:** `EventPackage` hat `pricePerPersonCents` ohne `priceMode`-Feld. Vorschlag: in ADR-0029-A ergänzen.

### 5. Beverage-Packages (Deepdive §6)

Sechs Pakete aus der Bankettmappe:

| Paket | Dauer | Inhalt | Netto-Preis/Person |
|---|---|---|---|
| Aperitif | 1h | non_alcoholic, prosecco, prosecco_orange, beer | ab 9,50 € |
| Classic | 3-4h | non_alcoholic, wine_075_selection, beer | ab 32,90 € |
| Exklusiv | 3-4h | non_alcoholic, wine_075_selection, beer, coffee_specialties | ab 36,90 € |
| Kids | 3-4h | non_alcoholic (5-11 Jahre, unter 5 frei) | ab 18,90 € |
| Digestif | 3h | digestif_selection | ab 7,50 € |
| Cocktails/Longdrinks | 3h | cocktail_selection, longdrink_selection | ab 24,90 € |

**Berechnungs-Formel (Spec, nicht Engine):**

```text
totalNet = guestCount × pricePerPersonNetCents × durationMultiplier(hours) × eventPhaseFactor(1.0)
```

`eventPhaseFactor` ist eine Cockpit-Eingabe (z.B. 1.0 für Standard, 0.5 für Aperitif-only, 1.2 für Late-Night-Snack-Add-on). **Keine** automatische Multiplikation, kein LLM, keine Connector-API.

**Annotationen für `BeveragePackage` (Task 03):**

- `name: BeveragePackageName` (Enum) — bereits in Task 03: `APERITIF, CLASSIC, EXKLUSIV, KIDS, DIGESTIF, COCKTAILS_LONGDRINKS, CUSTOM`.
- `durationHoursMin: Float`, `durationHoursMax: Float` — bereits in Task 03 als `durationHours Float`. Vorschlag: aufsplitten in `Min`/`Max` für korrekte Intervall-Berechnung.
- `includedCategories: String[]` — bereits in Task 03.
- `pricePerPersonCents: Int?` — bereits in Task 03, **neu:** Constraint `> 0` wenn gesetzt.
- `isKidsPackage: Boolean @default(false)` — **neu**, leitet Kinderpreis-Logik ab (5-11 Jahre, unter 5 frei).
- `childAgeMin: Int?`, `childAgeMax: Int?` — **neu**, optional.
- `under5Free: Boolean @default(false)` — **neu**, optional.
- `eventPhaseFactor: Float @default(1.0)` — **neu**, Cockpit-Override.

**Lücke im aktuellen Task 03:** `isKidsPackage`, `childAgeMin/Max`, `under5Free`, `eventPhaseFactor` fehlen. Vorschlag: in ADR-0029-A ergänzen.

### 6. o.T. Bar als eigener Layer (Deepdive §7)

Drei Dayparts mit eigenen Inventar-Scopes.

**Annotationen für `OperationalUnit` (Task 01):**

- `inventoryScopes: String[]` (siehe §1) — Pflicht für o.T. Bar.
- `weatherSensitive: Boolean` — true für Terrasse-Anteil, false für Innenbereich.
- `dayparts: String[]` (oder Substrat in Implementation-Slice) — `["morning", "daytime", "afterWork"]` für o.T. Bar.

**Daypart-Spezifische Inventar-Scopes:**

- `morning`: `bakery`, `breakfast`, `coffee`, `tea`
- `daytime`: `cake`, `patisserie`, `snacks`, `sandwiches`, `soup`, `bowl`, `pasta`
- `afterWork`: `aperitif`, `spritz`, `cocktails`, `iced_drinks`, `bar_snacks` (wettersensitiv)

**Open Question 5 (Architektur):** Wetter-Sensitivität über externes API (Phase G verbietet) oder client-side Cockpit-Logik? **Empfehlung:** client-side Cockpit-Logik, **kein** externes API. Manager markiert `OperationalUnit.weatherActive` als Boolean pro Tag; Cockpit-UI zeigt Wetter-Indikator (z.B. "Terrasse wettersensitiv — wenden Sie sich an Service").

### 7. Private Packages (Deepdive §8)

Drei standardisierte Produkte: **Wedding Bells**, **Love Retreat**, **Happy Birthday**.

**Annotationen für `EventPackage` (Task 03):**

- `requiredLeadTimeDays: Int @default(3)` — Hard-Rule: Buchung muss mindestens 3 Tage im Voraus erfolgen.
- `paymentMode: String` (oder Enum) — Default `prepayment`. Werte: `prepayment`, `on_arrival`, `invoice`. **Invariante:** `private_package` ⇒ `paymentMode = 'prepayment'`.
- `cancellationPolicy: String` (oder Enum) — Default `free_until_3_days_before`. Werte: `free_until_3_days_before`, `free_until_7_days_before`, `non_refundable`.
- `windowSeat: String` (oder Enum) — Default `only_by_availability`. Werte: `only_by_availability`, `guaranteed`, `not_applicable`.
- `includedItems: String[]` — z.B. `["table_reservation", "occasion_decoration", "4_course_menu", "champagne_bottle", "aperitif_cocktail", "personalized_menu_card", "flowers", "cake", "gift"]` für Wedding Bells.
- `addOns: String[]` — z.B. `["wine_pairing", "surprise_cake", "flowers", "4_course_menu"]`.
- `defaultGuestCount: Int @default(2)` — Standard-Paketgröße.

**Lücke im aktuellen Task 03:** Diese Felder fehlen komplett. Vorschlag: in ADR-0029-A ergänzen. **Caveat:** Die DB-Invariante `private_package ⇒ prepayment` ist Implementation-Slice-Concern.

### 8. Intake-Confirmation-Fallback (Deepdive §11)

CUBE-Kontaktformular versendet eine Bestätigungs-Mail; falls innerhalb von 10 Minuten keine Antwort kommt, soll der Kunde erneut per E-Mail/Phone kontaktiert werden.

**Annotationen für `EventInquiry` (Task 03):**

- `confirmationEmailSentAt: DateTime?` — Timestamp der ausgehenden Bestätigung.
- `confirmationExpectedWithinMinutes: Int @default(10)` — Konfigurierbar pro Inquiry, Default aus CUBE-Standard.
- `confirmationReminderSentAt: DateTime?` — Timestamp des Reminder-Versands (von Manager ausgelöst, nicht automatisch).

**Lücke im aktuellen Task 03:** `confirmationEmailSentAt` und `confirmationReminderSentAt` fehlen. Vorschlag: in ADR-0029-A ergänzen. **Caveat:** Es ist **kein** Auto-Event. Cockpit zeigt nur einen "Bestätigung überfällig" Indikator, wenn `confirmationEmailSentAt` + `confirmationExpectedWithinMinutes` < `now()` und kein `confirmationReminderSentAt`. Manager entscheidet.

## Out-of-Scope

- Schema-Implementierung (in ADR-0029-A)
- Migrationen
- Read-Endpoints
- Cockpit-Views (eigener Folge-Task)
- LLM-Event-Draft-Generator (ADR-0021 §3 verbietet)
- Live-Wetter-API
- Connector zu FoodNotify/Gastronovi
- PDF-Ingest der Bankettmappe (Open Question, Architektur-Beschluss fehlt)

## Open Questions (Zusammenfassung für ADR-0029-A)

1. `spange_ground_floor` Seed-Erweiterung — Folge-Task?
2. `parentContext` freier String oder FK auf `LocationContext`?
3. Slot-Override-Listen für o.T.-Bar-Wochentag-Konflikt?
4. `exclusiveRentalFrom` in `GroupRule` oder neuer `CapacityPolicy`-Substrat?
5. Wetter-Sensitivität client-side oder externes API?
6. `dayparts` als String[] auf `OperationalUnit` oder eigener Substrat?

## Bindings

- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime`)
- ADR-0021 (Phase A Hard-Guardrails)
- ADR-0022, ADR-0023 (Automation-Surface)
- ADR-0030 (Profile-Discriminator)
- ADR-0034 (Substrate: OperationalUnit, ServiceSlot, GroupRule) — *Stand 2026-06-09: bleibt ADR-0034, siehe `docs/tasks/logik/README.md` §"Task-Verzeichnis"*
- ADR-0035 (Substrate: Menu, MenuItem) — *Stand 2026-06-09 renumbered: war ADR-0034-B*
- ADR-0048 (Substrate: EventPackage, BeveragePackage, EventInquiry) — *Stand 2026-06-09 renumbered: war ADR-0035*
- ADR-0053 (Cockpit-Service-Slot-Dashboard, Event-Inquiry-Drawer) — *Stand 2026-06-09 renumbered: war ADR-0037*
- Task 00 (`00-cube-venue-spec-gap.md`)
- Task 01 (`01-cube-sub-units-data-model.md`)
- Task 02 (`02-cube-menu-matrix.md`)
- Task 03 (`03-cube-event-intake-read-apis.md`)
- Task 08 (`08-cockpit-cube-service-slot-dashboard.md`)

## Gate (Definition of Done)

- Diese Datei existiert mit `Status: OPEN`.
- Owner-Acceptance von ADR-0036-A (Sub-Section von ADR-0036).
- Alle 8 Entscheidungs-Sections sind dokumentiert mit Annotationen, Open Questions, Invarianten.
- Brutto/Netto-Invariante ist als DB-Check-Constraint-Spec formuliert.
- Kein Code, kein Schema, keine Migration geschrieben.

## Next gate

ADR-0029-A Implementation-Slice (`01b-cube-venue-model-impl.md`) mit:

- Migration `prisma/migrations/<ts>_extend_cube_venue_model/migration.sql` (alle 8 Feld-Erweiterungen)
- Erweiterung der 3 Read-Endpoints aus Tasks 01/02/03 um die neuen Felder
- 11 neue Vitest-Cases (1 pro Annotation, plus Invariant-Tests)
- 14-Query Supabase-Promotion-Script analog ADR-0028
