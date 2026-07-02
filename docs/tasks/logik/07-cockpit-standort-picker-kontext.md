# Task: Cockpit Standort-Picker & Profile-aware Kontext (Motorworld-Inn + CUBE)

**Working title:** `cockpit-standort-picker-kontext`

**Status:** `IMPLEMENTED` — ADR-0052 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance.
**Owner-ADR:** ADR-0052 (proposed) — *(renumbered 2026-06-09: war ADR-0041, jetzt ADR-0052)*
**Depends on:** Task 06 (Mother-Concern Read APIs), Task 05 (Motorworld Data Model), Task 03 (CUBE Event-Intake), ADR-0033 (Cockpit Standort-Kontext v1)
**Source spec:** Motorworld-Inn Today-View, CUBE Today-View, VISION §9 Phase 5
**Target repo state:** `apps/cockpit-next/app/(app)/workspaces/*` mit Location-Picker, Profil-aware Landing, Today-Overview, Exception-Calendar, Event-Spaces, Connectors; 3 vitest-Snapshot-Tests.

## Decision

Cockpit bekommt eine **Location-Kontext-Schicht**, die pro Standort das richtige Set an Tiles und Read-Views zeigt. Profil-Discriminator (`LocationProfile`) entscheidet, welche Kacheln sichtbar sind.

**Neue Cockpit-Routen (alle read-only, ADR-0021 §3):**

- `apps/cockpit-next/app/(app)/workspaces/page.tsx` (edit) — Standort-Liste mit Profil-Badge + Signature-Assets-Preview + Today-Status-Tile (offene Inquiries Count, aktive ExceptionRules Count, kritische Stock-Counts).
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/layout.tsx` (new) — LocationContext-Provider, der Location-Profil + Today-Overview einmal lädt und per React-Context an Sub-Routes weitergibt. 5min client-side Cache.
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/page.tsx` (new) — Profil-aware Landing:
  - `MOTORWORLD_STANDARD` Standard-KPI-Tile (Refill-Runs, offene Wareneingänge, kritische Bestände, Anomalien)
  - `CUBE_PREMIUM` zusätzlich **Service-Vorbereitung**-Card (aktive Service-Slots, GroupRule-Badge)
  - `EVENT_BANKETT_FUTURE` zusätzlich **Event-Pipeline**-Card (offene Inquiries)
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/today/page.tsx` (new) — Today-Overview-View, konsumiert `GET /admin/location/locations/:id/today-overview`. Karten für: aktive Service-Slots, aktive ExceptionRules (mit `requiresConfirmation`-Badge), offene Inquiries (Count + 5 neueste Header), kritische Bestände (Top 10), Reservation-Connector-Status, External-System-Link-Liste, Signature-Assets-Read-Display.
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/calendar/page.tsx` (new) — Exception-Calendar-View, **read-only** Timeline der ExceptionRules über 90 Tage. Warthausen-Öchsle-Override bekommt einen speziellen Hinweis-Banner ("Manuelle Bestätigung erforderlich").
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-spaces/page.tsx` (new) — Event-Space-Liste mit Kapazitäts-Tabelle, Filter nach `EventSpaceSupport` (CINEMA, WEDDING, CONFERENCE, etc.).
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/connectors/page.tsx` (new) — Reservation-Connector-Liste + External-System-Link-Liste, read-only mit "open in new tab"-Affordance. **Kein** API-Key sichtbar, **keine** Connector-Logik.

**`LocationContextProvider` in `apps/cockpit-next/lib/location-context.tsx` (new):**
- Lädt `GET /admin/location/locations/:id/today-overview` einmal pro Mount.
- 5min client-side Cache via `useState` + `useEffect` (kein SWR/React-Query in dieser Slice).
- Bietet Hooks: `useLocationProfile()`, `useTodayOverview()`, `useExceptionRules(dateRange)`.
- Fehler-State mit verständlichem Error-Message (kein roher 500), Empty-State mit "noch keine Daten"-Hinweis.

**Profil-aware Tile-Selection:**
- `MOTORWORLD_STANDARD`: Refill-Runs, Wareneingänge, kritische Bestände, Anomalien, aktive Slots, offene Inquiries.
- `CUBE_PREMIUM`: alle Standard + Service-Vorbereitung, GroupRule-Badge, Menü-Active-Hinweis (aus Task 02), EventInquiry-Detail-Tile.
- `EVENT_BANKETT_FUTURE`: alle Standard + Event-Pipeline, Event-Space-Auslastungs-Tile (read-only, keine Buchung).

