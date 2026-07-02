# Task: Cockpit Mother-Concern Dashboard & Inquiry-Routing Review Queue

**Working title:** `cockpit-mother-concern-dashboard`

**Status:** `OPEN`
**Owner-ADR:** ADR-0058 (proposed) — *(renumbered 2026-06-09: war ADR-0046, jetzt ADR-0058)*
**Depends on:** Task 12 (Mother-Concern Read v2), Task 11 (Data Model), alle vorherigen Cockpit-Tasks
**Source spec:** VISION §9 Phase 5, Rauschenberger Meta-Layer Architecture
**Target repo state:** `apps/cockpit-next/app/(app)/mother-concern/page.tsx` + `apps/cockpit-next/app/(app)/inquiries/page.tsx` + 2 Sub-Routes; 3 vitest-Snapshot-Tests.

## Decision

Cockpit bekommt eine **konzernweite Sicht** für Rauschenberger-Management: alle Standorte, BUs, Inquiries, Konzepte, Partner-Locations aggregiert. Plus eine **Inquiry-Routing-Review-Queue** für Manager, die deterministische Klassifizierungs-Vorschläge prüfen.

**Neue Cockpit-Routen:**

- `apps/cockpit-next/app/(app)/mother-concern/page.tsx` (new) — Haupt-Dashboard:
  - **Header-KPI-Strip** (5 Tiles): Total Inquiries, Inquiries last 7d, Critical-Stock-Locations, Active-Exception-Rules, Upcoming-Events.
  - **Business-Unit-Grid** (5 Cards: Corporate Events, Private Events, Restaurants, Book-the-Concept, Locations) mit Inquiry-Counts, Top-3-Konzepte, Top-3-Standorte.
  - **Standort-Vergleichs-Tabelle** (eigene + Partner) mit `criticalStockAlerts`, `activeExceptionRules`, `openInquiries` pro Standort. Sortierbar, filterbar.
  - **Signature-Asset-Map** (read-only Display) — Liste aller `signatureAssets` pro Location, gruppiert nach Marke.
  - **Engpassübersicht** (Top 10 kritische Bestände, aggregiert aus Mother-Concern Read v1).
  - **Audit-Trail-Hinweis** ("Letzte 10 WorkflowEvents") — read-only Liste der jüngsten Events.
- `apps/cockpit-next/app/(app)/mother-concern/event-concepts/page.tsx` (new) — EventConcept-Katalog:
  - Grid (7 Cards: Feel the Forest, Mysterious Urban Venue, Winter Wonderland, etc.).
  - Pro Concept: Compatible-Locations-Liste (eigene + Partner), `compatibilityScore`, Notes.
  - Filter nach BU, Region, Capacity.
- `apps/cockpit-next/app/(app)/mother-concern/partner-locations/page.tsx` (new) — ExternalCatalogEntry-Liste:
  - Tabelle mit Name, City, Type, Capacity, Catering-Mode, Logistics-Profile.
  - Filter nach Region, Type, Capacity-Range.
- `apps/cockpit-next/app/(app)/inquiries/page.tsx` (new) — Inquiry-Routing-Review-Queue:
  - **Haupt-Tab** "Offen" (NEW, NEEDS_CLASSIFICATION, NEEDS_HUMAN_REVIEW) mit Filter nach BU, Source, Date.
  - **Sub-Tab** "Heute eingegangen" (last 24h).
  - **Sub-Tab** "Angebot in Vorbereitung" (OFFER_DRAFT, APPROVED).
  - **Sub-Tab** "Abgeschlossen" (SENT, CONFIRMED, LOST, REJECTED, ARCHIVED).
  - Pro Inquiry: Header (id, subject, guestCount, preferredDate, businessUnitHint, source, status-Badge, assignedToHeader).
  - **Detail-Drawer** mit Classification-Vorschlag (matchedRuleId, confidence, matchedKeywords), PII-Indikatoren (`hasRawMessage`, `hasContactEmail`, `hasContactPhone`).
  - **"Klassifizieren"-Button** (read-only Operation, siehe Task 12) → zeigt deterministisches Ergebnis, **keine** Auto-Set-Aktion.
  - Empty-State pro Tab mit verständlichem Hinweis.
- `apps/cockpit-next/app/(app)/inquiries/[inquiryId]/page.tsx` (new) — Inquiry-Detail (PII-sanitized), mit Verlauf (`InquiryClassificationAudit`-Liste).

**Hook-Integration:**
- `useOrganizationOverview()` aus `GET /admin/organization/overview` (Task 12).
- `useBusinessUnits()` aus `GET /admin/organization/business-units`.
- `useEventConcepts(businessUnitId?)` aus `GET /admin/organization/event-concepts`.
- `useCompatibleLocations(eventConceptId)` aus `GET /admin/organization/event-concepts/:id/compatible-locations`.
- `useExternalCatalogEntries(filters)` aus `GET /admin/organization/external-catalog-entries` (neu in Task 12).
- `useInquiries(filters)` aus `GET /admin/inquiries?status=&businessUnitHint=&source=&dateFrom=&dateTo=`.
- `useInquiry(id)` aus `GET /admin/inquiries/:id` (PII-sanitized).
- `useClassifyInquiry(rawMessage?)` aus `POST /admin/inquiries/classify` (read-only Operation).

