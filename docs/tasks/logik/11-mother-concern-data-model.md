# Task: Mother-Concern Data Model — Organization, BusinessUnit, EventConcept, ExternalCatalog, Inquiry

**Working title:** `mother-concern-data-model`

**Status:** `OPEN`
**Owner-ADR:** ADR-0056 (proposed) — *(renumbered 2026-06-09: war ADR-0044, jetzt ADR-0056)*
**Depends on:** Task 10 (Phase A Contract), Task 03 (CUBE Event-Intake), Task 05 (Motorworld Data Model)
**Source spec:** Rauschenberger Meta-Layer Architecture, VISION §9 Phase 5
**Target repo state:** `prisma/schema.prisma` erweitert um `Organization` + `BusinessUnit` + `EventConcept` + `ExternalCatalogEntry` + `Inquiry` (generalisiert) + `InquiryRoutingRule` + 5 Enums; `Brand.organizationId` von String zu FK mit Migration; Seed um Organization + 4 BUs + 7 EventConcepts + 5 ExternalCatalogEntries erweitert; 14 vitest cases.

## Decision

Der Phase-A-Contract aus Task 10 wird in Schema operationalisiert. **Wichtig (RESOLVED 2026-06-09):** `OperationalUnit`/`ServiceSlot`/`GroupRule` (Task 01) sind **bereits in ADR-0034 (Task 01)** als brand-übergreifende Substrate entstanden — Task 11 (ADR-0056) erbt sie als Vertrag. Diese Reihenfolge wurde in Task 01 OQ1 am 2026-06-09 zu Gunsten ADR-0034 aufgelöst.

**Neu:**

- **`Organization`** — Top-Level Mother Concern. Felder: `id`, `name`, `slug` (unique), `headquartersAddress String?`, `headquartersPhone String?`, `headquartersEmail String?`, `createdAt`, `updatedAt`. FK von `Brand` (siehe Migrations-Hinweis unten).
- **`BusinessUnit`** — Workflow-Container. Felder: `id`, `organizationId` (FK), `name` (CORPORATE_EVENTS, PRIVATE_EVENTS, RESTAURANTS, BOOK_THE_CONCEPT, LOCATIONS), `slug`, `description String?`, `defaultWorkflowKey String` (z.B. `event_inquiry_handling`), `requiredInquiryFields Json?` (z.B. `{ "guestCount": "required", "eventDate": "required" }`), `createdAt`, `updatedAt`. 1 Org : n BUs.
- **`BusinessUnitLocation`** — m:n Join (welche Locations bedienen welche BU). Felder: `businessUnitId`, `locationId` (oder `externalCatalogEntryId`), `isPrimary Boolean`, `metadata Json?`. 1 BU : n Locations.
- **`BusinessUnitEventConcept`** — m:n (welche Konzepte gehören zu welcher BU).
- **`EventConcept`** — Marken-übergreifende Event-Formate. Felder: `id`, `organizationId` (FK), `name` (FEEL_THE_FOREST, MYSTERIOUS_URBAN_VENUE, WINTER_WONDERLAND, DINE_AROUND_THE_WORLD, GARDEN_EDEN, HEAVEN_SEVEN_ELEVEN, BUENA_VIDA, CUSTOM), `customName String?`, `description String?`, `themeTags String[]`, `isActive Boolean`, `createdAt`, `updatedAt`.
- **`EventConceptLocationCompatibility`** — m:n (welche Konzepte passen zu welchen Locations/ExternalCatalogEntries). Felder: `eventConceptId`, `locationId?`, `externalCatalogEntryId?`, `compatibilityScore Int?` (0–100, optional), `notes String?`. 1 Concept : n Locations.
- **`ExternalCatalogEntry`** — Partner-/Event-Locations (NICHT eigene). Felder: `id`, `organizationId` (FK), `name` (z.B. "Goldberg[Werk]", "Legendenhalle", "Carl Benz Arena", "ZENITH", "Kesselhaus", "Hospitalhof", "Motorworld Manufaktur", "Quader 12", "OutOfOffice"), `slug`, `city`, `region` (stuttgart | muenchen | mallorca | other), `type` (PARTNER_RESTAURANT, PARTNER_EVENT_HALL, PARTNER_CONFERENCE_SPACE, PARTNER_OUTDOOR, PARTNER_WEDDING_LOCATION, PARTNER_SPECIAL_VENUE), `capacityMin Int?`, `capacityMax Int?`, `cateringMode` (INHOUSE_RAUSCHENBERGER | EXTERNAL_EVENT_CATERING | HYBRID), `logisticsProfile Json?` (z.B. `{ "kitchenAccess": "limited", "loadingDock": true }`), `isActive Boolean`, `metadata Json?`, `createdAt`, `updatedAt`. **Kein** `Area`/`StorageLocation`/`LocationInventoryConfig` für Partner.
- **`Inquiry`** — brand-übergreifend. Felder: `id`, `organizationId` (FK), `businessUnitHint` (CORPORATE_EVENTS | PRIVATE_EVENTS | RESTAURANTS | BOOK_THE_CONCEPT | LOCATIONS | null), `source` (RAUSCHENBERGER_WEBSITE | CUBE_WEBSITE | MOTORWORLD_INN_WEBSITE | MANUAL_ENTRY | EMAIL_IMPORT), `externalRef String?` (externe Ticket-ID), `subject` (BUSINESS_DINNER | CORPORATE_EVENT | INCENTIVE | WEDDING | PRIVATE_EVENT | BIRTHDAY | CONFERENCE | SEMINAR | WORKSHOP | CHRISTMAS_PARTY | PRODUCT_PRESENTATION | OTHER), `guestCount Int?`, `contactName` (PII), `contactEmail` (PII), `contactPhone String?`, `contactAddress String?`, `rawMessage` (PII), `preferredDate DateTime?`, `preferredLocationId String?` (FK auf `Location`), `preferredExternalCatalogEntryId String?` (FK auf `ExternalCatalogEntry`), `status` (NEW | NEEDS_CLASSIFICATION | NEEDS_HUMAN_REVIEW | OFFER_DRAFT | APPROVED | SENT | CONFIRMED | LOST | REJECTED | ARCHIVED), `assignedToUserId String?`, `routingRuleId String?` (welche Regel hat geroutet, Audit-Trail), `createdAt`, `updatedAt`. **PII-Sanitization vor Export (ADR-0021 §5).**
- **`InquiryRoutingRule`** — deterministische Routing-Regeln. Felder: `id`, `organizationId` (FK), `businessUnitHint` (Ziel-BU), `priority Int` (niedrigste = höchste Priorität), `matchKeywords String[]` (z.B. `["hochzeit", "wedding", "private feier"]`), `matchSubjectTypes InquirySubject[]`, `matchGuestCountMin Int?`, `matchGuestCountMax Int?`, `isActive Boolean`, `description String?`, `createdByUserId String?`, `createdAt`, `updatedAt`. **KEIN** LLM, **KEIN** ML.

