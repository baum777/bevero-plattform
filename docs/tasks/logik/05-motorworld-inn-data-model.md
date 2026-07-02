# Task: Motorworld-Inn Data Model — Locations, EventSpaces, ExceptionRules, Connectors

**Working title:** `motorworld-inn-data-model`

**Status:** `IMPLEMENTED` — ADR-0050 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance + Supabase promotion.
**Owner-ADR:** ADR-0050 (proposed) — *(renumbered 2026-06-09: war ADR-0039, jetzt ADR-0050)*
**Depends on:** Task 01 (`OperationalUnit`/`ServiceSlot`), Task 04 (Phase A Contract)
**Source spec:** Motorworld-Inn Deepdive, Bankettmappe Warthausen, Reservation-Connector-Logik
**Target repo state:** `prisma/schema.prisma` erweitert um `EventSpace` / `ExceptionRule` / `ReservationConnector` / `ExternalSystemLink` + 4 Enums; `Location.signatureAssets/weatherSensitive/cinemaAvailable` ergänzt; Seed um 4 Motorworld-Standorte erweitert; 11 vitest cases.

## Decision

Der Phase-A-Contract aus Task 04 wird in Schema operationalisiert. **Neu:**

- **`EventSpace`** — Räume innerhalb einer Location (Rennstall, Museum, Sieben Schwaben, Movie Cars Cinema, Innen-/Außenbereich Mallorca, CUBE Restaurant Top Floor, o.T. Bar Lounge, Spange). Felder: `name`, `slug` (unique per location), `capacitySeated/Standing/Indoor/Outdoor Int?`, `hasOwnBar/Restrooms Boolean`, `supports EventSpaceSupport[]` (PRIVATE_EVENT, COMPANY_EVENT, WEDDING, CONFERENCE, PRODUCT_PRESENTATION, CINEMA, DINNER_THEATER, WORKSHOP, SEMINAR, PRESENTATION_PITCH, TRAINING, EVENT_ADDON), `metadata Json?`, `isActive`.
- **`ExceptionRule`** — zeitlich begrenzte Override-Regeln pro Location. Felder: `type` (EXCLUSIVE_EVENT_CLOSURE, BRUNCH_BLOCKS_REGULAR_SERVICE, OECHSLE_BUFFET_OVERRIDE, WEATHER_OUTDOOR_CHANGE, HOLIDAY_SCHEDULE, HOTEL_OPERATIONAL_HOLIDAY, BRUNCH_SUNDAY_LATE_START, EVENT_CLOSURE_PRIVATE), `title`, `description`, `affectedUnitIds String[]` (OperationalUnit IDs), `startsAt/endsAt DateTime?`, `source` (website | calendar | manual | external_schedule | oechsle_schedule), `requiresConfirmation Boolean`, `confirmedByUserId String?`, `confirmedAt DateTime?`, `isActive`, `metadata Json?`. **Editierbar** (kein Trigger, Standard-`updatedAt` für Audit).
- **`ReservationConnector`** — read-only Link-Register, kein Connector-Build. Felder: `provider` (GASTRONAUT, GASTRONOVI, PHONE, WALK_IN, EVENT_INQUIRY, EVIIVO, OTHER), `externalUrl String?`, `externalRef String?`, `isActive`, `metadata Json?` (kein API-Key!).
- **`ExternalSystemLink`** — read-only Link zu externen Systemen (Gutscheine, PMS, Fahrplan). Felder: `kind` (GUTSCHEINE_AMADEUS360, HOTEL_EVIIVO, OECHSLE_SCHEDULE, FOODNOTIFY_BRIDGE, GASTRONOVI_BRIDGE, GASTRONAUT_BRIDGE, OTHER), `url`, `externalRef`, `isActive`, `metadata`.

**Location-Field-Additions:**
- `signatureAssets String[]` (read-only Display, z.B. `["25m bar", "1954 Buick Super Convertible", "Pizzaofen"]`)
- `weatherSensitive Boolean @default(false)` (Mallorca default true)
- `cinemaAvailable Boolean @default(false)` (München default true)

**Brand-übergreifend wiederverwendbare `OperationalUnitType`-Erweiterungen** (aus Task 01 vererbt):
- `RESTAURANT`, `BAR`, `EVENT_BANKETT`, `OUTDOOR_BAR_TERRACE`, `CAFE_BAR`, `HOTEL_CONTEXT`, `COLLECTIVE_OTHER`
- Daraus ergeben sich für die 4 Motorworld-Standorte:
  - **München:** Restaurant, Bar, Eventlocation, Movie-Cars-Cinema (als EventSpace, nicht eigene Unit)
  - **Böblingen:** Restaurant, Eventlocation, Hotel-Context, Motomio-Cafébar
  - **Warthausen:** Restaurant, Biergarten, Tagungsräume, Eventlocation, Hotel-Context, Öchsle-Buffet (als ServiceSlot-Kind auf Restaurant)
  - **Mallorca:** Café, Restaurant, Outdoor-Bar, Terrasse, Eventlocation

