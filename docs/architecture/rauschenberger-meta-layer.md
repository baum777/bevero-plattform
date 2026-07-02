# Rauschenberger Meta-Layer Architecture

**Status:** proposed — ADR-0055 (2026-06-09)
**Maintainer:** architect agent / owner

> **Scope:** This document is the Phase A contract for the Rauschenberger Operating Meta-Layer.
> It defines `Organization`, `BusinessUnit`, `EventConcept`, `ExternalCatalogEntry`, and
> the generalized `Inquiry` model. No Prisma migration, no new API route, no new UI surface
> is authorized by this document alone. Those are gated to ADR-0056 (data model) and ADR-0057
> (read APIs v2).

---

## 1. Why a Meta-Layer?

The current `Brand → Location → Area` hierarchy (ADR-0030/0031) covers operational standorts.
Rauschenberger Catering & Restaurants operates **above** that layer — as an event-catering
organization that books **external partner locations**, packages **event concepts** across
brands, and routes **multi-channel inquiries** to business-unit-specific workflows.

The existing hierarchy has no node for:

- An **Organization** (legal entity / mother concern above Brand).
- A **BusinessUnit** (workflow container like "Corporate Events", "Private Events").
- An **EventConcept** (cross-brand event format like "Feel the Forest").
- An **ExternalCatalogEntry** (partner location not owned by Rauschenberger).
- A generalized **Inquiry** (multi-source, multi-BU, PII-aware).

These four concepts form the Rauschenberger Meta-Layer.

---

## 2. Hierarchy (extended)

```text
Organization (Mother Concern)         ← NEW — ADR-0055 / ADR-0056
  └─ BusinessUnit                     ← NEW — workflow container
  │    ├─ BusinessUnitLocation         ← NEW — m:n to Location/ExternalCatalog
  │    └─ BusinessUnitEventConcept     ← NEW — m:n to EventConcept
  ├─ EventConcept                     ← NEW — cross-brand format
  │    └─ EventConceptLocationCompatibility  ← NEW — m:n compatibility
  ├─ ExternalCatalogEntry             ← NEW — partner locations
  ├─ Inquiry                          ← NEW — generalized, replaces EventInquiry long-term
  │    └─ InquiryRoutingRule          ← NEW — deterministic, no LLM
  └─ Brand (existing — gains organizationId FK)
       └─ Location → Area → StorageLocation → InventoryItem
```

| Layer | Owner | Purpose | Prisma model |
|---|---|---|---|
| Organization | Mother concern | Legal entity / cross-brand oversight | NEW (ADR-0056) |
| BusinessUnit | BU lead | Workflow container per service type | NEW (ADR-0056) |
| EventConcept | Brand / Events | Cross-brand event format / theme | NEW (ADR-0056) |
| ExternalCatalogEntry | Events team | Partner venues not owned by Rauschenberger | NEW (ADR-0056) |
| Inquiry | Intake / CRM | Multi-source, multi-BU, PII-sanitized | NEW (ADR-0056) |
| InquiryRoutingRule | Admin | Deterministic keyword/type-based BU routing | NEW (ADR-0056) |
| Brand | Brand team | Groups locations under a brand | existing — gains `organizationId?` FK |
| Location / Area / etc. | Operations | Existing operational hierarchy | unchanged |

---

## 3. Organization

Represents Rauschenberger Catering & Restaurants as a legal top-level entity.
Positioned **above** `Brand` — one Organization may own multiple Brands.

**Conceptual fields:**
- `id`, `name`, `slug` (unique), `headquartersAddress?`, `headquartersPhone?`, `headquartersEmail?`
- `createdAt`, `updatedAt`

**Binding:** `Brand.organizationId` is introduced as an **optional** FK in ADR-0056.
A hard FK constraint is deferred to Phase 5.5 so existing Brand seed data is not broken.

---

## 4. BusinessUnit

