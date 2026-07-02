# Task: Mother-Concern Read APIs v2 — Organization Overview, Inquiry Routing, EventConcept Catalog

**Working title:** `mother-concern-read-apis-v2`

**Status:** `OPEN`
**Owner-ADR:** ADR-0057 (proposed) — *(renumbered 2026-06-09: war ADR-0045, jetzt ADR-0057)*
**Depends on:** Task 11 (Mother-Concern Data Model), Task 06 (Mother-Concern Read v1)
**Source spec:** Rauschenberger Meta-Layer Architecture, VISION §9 Phase 5
**Target repo state:** `src/modules/organization/overview.service.ts` + Erweiterung von `inquiry-routing.service.ts` + 5 Read-Endpoints; 11 vitest cases.

## Decision

Mother-Concern-Read v2 liefert die **konzernweite Übersicht** über alle Standorte, BUs, Konzepte, Inquiries und Partner-Locations. Reine Aggregation, keine Mutation.

**5 Read-Endpoints (alle read-only, ADR-0021 §3):**

- `GET /admin/organization/overview` — Aggregator-Endpoint pro Organization:
  - `businessUnitCounts` (z.B. `{ "CORPORATE_EVENTS": 0, "PRIVATE_EVENTS": 3, "RESTAURANTS": 5, "BOOK_THE_CONCEPT": 1, "LOCATIONS": 2 }`)
  - `locationCount` (eigene + External)
  - `inquiryStats` (total, byStatus, byBU, last7Days, last30Days)
  - `criticalStockLocations` (Top 5 mit `criticalStockAlerts > 0` aus Mother-Concern Read v1)
  - `activeExceptionRules` (Top 10)
  - `upcomingEvents` (aus EventInquiry mit `preferredDate` in den nächsten 30 Tagen, kein PII, nur Header)
  - `signatureAssetCount` (Anzahl Locations mit `signatureAssets.length > 0`)
- `GET /admin/organization/business-units` — Liste aller BUs.
- `GET /admin/organization/event-concepts?businessUnitId=` — EventConcept-Liste, gefiltert nach BU.
- `GET /admin/organization/event-concepts/:id/compatible-locations` — m:n Compatibility-View (eigene Locations + ExternalCatalogEntries), mit `compatibilityScore`-Sortierung.
- `GET /admin/inquiries?status=&businessUnitHint=&source=&dateFrom=&dateTo=` — PII-sanitized Inquiry-Liste, paginiert.
- `GET /admin/inquiries/:id` — PII-sanitized Detail (kein `rawMessage`, kein `contactEmail`/`contactPhone`).

**Routing-Logik:**
- `POST /admin/inquiries/classify` (read-only-Operation, **keine Mutation**) — deterministische Klassifizierung via `InquiryRoutingRule`:
  - Input: `rawMessage` (oder Inquiry-ID für Replay).
  - Output: `matchedRuleId`, `businessUnitHint`, `confidence Score (0-100)`, `matchedKeywords`.
  - **KEIN** LLM, **KEIN** ML, **KEIN** Auto-Routing. Output ist ein **Vorschlag**, Manager entscheidet manuell.
  - Audit-Trail: `classify`-Calls werden in separater Tabelle `InquiryClassificationAudit` geloggt.

**PII-Sanitization (ADR-0021 §5):**
- `GET /admin/inquiries*` filtert `rawMessage`, `contactEmail`, `contactPhone` **vor Response**.
- Stattdessen: `hasRawMessage Boolean`, `hasContactEmail Boolean`, `hasContactPhone Boolean`.
- Manager mit `assignedToUserId = inquiry.assignedToUserId` ODER Admin-Rolle darf vollen PII-View (eigener Endpoint `GET /admin/inquiries/:id/full`, RLS-gated, **separat** in ADR-0062 Phase 5.5) — *(war ADR-0047 vor Renumbering 2026-06-09; neue Reservierung siehe README §"Bewusst NICHT")*

