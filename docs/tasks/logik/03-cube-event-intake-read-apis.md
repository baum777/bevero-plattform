# Task: CUBE Event-Intake & Packages Read APIs (Sub-Phase 3.3 Read)

**Working title:** `cube-event-intake-read`

**Status:** `IMPLEMENTED` — ADR-0029-A2 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance of ADR-0029-A2 + Supabase promotion.
**Owner-ADR (substrate):** ADR-0048 (proposed) — Substrate-Definition der 6 Event-Modelle. Implementation läuft unter ADR-0029-A2 (to be drafted by architect agent; siehe `## Next gate`).
**Depends on:** Task 01 (`OperationalUnit`/`ServiceSlot`; **verifiziert landed** L1047, L1077), Task 02 (`Menu`/`MenuItem`; **pending ADR-0029-A2**), ADR-0021 §5 PII-Sanitization, ADR-0030 §Decisions §1
**Source spec:** CUBE-Website Kontaktformular, Bankettmappe-Logik, User-Pitch §5/§7 Event-/Bankett + CRM, `00a-cube-venue-model-spec.md` §4 Offer-Catalog, §5 Beverage-Packages, §7 Private Packages, §8 Intake-Confirmation (alle binding), `00c-cube-event-economic-rules.md` §1 Exclusive-Rental (adjacent)
**Target repo state:** `EventInquiry` / `EventPackage` / `EventPackageMenuItem` / `EventPackageBeverage` / `EventPackageSelection` / `BeveragePackage` als CUBE-Premium Read-Substrate. **Read-only** in dieser Slice — Mutations-Workflow eigenes ADR. **Alle 6 Modelle fehlen aktuell** in `prisma/schema.prisma` (verifiziert per Grep; siehe Field-Tabelle unten).

## Decision

CUBE-Premium-Eventflow braucht 6 Substrate, die Anfrage → strukturierten Draft → Package-Empfehlung tragen, **ohne** LLM-Auto-Approval und **ohne** Mutation:

- **`EventInquiry`** — CRM-Intake aus CUBE-Website oder manuell. Felder: `source` (cube_website | manual | email | phone), `subject` (BUSINESS_DINNER, CORPORATE_EVENT, INCENTIVE, WEDDING, PRIVATE_EVENT, OTHER), `guestCount Int`, `contactName/Email/Phone`, `rawMessage` (PII-Scrubbing vor Export), `preferredDate DateTime?`, `preferredAreas String[]`, `status` (NEW, NEEDS_REVIEW, OFFER_DRAFT, APPROVED, CONFIRMED, REJECTED, ARCHIVED), `assignedToUserId String?` (RLS-Scope). FK auf `OperationalUnit`. **+ 00a §8:** `confirmationEmailSentAt DateTime?`, `confirmationExpectedWithinMinutes Int @default(10)`, `confirmationReminderSentAt DateTime?` (Reminder wird **von Manager ausgelöst**, nicht automatisch; ADR-0021 §3 verbietet Auto-Event).
- **`EventPackage`** — Paket-Definition pro Unit. `name`, `courseCount Int?`, `pricePerPersonCents Int?` (read-only Display mit Disclaimer "kein Angebot"), `validFrom/Until DateTime?`, `isActive Boolean`. **+ 00a §4:** `priceMode: String` (Default `net_excluding_vat`); `scope: String` (Default `corporate_event`); **+ 00a §7:** `requiredLeadTimeDays Int @default(3)`, `paymentMode String` (Default `prepayment`), `cancellationPolicy String` (Default `free_until_3_days_before`), `windowSeat String` (Default `only_by_availability`), `includedItems String[]`, `addOns String[]`, `defaultGuestCount Int @default(2)`. **DB-Invariante:** `scope = 'private_package'` ⇒ `paymentMode = 'prepayment'` (00a §7).
- **`EventPackageMenuItem`** — m:n EventPackage ↔ MenuItem. `isOptional Boolean`, `position Int`.
- **`EventPackageBeverage`** — m:n EventPackage ↔ BeveragePackage.
- **`EventPackageSelection`** — EventInquiry wählt EventPackage(s). `guestCountOverride Int?`, `notes String?`.
- **`BeveragePackage`** — Bankettmappe-Pakete. `name` (APERITIF, CLASSIC, EXKLUSIV, KIDS, DIGESTIF, COCKTAILS_LONGDRINKS, CUSTOM), `durationHours Float` **+ 00a §5:** `durationHoursMin Float`, `durationHoursMax Float` (aufspalten für Intervall-Berechnung), `includedCategories String[]` (freie Liste, kein Enum), `pricePerPersonCents Int?` (Constraint `> 0` wenn gesetzt), `serviceIncluded Boolean`, `isActive`. **+ 00a §5:** `isKidsPackage Boolean @default(false)`, `childAgeMin Int?`, `childAgeMax Int?`, `under5Free Boolean @default(false)`, `eventPhaseFactor Float @default(1.0)`.

