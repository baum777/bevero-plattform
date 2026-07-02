# Task: CUBE Premium Sub-Unit & Slot Data Model (Sub-Phase 3.1)

**Working title:** `cube-sub-units-data-model`

**Status:** `OPEN` → substrate landed; task spec is evidence-only handoff (see `## Authority Map`).
**Owner-ADR (substrate):** ADR-0034 — *implementation now bound to ADR-0029-A (accepted 2026-06-09). Substrate code on disk in `prisma/schema.prisma` L1047–1117 + migrations `20260609040000_add_operational_units` + `20260609040100_add_operational_units_rls`; 14/14 verify-checks green per `scripts/verify-adr-0029a-operational-units.ts`.*
**Renumbering-Hinweis:** ADR-0034 ist seit 2026-06-09 der **Implementation-ADR für Task 01** (Substrat-Slice). Frühere Verweise im Body (z.B. „ADR-0044 erbt sie") beziehen sich auf die **Renumbering-Vor-Renumbering-Diskussion**; nach aktueller Konvention entstehen `OperationalUnit`/`ServiceSlot`/`GroupRule` direkt in ADR-0034 (dieser Slice), brand-übergreifend. Folge-Slices (Tasks 05, 11) erben sie.
**Depends on:** ADR-0030 (accepted), ADR-0031 (accepted, code landed in WS-005), ADR-0032 (Mother-Concern Read APIs), ADR-0033 (Cockpit Standort-Kontext)
**Source spec:** `docs/architecture/cube-premium-compatibility.md`, CUBE-Website Analyse, User-Pitch "CUBE als Premium-Org-Einheit", `00a-cube-venue-model-spec.md` (binding §1 Venue-Graph, §2 Service-Slot-Matrix, §3 Reservierungs-Decision-Engine)
**Target repo state:** ACHIEVED. `prisma/schema.prisma` L1047–1117 enthält `OperationalUnit` / `ServiceSlot` / `GroupRule` als **brand-übergreifende** Substrate (nicht CUBE-spezifisch). 00a-Annotationen (`parentContext`, `requiresManualConfirmation`, `weatherSensitive`, `outdoorCapacityRelevant`, `inventoryScopes`, `dayparts`, `kitchenTimeLocal`, `inventoryImpact`, `exclusiveRentalFrom`, `seatedMenuMax`, `standingReceptionMax`) sind in der Substrat-Shape enthalten (siehe ADR-0029-A §Decision, `docs/DECISIONS.md` L1720–1744).

## Reconciliation 2026-06-09

Delta zwischen dieser Spec und dem geflogenen Zustand:

- **Substrate landed:** `OperationalUnit` (L1047), `ServiceSlot` (L1077), `GroupRule` (L1101) sind in `prisma/schema.prisma` mit allen 00a-Annotationen. Migrationen `20260609040000_add_operational_units` + `20260609040100_add_operational_units_rls` sind auf Disk; RLS-Plan (1 SELECT-Policy/Tabelle, `authenticated` SELECT, kein `app_runtime`-Grant, keine Write-Policies) ist gelandet.
- **OQ 1 (Architektur) — RESOLVED 2026-06-09 by 00a §3:** `exclusiveRentalFrom`, `standingReceptionMax`, `seatedMenuMax` sind in `GroupRule` belassen (nicht in eigenem `CapacityPolicy`-Substrat ausgelagert). Begründung: 00a §3 OQ 4 Empfehlung; Decision-Engine läuft deterministisch auf einem Substrat-Typ. Phase-3.4-Folge möglich.
- **OQ 2 (Timezone) — UNRESOLVED, weiter Phase-3.4:** `ServiceSlot` bleibt `startTimeLocal`/`endTimeLocal` als lokale Strings. Cockpit-Display macht `Location.timezone`-Lookup. Kein DB-Feld für TZ.
- **OQ 3 (GroupRule-Validierung) — RESOLVED 2026-06-09 by ADR-0029-A:** App-Layer + DB-Check (doppelt). `bankettInquiryFrom` ist NOT-NULL (verifiziert in `prisma/schema.prisma` L1108).
- **OQ 4 (Wetter-Felder) — RESOLVED 2026-06-09 by 00a §1/§6:** `weatherSensitive`, `outdoorCapacityRelevant` sind auf `OperationalUnit` (L1057, L1058). `weatherActive` ist client-side Cockpit-Logik pro Tag (kein DB-Feld; ADR-0021 §3 verbietet externes Wetter-API).
- **Authority-Map hinzugefügt** (siehe unten). Owner-ADR (ADR-0034) und Implementation-ADR (ADR-0029-A) sind explizit getrennt; ADR-0036-A ist die bindende Spec.
- **Reihenfolge korrigiert:** `File scope` zeigt jetzt ✅ für gelandete Dateien, ⏳ für Folge-Phase. Implementation ist ADR-0029-A, ADR-0034 ist die substrate-Definition, ADR-0036-A ist die bindende Annotation.

## Decision

CUBE Premium braucht drei Substrate, die **allen** Brand-Standorten zugänglich sind:

- **`OperationalUnit`** — Geschäftswelt (Restaurant, Bar, Event, Café, Outdoor-Terrasse, Hotel-Kontext). 1:n auf `Location`. **Entkoppelt** von `Area` (Lagerwelt). NIEMALS Hardcoding auf `name === "CUBE"`, immer auf `LocationProfile` + `OperationalUnitType`.
- **`ServiceSlot`** — operative Zeitfenster (Lunch, Kaffee & Kuchen, Dinner, After-Work, Tardeo, BBQ-Night, Brunch-So). 1:n auf `OperationalUnit`. `daysOfWeekMask Int` (Bitmask Mo..So), `startTimeLocal`/`endTimeLocal` als `String` (HH:mm, lokal).
- **`GroupRule`** — Reservierungs-/Menüpflicht-Logik pro Unit (1–7 à la carte, 8–19 Menüpflicht, 20+ Bankett). 1:1 auf `OperationalUnit`. Deterministisch, kein LLM.

**Open Question 1 (Architektur):** [RESOLVED 2026-06-09] Diese Substrate entstehen in **ADR-0034 (Task 01)** als brand-übergreifend, **nicht** im Meta-Layer-ADR (ADR-0056, Task 11). Begründung: Topologische Sortierung erfordert, dass die Substrate **vor** dem Motorworld-Slice (Task 05 → ADR-0050) da sind; der Meta-Layer (Task 10 → ADR-0055) ist Vertrag, der die bereits existenten Substrate dokumentiert.

## File scope

Status-Spalte: ✅ = landed (verifiziert per `git log`/Migrations/Schema-Suche), ⏳ = ausstehend (Phase-3.4-Folge).

| Path | Aktion | Inhalt | Status |
|---|---|---|---|
| `prisma/schema.prisma` | edit | 3 neue Modelle (L1047–1117) + 1 Enum `OperationalUnitType` (L1025–1045); 00a-Annotationen enthalten | ✅ |
| `prisma/migrations/20260609040000_add_operational_units/migration.sql` | new | forward-only DDL | ✅ |
| `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql` | new | RLS: ENABLE, 1 SELECT-Policy/Tabelle, authenticated SELECT, kein app_runtime-Grant, keine Write-Policies | ✅ |
| `prisma/seeds/operational_units.sql` | new | DEMO_MODE-gated, id-guarded (`WHERE NOT EXISTS`); 3 CUBE-Units + 5 ServiceSlots + 1 GroupRule (8/9/20/60/80/120) | ✅ |
| `src/modules/operational-unit/operational-unit.types.ts` | new | DTOs | ✅ |
| `src/modules/operational-unit/operational-unit.service.ts` | new | `listByLocation`, `getById`, `listSlots`, `getGroupRule` | ✅ |
| `src/routes/operational-unit.route.ts` | new | 4 Read-Endpoints | ✅ |
| `src/app.ts` | edit | Route-Registrierung + `buildOperationalUnitDependencies` | ✅ |
| `tests/operational-unit.routes.test.ts` | new | 11 vitest cases | ✅ |
| `scripts/verify-adr-0029a-operational-units.ts` | new | 14-Query Supabase-Promotion-Script; revidiert von `verify-adr-0034-...` zu `verify-adr-0029a-...` (Implementation-ADR-Konvention) | ✅ |

## Open Questions

1. Soll `OperationalUnit` in ADR-0034 (CUBE-spezifisch) oder ADR-0056 (brand-übergreifend, ehemals ADR-0044) entstehen? — **RESOLVED 2026-06-09: ADR-0034**, brand-übergreifend. ADR-0056 dokumentiert nur die bereits existenten Substrate als Vertrag. **Verifiziert:** `OperationalUnit` ist in `prisma/schema.prisma` L1047, ohne `location.name`-Hardcoding, mit `unitType` als Discriminator (ADR-0030 §Decisions §1).
2. Soll `ServiceSlot` Timezone-aware sein (IANA-TZ pro `Location`) oder nur lokale Strings? — **Empfehlung: lokal + `Location.timezone`-Lookup im Read-Path**, weil Cockpit-Display lokale Zeit will. **Status 2026-06-09:** Schema-Layer unverändert (kein TZ-Feld). **Bleibt Phase-3.4-Folge.**
3. Soll `GroupRule.alaCarteMaxGuests` etc. als `Int` mit `CHECK constraint` in SQL oder als App-Layer-Validierung laufen? — **RESOLVED 2026-06-09 (ADR-0029-A):** App-Layer (`operational-unit.service.ts`) + DB-`NOT NULL` (verifiziert L1106–1108). Härtung als CHECK-Constraint ist Phase-3.4-Folge.
4. Soll `OperationalUnit.weatherSensitive` / `outdoorCapacityRelevant` als Felder modelliert werden? — **RESOLVED 2026-06-09:** beide Felder in `prisma/schema.prisma` L1057, L1058. `weatherActive` ist client-side Cockpit-Logik pro Tag (00a §6, ADR-0021 §3 verbietet externes Wetter-API).

## Authority Map (Reconciliation 2026-06-09)

Diese Spec hat **drei** Autoritäts-Layer. Verwechslung führt zu Drifts (siehe Recon-Delta):

| Layer | ADR/Spec | Status | Zweck |
|---|---|---|---|
| Substrate-Definition (Owner-ADR) | ADR-0034 | proposed | Definiert die drei Substrate brand-übergreifend, ohne Code-Pflicht |
| Implementation-ADR (Verify-Gate) | ADR-0029-A | accepted (2026-06-09) | Führt die Substrat-Erweiterung in 00a-Shape aus; Migrations + RLS + Service + Route + Tests + 14-Query-Verify |
| Binding Spec | `00a-cube-venue-model-spec.md` | accepted (ADR-0036-A Owner-Acceptance 2026-06-09) | Annotation-Layer; §1 Venue-Graph, §2 Slot-Matrix, §3 Decision-Engine, §4 Offer-Catalog (priceMode), §6 o.T. Bar-Dayparts |

**Read-Only-Posture (nicht-verhandelbar):** Verifiziert in `scripts/verify-adr-0029a-operational-units.ts` L183–195 (keine Write-Policies), L224–236 (kein `app_runtime`-Grant). Diese Posture gilt für alle Folge-Slices (02/03) als verbindliche Vorlage.

**00a §1 OQ-2 aufgelöst:** `parentContext: String?` ist freier String, kein FK auf `LocationContext`-Master (`prisma/schema.prisma` L1055). Begründung verbatim aus 00a §1 OQ-2: "Anzahl Kontexte ist klein und stabil; Lookup-Tabelle wäre Overhead."

**00a §3 OQ-4 aufgelöst:** `exclusiveRentalFrom`, `seatedMenuMax`, `standingReceptionMax` sind in `GroupRule` (L1109–1111). CapacityPolicy-Extraktion ist Phase-3.4-Folge.

## Bindings

- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime` — aber read-only slice, kein Grant)
- ADR-0021 §3 (no writeback, no LLM-driven approval, no service-role in user-facing path)
- ADR-0030 §Decisions §1 (profile is discriminator, kein name hardcoding)
- ADR-0031 §Open Questions §1 (Membership shape — `LocationMember` aus ADR-0031 wird genutzt)
- ADR-0029-A (Implementation-ADR; read-only slice, 00a-Shape)
- ADR-0036-A (binding spec 00a; annotation-layer)
- VISION §7 Phase 3

## Gate (Definition of Done)

- `npx prisma validate` grün
- `npm run typecheck` grün
- `npx vitest run` — 11 neue Cases grün, 507 total
- `scripts/verify-adr-0029a-operational-units.ts` 14/14 Queries grün gegen named Supabase dev project (verifiziert; Owner hat Promote ausgeführt)
- Owner-Acceptance von ADR-0029-A (2026-06-09, Cheikh) — ADR-0034 bleibt als Substrate-Definition referenziert

## Next gate

**Architect agent drafts ADR-0029-A2 block in `docs/DECISIONS.md` style** (numbered §Decisions, §Open Questions, §Bindings, §Gate; precedent: ADR-0029-A §Decision, `docs/DECISIONS.md` L1720–1787). ADR-0029-A2 bindet Tasks 02/03 als Folge-Slice von ADR-0029-A; siehe `## Authority Map` der Tasks 02 und 03 für die pre-deklarierten Slot-Inhalte. Bis dahin sind Tasks 02/03 **stale-by-design** und nicht implementierbar.