**PII-Sanitization:**
- Alle Inquiry-Displays zeigen **kein** `rawMessage`, **kein** `contactEmail`/`Phone`.
- Stattdessen Badges: "Nachricht vorhanden", "E-Mail vorhanden", "Telefon vorhanden".
- Manager mit `assignedToUserId` ODER Admin-Rolle können via separatem Endpoint `GET /admin/inquiries/:id/full` (RLS-gated) vollen PII-View sehen — **eigenes** ADR-0062 (Phase 5.5, ehemals ADR-0047), nicht in dieser Slice.

**Out-of-Scope:**
- Mutations (Status-Workflow, RoutingRule-Edit) — eigenes ADR-0061 (Mutation Surface, ehemals ADR-0042).
- LLM-Klassifizierung — ADR-0021 §3 verbietet, eigenes AI-Strategie-ADR nötig.
- Auto-Routing (Inquiry direkt auf BU setzen) — bewusst out-of-scope, manuelle Manager-Entscheidung.
- Connector-Build (FoodNotify/Gastronovi) — ADR-0002 + ADR-0021 verbieten.
- Angebots-Kalkulator — VISION §3 out-of-scope, eigenes ADR.
- Push-Notifications, Mobile-App, Service-Worker — ADR-0021 §Service-Worker-Strategy.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `apps/cockpit-next/app/(app)/mother-concern/page.tsx` | new | Haupt-Dashboard |
| `apps/cockpit-next/app/(app)/mother-concern/event-concepts/page.tsx` | new | EventConcept-Katalog |
| `apps/cockpit-next/app/(app)/mother-concern/partner-locations/page.tsx` | new | Partner-Location-Liste |
| `apps/cockpit-next/app/(app)/inquiries/page.tsx` | new | Inquiry-Routing-Review-Queue |
| `apps/cockpit-next/app/(app)/inquiries/[inquiryId]/page.tsx` | new | Inquiry-Detail (PII-sanitized) |
| `apps/cockpit-next/components/bestand/OrganizationKpiStrip.tsx` | new | KPI-Strip mit 5 Tiles |
| `apps/cockpit-next/components/bestand/BusinessUnitCard.tsx` | new | BU-Card mit Inquiry-Counts |
| `apps/cockpit-next/components/bestand/LocationComparisonTable.tsx` | new | Standort-Vergleichs-Tabelle |
| `apps/cockpit-next/components/bestand/SignatureAssetMap.tsx` | new | Signature-Asset-Liste (gruppiert) |
| `apps/cockpit-next/components/bestand/InquiryListItem.tsx` | new | Inquiry-Header mit PII-Badges |
| `apps/cockpit-next/components/bestand/InquiryDetailDrawer.tsx` | new | PII-sanitized Detail mit Classification-Vorschlag |
| `apps/cockpit-next/lib/mother-concern-hooks.ts` | new | Alle Mother-Concern + Inquiry Hooks |
| `tests/cockpit/mother-concern-dashboard.test.ts` | new | 2 vitest-Snapshot-Tests (BU-Variante + Inquiry-Review-Variante) |
| `tests/cockpit/inquiry-routing.test.ts` | new | 1 vitest-Snapshot-Test (Classification-Result-Display) |
| `scripts/smoke/browser-smoke-mother-concern.ts` | new | Browser-Smoke gegen Supabase-Dev |

## Open Questions

1. Soll die Standort-Vergleichs-Tabelle nach BU filterbar sein oder global alle Standorte zeigen? — **Empfehlung: global mit BU-Filter**, weil Manager oft alle Standorte im Blick haben wollen.
2. Soll der KPI-Strip klickbar sein (Klick auf Tile öffnet detaillierte Liste) oder rein Read-Display? — **Empfehlung: klickbar**, weil Cockpit-UX-Standard ist.
3. Soll die Signature-Asset-Map eine **visuelle** Karte (Leaflet/Mapbox) oder eine Text-Liste sein? — **Empfehlung: Text-Liste in v1**, weil Map eine zusätzliche Dep + API-Key braucht.
4. Soll die Inquiry-Routing-Review-Queue einen "Bulk-Classify"-Button haben (mehrere Inquiries gleichzeitig klassifizieren)? — **Empfehlung: nein in v1**, weil Bulk-Aktion Mutations-Surface braucht.
5. Soll `useClassifyInquiry` als Read-Only-Operation (POST ohne Side-Effect) oder als Suggestion-Endpoint (POST mit optionalem `commit=true`) gebaut werden? — **Empfehlung: Read-Only mit separatem `commit=true`-Parameter, der nur Audit-Log schreibt (kein Status-Set)**, weil Mutations später in ADR-0061 (ehemals ADR-0042) kommen.
6. Soll die Audit-Trail-Anzeige in Mother-Concern-Dashboard nur die letzten 10 Events zeigen oder filterbar sein? — **Empfehlung: Top 10 in v1**, Filter als Phase-5.5-Folge.

## Bindungen

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0029 (Back-Promotion-Pattern)
- ADR-0055 (Meta-Layer Contract), ADR-0056 (Data Model), ADR-0057 (Read APIs v2) — *(renumbered 2026-06-09)*
- VISION §9 Phase 5

## Gate (Definition of Done)

- `npm --prefix apps/cockpit-next run typecheck` grün
- `vitest` (586 + 3 = 589) grün
- Browser-Smoke gegen Supabase-Dev grün
- Owner-Acceptance

## Next gate

ADR-0061 (ExceptionRule/Inquiry Mutation Surface, separates ADR, ehemals ADR-0042), ADR-0062 (PII-Vollzugriff für zugewiesene Manager, separates ADR, ehemals ADR-0047), Task 13 (Mobile Event-Execution, Phase 6, separates Task-File).