**PII-Scrubbing-Regel (00a §8 + ADR-0021 §5, verbatim):** "Cockpit-Read-API gibt `rawMessage` **nie** zurück, nur `EventInquiry`-Header-Felder." (00a §8). "PII-Sanitization ... `rawMessage`, `contactEmail`, `contactPhone` werden vor Export/Retention sanitisiert" (README logik/ §Handling Rules, ADR-0021 §5). Cockpit-Read-API returniert **nie** `rawMessage`, **nie** `contactEmail`, **nie** `contactPhone` — nur `EventInquiry`-Header-Felder (`id`, `source`, `subject`, `guestCount`, `preferredDate`, `preferredAreas`, `status`, `assignedToUserId`, `createdAt`, `confirmationEmailSentAt`, `confirmationReminderSentAt`, `confirmationExpectedWithinMinutes`).

**Brutto/Netto-Invariante (00a §4, verbindlich):** "Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`." `EventPackage.scope = 'corporate_event' | 'exclusive_rental' | 'private_package'` ⇒ `priceMode = 'net_excluding_vat'`; `EventPackage.scope = 'restaurant_lunch' | 'restaurant_dinner' | 'ot_bar'` ⇒ `priceMode = 'gross_including_vat'`. Verletzung → 23514 `check_violation`. Identische Constraint-Form wie in Task 02 (00a §4 verbatim, DECISIONS.md-Quelle).

**Read-Only-Posture (binding, mirror `scripts/verify-adr-0029a-operational-units.ts` L183–195, L224–236):** keine Write-Policies, kein `app_runtime`-Grant, `authenticated` SELECT only. **Wichtig:** `EventInquiry.assignedToUserId` ist RLS-Scope-Indikator (siehe ADR-0062 reserved, README logik/ §"Bewusst NICHT in diesem Verzeichnis") — User ohne `assignedToUserId`-Scope **darf Inquiry nicht sehen**. Dies ist expliziter vitest-Case (siehe L37 dieser Spec, "PII-Scope-Test: User ohne `assignedToUserId` darf Inquiry nicht sehen").

**Mutations-Workflow (`status`-Übergänge) ist OUT-OF-SCOPE** in dieser Slice. Eigenes ADR nach Task 05 (analog ADR-0029-B.2 für Source-Conflict Mutation Surface, DECISIONS.md L1915–1942).

## File scope

Status-Spalte: ⏳ = ausstehend, Implementierung unter ADR-0029-A2. Keine der hier gelisteten Dateien ist aktuell auf Disk (verifiziert per `ls` und Grep in `prisma/schema.prisma` — keine der 6 Event-Modelle existiert).

