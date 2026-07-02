# Task: Cockpit Motorworld Event-Space Board & Reservation-Connector Status

**Working title:** `cockpit-motorworld-event-space-board`

**Status:** `IMPLEMENTED — ADR-0054 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance + Supabase promotion.`
**Owner-ADR:** ADR-0054 (proposed, Erweiterung) — *(renumbered 2026-06-09: war ADR-0041-B, jetzt ADR-0054)*
**Depends on:** Task 05 (Motorworld Data Model), Task 06 (Mother-Concern Read), Task 07 (Standort-Picker)
**Source spec:** Motorworld-Inn Eventlocations (Rennstall 100/40, Museum 150–200, Sieben Schwaben/Hubertus 20, Tagungsräume Museum/Tüftler, Movie Cars Cinema 27, Mallorca Innen 230/Außen 220), Reservation-Connector (gastronaut/gastronovi/eviivo)
**Target repo state:** `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-ops/page.tsx` mit Event-Space-Board + Reservation-Connector-Status + Warthausen-Öchsle-Banner; 2 vitest-Snapshot-Tests.

## Decision

Motorworld-Inn-Standorte brauchen ein **Event-Space-Board**, das Kapazitäten, Reservation-Connector-Status und Öchsle-Override-Status pro Standort sichtbar macht. Profil-Discriminator `LocationProfile = MOTORWORLD_STANDARD` triggert diese Sub-Route.

**Neue Cockpit-Routen:**