**Migrations-Hinweis `Brand.organizationId`:**
- Aktuell `String` (Seed nutzt `demo-organization-main` als String).
- Migration: Spalte bleibt `String` für Backward-Compat, **zusätzlich** `organizationId` als optionaler FK auf `Organization`.
- **Follow-up-ADR** (Phase 5.5) macht FK-Constraint hart, sobald alle Demo-Seeds migriert sind.
- **NICHT** in dieser Slice: bestehende Seed-Strings umschreiben.

**Brand-übergreifende Verortung `OperationalUnit`/`ServiceSlot`/`GroupRule` (aus Task 01):**
- Diese 3 Substrate sind in **ADR-0034 (Task 01, 2026-06-09 resolved)** ins Schema eingeführt. Task 11 (ADR-0056) fügt nur Mother-Concern-spezifische Erweiterungen hinzu (z.B. `BusinessUnit`/`Organization`/`Inquiry`).
- **Reihenfolge:** ADR-0034 (Substrate) **vor** ADR-0050 (Motorworld-Data) **vor** ADR-0056 (dieser Slice, Mother-Concern-Data).
- **Reihenfolge:** `OperationalUnit`/`ServiceSlot`/`GroupRule` müssen **vor** `Menu`/`MenuItem` (Task 02) da sein, weil `Menu.unitId` FK auf `OperationalUnit`.

**Seed-Erweiterung:**
- 1 Organization (Rauschenberger Catering & Restaurants)
- 5 BusinessUnits (Corporate Events, Private Events, Restaurants, Book-the-Concept, Locations)
- 7 EventConcepts (alle 7 aus dem Pitch)
- 5 ExternalCatalogEntries (Goldberg[Werk], Legendenhalle, Carl Benz Arena, ZENITH, Kesselhaus)
- 10 RoutingRules (deterministisch, z.B. "Hochzeit" → private_events, "Firmenveranstaltung" → corporate_events)
- 3 Sample-Inquiries (1 corporate, 1 private, 1 restaurant)