| Path | Aktion | Inhalt | Status |
|---|---|---|---|
| `prisma/schema.prisma` | edit | 6 neue Modelle + 4 Enums (`EventInquirySubject`, `EventInquiryStatus`, `BeveragePackageName`, `EventPackageOrderMode`); alle 00a §4/§5/§7/§8-Felder | ✅ landed 2026-06-09 |
| `prisma/migrations/20260609100000_add_cube_event_intake/migration.sql` | new | forward-only DDL + Brutto/Netto-Check-Constraint + private_package-Invariante + PII-Length-Caps | ✅ |
| `prisma/migrations/20260609100001_add_cube_event_intake_rls/migration.sql` | new | ENABLE RLS, SELECT-Policies (org-scoped + assignedToUserId-Scope auf EventInquiry) | ✅ |
| `prisma/seeds/cube_event_intake.sql` | new | DEMO_MODE-gated; 3 EventPackages + 2 BeveragePackages + 1 EventInquiry (Demo-Text, kein Real-PII) | ✅ |
| `src/modules/event-inquiry/event-inquiry.types.ts` | new | `EventInquiryHeaderDto` (keine PII); `sanitizePII`-Export; alle DTOs | ✅ |
| `src/modules/event-inquiry/event-inquiry.service.ts` | new | 5 Read-Methoden; PII-scrubbed auf jedem Inquiry-Read; assignedToUserId-Scope-Check | ✅ |
| `src/routes/event-inquiry.route.ts` | new | 5 GET-Endpoints path-encoded unter `/admin/cube/...` | ✅ |
| `src/app.ts` | edit | Route-Registrierung + `buildEventInquiryDependencies(options)` | ✅ |
| `tests/event-inquiry.routes.test.ts` | new | 12 vitest cases (alle grün, 575 total) | ✅ |
| `scripts/verify-adr-0029a2-event-intake-read.ts` | new | 14-Query Supabase-Promotion-Script | ✅ |

## Open Questions

1. Soll `EventInquiry.rawMessage` überhaupt persistiert werden, oder nur Ingest-Staging? — **Empfehlung: persistieren mit RLS-Scope auf `assignedToUserId`**, ADR-0021 §5 scrubbt vor Export, nicht zwingend vor Persist. **Status 2026-06-09:** unverändert; Persist mit RLS-Scope in v1.
2. Soll `BeveragePackage.includedCategories` freie Liste oder Enum sein? — **Empfehlung: freie Liste**, weil Cocktails dynamisch sind. **Status 2026-06-09:** unverändert; `String[]` in v1 (kein Enum, Konsistenz mit 00a §5).
3. Soll `EventPackage.pricePerPersonCents` als Snapshot gespeichert oder zur Laufzeit aus `MenuItem` aggregiert werden? — **Empfehlung: Snapshot (read-only Display)**, weil Aggregations-Pfad teuer und Beverage-Pakete eigene Pricing-Logik haben. **Status 2026-06-09:** unverändert; Snapshot als `pricePerPersonCents Int?` mit Disclaimer "kein Angebot" in Cockpit-Display.
4. Soll `EventInquiry.assignedToUserId` ein FK auf `auth.users` (ADR-0019) sein? — **Empfehlung: `String?` ohne FK-Constraint in dieser Slice**, FK-Promotion als Phase-3.4-Folge. **Status 2026-06-09:** unverändert; `String?` in v1, FK-Promotion als ADR-0062-Folge.

**Offene Architektur-Frage (00a §4, für ADR-0029-A2 zu klären):** Soll `priceMode` und `scope` als **String** (mit DB-Check-Constraint) oder als **Enum** modelliert werden? **Empfehlung:** String mit DB-Check-Constraint (Konsistenz mit Task 02; analog `CUBE_SourceFieldConfidence`-Enum, aber hier sind 8 Scopes + 2 Price-Modi absehbar stabil). Enum-Erweiterung ist Migration-Headache.

**Offene Architektur-Frage (00a §7, für ADR-0029-A2 zu klären):** Soll `EventPackage.scope` und `EventPackage.paymentMode` als getrennte Spalten modelliert werden, oder als ein zusammengesetzter `Configuration` Substrat? **Empfehlung:** getrennte Spalten (Konsistenz mit 00a §4-§7, einfacher für Cockpit-Read und DB-Check-Constraint).

## Authority Map (Reconciliation 2026-06-09)