**Out-of-Scope:**
- Mutations-UI (z.B. ExceptionRule bestätigen, EventInquiry-Status ändern) — eigenes ADR-0061 (ehemals ADR-0042).
- Service-Worker-Registration — Phase D laut ADR-0021 §Service-Worker-Strategy.
- Push-Notifications, Mobile-App, Wetter-Live-Fetch.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `apps/cockpit-next/app/(app)/workspaces/page.tsx` | edit | Standort-Liste mit Profil-Badge |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/layout.tsx` | new | LocationContext-Provider-Mount |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/page.tsx` | new | Profil-aware Landing |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/today/page.tsx` | new | Today-Overview-View |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/calendar/page.tsx` | new | Exception-Calendar-View (90 Tage) |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-spaces/page.tsx` | new | Event-Space-Liste mit Kapazitäts-Tabelle |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/connectors/page.tsx` | new | Connector + Link-Liste |
| `apps/cockpit-next/lib/location-context.tsx` | new | LocationContext-Provider + Hooks |
| `apps/cockpit-next/lib/location-tiles.ts` | new | Profil-aware Tile-Selection-Logik |
| `apps/cockpit-next/components/bestand/LocationTile.tsx` | new | Wiederverwendbare Tile-Komponente |
| `apps/cockpit-next/components/bestand/ExceptionRuleBanner.tsx` | new | ExceptionRule-Hinweis-Banner |
| `tests/cockpit/location-tiles.test.ts` | new | 3 vitest-Snapshot-Tests (pro Profil-Variante) |
| `scripts/smoke/browser-smoke-standort-picker.ts` | new | Browser-Smoke gegen Supabase-Dev |

## Open Questions

1. Sollen 5 Sub-Routes (`today`, `calendar`, `event-spaces`, `connectors`, plus Landing) der richtige Cut sein, oder 1 Tab-View mit Sub-Tabs? — **Empfehlung: 5 Sub-Routes** (Tiefen-Links, Browser-History, Lade-Performance pro Tab).
2. Soll `LocationContextProvider` SWR/React-Query nutzen oder Vanilla `useState`? — **Empfehlung: Vanilla `useState` + `useEffect` in dieser Slice**, weil keine zusätzliche Dep gewünscht; SWR-Migration als spätere Optimierung.
3. Soll der Exception-Calendar 30, 90 oder 365 Tage zeigen? — **Empfehlung: 90 Tage** (3 Monate, typische Event-Planungs-Horizont).
4. Soll Warthausen-Öchsle-Banner ein eigener Component-State sein oder generisch für `requiresConfirmation=true` ExceptionRules? — **Empfehlung: generisch**, weil `requiresConfirmation` ein Meta-Flag ist, der auch für andere Override-Typen Sinn macht.
5. Soll `connectors`-Route `externalUrl` als `<a target="_blank" rel="noopener">` rendern, oder via Cockpit-Proxy (kein direkter externer Klick)? — **Empfehlung: direkter `<a target="_blank" rel="noopener">`**, weil Cockpit-Proxy zusätzliche Komplexität ohne klaren Nutzen bringt.

## Bindungen

- ADR-0021 §3 (read-only), §5 (PII-Sanitization), §Service-Worker-Strategy
- ADR-0029 (Back-Promotion-Pattern)
- ADR-0030 §3 (Profil-driven Cockpit landing)
- ADR-0033 (Cockpit Standort-Kontext v1) — wird erweitert
- Task 03 (CUBE Event-Intake), Task 05 (Motorworld Data Model), Task 06 (Mother-Concern Read APIs)

## Gate (Definition of Done)

- `npm --prefix apps/cockpit-next run typecheck` grün
- `vitest` (552 + 3 = 555) grün
- Browser-Smoke gegen Supabase-Dev grün
- Owner-Acceptance

## Next gate

Task 07 (`07-cockpit-cube-service-slot-dashboard.md`) und Task 08 (`08-cockpit-motorworld-event-space-board.md`) als profil-spezifische Vertiefungen.