**Service-Logik:**
- `overview.service.ts` aggregiert aus `Organization`, `BusinessUnit`, `EventConcept`, `ExternalCatalogEntry`, `Inquiry`, `EventInquiry` (deprecated), `Location` (mit Count-Sub-Queries).
- Caching: 5min Memory-Cache pro `(organizationId, overviewType)`. Kein Redis in dieser Slice.
- **Pagination:** `inquiries`-Liste mit `?limit=&offset=`, max 100 pro Page.

**Out-of-Scope:**
- Mutations (Inquiry-Status-Workflow, RoutingRule-Edit) — eigenes ADR-0061 (Mutation Surface) — *(war ADR-0042 vor Renumbering 2026-06-09; neue Reservierung siehe README §"Bewusst NICHT")*
- LLM-basierte Klassifizierung — ADR-0021 §3 verbietet.
- Auto-Routing (Inquiry direkt auf `businessUnitHint` setzen) — explizit nicht in dieser Slice.
- Connector-Build (FoodNotify/Gastronovi) — ADR-0002 + ADR-0021 verbieten.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `src/modules/organization/overview.service.ts` | new | Mother-Concern-Aggregator v2 |
| `src/modules/inquiry/inquiry-routing.service.ts` | edit | +`classifyInquiry` (deterministisch, kein LLM) |
| `src/modules/inquiry/inquiry.types.ts` | edit | +InquiryListItem, +InquiryDetailHeader, +ClassificationResult |
| `src/routes/organization.route.ts` | edit | +4 Read-Endpoints (überschreibt Task-11-Stubs) |
| `src/routes/inquiry.route.ts` | edit | +3 Read-Endpoints (Liste, Detail, Classify) |
| `src/lib/pii-sanitizer.ts` | new | PII-Sanitization-Helper (zentral, wiederverwendbar) |
| `tests/organization.overview.test.ts` | new | 6 vitest cases |
| `tests/inquiry.routing.test.ts` | new | 5 vitest cases |
| `scripts/verify-adr-0045-mother-concern-read-v2.ts` | new | 12-Query Supabase-Promotion inkl. PII-RLS-Test |

## Open Questions

1. Soll `classify`-Endpoint eine **eigene** Audit-Tabelle schreiben oder ins bestehende `WorkflowEvent` loggen? — **Empfehlung: eigene `InquiryClassificationAudit`**, weil es eine spezielle Audit-Semantik hat (welche Regel hat gefeuert, welche Keywords matchten, welche Confidence).
2. Soll `compatibilityScore` im Read-Endpoint als `Int` oder als `enum { LOW, MEDIUM, HIGH }` exposed werden? — **Empfehlung: `Int` 0–100**, weil Granularität für Event-Planer wichtig.
3. Soll `upcomingEvents`-Liste Inquiries mit `status IN (NEW, NEEDS_HUMAN_REVIEW, OFFER_DRAFT)` oder alle Status zeigen? — **Empfehlung: nur die ersten drei**, weil APPROVED/SENT/CONFIRMED schon im Offerflow sind.
4. Soll `overview`-Endpoint ein `date`-Parameter haben, oder immer "heute" sein? — **Empfehlung: nur "heute"**, weil historische Snapshots eigenes Reporting-ADR brauchen.
5. Soll `classify`-Endpoint auch ohne persistierte Inquiry funktionieren (Input: `rawMessage` direkt)? — **Empfehlung: ja**, weil Cockpit-Manager auch Drafts klassifizieren wollen.

## Bindings

- ADR-0021 §3 (read-only), §5 (PII-Sanitization)
- ADR-0055 (Meta-Layer Contract) — *(renumbered 2026-06-09, war ADR-0043)*
- ADR-0056 (Meta-Layer Data Model) — *(renumbered 2026-06-09, war ADR-0044)*
- Task 06 (Mother-Concern Read v1)
- Task 11 (Mother-Concern Data Model)

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (575 + 11 = 586) grün
- 12/12 Supabase-Promotion-Queries grün inkl. PII-RLS-Test + RoutingRule-Match-Test
- Owner-Acceptance

## Next gate

Task 12 (`12-cockpit-mother-concern-dashboard.md`) konsumiert diese Read-Endpoints im Cockpit.