A workflow container within an Organization. The five Rauschenberger BUs are:

| BU | `slug` | `defaultWorkflowKey` | Primary access |
|---|---|---|---|
| Corporate Events | `corporate_events` | `event_inquiry_handling` | Admin, Manager |
| Private Events | `private_events` | `event_inquiry_handling` | Admin, Manager |
| Restaurants | `restaurants` | `restaurant_inquiry_handling` | Admin, Manager |
| Book-the-Concept | `book_the_concept` | `concept_booking_handling` | Admin |
| Locations | `locations` | `location_inquiry_handling` | Admin |

**Design decisions:**
- Modeled as a **table** (not an enum) because BU-list can grow (catering subsidiaries, pop-ups).
- `defaultWorkflowKey` is a free string in v1; FK promotion to `WorkflowDefinition` is Phase 5.5.
- `requiredInquiryFields Json?` captures per-BU intake requirements (e.g. `guestCount: required`).

**m:n join tables:**
- `BusinessUnitLocation` — which Locations (own) and ExternalCatalogEntries (partner) serve a BU.
- `BusinessUnitEventConcept` — which EventConcepts are offered by a BU.

---

## 5. EventConcept

Cross-brand, cross-BU event formats. Rauschenberger's seven signature concepts:

| Name | `slug` | Description |
|---|---|---|
| Feel the Forest | `feel_the_forest` | Forest ambience, natural materials, woodland decor |
| Mysterious Urban Venue | `mysterious_urban_venue` | Industrial-chic, hidden-location aesthetic |
| Winter Wonderland | `winter_wonderland` | Winter theme, ice/snow motifs, seasonal |
| Dine Around the World | `dine_around_the_world` | Multi-cuisine stations, world-travel theme |
| Garden Eden | `garden_eden` | Lush green, botanical, outdoor or indoor |
| Heaven Seven Eleven | `heaven_seven_eleven` | Elevated luxury dining at height / penthouse |
| Buena Vida | `buena_vida` | Mediterranean/Latin energy, outdoor summer |
| Custom | `custom` | Bespoke format not covered by above |

**Binding to locations:**
- `EventConceptLocationCompatibility` — m:n join between an EventConcept and a Location (own)
  or ExternalCatalogEntry (partner). Optional `compatibilityScore Int?` (0–100) for planner tooling.
- EventConcepts are owned by the **Organization** (not a BU), because concepts are cross-brand.

---

## 6. ExternalCatalogEntry

Partner venues not owned by Rauschenberger but available for catering assignments.
These are explicitly **not** `Location` rows — they have no `Area`, `StorageLocation`,
`LocationInventoryConfig`, or `OperationalUnit`. They are catalog entries only.

**Examples:**
| Name | City | Type |
|---|---|---|
| Goldberg[Werk] | Stuttgart | PARTNER_SPECIAL_VENUE |
| Legendenhalle | Stuttgart | PARTNER_EVENT_HALL |
| Carl Benz Arena | Stuttgart | PARTNER_CONFERENCE_SPACE |
| ZENITH | München | PARTNER_EVENT_HALL |
| Kesselhaus | Stuttgart | PARTNER_EVENT_HALL |
| Hospitalhof | Stuttgart | PARTNER_CONFERENCE_SPACE |
| Motorworld Manufaktur | Stuttgart | PARTNER_EVENT_HALL |
| Quader 12 | Stuttgart | PARTNER_SPECIAL_VENUE |
| OutOfOffice | Stuttgart | PARTNER_OUTDOOR |

**Key fields:**
- `cateringMode` — `INHOUSE_RAUSCHENBERGER` | `EXTERNAL_EVENT_CATERING` | `HYBRID`
- `logisticsProfile Json?` — e.g. `{ "kitchenAccess": "limited", "loadingDock": true }`
- `isActive Boolean` — soft deactivation only