**Seed-Erweiterung des bestehenden `prisma/seeds/multi_location.sql`:**
- 4 neue Location-Rows: München, Böblingen, Warthausen, Mallorca
- Per-Location Areas (Bar, Restaurant, Service, Küche, Lager, Premium-Lager wo nötig)
- 8-10 EventSpaces (Rennstall, Museum, Sieben Schwaben/Hubertus, Tagungsräume Museum/Tüftler, Movie Cars Cinema, Mallorca Innen/Außen, CUBE o.T. Bar Lounge/Spange)
- 1 Öchsle-ExceptionRule (sample, manuell kuratiert, requiresConfirmation=true)
- 4 ReservationConnectors (München/Böblingen/Mallorca = gastronaut, Warthausen = gastronovi + eviivo)
- 2-3 ExternalSystemLinks (amadeus360_gutscheine für München/Böblingen, oechsle_schedule für Warthausen)

**RLS-Sanity:** org-scoped SELECT policy auf allen 4 neuen Tabellen, `app_runtime` grants. **Kein** BEFORE UPDATE/DELETE-Trigger auf `EventSpace`/`ReservationConnector`/`ExternalSystemLink`/`ExceptionRule` (editierbar via Admin). Audit via Standard-`updatedAt`.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `prisma/schema.prisma` | edit | 4 neue Modelle + 4 Enums + 3 Location-Field-Additions |
| `prisma/migrations/<ts>_add_motorworld_inn_extensions/migration.sql` | new | forward-only |
| `prisma/migrations/<ts>_add_motorworld_inn_rls/migration.sql` | new | org-scoped RLS + `app_runtime` grants |
| `prisma/seeds/motorworld_inn_standorte.sql` | new | 4 Locations + Areas + EventSpaces + Connectors + 1 Öchsle-ExceptionRule |
| `src/modules/location/location.types.ts` | edit | +EventSpace / +ExceptionRule / +ReservationConnector / +ExternalSystemLink DTOs |
| `src/modules/location/location.service.ts` | edit | +listEventSpaces / +listExceptionRules / +listReservationConnectors / +listExternalSystemLinks |
| `src/routes/location.route.ts` | edit | +4 Read-Endpoints |
| `src/app.ts` | edit | ggf. keine Änderung, falls Routes bereits registriert |
| `tests/location.routes.test.ts` | edit | +11 vitest cases |
| `scripts/verify-adr-0039-motorworld-extensions.ts` | new | 14-Query Supabase-Promotion inkl. RLS-Test |

## Open Questions

1. Soll `EventSpace.support` als `String[]` oder als `Json` (mit strukturierten Capabilities) modelliert werden? — **Empfehlung: `EventSpaceSupport[]` Enum-Array**, weil Cockpit-Filter darauf basieren.
2. Soll `ExceptionRule.requiresConfirmation = true` einen Pflicht-Workflow auslösen (WorkflowTask erstellen)? — **Empfehlung: nur read-only Flag in dieser Slice**, Workflow-Trigger eigenes ADR-0061 (ehemals ADR-0042).
3. Soll `ReservationConnector.metadata` JSON frei sein oder ein typisiertes Schema (z.B. `{ rateLimit?, trustedSender? }`)? — **Empfehlung: freies JSON**, weil Connector-Logik out-of-scope ist.
4. Soll `ExternalSystemLink.url` validiert werden (z.B. nur https, keine localhost)? — **Empfehlung: App-Layer-Validierung in Service**, nicht DB-Constraint (DB-Constraints für URLs sind fragil).
5. Soll `Location.cinemaAvailable` dedizierter Boolean sein oder Teil von `signatureAssets`? — **Empfehlung: dedizierter Boolean**, weil Cockpit-Premium-Tile darauf filtern.

## Bindings

- ADR-0002 (read-only POS v1)
- ADR-0021 §3 (no writeback, no LLM, no service-role in user paths)
- ADR-0030 §Decisions §1 (Profil-Discriminator)
- ADR-0031 (Location-Substrate)
- Task 01 (`OperationalUnit` brand-übergreifend)
- Task 04 (Phase A Contract)

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (528 + 11 = 539) grün
- 14/14 Supabase-Promotion-Queries grün inkl. RLS-Test
- Owner-Acceptance

## Next gate

Task 05 (`05-mother-concern-read-apis.md`) konsumiert diese Read-Endpoints für Mother-Concern-Aggregation.