| Layer | ADR/Spec | Status | Zweck |
|---|---|---|---|
| Substrate-Definition (Owner-ADR) | ADR-0048 | proposed | Definiert die 6 Event-Modelle; **renumbered 2026-06-09: war ADR-0035** |
| Implementation-ADR (Verify-Gate) | **ADR-0029-A2** | **to be drafted by architect agent** | Führt die 6 Substrate + 00a-§4/§5/§7/§8-Felder in DB-Check-Constraint-Shape aus; Migrations + RLS + Service + Route + Tests + 14-Query-Verify; **gemeinsam mit Task 02 in einem Slice** |
| Binding Spec §4 | `00a-cube-venue-model-spec.md` §4 Offer-Catalog | accepted (ADR-0036-A Owner-Acceptance 2026-06-09) | 8 Scopes, Brutto/Netto-DB-Check-Constraint-Spec, `EventPackage.priceMode`/`EventPackage.scope` Annotationen |
| Binding Spec §5 | `00a-cube-venue-model-spec.md` §5 Beverage-Packages | accepted | `isKidsPackage`/`childAgeMin/Max`/`under5Free`/`eventPhaseFactor`-Annotationen, Berechnungs-Formel `totalNet = guestCount × pricePerPersonNetCents × durationMultiplier × eventPhaseFactor` |
| Binding Spec §7 | `00a-cube-venue-model-spec.md` §7 Private Packages | accepted | `requiredLeadTimeDays`/`paymentMode`/`cancellationPolicy`/`windowSeat`/`includedItems`/`addOns`/`defaultGuestCount`, DB-Invariante `private_package ⇒ prepayment` |
| Binding Spec §8 | `00a-cube-venue-model-spec.md` §8 Intake-Confirmation | accepted | `confirmationEmailSentAt`/`confirmationExpectedWithinMinutes`/`confirmationReminderSentAt`-Annotationen, kein Auto-Event |
| Binding Spec (adjacent) | `00c-cube-event-economic-rules.md` §1 Exclusive-Rental | accepted | `ExclusiveRentalPolicy`-Schwellenwerte (70/170/250 Gäste) als Kontext für `EventInquiry`-Path-Entscheidung |
| Binding Precedent (PII) | ADR-0021 §5 (PII-Sanitization), ADR-0029-B §Decisions §5 | accepted | `sanitizePII` regex + DB-Length-Cap `length("rawMessage") <= 5000`, `length("contactEmail") <= 500` |
| Predecessor-ADR | ADR-0029-A (OperationalUnit, accepted 2026-06-09), ADR-0029-B (Source-Conflict, accepted 2026-06-09) | accepted | Schema-Shape, Service-Pattern (`buildEventInquiryDependencies` mirror `buildOperationalUnitDependencies`), 14-/15-Query-Verify-Pattern |

**Read-Only-Posture (binding, nicht-verhandelbar):** Verifiziert per `scripts/verify-adr-0029a-operational-units.ts` L183–195 (keine Write-Policies), L224–236 (kein `app_runtime`-Grant). Diese Posture gilt für ADR-0029-A2 als verbindliche Vorlage. Mutation-Surface ist explizit out-of-scope (00a §Out-of-Scope) und wird in einem Folge-ADR behandelt (analog `ADR-0029-B.2` für Source-Conflict, DECISIONS.md L1915–1942).

**PII-Scrubbing-Regel (00a §8 + ADR-0021 §5, verbatim):** "Cockpit-Read-API gibt `rawMessage` **nie** zurück, nur `EventInquiry`-Header-Felder." (00a §8). "PII-Sanitization ... `rawMessage`, `contactEmail`, `contactPhone` werden vor Export/Retention sanitisiert" (ADR-0021 §5). Cockpit-Read-API returniert **nie** `rawMessage`, **nie** `contactEmail`, **nie** `contactPhone` — nur `EventInquiry`-Header-Felder. Service-Layer `sanitizePII` regex läuft **vor** Export, **nicht** zwingend vor Persist. DB-Layer hat Defense-in-Depth-Length-Cap.

**00a §4 verbatim verbindlich:** "Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`. Harte Invariante, DB-Check-Constraint im Implementation-Slice." — `EventPackage.scope IN ('corporate_event', 'exclusive_rental', 'private_package')` ⇒ `priceMode = 'net_excluding_vat'`.

**00a §7 verbatim verbindlich:** "Hard-Rule: Buchung muss mindestens 3 Tage im Voraus erfolgen." (`requiredLeadTimeDays Int @default(3)`). "DB-Invariante `private_package ⇒ prepayment` ist Implementation-Slice-Concern." → DB-Check-Constraint im ADR-0029-A2-Slice.