**Why parallel to Location (not a sub-type)?**
Partner locations never carry inventory, staff rosters, or area-level ops data.
Sub-typing `Location` with a `ownOrPartner` flag would force every Location query
to carry partner-only fields as nullable dead weight. A separate table is cleaner
and avoids nullable anti-patterns.

---

## 7. Inquiry (generalized)

Replaces `EventInquiry` (CUBE-specific, Task 03) as the canonical intake model for all brands.

### 7.1 Migration strategy

`EventInquiry` is **not** dropped in this slice. It is marked deprecated in the schema
and will remain readable for existing Cockpit CUBE views. A Phase 5.4 migration will
provide either a DB view mapping `EventInquiry → Inquiry` or a hard rename with
a `public.event_inquiries` view for backward compatibility.

### 7.2 Inquiry fields overview

| Field | Type | Note |
|---|---|---|
| `source` | Enum | RAUSCHENBERGER_WEBSITE, CUBE_WEBSITE, MOTORWORLD_INN_WEBSITE, MANUAL_ENTRY, EMAIL_IMPORT |
| `subject` | Enum | BUSINESS_DINNER, CORPORATE_EVENT, INCENTIVE, WEDDING, PRIVATE_EVENT, BIRTHDAY, CONFERENCE, SEMINAR, WORKSHOP, CHRISTMAS_PARTY, PRODUCT_PRESENTATION, OTHER |
| `businessUnitHint` | Enum? | Optional at intake; set by routing rule after classify |
| `status` | Enum | NEW → NEEDS_CLASSIFICATION → NEEDS_HUMAN_REVIEW → OFFER_DRAFT → APPROVED → SENT → CONFIRMED → LOST → REJECTED → ARCHIVED |
| `guestCount` | Int? | |
| `preferredDate` | DateTime? | |
| `contactName` | String | PII — sanitized in all list/detail endpoints |
| `contactEmail` | String | PII — sanitized |
| `contactPhone` | String? | PII — sanitized |
| `rawMessage` | String | PII — sanitized |
| `assignedToUserId` | String? | String (no FK in v1); FK promotion Phase 5.5 |
| `routingRuleId` | String? | Audit trail: which rule triggered classification |

### 7.3 PII policy

Per ADR-0021 §5: all List and Detail endpoints strip `rawMessage`, `contactEmail`,
`contactPhone`. Replaced by boolean indicators `hasRawMessage`, `hasContactEmail`,
`hasContactPhone`. Full PII access is reserved for a separate endpoint
`GET /admin/inquiries/:id/full` (RLS-gated, ADR-0062 Phase 5.5).

---

## 8. InquiryRoutingRule

Deterministic keyword/type-based routing — **no LLM, no ML**.

Each rule has:
- `priority Int` — lowest wins (rule 1 fires before rule 10).
- `matchKeywords String[]` — case-insensitive lowercase match on `subject` + `rawMessage`.
- `matchSubjectTypes InquirySubject[]` — optional enum-level match.
- `matchGuestCountMin/Max Int?` — guest-count range guard.
- `businessUnitHint` — target BU if rule fires.

**Example rules (seed data):**

| Priority | Keywords | Subject types | Target BU |
|---|---|---|---|
| 1 | hochzeit, wedding, heirat, trauung | WEDDING | PRIVATE_EVENTS |
| 2 | firmenveranstaltung, corporate, firmenevent, incentive | CORPORATE_EVENT, INCENTIVE | CORPORATE_EVENTS |
| 3 | geburtstag, birthday, jubiläum | BIRTHDAY, PRIVATE_EVENT | PRIVATE_EVENTS |
| 4 | konferenz, seminar, workshop, tagung | CONFERENCE, SEMINAR, WORKSHOP | CORPORATE_EVENTS |
| 5 | weihnachtsfeier, christmas | CHRISTMAS_PARTY | CORPORATE_EVENTS |
| 6 | produktpräsentation, product presentation | PRODUCT_PRESENTATION | CORPORATE_EVENTS |
| 7 | restaurant, abendessen, business dinner | BUSINESS_DINNER | RESTAURANTS |
| 8 | location mieten, eventlocation, venue | — | LOCATIONS |
| 9 | concept booking, feel the forest, winter wonderland | — | BOOK_THE_CONCEPT |
| 10 | (catch-all: guest_count ≥ 200) | — | CORPORATE_EVENTS |

