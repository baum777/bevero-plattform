# Task: Cockpit CUBE Service-Slot Dashboard & Event-Inquiry Drawer

**Working title:** `cockpit-cube-service-slot-dashboard`

**Status:** `IMPLEMENTED — ADR-0053 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance + Supabase promotion.`
**Owner-ADR:** ADR-0053 (proposed) — *(renumbered 2026-06-09: war ADR-0037, jetzt ADR-0053)*
**Depends on:** Task 01 (OperationalUnit/ServiceSlot), Task 02 (Menu-Matrix), Task 03 (Event-Intake), Task 06 (Mother-Concern Read)
**Source spec:** CUBE-Website Service-Fenster, Bankettmappe, GroupRule-Logik (1–7/8–19/20+)
**Target repo state:** `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/page.tsx` mit Timeline + Unit-Cards + GroupRule-Badge + Event-Inquiry-Drawer; 2 vitest-Snapshot-Tests.

## Decision

CUBE-Premium bekommt ein eigenes **Service-Slot-Dashboard**, das die operative Mittagsschicht-Planung sichtbar macht. Profil-Discriminator `LocationProfile = CUBE_PREMIUM` triggert diese Sub-Route.

**Neue Cockpit-Routen:**

- `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/page.tsx` (new) — Haupt-Dashboard:
  - **Timeline-View** (heute, morgen, Wochentag-Wahl) der Service-Slots pro OperationalUnit.
    - Restaurant: Lunch (12:00–14:00), Kaffee & Kuchen (14:00–16:45), Dinner (17:45–22:00), Gruppenmenü (variabel).
    - o.T. Bar & Terrasse: Tagesgeschäft, After Work, Terrasse.
    - Exklusiv Events: Vorbereitung, Durchführung.
  - **Unit-Cards** (3 Cards: Restaurant, o.T. Bar & Terrasse, Exklusiv Events) mit:
    - Active-Slot-Indikator (welcher Slot ist jetzt aktiv)
    - GroupRule-Badge (für Restaurant: "1–7 à la carte, 8–19 Menüpflicht, 20+ Bankett")
    - Heute aktive Menüs (aus Task 02, `Menu.serviceSlotKind` match)
    - Quick-Link zu Menü-Detail-View (read-only, kein Edit)
  - **Event-Inquiry-Tab** (read-only Liste, gefiltert auf `status IN (NEW, NEEDS_REVIEW, OFFER_DRAFT)`):
    - Liste mit Subject, GuestCount, PreferredDate, Status-Badge, AssignedToHeader.
    - Detail-Drawer (read-only, PII-sanitized — kein `rawMessage`, kein `contactEmail`/`Phone`).
    - Empty-State mit "Heute keine offenen Anfragen".
- `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/menus/page.tsx` (new) — Menü-Matrix-View pro Unit + ServiceSlot, read-only Display.

**Hook-Integration:**
- `useLocationContext()` aus `apps/cockpit-next/lib/location-context.tsx` (Task 07) für `locationProfile`-Check.
- `useServiceSlots(unitId, date)` Wrapper um `GET /admin/location/units/:id/slots`.
- `useMenuCatalog(unitId, serviceSlotKind, date)` Wrapper um `GET /admin/location/menus` (aus Task 02).
- `useEventInquiries(unitId, status)` Wrapper um `GET /admin/cube/inquiries?unitId=&status=` (aus Task 03).

**PII-Sanitization:**
- `EventInquiry`-Detail-Drawer zeigt **kein** `rawMessage`, **kein** `contactEmail`/`contactPhone`. Nur Header + `notes` (falls von Manager hinzugefügt, **nicht** im Read-Slice).
- Read-API gibt diese Felder gar nicht erst zurück (Task 03 §PII).

**Out-of-Scope:**
- Mutations-UI (Status-Workflow für EventInquiry) — eigenes ADR-0061 (ehemals ADR-0042).
- Mobile-optimierte Variante — VISION §3 out-of-scope.
- Drag-and-Drop Slot-Editor — out-of-scope.
- LLM-Event-Draft-Generator — ADR-0021 §3 verbietet, eigenes AI-Strategie-ADR nötig.
- Push-Notifications für Slot-Start.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/page.tsx` | new | Haupt-Dashboard |
| `apps/cockpit-next/app/(app)/workspaces/[locationId]/cube/menus/page.tsx` | new | Menü-Matrix-View |
| `apps/cockpit-next/components/bestand/ServiceSlotTimeline.tsx` | new | Timeline-Komponente (Lunch/Kaffee/Dinner/After-Work) |
| `apps/cockpit-next/components/bestand/UnitCard.tsx` | new | Unit-Card mit GroupRule-Badge |
| `apps/cockpit-next/components/bestand/GroupRuleBadge.tsx` | new | "1–7 / 8–19 / 20+" Badge |
| `apps/cockpit-next/components/bestand/EventInquiryDrawer.tsx` | new | Read-only Inquiry-Detail-Drawer, PII-sanitized |
| `apps/cockpit-next/lib/cube-hooks.ts` | new | `useServiceSlots`, `useMenuCatalog`, `useEventInquiries` Hooks |
| `tests/cockpit/cube-dashboard.test.ts` | new | 2 vitest-Snapshot-Tests (Standard-Variante + Premium-Variante) |
| `scripts/smoke/browser-smoke-cube-dashboard.ts` | new | Browser-Smoke gegen Supabase-Dev |

## Open Questions

1. Soll der Service-Slot-Timeline horizontal (Tag × Stunden) oder vertikal (Slot-Stacks) sein? — **Empfehlung: horizontal**, weil Restaurant-Lunch → Kaffee → Dinner ein klassischer Tagesverlauf ist.
2. Soll die Wochentag-Wahl alle 7 Tage oder nur nächste 7 Tage zeigen? — **Empfehlung: aktueller Tag + 6 folgende** (1-Wochen-Horizont, typisch für CUBE-Schichtplanung).
3. Soll `EventInquiry-Drawer` ein "Print Offer"-Button haben, der ein druckbares Angebots-Layout rendert? — **Empfehlung: nein in dieser Slice**, weil Offer-Erstellung Mutation-Surface + Connector-Pfad hat (eigenes ADR).
4. Soll `UnitCard` einen "Aktive Slot jetzt"-Live-Indikator haben (z.B. pulsierender Punkt)? — **Empfehlung: ja**, aber rein client-side Zeit-Vergleich, kein Backend-Event.
5. Soll `Menu-Matrix-View` Allergene als Icons (Gluten, Laktose, Nüsse) oder als Text-Liste rendern? — **Empfehlung: Text-Liste mit LMIV-Codes** in v1, Icon-Set als Phase-3.4-Folge.

## Bindungen

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0029 (Back-Promotion-Pattern)
- Task 01 (OperationalUnit/ServiceSlot), Task 02 (Menu-Matrix), Task 03 (Event-Intake)
- Task 07 (Location-Context-Provider)

## Gate (Definition of Done)

- `npm --prefix apps/cockpit-next run typecheck` grün
- `vitest` (555 + 2 = 557) grün
- Browser-Smoke gegen Supabase-Dev grün
- Owner-Acceptance

## Next gate

Task 08 (`08-cockpit-motorworld-event-space-board.md`) und Task 10 (`10-cockpit-mother-concern-dashboard.md`).