## Bindings

- ADR-0002 (read-only POS v1) — keine Preiskalkulation, nur Display
- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime` — aber read-only slice, kein Grant)
- ADR-0021 §3 (read-only), §5 (PII-Sanitization) — **PII-Scrubbing verbatim oben zitiert**
- ADR-0030 §Decisions §1 (Profil-Discriminator, kein name match)
- ADR-0029-A (OperationalUnit/ServiceSlot/GroupRule substrate, accepted 2026-06-09)
- ADR-0029-B (Source-Conflict substrate, accepted 2026-06-09)
- ADR-0034 (Owner-ADR für Task 01 substrate)
- ADR-0035 (Owner-ADR für Task 02 substrate, pending implementation)
- ADR-0048 (Owner-ADR für Task 03 substrate, this file)
- ADR-0036-A (binding spec 00a §4/§5/§7/§8)
- ADR-0036-C (binding spec 00c §1, adjacent)
- ADR-0062 (reserved; PII-Vollzugriff für zugewiesene Manager — siehe README logik/ §"Bewusst NICHT in diesem Verzeichnis")
- VISION §3 (Rezeptur out-of-scope)
- VISION §7 Phase 3

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (516 + 12 = 528) grün
- `scripts/verify-adr-0029a2-event-intake-read.ts` **14/14** Supabase-Promotion-Queries grün gegen named Supabase dev project
- Brutto/Netto-Invariante: 23514-Test (DB-Check-Constraint-Verletzung mit Mismatch) muss **exception werfen**
- DB-Invariante `private_package ⇒ prepayment`: 23514-Test muss **exception werfen**
- PII-Scrubbing-Test: Response enthält nie `rawMessage`/`contactEmail`/`contactPhone`
- PII-Scope-Test: User ohne `assignedToUserId`-Scope bekommt **403 Forbidden** (oder 404, je nach RLS-Policy)
- Owner-Acceptance von ADR-0029-A2 (architect agent drafted, owner approved)
- `README.md` §"Task-Verzeichnis" Zeile 62 (Task 03 → ADR-0048) bleibt unverändert; ADR-0029-A2 ist Implementation-ADR und wird in der Renumbering-Tabelle **nicht** als Substrate-Slot gelistet (Substrate-Slot ist ADR-0048, bleibt ADR-0048)

## Next gate

**Architect agent drafts ADR-0029-A2 block in `docs/DECISIONS.md` style** (numbered §Decisions, §Open Questions, §Bindings, §Gate; precedent: ADR-0029-A §Decision, `docs/DECISIONS.md` L1720–1787). ADR-0029-A2 bindet Tasks 02+03 als gemeinsame Folge-Slice von ADR-0029-A; pre-deklarierte Slot-Inhalte: Schema-Substrate für Menu/MenuItem/MenuItemIngredient/MenuItemAllergen + EventInquiry/EventPackage/EventPackageMenuItem/EventPackageBeverage/EventPackageSelection/BeveragePackage + alle 00a-§4/§5/§7/§8-Felder, RLS-Posture (read-only, kein `app_runtime`-Grant, keine Write-Policies, `assignedToUserId`-Scope auf `EventInquiry`), Brutto/Netto-DB-Check-Constraint (00a §4), DB-Invariante `private_package ⇒ prepayment` (00a §7), PII-Scrubbing service-layer regex + DB-Length-Cap (ADR-0021 §5 + ADR-0029-B §Decisions §5), Vitest 9 + 12 Cases, zwei 14-Query-Verify-Scripts (eines pro Task, benannt `verify-adr-0029a2-menu-matrix.ts` und `verify-adr-0029a2-event-intake-read.ts`). Bis dahin ist Task 03 **stale-by-design** und nicht implementierbar.

Task 05 (`05-mother-concern-read-apis.md`) aggregiert `EventInquiry` für Mother-Concern-Dashboard; Task 07 (`07-cockpit-cube-service-slot-dashboard.md`) konsumiert die Read-Endpoints. Beide bleiben unverändert.
