# Task: Mother-Concern Read APIs — Today-Overview, ExceptionCalendar, EventSpaces

**Working title:** `mother-concern-read-apis`

**Status:** `IMPLEMENTED` — ADR-0051 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance + Supabase promotion.
**Owner-ADR:** ADR-0051 (proposed) — *(renumbered 2026-06-09: war ADR-0040, jetzt ADR-0051)*
**Depends on:** Task 05 (Motorworld-Inn Data Model), Task 03 (CUBE Event-Intake), ADR-0032 (Mother-Concern Read v1)
**Source spec:** ADR-0030 §3 Mother-Concern Overview, VISION §9 Phase 5, Motorworld-Inn Today-View, CUBE Today-View
**Target repo state:** `src/modules/location/overview.service.ts` + `src/modules/location/exception-rule.service.ts` + `src/modules/location/connector.service.ts` + 5 Read-Endpoints; 13 vitest cases.

## Decision

Mother-Concern-View ist die **Aggregation** über alle Standorte und BusinessUnits. Sie liefert pro Standort und pro Tag eine konsolidierte operative Sicht, ohne Mutations-Pfad.

**5 Read-Endpoints (alle read-only, ADR-0021 §3):**

- `GET /admin/location/locations/:id/exception-rules?dateFrom=&dateTo=&type=` — Liste aktiver ExceptionRules im Zeitfenster, gefiltert nach `ExceptionRuleType`.
- `GET /admin/location/locations/:id/event-spaces` — EventSpace-Liste mit Kapazitäts-Tabelle, Read-Display für Cockpit.
- `GET /admin/location/locations/:id/reservation-connectors` — Reservation-Connector-Liste pro Location (gastronaut / gastronovi / phone / walk_in), mit `externalUrl` als "open in new tab"-Affordance.
- `GET /admin/location/locations/:id/external-system-links` — External-System-Link-Liste (amadeus360_gutscheine, hotel_eviivo, oechsle_schedule, foodnotify_bridge), read-only.
- `GET /admin/location/locations/:id/today-overview` — **Aggregator-Endpoint** (Kernstück): liefert pro Standort für "heute" (lokales Datum via `Location.timezone`):
  - `openingHours` (aus `ServiceSlot` für aktuelle Wochentag-Mask)
  - `activeServiceSlots` (welche Slots sind jetzt aktiv, basierend auf `startTimeLocal`/`endTimeLocal`)
  - `activeExceptionRules` (welche ExceptionRules überlappen mit "jetzt")
  - `openInquiries` (Count + Liste-Header aus `EventInquiry` mit `status IN (NEW, NEEDS_REVIEW)`)
  - `criticalStockAlerts` (Count aus `InventoryStockSnapshot` < `LocationInventoryConfig.minimumQuantity`)
  - `reservationConnectorStatus` (welche Provider sind aktiv, mit URL-Hinweis)
  - `signatureAssets` (Read-Display-Liste)
  - `weatherSensitive`-Hinweis wenn `Location.weatherSensitive = true` (kein Live-Fetch, nur Flag)

**Service-Logik:**
- `overview.service.ts` aggregiert aus `ServiceSlot`, `ExceptionRule`, `EventInquiry`, `InventoryStockSnapshot`, `ReservationConnector`, `Location`.
- **Caching:** Read-Endpoint cached 60s pro `(locationId, date)` im Memory. Kein Redis in dieser Slice.
- **PII:** `today-overview.openInquiries` enthält **kein** `rawMessage`, **keine** `contactEmail`/`Phone`. Nur Header: `id`, `subject`, `guestCount`, `preferredDate`, `status`, `assignedToUserId`.

**Out-of-Scope:**
- Mutations (Status-Workflow für ExceptionRule, EventInquiry) — eigenes ADR-0061 (ehemals ADR-0042).
- Connector-Build (echte API-Calls zu gastronaut/gastronovi) — ADR-0002 + ADR-0021 verbieten.
- Live-Wetter-API — ADR-0021 §3 verbietet externen Fetch.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `src/modules/location/overview.service.ts` | new | Aggregator-Logik, inkl. PII-Sanitizer-Helper |
| `src/modules/location/exception-rule.service.ts` | new | ExceptionRule-Liste, gefiltert |
| `src/modules/location/connector.service.ts` | new | Reservation-Connector + External-System-Link-Liste |
| `src/modules/location/location.types.ts` | edit | +TodayOverviewDto, +ExceptionRuleListItem, +EventSpaceListItem, +ConnectorListItem |
| `src/routes/location.route.ts` | edit | +5 Read-Endpoints |
| `tests/location.overview.test.ts` | new | 13 vitest cases (pro Endpoint 1 happy + 401/403/404/400) |
| `scripts/verify-adr-0040-read-apis.ts` | new | 12-Query Supabase-Promotion inkl. PII-RLS-Test |

## Open Questions

1. Soll `today-overview` als Single-Endpoint oder als 5 Sub-Endpoints gebaut werden? — **Empfehlung: Single `today-overview` + 4 Sub-Endpoints für Filter-Use-Cases** (z.B. Cockpit-Calendar will nur ExceptionRules für 30 Tage).
2. Soll der 60s-Cache pro `(locationId, date)` sein oder pro Endpoint-URL? — **Empfehlung: pro `(locationId, date)`**, weil das die Granularität ist, die Cockpit braucht.
3. Soll `criticalStockAlerts` aus `InventoryStockSnapshot` direkt oder via `LocationInventoryConfig.minimumQuantity` Join berechnet werden? — **Empfehlung: Snapshot + Join**, weil Snapshot die Source-of-Truth für Read ist (ADR-0016 §"snapshot is current-state read model").
4. Soll `weatherSensitive`-Hinweis im `today-overview` immer angezeigt werden oder nur wenn `activeServiceSlots` einen `OUTDOOR_BAR_TERRACE`-Slot überlappt? — **Empfehlung: nur bei Slot-Overlap**, weil sonst Mallorca-Tile bei Innenraum-Service unsinnig warnt.
5. Soll `today-overview` auch `EventInquiry.openInquiries` aggregieren oder nur `EventInquiry`-Count zeigen? — **Empfehlung: Count + 5 neueste Header** (id, subject, guestCount, status, assignedTo), kein rawMessage, kein PII.

## Bindings

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0030 §3 (Mother-Concern Overview deferred, jetzt autorisiert)
- ADR-0032 (Mother-Concern Read v1) — wird erweitert
- Task 03 (CUBE Event-Intake)
- Task 05 (Motorworld-Inn Data Model)

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (539 + 13 = 552) grün
- 12/12 Supabase-Promotion-Queries grün inkl. PII-RLS-Test
- Owner-Acceptance

## Next gate

Task 06 (`06-cockpit-standort-picker-kontext.md`) konsumiert diese Endpoints im Cockpit.