**RLS:** org-scoped SELECT policy auf allen neuen Tabellen, `app_runtime` grants. **Kein** Trigger (alle editierbar via Admin).

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `prisma/schema.prisma` | edit | +`Organization`, `BusinessUnit`, `BusinessUnitLocation`, `BusinessUnitEventConcept`, `EventConcept`, `EventConceptLocationCompatibility`, `ExternalCatalogEntry`, `Inquiry`, `InquiryRoutingRule` + 3 neue Enums (`BusinessUnitName`, `EventConceptName`, `InquirySubject`) + `Brand.organizationId Optional FK` |
| `prisma/migrations/<ts>_add_mother_concern_tables/migration.sql` | new | forward-only |
| `prisma/migrations/<ts>_add_mother_concern_rls/migration.sql` | new | org-scoped RLS + `app_runtime` grants |
| `prisma/seeds/mother_concern.sql` | new | 1 Org + 5 BUs + 7 EventConcepts + 5 ExternalCatalogEntries + 10 RoutingRules + 3 Sample-Inquiries |
| `src/modules/organization/organization.types.ts` | new | DTOs |
| `src/modules/organization/organization.service.ts` | new | `getById`, `listBusinessUnits`, `listEventConcepts`, `listExternalCatalogEntries`, `getOverview` |
| `src/modules/inquiry/inquiry.types.ts` | new | DTOs, inkl. PII-Sanitizer |
| `src/modules/inquiry/inquiry.service.ts` | new | `listInquiries`, `getInquiry` (PII-sanitized), `classifyInquiry` (deterministisch via RoutingRule) |
| `src/modules/inquiry/inquiry-routing.service.ts` | new | `matchRoutingRule`, `applyRouting` |
| `src/routes/organization.route.ts` | new | 4 Read-Endpoints |
| `src/routes/inquiry.route.ts` | new | 4 Read-Endpoints |
| `src/app.ts` | edit | Route-Registrierung |
| `tests/organization.routes.test.ts` | new | 8 vitest cases |
| `tests/inquiry.routes.test.ts` | new | 8 vitest cases |
| `scripts/verify-adr-0044-mother-concern.ts` | new | 14-Query Supabase-Promotion inkl. RLS-Test + PII-Test |

## Open Questions

1. Soll `Organization` als **eigenes** Top-Level-Modell oder als Spezialisierung von `Brand` modelliert werden? — **Empfehlung: eigenes Modell**, weil Brand und Organization semantisch unterschiedlich sind.
2. Soll `Inquiry.source` Enum alle 4 Website-Quellen umfassen oder freier String sein? — **Empfehlung: Enum**, weil Website-Quellen endlich sind.
3. Soll `InquiryRoutingRule.matchKeywords` Case-Insensitive matchen oder exakt? — **Empfehlung: Case-Insensitive Lowercase-Match** im Service-Layer, DB-Storage in Lowercase.
4. Soll `Inquiry` einen `businessUnitHint` schon bei Intake haben oder erst nach Routing? — **Empfehlung: optional bei Intake, nach Routing gesetzt**, weil Website-Formulare oft schon BU-Hinweise liefern.
5. Soll die `EventInquiry → Inquiry` Migration in derselben Slice laufen oder als eigene Migrations-Folge? — **Empfehlung: separate Follow-up-Migration (Phase 5.4)**, weil bestehende Cockpit-UI auf `EventInquiry` zeigt und Breaking-Change vermieden werden muss.
6. Soll `ExternalCatalogEntry.compatibilityScore` mit 0–100-Int oder als `enum { LOW, MEDIUM, HIGH }` modelliert werden? — **Empfehlung: `compatibilityScore Int?` 0–100**, weil Event-Planer fein-granular abwägen.
7. Soll `BusinessUnit.defaultWorkflowKey` ein FK auf eine `WorkflowDefinition`-Tabelle sein oder freier String? — **Empfehlung: freier String in v1**, FK als Phase-5.5-Folge.

## Bindungen

- ADR-0021 §3 (read-only, no LLM-approval)
- ADR-0030 (Multi-Standort-Vertrag)
- ADR-0031 (Brand/Location/Area)
- VISION §9 Phase 5

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (559 + 16 = 575) grün
- 14/14 Supabase-Promotion-Queries grün inkl. RLS + PII-Test
- Owner-Acceptance

## Next gate

Task 11 (`11-mother-concern-read-apis.md`) erweitert Mother-Concern-Read um Organization- und Inquiry-Routing-Endpoints.