**Rule application:**
1. Load all `isActive = true` rules ordered by `priority ASC`.
2. Normalize `rawMessage + subject` to lowercase.
3. For each rule: check keyword overlap OR subject-type match OR guest-count range.
4. First rule that matches → `businessUnitHint` is set, `routingRuleId` is recorded.
5. No match → `status = NEEDS_HUMAN_REVIEW`, `businessUnitHint = null`.

---

## 9. Cross-Reference Map

| Concept | Defined in | Used in |
|---|---|---|
| `Organization` | ADR-0056 (Task 11) | ADR-0057 (Task 12), ADR-0058 (Task 13) |
| `BusinessUnit` | ADR-0056 | ADR-0057, ADR-0058 |
| `EventConcept` | ADR-0056 | ADR-0057, ADR-0058 |
| `ExternalCatalogEntry` | ADR-0056 | ADR-0057, ADR-0058 |
| `Inquiry` | ADR-0056 | ADR-0057, ADR-0058 |
| `InquiryRoutingRule` | ADR-0056 | ADR-0057 (`classify`) |
| `Brand.organizationId` | ADR-0056 (optional FK) | Phase 5.5 (hard FK) |
| PII sanitization | ADR-0021 §5 | ADR-0057 endpoints, ADR-0058 Cockpit |
| `EventInquiry` deprecation | ADR-0055 contract | ADR-0056 schema, Phase 5.4 migration |
| Full PII endpoint | ADR-0062 (Phase 5.5) | not in this slice |
| Inquiry Mutation Surface | ADR-0061 | not in this slice |

---

## 10. Anti-Things (Hard Non-Goals for all Meta-Layer slices)

- No connector build (FoodNotify / Gastronovi API) — ADR-0002 + ADR-0021 §3.
- No LLM-based event-draft generation — ADR-0021 §3.
- No auto-offer creation — Phase 5.5+ only.
- No offer-flow mutation surface in this slice — ADR-0061.
- No HR / recruiting module.
- No recipe / cost-calculation engine.
- No hotel PMS integration (eviivo remains `ExternalSystemLink`) — ADR-0049.
- No live weather API.
- No push notifications / mobile app / service worker — ADR-0021 §Service-Worker-Strategy.

---

## 11. Open Questions (resolved 2026-06-09)

| # | Question | Resolution |
|---|---|---|
| OQ1 | `Organization` as new model or `Brand` elevation? | New model — semantically distinct. |
| OQ2 | `BusinessUnit` as enum or table? | Table — list can grow. |
| OQ3 | `EventConcept` under `BusinessUnit` or `Organization`? | `Organization` — cross-brand. |
| OQ4 | `ExternalCatalogEntry` parallel or sub-type of `Location`? | Parallel — partner locations carry no inventory. |
| OQ5 | `Inquiry` as new table or rename of `EventInquiry`? | New table; `EventInquiry` deprecated (not dropped). |
| OQ6 | Routing rules as table or hardcoded map? | Table — admin-manageable without deploy. |
| OQ7 | `Inquiry.assignedToUserId` as FK or String? | String in v1; FK Phase 5.5. |

---

## 12. Gate

Per ADR-0055:
- `git diff --stat` shows only `docs/architecture/` + `docs/DECISIONS.md` + `docs/agent-team/*`.
- `prisma validate`, `npm run typecheck`, `vitest` remain unchanged green.
- Owner review.

---

*Document owner: baum777 · Created 2026-06-09 · Governed by ADR-0055*