- `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-ops/page.tsx` (new) — Haupt-Board:
  - **Event-Space-Grid** (read-only, Kapazitäts-Tabelle pro Standort):
    - München: Movie Cars Cinema (27), Innen-Bereich, Außen-Bereich.
    - Böblingen: Eventlocation (300), Motomio-Cafébar, Tagungsräume.
    - Warthausen: Rennstall (100/40 + Emporen-Aufschlüsselung), Museum (150–200), Sieben Schwaben & Hubertuskeller (20), Tagungsräume Museum & Tüftler, Hotel (8 Themenzimmer als Read-Display).
    - Mallorca: Innen (230), Außen (220), Eventhalle (450), Seminarwelt (2.000 auf 80.000 m²).
  - **Reservation-Connector-Status** (read-only, mit "open in new tab"-Affordance):
    - München/Böblingen/Mallorca: gastronaut aktiv.
    - Warthausen: gastronovi + eviivo aktiv.
    - Empty-State wenn kein Connector konfiguriert.
  - **Warthausen-Öchsle-Banner** (speziell für Warthausen, wenn aktive `ExceptionRule` mit `type=OECHSLE_BUFFET_OVERRIDE` und `requiresConfirmation=true`):
    - Gelbes Banner mit "Öchsle-Buffet-Override aktiv — manuelle Bestätigung erforderlich".
    - Read-only, **keine** Confirm-Aktion (eigenes ADR-0061, ehemals ADR-0042).
  - **Inquiry-Pipeline-Hinweis** (optional, nur wenn Standort zu Corporate-/Private-Events fähig): "Heute 3 neue Event-Anfragen" mit Link zu Mother-Concern-Dashboard (Task 10).
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-ops/inquiries/page.tsx` (new) — Standort-spezifische Inquiry-Liste (CUBE-Standort + Motorworld-Standort einheitlich, da `EventInquiry` aus Task 03 CUBE-Scope erweitert wird zu brand-übergreifend in Task 09).

**Hook-Integration:**
- `useEventSpaces(locationId)` aus `GET /admin/location/locations/:id/event-spaces` (Task 06).
- `useReservationConnectors(locationId)` aus `GET /admin/location/locations/:id/reservation-connectors`.
- `useExternalSystemLinks(locationId)` aus `GET /admin/location/locations/:id/external-system-links`.
- `useExceptionRules(locationId, dateRange, type=OECHSLE_BUFFET_OVERRIDE)` für Warthausen-Banner.

**PII-Sanitization:**
- `EventInquiry`-Liste zeigt **keine** `rawMessage`, **keine** `contactEmail`/`Phone`. Nur Header (id, subject, guestCount, preferredDate, status).

**Out-of-Scope:**
- Connector-Logik (echte API-Calls zu gastronaut/gastronovi) — ADR-0002 + ADR-0021 verbieten.
- Anfrage-Status-Workflow (Manager bestätigt, Anfrage zugewiesen, etc.) — eigenes ADR-0061 (ehemals ADR-0042).
- Live-Wetter-API für Mallorca-Terrasse — ADR-0021 §3 verbietet externen Fetch, statischer `weatherSensitive`-Flag reicht.
- Angebots-Kalkulator — VISION §3 out-of-scope, eigenes ADR nach Offerflow-Strategie.
- Hotel-PMS-Integration (eviivo) — out-of-scope.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-ops/page.tsx` | new | Haupt-Board |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/event-ops/inquiries/page.tsx` | new | Standort-Inquiry-Liste |
| `apps/cockpit-next/components/bestand/EventSpaceCard.tsx` | new | Event-Space-Card mit Kapazitäts-Tabelle |
| `apps/cockpit-next/components/bestand/ReservationConnectorList.tsx` | new | Connector-Liste mit Status-Indikator |
| `apps/cockpit-next/components/bestand/OechsleBanner.tsx` | new | Warthausen-Öchsle-Banner (gelb, read-only) |
| `apps/cockpit-next/lib/motorworld-hooks.ts` | new | `useEventSpaces`, `useReservationConnectors`, `useExternalSystemLinks`, `useExceptionRules` Hooks |
| `tests/cockpit/motorworld-event-board.test.ts` | new | 2 vitest-Snapshot-Tests (München-Variante + Warthausen-Variante) |
| `scripts/smoke/browser-smoke-motorworld-event-board.ts` | new | Browser-Smoke gegen Supabase-Dev |

## Open Questions

1. Soll die Event-Space-Grid nach Kapazität sortiert sein (max → min) oder nach Standort-Logik (Innen → Außen → Tagung → Hotel)? — **Empfehlung: nach Standort-Logik**, weil Event-Planer mentale Maps nach Raum-Typ bauen.
2. Soll `Movie Cars Cinema` als eigener Tile oder im "Innen-Bereich"-Aggregate gezeigt werden? — **Empfehlung: eigener Tile** mit `support = CINEMA`-Badge, weil es eine eigenständige Verkaufs-Logik hat.
3. Soll der Warthausen-Öchsle-Banner dismissable sein (User kann ihn wegklicken)? — **Empfehlung: nein**, weil `requiresConfirmation = true` Sicherheits-relevante Info ist; eigener Bestätigungs-Workflow in ADR-0061 (ehemals ADR-0042).
4. Soll die Inquiry-Pipeline-Anzeige (z.B. "Heute 3 neue Event-Anfragen") pro BU gefiltert sein (Corporate/Private) oder global? — **Empfehlung: global mit BU-Badge pro Inquiry**, weil Cockpit-Manager oft alle BUs sehen wollen.
5. Soll `Event-Space-Card` einen "Heute gebucht"-Indikator haben (read-only, aus externem Reservation-Connector, nicht aus Bevero-DB)? — **Empfehlung: nein in dieser Slice**, weil Connector-Build out-of-scope.

## Bindungen

- ADR-0002 (read-only POS v1)
- ADR-0021 §3 (read-only, no writeback)
- ADR-0029 (Back-Promotion-Pattern)
- Task 05 (Motorworld Data Model), Task 06 (Mother-Concern Read), Task 07 (Standort-Picker)
- Task 09 (Inquiry-Generalisierung) für standort-übergreifende Inquiry-Liste

## Gate (Definition of Done)

- `npm --prefix apps/cockpit-next run typecheck` grün
- `vitest` (557 + 2 = 559) grün
- Browser-Smoke gegen Supabase-Dev grün
- Owner-Acceptance

## Next gate

Task 09 (`09-inquiry-routing-meta-layer.md`) generalisiert `EventInquiry` zu brand-übergreifendem `Inquiry`-Modell.
