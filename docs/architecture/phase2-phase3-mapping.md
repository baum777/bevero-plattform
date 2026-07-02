# Phase 2 & Phase 3 — Detailed Mapping
**Multi-Location + CUBE Professional — Interfaces, Actions, Paths & Data Flows**

> Status: 2026-06-10 | Authoritative sources: ADR-0030, ADR-0031, ADR-0029-A/B/C, ADR-0055–0058, ADR-0062
>
> Scope: every read path between Cockpit (apps/cockpit) and the Fastify backend (src/routes, src/modules) for Multi-Standort (Phase 2) and CUBE Professional (Phase 3). Mutation surfaces are listed where they exist (operational-note, cube-economic manager-verify, cube-source-conflict manager-resolve). The automation surface (Phase B) is out of scope here.

---

## Table of Contents

1. [System Overview & Hierarchy](#1-system-overview--hierarchy)
2. [Phase 2 — Multi-Location](#2-phase-2--multi-location)
   - 2.1 [Data Model Interfaces](#21-data-model-interfaces)
   - 2.2 [API Paths & Signatures](#22-api-paths--signatures)
   - 2.3 [Service Functions](#23-service-functions)
   - 2.4 [Data Flows Frontend ↔ Backend](#24-data-flows-frontend--backend)
   - 2.5 [Frontend Components & Hooks](#25-frontend-components--hooks)
3. [Phase 3 — CUBE Professional](#3-phase-3--cube-professional)
   - 3.1 [Operational Unit (ADR-0029-A)](#31-operational-unit-adr-0029-a)
   - 3.2 [CUBE Source-Conflict Validator (ADR-0029-B)](#32-cube-source-conflict-validator-adr-0029-b)
   - 3.3 [CUBE Event-Economic Rules (ADR-0029-C)](#33-cube-event-economic-rules-adr-0029-c)
   - 3.4 [CUBE Event Inquiry & Mother-Concern Inquiry Layer (ADR-0029-D / ADR-0055–0058)](#34-cube-event-inquiry--mother-concern-inquiry-layer-adr-0029-d--adr-0055-0058)
   - 3.5 [Operational Note](#35-operational-note)
4. [Module Connection Matrix](#4-module-connection-matrix)
5. [Pipeline Overview: Request Lifecycle](#5-pipeline-overview-request-lifecycle)
6. [Cross-Cutting Contracts](#6-cross-cutting-contracts)
   - 6.1 [Known Production Blockers (B1–B4)](#61-known-production-blockers-b1b4)
7. [Spec ↔ Code Drift (AS-IS vs. TO-BE)](#7-spec--code-drift-as-is-vs-to-be)

---

## 1. System Overview & Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Rauschenberger GmbH                           │
│                     (Organization / Mother Concern)                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │  Brand   │    │  Brand   │    │  Brand   │
     │Motorworld│    │  CUBE    │    │ (future) │
     └────┬─────┘    └────┬─────┘    └──────────┘
          │               │
     ┌────┴────┐     ┌────┴─────────┐
     ▼         ▼     ▼              ▼
 Location   Location  Location   Location
 MW BB      MW Inn    CUBE STG   CUBE MUC
     │                    │
  ┌──┴──────┐         ┌───┴──────────────┐
  ▼         ▼         ▼                  ▼
Area      Area    OperationalUnit    OperationalUnit
(Bar)  (Küche)    (RESTAURANT)        (BAR)
  │                    │
  ▼                    ▼
StorageLocation     ServiceSlot
(Regal A1)         (lunch, 12:00-14:00)
  │                    │
  ▼                    ▼
LocationInventoryConfig  GroupRule
(target quantity per site)
```

**Profile discriminator** (ADR-0030 §1, non-negotiable):
- `Location.profile` → `MOTORWORLD_STANDARD | CUBE_PREMIUM | EVENT_BANKETT_FUTURE` (`prisma/schema.prisma:946-952`)
- `OperationalUnit.unitType` → `RESTAURANT | BAR | EVENT | CAFE | OUTDOOR_TERRACE | HOTEL_CONTEXT | LOUNGE` (`prisma/schema.prisma:1084-1094`)
- **Never** branch on `if (name.startsWith("CUBE"))` — only enum-based distinction.

Authority chain (binding):
- `docs/architecture/multi-location-mother-concern.md` (Phase 2 + 5 mother-concern overview)
- `docs/architecture/location-profiles.md` (CUBE_PREMIUM / MOTORWORLD_STANDARD discriminator contract)
- `docs/architecture/cube-premium-compatibility.md` (Phase 3 CUBE premium features)
- `docs/architecture/motorworld-inn-standortlogik.md` (Motorworld-specific extension)
- `docs/architecture/rauschenberger-meta-layer.md` (mother-concern + Phase 5 inquiry + 5.4 EventInquiry deprecation)

---

## 2. Phase 2 — Multi-Location

### 2.1 Data Model Interfaces

**Sources:** `prisma/schema.prisma`, `src/modules/location/location.types.ts`, `src/modules/organization/organization.types.ts`, `src/modules/menu/menu.types.ts`, `src/modules/operational-unit/operational-unit.types.ts`.

| Model | Schema lines | Types/DTOs | RLS migration |
|---|---|---|---|
| `Organization` | `prisma/schema.prisma:1770-1787` | `OrganizationDto` (types:92), `OrganizationRecord` (types:35) | `20260609120001_add_mother_concern_rls/migration.sql:8-18` |
| `BusinessUnit` | `prisma/schema.prisma:1789-1807` | `BusinessUnitDto` (types:103) | `20260609120001_add_mother_concern_rls/migration.sql:25-35` |
| `EventConcept` | `prisma/schema.prisma:1830-1847` | `EventConceptDto` (types:115) | `20260609120001_add_mother_concern_rls/migration.sql:60-70` |
| `EventConceptLocationCompatibility` | `prisma/schema.prisma:1849-1860` | `CompatibleLocationRow` (types:212) | `20260609120001_add_mother_concern_rls/migration.sql:95-106` |
| `ExternalCatalogEntry` | `prisma/schema.prisma:1862-1883` | `ExternalCatalogEntryDto` (types:127) | `20260609120001_add_mother_concern_rls/migration.sql:113-123` |
| `Brand` | `prisma/schema.prisma:962-975` | `BrandListItem` (types:118), `BrandRecord` (types:40) | `20260608171000_add_multi_location_rls/migration.sql:44-55` |
| `Location` | `prisma/schema.prisma:977-1009` | `LocationListItem` (types:126), `LocationDetailDto` (types:142), `LocationProfileDto` (types:146) | `20260608171000_add_multi_location_rls/migration.sql:61-72` |
| `LocationProfile` enum | `prisma/schema.prisma:946-952` | `LocationProfile` union (types:11) | — |
| `StoragePrecisionLevel` enum | `prisma/schema.prisma:954-960` | `StoragePrecisionLevel` (types:16) | — |
| `Area` | `prisma/schema.prisma:1011-1031` | `AreaListItem` (types:154) | `20260608171000_add_multi_location_rls/migration.sql:77-87` |
| `LocationMember` | `prisma/schema.prisma:1033-1049` | `LocationMemberRecord` (types:78) | `20260608171000_add_multi_location_rls/migration.sql:94-104` |
| `LocationInventoryConfig` | `prisma/schema.prisma:1051-1079` | `LocationInventoryConfigListItem` (types:170) | `20260608171000_add_multi_location_rls/migration.sql:109-119` |
| `EventSpace` | `prisma/schema.prisma:1229-1253` | `EventSpaceListItem` (types:290) | `20260609110001_add_motorworld_inn_rls/migration.sql` |
| `ExceptionRule` | `prisma/schema.prisma:1255-1281` | `ExceptionRuleListItem` (types:304) | `20260609110001_add_motorworld_inn_rls/migration.sql` |
| `ReservationConnector` | `prisma/schema.prisma:1283-1300` | `ConnectorListItem` (types:319) | `20260609110001_add_motorworld_inn_rls/migration.sql` |
| `ExternalSystemLink` | `prisma/schema.prisma:1302-1319` | `ExternalSystemLinkListItem` (types:327) | `20260609110001_add_motorworld_inn_rls/migration.sql` |
| `OperationalUnit` | `prisma/schema.prisma:1096-1127` | `OperationalUnitListItem` (types:90), `OperationalUnitDetailDto` (types:106) | `20260609040100_add_operational_units_rls/migration.sql:33-44` |
| `OperationalUnitType` enum | `prisma/schema.prisma:1084-1094` | `OperationalUnitType` (types:11) | — |
| `ServiceSlot` | `prisma/schema.prisma:1129-1151` | `ServiceSlotListItem` (types:112) | `20260609040100_add_operational_units_rls/migration.sql:48-59` |
| `GroupRule` | `prisma/schema.prisma:1153-1169` | `GroupRuleDto` (types:126) | `20260609040100_add_operational_units_rls/migration.sql:63-74` |
| `Menu` | `prisma/schema.prisma:1545-1568` | `MenuListItem` (types:80) | `20260609090001_add_cube_menu_matrix_rls/migration.sql:12-22` |
| `MenuItem` | `prisma/schema.prisma:1570-1593` | `MenuItemDto` (types:93), `MenuItemDetailDto` (types:121) | `20260609090001_add_cube_menu_matrix_rls/migration.sql:24-34` |
| `MenuItem_Ingredient` | `prisma/schema.prisma:1595-1611` | `MenuItemIngredientDto` (types:106) | `20260609090001_add_cube_menu_matrix_rls/migration.sql:36-46` |
| `MenuItem_Allergen` | `prisma/schema.prisma:1613-1626` | `MenuItemAllergenDto` (types:115) | `20260609090001_add_cube_menu_matrix_rls/migration.sql:48-58` |
| `Menu_brutto_netto_invariant` CHECK | migration `20260609090000/migration.sql:53-62` | — | — |

#### DTO shape examples (canonical, from `.types.ts` exports)

```typescript
// src/modules/location/location.types.ts:126
type LocationListItem = {
  id: string;
  name: string;
  slug: string;
  profile: LocationProfile;
  precisionLevel: StoragePrecisionLevel;
  brandId: string;
  isActive: boolean;
  weatherSensitive: boolean;
  cinemaAvailable: boolean;
};

// src/modules/location/location.types.ts:142
type LocationDetailDto = {
  id: string;
  organizationId: string;
  brandId: string;
  name: string;
  slug: string;
  profile: LocationProfile;
  precisionLevel: StoragePrecisionLevel;
  signatureAssets: string[];
  weatherSensitive: boolean;
  cinemaAvailable: boolean;
  brand: { id: string; name: string; slug: string };
  _count: { areas: number; members: number; inventoryConfig: number };
};

// src/modules/location/location.types.ts:344
type TodayOverviewDto = {
  locationId: string;
  date: string;                       // "YYYY-MM-DD"
  serviceSlots: ServiceSlotListItem[];
  openInquiries: OpenInquiryHeader[];
  eventSpaces: EventSpaceListItem[];
  activeExceptionRules: ExceptionRuleListItem[];
};

// src/modules/organization/organization.types.ts:197
type OrganizationOverviewDto = {
  organizationId: string;
  organizationName: string;
  generatedAt: string;               // ISO
  businessUnitCounts: Record<BusinessUnitNameValue, number>;
  locationCount: number;
  externalLocationCount: number;
  signatureAssetCount: number;
  inquiryStats: InquiryStats;
  criticalStockLocations: CriticalStockLocation[];
  activeExceptionRules: ActiveExceptionRule[];
  upcomingEvents: UpcomingEventHeader[];
  locationComparison: LocationComparisonRow[];
};

// src/modules/location/location.types.ts:78
type LocationMemberRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
  isActive: boolean;
};

// src/modules/operational-unit/operational-unit.types.ts:40
type OperationalUnitRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  key: string;                       // profile discriminator, NOT name
  name: string;
  unitType: OperationalUnitType;
  parentContext?: string;            // e.g. "cube-stuttgart"
  requiresManualConfirmation: boolean;
  weatherSensitive: boolean;
  outdoorCapacityRelevant: boolean;
  inventoryScopes: string[];         // ["bar", "kitchen", "storage"]
  dayparts: string[];                // ["lunch", "dinner", "brunch"]
  sortOrder: number;
  isActive: boolean;
};
```

---

### 2.2 API Paths & Signatures

**Convention:** `/admin/...` prefix (ADR-0031 §2 path-convergence, ADR-0023 path-convergence). All routes gated by `operationalRoles = ["admin", "shift_lead", "staff"]` unless noted.

#### 2.2.1 Location routes — `src/routes/location.route.ts`

| Method | Path | Lines | Query | Auth | Service method |
|---|---|---|---|---|---|
| `GET` | `/admin/location/organizations` | 27-40 | — | operational | `LocationService.listOrganizations` (svc:40-43) |
| `GET` | `/admin/location/organizations/:id/brands` | 42-66 | — | operational | `LocationService.listBrands` (svc:45-52) |
| `GET` | `/admin/location/locations` | 68-91 | — | operational | `LocationService.listLocations` (svc:54-64) |
| `GET` | `/admin/location/locations/:id` | 93-120 | — | operational | `LocationService.getLocation` (svc:66-75) |
| `GET` | `/admin/location/locations/:id/profile` | 122-152 | — | operational | `LocationService.getLocationProfile` (svc:77-95) |
| `GET` | `/admin/location/locations/:id/areas` | 154-175 | — | operational | `LocationService.listAreas` (svc:97-110) |
| `GET` | `/admin/location/locations/:id/storage-locations` | 177-204 | — | operational | `LocationService.listStorageLocations` (svc:112-137) |
| `GET` | `/admin/location/locations/:id/inventory-config` | 206-233 | `areaId?`, `activeOnly?` | operational | `LocationService.listInventoryConfig` (svc:139-155) |
| `GET` | `/admin/location/locations/:id/event-spaces` | 235-249 | — | operational | `LocationService.listEventSpaces` (svc:157-171) |
| `GET` | `/admin/location/locations/:id/exception-rules` | 251-269 | `dateFrom?`, `dateTo?`, `type?` | operational | `LocationService.listExceptionRules` (svc:173-204) |
| `GET` | `/admin/location/locations/:id/reservation-connectors` | 271-285 | — | operational | `LocationService.listReservationConnectors` (svc:206-220) |
| `GET` | `/admin/location/locations/:id/external-system-links` | 287-301 | — | operational | `LocationService.listExternalSystemLinks` (svc:222-236) |
| `GET` | `/admin/location/locations/:id/today-overview` | 303-319 | `date?` (default: today) | operational | `LocationService.getTodayOverview` (svc:238-337) |

Deviation (reviewer M4): `LocationService.listOrganizations` returns a single-element array `[{ organizationId: actor.organizationId }]` (svc:40-43) — does not enumerate real orgs. The Cockpit `workspaces/page.tsx:101-126` does not currently call this endpoint and falls back to direct Supabase queries.

#### 2.2.2 Organization routes — `src/routes/organization.route.ts`

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/organization` | 31-46 | operational | `OrganizationService.getOrganization` (svc:58-65) |
| `GET` | `/admin/organization/business-units` | 48-60 | operational | `OrganizationService.listBusinessUnits` (svc:67-74) |
| `GET` | `/admin/organization/event-concepts` | 62-77 | operational | `OrganizationService.listEventConcepts` (svc:76-91) |
| `GET` | `/admin/organization/event-concepts/:id/compatible-locations` | 79-94 | operational | `OrganizationService.listCompatibleLocations` (svc:104-143) |
| `GET` | `/admin/organization/overview` | 96-111 | **admin only** (line 24: `adminRoles = ["admin"]`) | `OrganizationService.getOverview` (svc:145-254, cached 5 min via `OVERVIEW_CACHE_TTL_MS` at svc:48) |
| `GET` | `/admin/organization/external-catalog-entries` | 113-125 | **admin only** | `OrganizationService.listExternalCatalogEntries` (svc:93-102) |

#### 2.2.3 Operational-Unit routes — `src/routes/operational-unit.route.ts`

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/operational-units/locations/:id/units` | 30-54 | operational | `OperationalUnitService.listByLocation` (svc:28-38) |
| `GET` | `/admin/operational-units/:id` | 56-86 | operational | `OperationalUnitService.getById` (svc:40-52) |
| `GET` | `/admin/operational-units/:id/slots` | 88-112 | operational | `OperationalUnitService.listSlots` (svc:54-67) |
| `GET` | `/admin/operational-units/:id/group-rule` | 114-144 | operational | `OperationalUnitService.getGroupRule` (svc:69-84) |

#### 2.2.4 Menu routes — `src/routes/menu.route.ts`

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/menu/operational-units/:unitId/menus` | 33-56 | operational | `MenuService.listByUnitAndSlot` (svc:32-59) |
| `GET` | `/admin/menu/:id` | 58-79 | operational | `MenuService.getById` (svc:61-71) |
| `GET` | `/admin/menu/items/:id` | 81-102 | operational | `MenuService.getItemWithDetails` (svc:73-86) |

---

### 2.3 Service Functions

**Authoritative source files:**
- `src/modules/location/location.service.ts` (read-only surface, line 33-338)
- `src/modules/organization/organization.service.ts` (read-only surface, line 50-271)
- `src/modules/operational-unit/operational-unit.service.ts` (read-only surface, line 21-85)
- `src/modules/menu/menu.service.ts` (read-only surface, line 25-87)

#### 2.3.1 `LocationService` (`location.service.ts:33-338`)

```typescript
class LocationService implements LocationServicePort {
  listOrganizations(actor: Actor): Promise<OrganizationReadDto[]>;
  // 40-43 — returns [{ organizationId: actor.organizationId }] (stub)

  listBrands(actor: Actor, organizationId: string): Promise<BrandListItem[]>;
  // 45-52

  listLocations(actor: Actor, organizationId: string): Promise<LocationListItem[]>;
  // 54-64 — does NOT filter by LocationMember.userId (reviewer M4)

  getLocation(actor: Actor, locationId: string): Promise<LocationDetailDto | null>;
  // 66-75

  getLocationProfile(actor: Actor, locationId: string): Promise<LocationProfileDto | null>;
  // 77-95 — returns { profile, precisionLevel, weatherSensitive, cinemaAvailable }

  listAreas(actor: Actor, locationId: string): Promise<AreaListItem[]>;
  // 97-110

  listStorageLocations(actor: Actor, locationId: string): Promise<LocationStorageLocationListItem[]>;
  // 112-137 — joins Area → StorageLocation hierarchy

  listInventoryConfig(actor: Actor, locationId: string): Promise<LocationInventoryConfigListItem[]>;
  // 139-155

  listEventSpaces(actor: Actor, locationId: string): Promise<EventSpaceListItem[]>;
  // 157-171

  listExceptionRules(
    actor: Actor,
    locationId: string,
    options?: { dateFrom?: string; dateTo?: string; type?: ExceptionRuleTypeValue }
  ): Promise<ExceptionRuleListItem[]>;
  // 173-204

  listReservationConnectors(actor: Actor, locationId: string): Promise<ConnectorListItem[]>;
  // 206-220

  listExternalSystemLinks(actor: Actor, locationId: string): Promise<ExternalSystemLinkListItem[]>;
  // 222-236

  getTodayOverview(actor: Actor, locationId: string, date: string): Promise<TodayOverviewDto | null>;
  // 238-337 — uses daysOfWeekMask + localHHMM filter at 275-298
}
```

#### 2.3.2 `OrganizationService` (`organization.service.ts:50-271`)

```typescript
class OrganizationService implements OrganizationServicePort {
  getOrganization(actor: Actor): Promise<OrganizationDto | null>;
  // 58-65

  listBusinessUnits(actor: Actor): Promise<BusinessUnitDto[]>;
  // 67-74

  listEventConcepts(actor: Actor, options?: { businessUnitId?: string }): Promise<EventConceptDto[]>;
  // 76-91 — businessUnitId is a soft no-op (line 86-89 comment)

  listExternalCatalogEntries(actor: Actor): Promise<ExternalCatalogEntryDto[]>;
  // 93-102

  listCompatibleLocations(actor: Actor, eventConceptId: string): Promise<CompatibleLocationRow[]>;
  // 104-143

  getOverview(actor: Actor): Promise<OrganizationOverviewDto | null>;
  // 145-254 — cached 5 min (svc:48 OVERVIEW_CACHE_TTL_MS)
  // Includes locationComparison aggregation (reviewer M6/M7 caveats)
}
```

#### 2.3.3 `OperationalUnitService` (`operational-unit.service.ts:21-85`)

```typescript
class OperationalUnitService implements OperationalUnitServicePort {
  listByLocation(actor: Actor, locationId: string): Promise<OperationalUnitListItem[]>;
  // 28-38

  getById(actor: Actor, unitId: string): Promise<OperationalUnitDetailDto | null>;
  // 40-52

  listSlots(actor: Actor, unitId: string): Promise<ServiceSlotListItem[]>;
  // 54-67

  getGroupRule(actor: Actor, unitId: string): Promise<GroupRuleDto | null>;
  // 69-84
}
```

#### 2.3.4 `MenuService` (`menu.service.ts:25-87`)

```typescript
class MenuService implements MenuServicePort {
  listByUnitAndSlot(
    actor: Actor,
    unitId: string,
    options?: { slotKind?: string; activeOnly?: boolean }
  ): Promise<MenuListItem[]>;
  // 32-59

  getById(actor: Actor, menuId: string): Promise<MenuDetailDto | null>;
  // 61-71

  getItemWithDetails(actor: Actor, itemId: string): Promise<MenuItemDetailDto | null>;
  // 73-86
}
```

---

### 2.4 Data Flows Frontend ↔ Backend

#### Flow A: Workspace detail page resolves location context

```
apps/cockpit/app/(app)/workspaces/[locationId]/layout.tsx
  │  (no per-location auth check — reviewer M5)
  │
  ├─ apps/cockpit/lib/supabase/queries/locations.ts:20-31
  │   supabase.from("Location").select(...).eq("id", params.locationId)
  │   → returns raw Location row
  │
  └─ <LocationContextProvider value={location}>
       │
       ├─ /admin/location/locations/:id/profile          (location.route.ts:122-152)
       │   → LocationProfileDto { profile, precisionLevel, weatherSensitive, cinemaAvailable }
       │
       └─ /admin/location/locations/:id/today-overview  (location.route.ts:303-319)
           → TodayOverviewDto (ServiceSlot list, ExceptionRule list, EventSpace list)
```

#### Flow B: Location picker (standort-picker)

```
apps/cockpit/app/(app)/workspaces/page.tsx:101-126
  │
  ├─ apps/cockpit/lib/supabase/queries/locations.ts:20-31
  │   supabase direct query against Location table
  │   (no LocationMember narrowing — reviewer M4)
  │
  └─ <LocationTile location={...} onClick=...>
       │  onClick: router.push(`/workspaces/${location.id}`)
       └─ /admin/location/locations/:id  (location.route.ts:93-120)
```

#### Flow C: CUBE Service-Slot Dashboard (cockpit tab)

```
apps/cockpit/app/(app)/workspaces/[locationId]/cube/page.tsx
  │
  ├─ apps/cockpit/lib/cube-hooks.ts:37-58  useServiceSlots(unitId, date)
  │   fetches: ${apiBase()}/admin/location/units/${unitId}/service-slots
  │   ❌ WRONG URL — server route is /admin/operational-units/:id/slots
  │   Reviewer B3 — CUBE service-slot dashboard 404's in production
  │
  └─ apps/cockpit/lib/cube-hooks.ts:61-83  useMenuCatalog(unitId, slotKind)
      fetches: ${apiBase()}/admin/menu/operational-units/${unitId}/menus?slotKind=...
      (correct URL — menu.route.ts:33-56)
```

#### Flow D: Event-Spaces tab (Motorworld)

```
apps/cockpit/app/(app)/workspaces/[locationId]/event-spaces/page.tsx
  │
  └─ apps/cockpit/lib/motorworld-hooks.ts:38-62  useEventSpaces(locationId)
      fetches: ${apiBase()}/admin/location/locations/${locationId}/event-spaces
      (correct URL — location.route.ts:235-249)
```

#### Flow E: Exception-Rules tab (Motorworld)

```
apps/cockpit/app/(app)/workspaces/[locationId]/calendar/page.tsx
  │
  └─ apps/cockpit/lib/motorworld-hooks.ts:119-155  useExceptionRules(locationId, opts)
      fetches: ${apiBase()}/admin/location/locations/${locationId}/exception-rules?...
      (correct URL — location.route.ts:251-269)
```

#### Flow F: Mother-Concern overview

```
apps/cockpit/app/(app)/mother-concern/page.tsx
  │
  └─ apps/cockpit/lib/mother-concern-hooks.ts:215-217  useOrganizationOverview
      fetches: ${apiBase()}/admin/organization/overview
      (organization.route.ts:96-111, admin-gated)
      → OrganizationOverviewDto (KPI tiles, locationComparison table)
      Reviewer M6/M7: criticalStockLocations and openInquiries are placeholders
      (organization.service.ts:319-351, 362-390)
```

#### Flow G: Mother-Concern / Partner-Locations

```
apps/cockpit/app/(app)/mother-concern/partner-locations/page.tsx
  │
  ├─ useBusinessUnits()         → /admin/organization/business-units         (org.route.ts:48-60)
  ├─ useEventConcepts()         → /admin/organization/event-concepts         (org.route.ts:62-77)
  ├─ useCompatibleLocations(id) → /admin/organization/event-concepts/:id/...  (org.route.ts:79-94)
  └─ useExternalCatalogEntries()→ /admin/organization/external-catalog-entries (org.route.ts:113-125)
```

#### Flow H: Mother-Concern / Event-Concepts

```
apps/cockpit/app/(app)/mother-concern/event-concepts/page.tsx
  │
  └─ useEventConcepts()        → /admin/organization/event-concepts          (org.route.ts:62-77)
```

#### Auth contract for all Cockpit client hooks

All Phase 2/3 hooks currently use `fetch(url, { credentials: "include" })` without an `Authorization: Bearer <token>` header:
- `apps/cockpit/lib/cube-hooks.ts:46,71,97`
- `apps/cockpit/lib/mother-concern-hooks.ts:195,289`
- `apps/cockpit/lib/motorworld-hooks.ts:49,76,103,142`

The backend's `parseActorFromHeaders` (`src/modules/auth/actor.ts:55-88`) requires `authorization: Bearer <jwt>` and returns 401 otherwise. **This is Blocker B2** (§6.1).

The server-rendered `workspaces/page.tsx:20-31` uses direct Supabase queries and works because it has a session cookie; it does not exercise the backend API at all.

---

### 2.5 Frontend Components & Hooks

| File | Type | Purpose | Backend binding |
|---|---|---|---|
| `apps/cockpit/lib/supabase/queries/locations.ts:20-31` | Supabase direct query | Location list for picker | reads `Location` table directly (RLS via PostgREST) |
| `apps/cockpit/lib/location-context.tsx` | Context provider | Holds `Location` + `LocationProfile` in React tree | `/admin/location/locations/:id` + `/profile` (location.route.ts:93-152) |
| `apps/cockpit/lib/location-tiles.ts` | Utility | Builds LocationTile data | `LocationListItem` shape (location.types.ts:126) |
| `apps/cockpit/lib/cube-hooks.ts:37-58` | Hook | Service slot list | ⚠ wrong URL — should be `/admin/operational-units/:id/slots` (B3) |
| `apps/cockpit/lib/cube-hooks.ts:61-83` | Hook | Menu catalog per unit | `/admin/menu/operational-units/:id/menus` (menu.route.ts:33-56) |
| `apps/cockpit/lib/cube-hooks.ts:86-109` | Hook | CUBE event inquiries (per unit) | ⚠ `unitId` is dropped on backend (M8) |
| `apps/cockpit/lib/mother-concern-hooks.ts:215-217` | Hook | Mother-concern KPI strip | `/admin/organization/overview` (org.route.ts:96-111) |
| `apps/cockpit/lib/mother-concern-hooks.ts:219-242` | Hooks | Business units / event concepts / external catalog | `/admin/organization/{business-units,event-concepts,external-catalog-entries}` |
| `apps/cockpit/lib/mother-concern-hooks.ts:244-269` | Hooks | Inquiry list / detail / audit | `/admin/inquiries{,/:id{,/audit}}` (inquiry.route.ts:42-97) |
| `apps/cockpit/lib/mother-concern-hooks.ts:280-309` | Hook | `useClassifyInquiry` (POST) | `/admin/inquiries/classify` (inquiry.route.ts:101-128) |
| `apps/cockpit/lib/motorworld-hooks.ts:38-62` | Hook | Event spaces per location | `/admin/location/locations/:id/event-spaces` (location.route.ts:235-249) |
| `apps/cockpit/lib/motorworld-hooks.ts:65-89` | Hook | Reservation connectors per location | `/admin/location/locations/:id/reservation-connectors` (location.route.ts:271-285) |
| `apps/cockpit/lib/motorworld-hooks.ts:92-116` | Hook | External system links per location | `/admin/location/locations/:id/external-system-links` (location.route.ts:287-301) |
| `apps/cockpit/lib/motorworld-hooks.ts:119-155` | Hook | Exception rules per location | `/admin/location/locations/:id/exception-rules` (location.route.ts:251-269) |

---

## 3. Phase 3 — CUBE Professional

### 3.1 Operational Unit (ADR-0029-A)

#### Interface (canonical, from `src/modules/operational-unit/operational-unit.types.ts`)

```typescript
// types.ts:11
type OperationalUnitType =
  | "RESTAURANT"
  | "BAR"
  | "EVENT"
  | "CAFE"
  | "OUTDOOR_TERRACE"
  | "HOTEL_CONTEXT"
  | "LOUNGE";

// types.ts:40
interface IOperationalUnit {
  id: string;
  organizationId: string;
  locationId: string;
  key: string;                       // profile discriminator, NOT name
  name: string;
  unitType: OperationalUnitType;
  parentContext?: string;            // e.g. "cube-stuttgart", "hotel_floor_2"
  requiresManualConfirmation: boolean;
  weatherSensitive: boolean;
  outdoorCapacityRelevant: boolean;
  inventoryScopes: string[];         // ["bar", "kitchen", "storage"]
  dayparts: string[];                // ["lunch", "dinner", "brunch"]
  sortOrder: number;
  isActive: boolean;
  serviceSlots?: IServiceSlot[];
  groupRules?: IGroupRule[];
}

// types.ts:59
interface IServiceSlot {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  slotKind: string;                  // "lunch" | "dinner" | "brunch" | "event"
  name: string;
  daysOfWeekMask: number;            // bitmask 0-127, bit 0 = Sunday
  startTimeLocal: string;            // "HH:MM"
  endTimeLocal: string;
  kitchenTimeLocal?: string;
  inventoryImpact: string[];
  sortOrder: number;
  isActive: boolean;
}

// types.ts:76
interface IGroupRule {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  alaCarteMaxGuests: number;
  groupMenuRequiredFrom: number;
  bankettInquiryFrom: number;
  exclusiveRentalFrom?: number;
  seatedMenuMax?: number;
  standingReceptionMax?: number;
}
```

Drift note (reviewer M2): `docs/architecture/motorworld-inn-standortlogik.md:32` lists `CAFE_BAR`, `OUTDOOR_BAR_TERRACE`, `EVENT_BANKETT`, `COLLECTIVE_OTHER` — these values **do not exist** in the Prisma enum. The spec is the lie. The seed file `prisma/seeds/operational_units.sql` uses `RESTAURANT`, `OUTDOOR_TERRACE`, `EVENT` (the real enum values).

#### API paths

See §2.2.3 — all 4 endpoints are path-encoded under `/admin/operational-units/...` per ADR-0029-A §14 binding (no `fastify.register({ prefix })`).

#### Service functions

See §2.3.3 — `OperationalUnitService` (operational-unit.service.ts:21-85).

#### Data flow: CUBE Service-Slot Dashboard

```
cockpit: /workspaces/[locationId]/cube/service-slots
  │
  ├─ LocationContextProvider asserts profile === "CUBE_PREMIUM" (apps/cockpit/lib/location-context.tsx)
  │
  ├─ GET /admin/operational-units/locations/:id/units      (operational-unit.route.ts:30-54)
  │   → OperationalUnitListItem[] filtered to unitType ∈ {RESTAURANT, BAR, EVENT}
  │
  ├─ For each unit:
  │   GET /admin/operational-units/:id/slots                (operational-unit.route.ts:88-112)
  │   → ServiceSlotListItem[] with daysOfWeekMask
  │
  └─ <ServiceSlotCalendar units={...} slots={...} />
       → decodeDaysOfWeek(mask) → ['Mo','Di','Mi','Do','Fr']
       → kitchenTimeLocal → lead-time indicator
```

**Note:** the existing Cockpit implementation in `apps/cockpit/lib/cube-hooks.ts:46` uses the wrong path `/admin/location/units/${unitId}/service-slots` — see §6.1 B3.

---

### 3.2 CUBE Source-Conflict Validator (ADR-0029-B)

#### Interface (canonical, from `src/modules/cube-source-conflict/cube-source-conflict.types.ts`)

```typescript
// Confidence is stored as enum (CERTAIN/HIGH/MEDIUM/LOW) in service layer
// and as Zod-validated string in route layer (cube-source-conflict.route.ts:74-76):
// "confirmed" | "conflict_detected" | "requires_manager_confirmation"

interface ICUBE_Source {
  id: string;
  organizationId: string;
  locationId: string;
  name: string;                      // e.g. "CUBE_WEBSITE", "CUBE_BANKETTMAPPE_PDF"
  displayName: string;
  version: number;                   // 1..100
  retrievedAt: Date;
  url: string | null;
  payloadHash: string | null;
  isActive: boolean;
  enteredBy: string | null;
}

interface ICUBE_SourceField {
  id: string;
  cubeSourceId: string;
  fieldKey: string;                  // e.g. "table_count", "capacity"
  fieldValue: string;                // ≤ 500 chars (PII defense)
  confidence: CUBE_SourceFieldConfidence;
  conflictCount: number;
  isActive: boolean;
  discoveredAt: Date;
}

interface ICUBE_Conflict {
  id: string;
  organizationId: string;
  locationId: string;
  sourceAId: string;
  sourceBId: string;
  fieldKey: string;
  valueA: string;
  valueB: string;
  severity: "critical" | "warning" | "info";
  resolvedAt: Date | null;
  resolvedBy: string | null;
  winningFieldValue: string | null;
  resolutionNotes: string | null;
  createdAt: Date;
}
```

#### API paths — `src/routes/cube-source-conflict.route.ts`

All paths are path-encoded under `/admin/cube/...` per ADR-0029-B §14 binding.

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/cube/sources` | 91-117 | operational (`active` query: `true`/`false`) | `CUBE_SourceConflictService.listSources` (svc:185-205) |
| `GET` | `/admin/cube/sources/:id` | 119-145 | operational | `CUBE_SourceConflictService.getSource` (svc:207-220) |
| `GET` | `/admin/cube/sources/:id/fields` | 147-170 | operational | `CUBE_SourceConflictService.listFields` (svc:222-240) |
| `GET` | `/admin/cube/conflicts` | 172-207 | operational (`resolved`, `fieldKey` query) | `CUBE_SourceConflictService.detectConflicts` (svc:242-285) |
| `GET` | `/admin/cube/conflicts/:id` | 209-235 | operational | `CUBE_SourceConflictService.getConflict` (svc:287-300) |
| `POST` | `/admin/cube/conflicts/:id/resolve` | 242-284 | **manager (admin + shift_lead)** (line 36) | `CUBE_SourceConflictService.resolveConflict` (svc:380-440) |
| `POST` | `/admin/cube/conflicts/:id/reject` | 286-326 | **manager** | `CUBE_SourceConflictService.rejectConflict` (svc:442-480) |
| `POST` | `/admin/cube/sources` | 328-375 | **manager** | `CUBE_SourceConflictService.enterSource` (svc:330-378) |

#### RLS guard (binding)

The 3 mutation endpoints (resolve, reject, enter-source) are gated by **two** layers:
1. **Route layer** — `managerRoles = ["admin", "shift_lead"]` (cube-source-conflict.route.ts:36).
2. **RLS + trigger guard** — `prisma/migrations/20260609050001_add_cube_source_conflict_rls/migration.sql:121-135` creates `cube_conflict_block_update` and `cube_conflict_block_delete` BEFORE triggers. The relaxed migration `20260609080001_relax_cube_source_append_only/migration.sql` modifies the trigger to honor the `bevero.allow_cube_source_update` GUC, which the service sets inside a `SET LOCAL` transaction.

#### Data flow: Conflict Dashboard

```
cockpit: /workspaces/[locationId]/cube/conflicts
  │
  ├─ GET /admin/cube/conflicts?resolved=false&fieldKey=...  (cube-source-conflict.route.ts:172-207)
  │   → CUBE_Conflict[] sorted by severity (critical first)
  │
  ├─ <ConflictList conflicts={...} />
  │   → severity "critical" → red badge + immediate action
  │   → severity "warning"  → orange badge
  │   → severity "info"     → gray, collapsible
  │
  └─ onResolve(conflict):
       POST /admin/cube/conflicts/:id/resolve              (cube-source-conflict.route.ts:242-284)
       body: { winningFieldValue, reason?, notes?, clientRequestId? }
       → 200: { conflict, decision, workflowTask? }
```

---

### 3.3 CUBE Event-Economic Rules (ADR-0029-C)

#### Interface (canonical, from `src/modules/cube-economic/cube-economic.types.ts`)

```typescript
// types.ts:35
type StaffRole =
  | "KITCHEN_APPRENTICE"
  | "KITCHEN_STAFF"
  | "KITCHEN_LEAD"
  | "SERVICE_APPRENTICE"
  | "SERVICE_STAFF"
  | "SERVICE_LEAD"
  | "EVENT_COORDINATOR";

// types.ts:37
type NonFoodCategory =
  | "included_by_default"
  | "optional_addon"
  | "cost_driver";

// types.ts:39
type FurniturePolicySource =
  | "EXCLUSIVE_RENTAL_PARTNER"
  | "INTERNAL_STORAGE"
  | "EXTERNAL_CONTRACTOR"
  | "CUBE_WEBSITE"                   // inferred from cube-restaurant.de URL prefix
  | "CUBE_BANKETTMAPPE_PDF"          // inferred from null URL
  | "OTHER";

interface IExclusiveRentalPolicy {
  id: string;
  organizationId: string;
  locationId: string;
  eventUnitId: string;               // FK → OperationalUnit (unitType = EVENT)
  minimumGuestCount: number;
  requiresContractReview: boolean;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  priceMode: "NETTO" | "BRUTTO";
  baseRentalNetCents: number;
  perHeadNetCents: number | null;
  setupFeesNetCents: number | null;
}

interface IAfterMidnightStaffRate {
  id: string;
  organizationId: string;
  locationId: string;
  staffRole: StaffRole;
  hourlyRateNetCents: number;
  breakRequirementMins: number;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
  requiresManagerConfirmation: boolean;
  notes: string | null;
}

interface INonFoodComponent {
  id: string;
  organizationId: string;
  locationId: string;
  eventUnitId: string;
  category: NonFoodCategory;
  name: string;
  unitNetCents: number;
  standardQuantity: number;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
}

interface IFurniturePolicy {
  id: string;
  organizationId: string;
  locationId: string;
  eventUnitId: string;
  furnitureType: string;
  source: FurniturePolicySource;
  costPerUnitNetCents: number;
  minimumRentalDays: number;
  setupChargeNetCents: number | null;
  requiresManagerConfirmation: boolean;
  notes: string | null;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
}
```

**Monetary convention (binding):**
- All price fields carry suffix `NetCents` (integer; `1€ = 100`).
- Frontend formatting: `new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)`.
- `priceMode = "BRUTTO"` → frontend multiplies by 1.19 (MwSt).

#### API paths — `src/routes/cube-economic.route.ts`

All paths are path-encoded under `/admin/cube/economic/...` per ADR-0029-B §14 binding.

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/cube/economic/exclusive-rental` | 121-141 | operational | `CUBE_EconomicService.getActiveExclusiveRentalPolicy` (svc:175-193) |
| `GET` | `/admin/cube/economic/staff-rates` | 143-163 | operational | `CUBE_EconomicService.listAfterMidnightStaffRates` (svc:195-204) |
| `GET` | `/admin/cube/economic/non-food` | 165-191 | operational (`category` query) | `CUBE_EconomicService.listNonFoodComponents` (svc:206-220) |
| `GET` | `/admin/cube/economic/furniture` | 193-211 | operational | `CUBE_EconomicService.listFurniturePolicies` (svc:222-231) |
| `POST` | `/admin/cube/economic/exclusive-rental/:id/verify` | 221-226 | **manager (admin + shift_lead)** | `CUBE_EconomicService.verifyManagerConfirmation` (svc:250-318) |
| `POST` | `/admin/cube/economic/staff-rates/:id/verify` | 228-233 | manager | same |
| `POST` | `/admin/cube/economic/non-food/:id/verify` | 235-240 | manager | same |
| `POST` | `/admin/cube/economic/furniture/:id/verify` | 242-247 | manager | same |

The 4 verify endpoints share a single Zod body schema `verifyBodySchema` (cube-economic.route.ts:41-53). The service narrows by `rowKind` (cube-economic.types.ts:327) and rejects unknown field combinations with 422.

#### RLS guard (binding)

- SELECT policies: `prisma/migrations/20260609060001_add_cube_event_economics_rls/migration.sql` (one per table).
- Append-only triggers: same migration, one per table. Relaxed by `prisma/migrations/20260609070001_relax_cube_economic_append_only/migration.sql` to honor the `bevero.allow_cube_economic_update` GUC.
- Manager-update policies: `prisma/migrations/20260609070000_add_cube_economic_manager_update_policies/migration.sql` adds `WITH CHECK`-gated UPDATE policies, scoped to the GUC.
- The service sets `bevero.allow_cube_economic_update` via `SET LOCAL` at the start of every transaction that runs a `verify` path.

#### Data flow: Event cost-estimate (frontend computation only)

```
cockpit: /workspaces/[locationId]/cube/event-ops/[eventId]/cost-estimate
  │
  ├─ GET /admin/operational-units/:eventUnitId   (operational-unit.route.ts:56-86)
  │   → OperationalUnitDetailDto (with groupRules)
  │
  ├─ Parallel reads:
  │   ├─ GET /admin/cube/economic/exclusive-rental
  │   ├─ GET /admin/cube/economic/staff-rates
  │   ├─ GET /admin/cube/economic/non-food?category=...
  │   └─ GET /admin/cube/economic/furniture
  │
  ├─ Frontend computation (no backend compute endpoint):
  │   totalRental = baseRentalNetCents + (guestCount * perHeadNetCents)
  │   staffCost = staffRates.reduce(computeOvertimeCost)
  │   nonFood = nonFoodComponents.reduce(sumComponents)
  │
  └─ <EventCostBreakdown total={...} lines={...} />
       → All values in € (cents / 100)
       → priceMode === "BRUTTO" → × 1.19 MwSt
```

Note: `computeEventCostEstimate` is not yet a backend endpoint — only frontend computation exists.

---

### 3.4 CUBE Event Inquiry & Mother-Concern Inquiry Layer (ADR-0029-D / ADR-0055–0058)

This section covers two read-only inquiry surfaces that landed in the same slice:
- **CUBE Event Intake** (`event-inquiry` module) — premium-event intake.
- **Mother-Concern Inquiry** (`inquiry` + `inquiry-routing` modules) — `Organization`-level inquiry funnel.

#### 3.4.1 Event Inquiry module — `src/modules/event-inquiry/`

##### Interface (canonical, from `src/modules/event-inquiry/event-inquiry.types.ts`)

```typescript
interface IEventInquiry {
  id: string;
  organizationId: string;
  operationalUnitId: string;         // FK → OperationalUnit
  subject: string;
  preferredDate: Date | null;
  preferredLocationId: string | null;
  contactName: string | null;        // PII — only via full-detail route
  contactNameInitials: string;       // PII-safe projection
  contactEmail: string | null;       // PII
  contactPhone: string | null;       // PII
  guestCount: number | null;
  status: "open" | "in_review" | "accepted" | "declined" | "cancelled";
  assignedToUserId: string | null;
  source: string;                    // "DIRECT" | "EVENT_INTAKE_FORM" | "CUBE_SALES_OUTREACH"
  externalRef: string | null;
  confirmationExpectedWithinMinutes: number;  // default 10
  createdAt: Date;
  updatedAt: Date;
}

interface IEventPackage {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  name: string;
  priceMode: "NETTO" | "BRUTTO";
  scope: string;
  courseCount: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
}

interface IBeveragePackage {
  id: string;
  organizationId: string;
  name: string;
  priceMode: "NETTO" | "BRUTTO";
  scope: string;
  courseCount: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
}
```

##### API paths — `src/routes/event-inquiry.route.ts`

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/cube/event-inquiries` | 33-45 | operational | `EventInquiryService.listInquiries` (svc:45-52) |
| `GET` | `/admin/cube/event-inquiries/:id` | 47-68 | operational | `EventInquiryService.getInquiry` (svc:54-72) — enforces `assignedToUserId` per-row scope (svc:65-70) |
| `GET` | `/admin/cube/event-packages` | 70-84 | operational (`unitId?` query) | `EventInquiryService.listPackages` (svc:74-91) |
| `GET` | `/admin/cube/event-packages/:id` | 86-107 | operational | `EventInquiryService.getPackage` (svc:93-105) |
| `GET` | `/admin/cube/beverage-packages` | 109-122 | operational | `EventInquiryService.listBeveragePackages` (svc:107-114) |

RLS: `prisma/migrations/20260609100001_add_cube_event_intake_rls/migration.sql:26-42` is the **only** Phase 2/3 RLS policy that includes a per-row `assignedToUserId = auth.uid()` constraint.

Drift note (reviewer M3): `listInquiries` returns the entire org's inquiries without the per-row scope. The `assignedToUserId` scope is enforced only in `getInquiry` (svc:65-70). Staff can still see inquiries assigned to other staff members via the list endpoint.

Drift note (reviewer M8): `apps/cockpit/lib/cube-hooks.ts:86-109` calls `/admin/cube/event-inquiries?unitId=...&status=...` but the backend route (event-inquiry.route.ts:33-45) **ignores `unitId`**. The hook's `unitId` parameter is dropped on the floor.

#### 3.4.2 Inquiry + Inquiry-Routing modules (mother-concern) — `src/modules/inquiry/`

##### Interface (canonical, from `src/modules/inquiry/inquiry.types.ts`)

```typescript
type BusinessUnitNameValue =
  | "CORPORATE_EVENTS"
  | "PRIVATE_EVENTS"
  | "RESTAURANTS"
  | "BOOK_THE_CONCEPT"
  | "LOCATIONS";

type InquiryStatusValue =
  | "new"
  | "in_review"
  | "routed"
  | "converted"
  | "closed"
  | "spam";

type InquirySourceValue =
  | "WEBSITE"
  | "EMAIL"
  | "PHONE"
  | "PARTNER"
  | "MANUAL";

type InquirySubjectValue =
  | "WEIHNACHTSFEIER"
  | "SOMMERFEST"
  | "HOCHZEIT"
  | "GEBURTSTAG"
  | "TAGUNG"
  | "RESTAURANT_RESERVIERUNG"
  | "CATERING"
  | "SONSTIGES";

interface IInquiry {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue | null;
  source: InquirySourceValue;
  subject: InquirySubjectValue;
  customSubject: string | null;
  rawMessage: string | null;          // PII — only via /admin/inquiries/:id (full)
  contactName: string | null;         // PII
  contactNameInitials: string;        // PII-safe projection
  contactEmail: string | null;        // PII
  contactPhone: string | null;        // PII
  contactAddress: string | null;      // PII
  guestCount: number | null;
  preferredDate: Date | null;
  preferredLocationId: string | null;
  preferredExternalCatalogEntryId: string | null;
  externalRef: string | null;
  status: InquiryStatusValue;
  assignedToUserId: string | null;
  routingRuleId: string | null;
  hasRawMessage: boolean;
  hasContactEmail: boolean;
  hasContactPhone: boolean;
  hasContactAddress: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IInquiryClassificationAudit {
  id: string;
  inquiryId: string | null;
  matchedRuleId: string | null;
  matchedKeywords: string[];
  confidence: number;
  businessUnitHint: BusinessUnitNameValue | null;
  callerUserId: string | null;
  createdAt: Date;
}
```

##### API paths — `src/routes/inquiry.route.ts`

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `GET` | `/admin/inquiries` | 42-62 | operational (`status`, `businessUnitHint`, `source`, `dateFrom`, `dateTo`, `limit`, `offset` query) | `InquiryService.listInquiries` (svc:35-54) |
| `GET` | `/admin/inquiries/:id` | 64-79 | operational | `InquiryService.getInquiry` (svc:56-66) — header DTO, strips PII |
| `GET` | `/admin/inquiries/:id/audit` | 82-97 | operational | `InquiryService.listClassificationAudit` (svc:89-114) — PII-sanitized |
| `POST` | `/admin/inquiries/classify` | 101-128 | operational | `InquiryService.classifyInquiry` (svc:68-87) — writes **only** to `InquiryClassificationAudit`; no Inquiry mutation |

The `POST /admin/inquiries/classify` endpoint is the only mutation surface in this module and is the **exception to the read-only rule** allowed by ADR-0021 §3 (audit-log write only).

##### RLS: `prisma/migrations/20260609120001_add_mother_concern_rls/migration.sql:130-175` — three policies:
- `Inquiry_select_org_members` (130-140)
- `InquiryRoutingRule_select_org_members` (147-157)
- `InquiryClassificationAudit_select_org_members` (164-175)

All have `app_runtime` SELECT grants.

#### 3.4.3 Data flow: CUBE Event Inquiry dashboard

```
cockpit: /workspaces/[locationId]/event-ops/inquiries
  │
  └─ apps/cockpit/lib/cube-hooks.ts:86-109  useEventInquiries(unitId, status)
      fetches: ${apiBase()}/admin/cube/event-inquiries?unitId=...&status=...
      → backend drops unitId (M8)
      → EventInquiryHeader[] list (PII stripped)
```

#### 3.4.4 Data flow: Mother-Concern inquiry list

```
cockpit: /inquiries
  │
  └─ apps/cockpit/lib/mother-concern-hooks.ts:244-254  useInquiries(filters)
      fetches: ${apiBase()}/admin/inquiries?{status,businessUnitHint,source,dateFrom,dateTo,limit,offset}
      → InquiryListItem[] (PII stripped; hasContactEmail/Phone/Address boolean flags)
```

#### 3.4.5 Data flow: Inquiry detail

```
cockpit: /inquiries/[inquiryId]
  │
  ├─ useInquiry(id)         → /admin/inquiries/:id            (inquiry.route.ts:64-79)
  │   → InquiryDetailHeader (no PII body, only contactNameInitials + flags)
  │
  └─ useInquiryAudit(id)    → /admin/inquiries/:id/audit      (inquiry.route.ts:82-97)
      → InquiryAuditEntry[] (PII-sanitized classification history)
```

#### 3.4.6 Data flow: Inquiry classification (POST)

```
cockpit: /inquiries/[inquiryId]  (manager UI action)
  │
  └─ useClassifyInquiry().classify({ rawMessage, subject?, guestCount?, inquiryId?, commit? })
      POST /admin/inquiries/classify                            (inquiry.route.ts:101-128)
      → InquiryService.classifyInquiry
        - Parses message, applies InquiryRoutingRule (svc: 27-96 in inquiry-routing.service.ts)
        - Writes InquiryClassificationAudit row (commit=true)
        - Returns ClassificationResult { matchedRuleId, businessUnitHint, confidence, matchedKeywords }
      Note: this does NOT mutate the Inquiry row itself.
```

#### 3.4.7 Phase 5.4 / ADR-0058 follow-up (deferred)

- `EventInquiry` is marked deprecated by `docs/architecture/rauschenberger-meta-layer.md:153-186`. The deprecation migration (DB view mapping `EventInquiry → Inquiry`) is **not yet landed**.
- `GET /admin/inquiries/:id/full` (PII-bearing detail) per ADR-0062 Phase 5.5 is **not yet implemented**. PII is currently only reachable via the raw `EventInquiry.contactName/Email/Phone` fields, which are stripped from all DTOs.

---

### 3.5 Operational Note

#### Interface (canonical, from `src/modules/operational-note/operational-note.types.ts`)

```typescript
type OperationalNoteStatus = "open" | "in_progress" | "resolved" | "archived";

interface IOperationalNote {
  id: string;
  organizationId: string;
  locationId: string | null;          // optional, but expected by Cockpit
  storageLocationId: string | null;
  title: string;
  body: string;
  authorUserId: string;
  assigneeUserId: string | null;
  status: OperationalNoteStatus;
  priority: "low" | "normal" | "high" | "urgent";
  category: string;                   // free-form; e.g. "equipment_issue", "stock_problem"
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  archivedAt: Date | null;
}

interface IOperationalNoteAuditEvent {
  id: string;
  noteId: string;
  eventType: "created" | "updated" | "resolved" | "archived";
  actorUserId: string;
  payload: Json;
  createdAt: Date;
}
```

#### API paths — `src/routes/operational-note.route.ts` (deviation: root path, not `/admin/...`)

| Method | Path | Lines | Auth | Service method |
|---|---|---|---|---|
| `POST` | `/operational-notes` | 36-54 | staff-up (`staff`, `shift_lead`, `admin`) | `OperationalNoteService.create` (svc:269-320) |
| `GET` | `/operational-notes` | 57-79 | staff-up | `OperationalNoteService.list` (svc:322-354) |
| `GET` | `/operational-notes/:id` | 82-97 | staff-up | `OperationalNoteService.get` (svc:355-362) |
| `PATCH` | `/operational-notes/:id` | 100-124 | staff-up | `OperationalNoteService.update` (svc:364-413) |
| `POST` | `/operational-notes/:id/resolve` | 127-142 | staff-up | `OperationalNoteService.resolve` (svc:415-452) |
| `POST` | `/operational-notes/:id/archive` | 145-160 | **manager-up** (`shift_lead`, `admin`) | `OperationalNoteService.archive` (svc:454-489) |
| `GET` | `/operational-notes/:id/audit` | 163-187 | **manager-up** | `OperationalNoteService.auditHistory` (svc:491-503) |

**Deviation from `/admin/...` convention:** these routes are mounted at the **root** path (`/operational-notes/...`), not under `/admin/operational-notes/...`. This breaks the ADR-0023 path-convergence convention. The deviation is recorded for posterity.

#### RLS: `prisma/migrations/20260609150001_add_operational_notes_rls/migration.sql`
- OperationalNote: SELECT + INSERT + UPDATE policies (lines 5-30). **No DELETE policy** (intentional — soft-delete via `archivedAt` only).
- OperationalNoteAuditEvent: SELECT policy (line 46-60) + `GRANT SELECT ... TO app_runtime` (line 56).
- **CRITICAL:** No INSERT policy on `OperationalNoteAuditEvent` — see Blocker B4 (§6.1).

#### Data flow: Operational Note write + audit

```
cockpit: /notes (or /workspaces/[locationId]/notes)
  │
  ├─ POST /operational-notes                                    (operational-note.route.ts:36-54)
  │   body: OperationalNoteCreateDto (Zod: createNoteBodySchema, svc:162-174)
  │   → service: tx.operationalNote.create + tx.operationalNoteAuditEvent.create
  │   → ❌ B4: audit event insert fails RLS permission check
  │
  └─ GET /operational-notes/:id/audit                           (operational-note.route.ts:163-187)
      → events: OperationalNoteAuditEvent[] (manager-gated)
```

---

## 4. Module Connection Matrix

```
┌─────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ Backend module                     │ Frontend consumer (route or hook)                          │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ location (Phase 2)                 │ apps/cockpit/app/(app)/workspaces/[locationId]/layout │
│                                     │ apps/cockpit/lib/location-context.tsx                  │
│                                     │ apps/cockpit/lib/supabase/queries/locations.ts:20-31   │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ organization (Phase 2 + 5)         │ apps/cockpit/app/(app)/mother-concern/page.tsx         │
│                                     │ apps/cockpit/lib/mother-concern-hooks.ts:215-242        │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ operational-unit (Phase 3, 0029-A) │ apps/cockpit/app/(app)/workspaces/[locationId]/cube/   │
│                                     │ apps/cockpit/lib/cube-hooks.ts:37-58 (wrong URL — B3)   │
│                                     │ apps/cockpit/lib/cube-hooks.ts:61-83 (menus)          │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ menu (Phase 3)                     │ apps/cockpit/app/(app)/workspaces/[locationId]/cube/   │
│                                     │   menus/page.tsx                                             │
│                                     │ apps/cockpit/lib/cube-hooks.ts:61-83                   │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ cube-source-conflict (0029-B)      │ apps/cockpit/app/(app)/workspaces/[locationId]/cube/   │
│                                     │   conflicts (planned)                                        │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ cube-economic (0029-C)             │ apps/cockpit/app/(app)/workspaces/[locationId]/cube/   │
│                                     │   event-ops/[id]/cost (planned)                             │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ event-inquiry (0029-D, Phase 3)    │ apps/cockpit/app/(app)/workspaces/[locationId]/event- │
│                                     │   ops/inquiries/page.tsx                                     │
│                                     │ apps/cockpit/lib/cube-hooks.ts:86-109 (unitId dropped) │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ inquiry + inquiry-routing (5.x)    │ apps/cockpit/app/(app)/inquiries/page.tsx              │
│                                     │ apps/cockpit/app/(app)/inquiries/[inquiryId]/page.tsx  │
│                                     │ apps/cockpit/lib/mother-concern-hooks.ts:244-309        │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ operational-note (Phase 3)         │ apps/cockpit/app/(app)/notes/page.tsx (planned)        │
│                                     │ (no client hook lands in the current slice — see §7)        │
├─────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ location event-spaces/connectors/  │ apps/cockpit/app/(app)/workspaces/[locationId]/        │
│ external-system-links (Motorworld)  │   event-spaces/page.tsx, /connectors/page.tsx,              │
│                                     │   /calendar/page.tsx                                         │
│                                     │ apps/cockpit/lib/motorworld-hooks.ts:38-155             │
└─────────────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

Cross-module dependencies (FKs that span module boundaries):
- `OperationalUnit.locationId` → `Location.id` (operational-unit → location)
- `OperationalUnit.parentContext` (free-form) — no FK
- `Menu.operationalUnitId` → `OperationalUnit.id` (menu → operational-unit)
- `CUBE_Economic*.eventUnitId` → `OperationalUnit.id` (cube-economic → operational-unit)
- `EventInquiry.operationalUnitId` → `OperationalUnit.id` (event-inquiry → operational-unit)
- `EventInquiry.preferredLocationId` → `Location.id` (event-inquiry → location)
- `Inquiry.preferredLocationId` → `Location.id` (inquiry → location)
- `Inquiry.preferredExternalCatalogEntryId` → `ExternalCatalogEntry.id` (inquiry → organization)
- `LocationMember.userId` → `auth.users.id` (location → auth via ADR-0018 cross-schema bridge)

---

## 5. Pipeline Overview: Request Lifecycle

### 5.1 Standard Read Request (all GET endpoints)

```
[Browser]
  │
  ▼ fetch(url, { credentials: "include" })    ⚠ no Bearer token (B2)
[Next.js Server Component / API Route]
  │ NEXT_PUBLIC_API_BASE_URL → bevero-api
  ▼
[Fastify Backend — src/app.ts]
  │
  ├─ 1. JWT verify             src/modules/auth/actor.ts:55-88
  │   → parseActorFromHeaders  src/modules/auth/actor.ts:55-88
  │   → Actor { userId, organizationId, roles[] }
  │
  ├─ 2. Route mount            src/app.ts:271-305
  │
  ├─ 3. requireActorRole       src/modules/auth/actor.ts:159-165
  │   → 401/403 if role mismatch
  │
  ├─ 4. Input validation       Zod schema in route file
  │
  ├─ 5. Service call           e.g. LocationService.listLocations
  │   │
  │   ├─ 6. RLS check          prisma/migrations/20260608171000_add_multi_location_rls/...
  │   │   → org-scoped SELECT only
  │   │
  │   ├─ 7. DB query           Prisma ORM → Supabase PostgreSQL
  │   │   ⚠ B1: JWT claim set on wrong transaction, auth.uid() = NULL
  │   │
  │   └─ 8. DTO map            raw DB row → typed DTO
  │
  ├─ 9. Response serialize     Fastify JSON serializer
  └─ 10. HTTP 200 + JSON body
[Browser] → React state update → UI render
```

### 5.2 Auth-Failure Pipeline

```
[Fastify]
  │ JWT missing (B2) or invalid
  └─ HTTP 401 { code: "UNAUTHORIZED" }
       │
       [Next.js] middleware.ts → redirect to /auth/login?redirect=...
```

### 5.3 RLS-Policy-Failure Pipeline

```
[Prisma query]
  │ Row blocked by RLS (org mismatch)
  │ ⚠ M1: app_runtime role has no GRANT on 5 of the 8 Phase 2/3 RLS migrations
  └─ Prisma returns empty array (RLS is transparent)
       │
       [Service] → returns [] or null
       [Route]   → HTTP 404 if :id lookup, HTTP 200 + [] for list
```

### 5.4 Manager-Mutation Pipeline (CUBE)

```
[Manager UI action — admin or shift_lead]
  │
  ▼ POST /admin/cube/economic/{table}/:id/verify
  │   body: { isActive?, requiresManagerConfirmation?, notes?, ... , reason?, clientRequestId? }
  │   (Zod: verifyBodySchema, cube-economic.route.ts:41-53)
[Fastify]
  │
  ├─ 1-4. Standard pipeline (JWT, role, validation)
  │
  ├─ 5. Service call: CUBE_EconomicService.verifyManagerConfirmation
  │   │
  │   ├─ 6. SET LOCAL bevero.allow_cube_economic_update = 'on'   (svc:273-276)
  │   │
  │   ├─ 7. Per-table whitelist check (svc:546-566)  ⚠ m5: hardcoded, not Prisma-derived
  │   │
  │   ├─ 8. tx.row.update WHERE id = :rowId (RLS GUC-gated UPDATE)
  │   │       ⚠ m3: clientRequestId not enforced at DB level (no unique constraint)
  │   │
  │   ├─ 9. tx.automationDecision.create (append-only, B-2 trigger)
  │   │       ⚠ m1: race on P2002 unique violation
  │   │
  │   └─ 10. RESET GUC + COMMIT
  │
  └─ 200: { row, decision }
```

---

## 6. Cross-Cutting Contracts

### 6.0.1 Authentication & RBAC

```
OrganizationMember.role  → org-wide rights ("OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER")
LocationMember.role      → per-location rights (same enum values, ADR-0015)
```

- A user can be org-VIEWER but location-ADMIN (location-owner pattern for CUBE operators).
- RLS policies check `organizationId` (not `locationId`). LocationMember guards are service-layer.
- Role rank: `owner > admin > manager > shift_lead > staff > viewer` per ADR-0015.

### 6.0.2 Profile-Discriminator (ADR-0030 §1, binding)

| Flag | Meaning | Source of truth |
|---|---|---|
| `Location.profile = CUBE_PREMIUM` | CUBE-specific UI + features active | `prisma/schema.prisma:946-952` |
| `StoragePrecisionLevel = PREMIUM_TRACEABLE` | Batch traceability required | `prisma/schema.prisma:954-960` |
| `premiumHandlingRequired` | Special storage needed | `LocationInventoryConfig` (`prisma/schema.prisma:1064-1066`) |
| `qualityNoteRequired` | Quality note required on receipt | `LocationInventoryConfig` (1065) |
| `batchNoteAllowed` | Batch-note input enabled | `LocationInventoryConfig` (1066) |

⚠ The `LocationInventoryConfig` flags exist in the schema but **no withdrawal or correction flow in `src/modules/inventory/` reads them**. The flags are informational only today.

### 6.0.3 Monetary Data

- All prices: `*NetCents` integer (no float, no strings).
- UI formatting: `new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)`.
- `priceMode` annotation on `ExclusiveRentalPolicy` — MwSt calculation frontend-side.

### 6.0.4 Bitmask decoding (`ServiceSlot.daysOfWeekMask`)

```typescript
// bit 0 = Sunday, bit 6 = Saturday
function decodeDaysOfWeek(mask: number): string[] {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days.filter((_, i) => (mask >> i) & 1);
}
// example: mask = 0b0111110 = 62 → ['Mo','Di','Mi','Do','Fr']
```

### 6.0.5 Append-Only Invariants

| Table | Trigger | Migration | Notes |
|---|---|---|---|
| `AutomationDecision` | BEFORE UPDATE + BEFORE DELETE | `prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql` | Phase B-2 |
| `CUBE_Conflict` | BEFORE UPDATE + BEFORE DELETE | `prisma/migrations/20260609050001_add_cube_source_conflict_rls/migration.sql:121-135` | Relaxed by `20260609080001_relax_cube_source_append_only` to honor GUC |
| `CUBE_Economic*` (4 tables) | BEFORE UPDATE + BEFORE DELETE | `prisma/migrations/20260609060001_add_cube_event_economics_rls/migration.sql` | Relaxed by `20260609070001_relax_cube_economic_append_only` |

### 6.0.6 RLS Migration Inventory

| Migration | Tables gated | Policies | `app_runtime` GRANT |
|---|---|---|---|
| `20260608171000_add_multi_location_rls` | Brand, Location, Area, LocationMember, LocationInventoryConfig | 5 SELECT | ⚠ **No** (M1) |
| `20260609040100_add_operational_units_rls` | OperationalUnit, ServiceSlot, GroupRule | 3 SELECT | ⚠ **No** (M1) |
| `20260609050001_add_cube_source_conflict_rls` | CUBE_Source, CUBE_SourceField, CUBE_Conflict | 3 SELECT + 2 triggers | ⚠ **No** (M1) |
| `20260609060001_add_cube_event_economics_rls` | ExclusiveRentalPolicy, AfterMidnightStaffRate, NonFoodComponent, FurniturePolicy | 4 SELECT + 8 triggers | ⚠ **No** (M1) |
| `20260609070000_add_cube_economic_manager_update_policies` | same 4 tables | 4 UPDATE (GUC-gated) | — |
| `20260609080000_add_cube_source_manager_update_policies` | CUBE_Source, CUBE_SourceField, CUBE_Conflict | UPDATE + INSERT (GUC-gated) | — |
| `20260609090001_add_cube_menu_matrix_rls` | Menu, MenuItem, MenuItem_Ingredient, MenuItem_Allergen | 4 SELECT | ⚠ **No** (M1) |
| `20260609100001_add_cube_event_intake_rls` | EventInquiry (+ per-row `assignedToUserId`), EventPackage*, BeveragePackage | 5 SELECT | ⚠ **No** (M1) |
| `20260609110001_add_motorworld_inn_rls` | EventSpace, ExceptionRule, ReservationConnector, ExternalSystemLink | 4 SELECT | ✓ Yes |
| `20260609120001_add_mother_concern_rls` | Organization, BusinessUnit, EventConcept, BusinessUnitEventConcept, EventConceptLocationCompatibility, ExternalCatalogEntry, Inquiry, InquiryRoutingRule, InquiryClassificationAudit | 9 SELECT | ✓ Yes |
| `20260609150001_add_operational_notes_rls` | OperationalNote, OperationalNoteAuditEvent | SELECT + INSERT + UPDATE on OperationalNote; SELECT only on AuditEvent | ✓ Yes (SELECT only) |

---

### 6.1 Known Production Blockers (B1–B4)

The following are **production-blocking bugs** identified during the read-only audit. This section does **not** fix them; it documents them so a future slice can land the fixes in a dedicated ADR. The slice is blocked from claiming "production-ready" until all 4 are resolved.

#### B1 — JWT claims set on the wrong transaction

- **Severity:** blocker
- **Path:** `src/modules/auth/actor.ts:114-157`
- **Evidence:** `setSupabaseJwtClaims` is invoked inside `findMembershipsForUser` only, scoped with `set_config(..., true)` (transaction-local). Every RLS policy in Phase 2/3 migrations evaluates `(SELECT auth.uid())::text` (e.g. `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql:53`, `prisma/migrations/20260609120001_add_mother_concern_rls/migration.sql:16`, `prisma/migrations/20260609040100_add_operational_units_rls/migration.sql:42`, `prisma/migrations/20260609100001_add_cube_event_intake_rls/migration.sql:35`). Once the membership-lookup transaction ends, the JWT claim is gone on subsequent service-layer queries, so `auth.uid()` returns NULL and every `EXISTS (... userId = auth.uid())` returns false.
- **Risk:** Phase 2/3 endpoints will return empty arrays / 404 in any real Supabase-backed deployment, even though vitest fakes (which bypass the real Prisma client and skip RLS) report green.
- **Recommended fix:** Set the JWT claim once on the same connection/transaction used for service-layer reads, or move RLS evaluation to a connection-pooler pattern (e.g. `set_config('request.jwt.claim.sub', ..., false)` at connection acquisition, or a per-request Prisma `$extends` middleware).

#### B2 — Cockpit client hooks use `credentials: "include"` and never forward the Supabase access token

- **Severity:** blocker
- **Paths:**
  - `apps/cockpit/lib/cube-hooks.ts:46,71,97`
  - `apps/cockpit/lib/mother-concern-hooks.ts:195,289`
  - `apps/cockpit/lib/motorworld-hooks.ts:49,76,103,142`
- **Evidence:** All five Phase 2/3 client hooks issue `fetch(url, { credentials: "include" })` with no `Authorization: Bearer <token>` header. The backend `parseActorFromHeaders` (`src/modules/auth/actor.ts:55-88`) reads the `authorization` header (line 186 `readBearerToken`) and returns 401 if missing.
- **Risk:** Every Cockpit page in `workspaces/[locationId]/`, `mother-concern/`, `inquiries/`, and the new CUBE dashboard will 401 in the browser.
- **Recommended fix:** Add a shared `useBackendFetch` hook (or `getAuthHeaders()` helper) that reads `supabase.auth.getSession()` on the client and adds `Authorization: Bearer <token>` to every backend call. Migrate all `credentials: "include"` callers in `cube-hooks.ts`, `mother-concern-hooks.ts`, `motorworld-hooks.ts` to it.

#### B3 — `useServiceSlots` calls a non-existent backend route

- **Severity:** blocker
- **Path:** `apps/cockpit/lib/cube-hooks.ts:46` vs `src/routes/operational-unit.route.ts:88-112`
- **Evidence:** Cockpit calls `GET /admin/location/units/${unitId}/service-slots`. The actual route is `GET /admin/operational-units/:id/slots` (no `/location/units/...` segment, different path). The CUBE Service-Slot Dashboard tab will always 404 in production.
- **Risk:** Core Phase 3 functionality is dead in the UI. ADR-0050 / Task 04 / Task 08 promise a CUBE Service-Slot Dashboard that is wired against the wrong URL.
- **Recommended fix:** Update `cube-hooks.ts:46` to `${apiBase()}/admin/operational-units/${unitId}/slots`. Single-line fix.

#### B4 — `OperationalNoteAuditEvent` has no INSERT policy, but every note write path creates an audit event

- **Severity:** blocker
- **Path:** `prisma/migrations/20260609150001_add_operational_notes_rls/migration.sql:46-61` vs `src/modules/operational-note/operational-note.service.ts:305,398,437,474` (each `tx.operationalNoteAuditEvent.create` call)
- **Evidence:** The migration enables RLS on `OperationalNoteAuditEvent` and adds only a SELECT policy plus a `GRANT SELECT ... TO app_runtime`. The service runs `tx.operationalNoteAuditEvent.create(...)` on every `create`, `update`, `resolve`, and `archive` call. The `OperationalNote` table itself has INSERT/UPDATE policies, but the audit-event insert will be denied.
- **Risk:** Every operational-note mutation will fail with a Postgres permission error, or — depending on pooler settings — silently drop the audit row, breaking the append-only audit-trail invariant. Operational Notes is one of the only Phase 2/3 write surfaces that landed; this leaves the slice non-functional.
- **Recommended fix:** Add an `OperationalNoteAuditEvent_insert` policy (mirror the `OperationalNote_insert_org_members` shape) and `GRANT INSERT ON public."OperationalNoteAuditEvent" TO app_runtime`. Update the migration in a follow-up slice.

---

## 7. Spec ↔ Code Drift (AS-IS vs. TO-BE)

This section replaces the previous "Offene Verdrahtungen (TODO)" list with an evidence-based AS-IS vs. TO-BE diff. Each row names a spec promise and the current code state.

### 7.1 Spec promises the code does NOT yet deliver

| # | Spec promise | Spec source | Code state | Gap |
|---|---|---|---|---|
| 1 | `OperationalUnitType` values: `CAFE_BAR`, `OUTDOOR_BAR_TERRACE`, `EVENT_BANKETT`, `COLLECTIVE_OTHER` | `docs/architecture/motorworld-inn-standortlogik.md:32` | Enum is `RESTAURANT, BAR, EVENT, CAFE, OUTDOOR_TERRACE, HOTEL_CONTEXT, LOUNGE` (`prisma/schema.prisma:1084-1094`) | Spec is the lie. Seed uses real enum values. M2. |
| 2 | CUBE `premiumHandlingRequired` / `qualityNoteRequired` / `batchNoteAllowed` flags are honored by withdrawal/correction flow | `docs/architecture/cube-premium-compatibility.md:31-47` | Flags exist (`prisma/schema.prisma:1064-1066`) and are returned by the service. No withdrawal/correction flow reads them. | Phase D concern; not in this slice. |
| 3 | CUBE bar and restaurant are separate Areas, not merged | `docs/architecture/cube-premium-compatibility.md:74-78` | Data model supports it. Cockpit cube page renders `OperationalUnit`s, not Areas. Bar-refill flow is the same Motorworld flow. | Phase D concern. |
| 4 | `EventInquiry` is **deprecated** by new `Inquiry` model; Phase 5.4 view migration maps `EventInquiry → Inquiry` | `docs/architecture/rauschenberger-meta-layer.md:153-186` | No deprecation marker in `prisma/schema.prisma:1952-1981`. `EventInquiry` table still in active use by `src/modules/event-inquiry/event-inquiry.service.ts`. The 5.4 view mapping has not landed. | ADR-0058 deferred. |
| 5 | Full PII access via `GET /admin/inquiries/:id/full` (RLS-gated, ADR-0062 Phase 5.5) | `docs/architecture/rauschenberger-meta-layer.md:188` | No such endpoint. PII is not yet exposed via any route, and not yet gated behind ADR-0062. The header DTO and the `EventInquiryHeaderDto` strip PII. | Phase 5.5 — not in scope. |
| 6 | `inquiryCountByLoc` and `openInquiries` in `LocationComparisonRow` are real counts | `docs/architecture/multi-location-mother-concern.md:141-156` (overview endpoint contract) | `src/modules/organization/organization.service.ts:362-390` hardcodes `openInquiries: 0` for every location. `inquiryCountByLoc` is empty (`inquiries.length` is the only count, not joined by `locationId`). | M7. |
| 7 | `criticalStockLocations` aggregation surfaces real stock health | same | `buildCriticalStockLocations` (`organization.service.ts:319-351`) aggregates by `activeExceptionRules` count, not by `InventoryStockSnapshot`. KPI is misleading. | M6. |
| 8 | Per-location narrowing for non-admin actors at the service layer via `LocationMember.userId` | `docs/architecture/multi-location-mother-concern.md:159-175` | `LocationService.listLocations` (`src/modules/location/location.service.ts:54-64`) returns every org location; no `LocationMember` filter. | M4. |
| 9 | `workspaces/[locationId]/layout.tsx` verifies the user has access to that specific `locationId` | (implied by multi-location spec) | Layout (`apps/cockpit/app/(app)/workspaces/[locationId]/layout.tsx:1-29`) does no per-location check. | M5. |
| 10 | `computeEventCostEstimate` backend service | `docs/architecture/cube-premium-compatibility.md` (implied) | Not implemented. Only frontend computation exists. | Phase D concern. |
| 11 | CUBE service-slot dashboard URL `/admin/location/units/:id/service-slots` | (Cockpit task 08) | Backend route is `/admin/operational-units/:id/slots`. Cockpit calls the wrong URL. | B3. |
| 12 | `useEventInquiries(unitId)` filters by `unitId` | (Cockpit task 03) | Backend drops `unitId`. | M8. |
| 13 | Cockpit client hooks forward Supabase access token | (implied by ADR-0014) | All 5 hooks use `credentials: "include"` only. | B2. |
| 14 | Service-layer JWT claims set on the same transaction as the read query | (implied by ADR-0017) | JWT claim set inside membership-lookup transaction only. | B1. |
| 15 | `OperationalNoteAuditEvent` is writable from service layer | (implied by audit-trail invariant) | No INSERT policy; no `INSERT` grant. | B4. |

### 7.2 Code surfaces the specs do not yet mention

| # | Code surface | Where | Notes |
|---|---|---|---|
| 1 | `LocationService.listOrganizations` returns a stub `[{ organizationId }]` | `src/modules/location/location.service.ts:40-43` | Spec promises a real list. Cockpit does not call this; it uses direct Supabase queries. |
| 2 | Operational-Note routes mounted at root path, not `/admin/...` | `src/routes/operational-note.route.ts:36-187` | Path-convergence deviation. Recorded for posterity. |
| 3 | Cockpit `mother-concern` page auto-fills `signatureEntries` with placeholder `"Beispiel-Asset"` | `apps/cockpit/app/(app)/mother-concern/page.tsx:108-111` | M10. |
| 4 | `cube-hooks.ts` types DTOs inline (`ServiceSlot`, `MenuRecord`, `EventInquiryHeader`) | `apps/cockpit/lib/cube-hooks.ts:7-35` | No type import from `src/modules/*/types.ts`. Drift risk. |
| 5 | `useEventInquiries` and `useServiceSlots` exist as client hooks but the corresponding `OperationalUnitService.listSlots` server endpoint is not yet called by the URL the hook builds | (B3) | Half-wired. |
| 6 | `automation/routes` exist for the Phase B read surface, but no `/automation/suggestions` Cockpit consumer | (out of scope for this doc) | Owned by `apps/cockpit/app/(app)/automation/suggestions/page.tsx` — Phase C. |

### 7.3 Operational Note (Phase 3) — implementation status

| Surface | Status |
|---|---|
| Schema (`OperationalNote`, `OperationalNoteAuditEvent`) | ✓ migrated (`prisma/migrations/20260609150000_add_operational_notes`) |
| RLS policies | ⚠ partial (B4: no INSERT on AuditEvent) |
| Service | ✓ landed (`src/modules/operational-note/operational-note.service.ts`) |
| Routes (7 endpoints) | ✓ landed (`src/routes/operational-note.route.ts`) |
| Cockpit client hook | ✗ not yet shipped |
| Cockpit page (`/notes`) | ⚠ stub only (no live wiring) |
| Tests | ✗ no test file in `tests/` for the operational-note module |
| Smoke runner (`smoke:operational-notes`) | ✗ not in `package.json` |

### 7.4 Test coverage matrix (Phase 2/3)

| Module | Unit | Integration | Smoke | Notes |
|---|---|---|---|---|
| `organization` | ✓ (in-memory fakes) | ✗ | ✗ | `tests/organization.routes.test.ts`, `tests/organization.overview.test.ts` — bypass real Prisma + RLS |
| `location` | ✓ | ✗ | ✗ | `tests/location.routes.test.ts`, `tests/location.overview.test.ts` — same caveat; B1+B2+M1 make production reads fail despite green tests |
| `operational-unit` | ✓ | ✗ | ✗ | `tests/operational-unit.routes.test.ts` — service-layer only |
| `menu` | ✓ | ✗ | ✗ | `tests/menu.routes.test.ts` — service-layer only |
| `cube-economic` | ✓ | ✗ | ✗ | `tests/cube-economic.routes.test.ts` — doesn't exercise GUC-required relax trigger; m3 idempotency not tested |
| `cube-source-conflict` | ✓ | ✗ | ✗ | `tests/cube-source-conflict.routes.test.ts` — same |
| `inquiry` | ✓ | ✗ | ✗ | `tests/inquiry.routes.test.ts`, `tests/inquiry.routing.test.ts` — PII edge cases not covered (m7) |
| `event-inquiry` | ✓ | ✗ | ✗ | `tests/event-inquiry.routes.test.ts` — `assignedToUserId` scope on `listInquiries` not validated (M3) |
| `operational-note` | ✗ | ✗ | ✗ | **No test file in `tests/`** — B4 (RLS INSERT gap) would never be caught |
| Cockpit pages | ✗ | ✗ | ✗ | No Cockpit tests under `apps/cockpit` for any Phase 2/3 page; B3 (URL drift) not caught |
| `smoke:mother-concern` / `smoke:cube` / `smoke:operational-notes` | ✗ | n/a | n/a | Not in `package.json` |

### 7.5 Branch / PR hygiene

- `main` is at commit `020b571` (verified via `git status` / `git log`).
- Last 5 commits under Phase 2/3 effort: `fix(movements)`, `feat(enterprise): Operative Notes + HITL Automation`, `feat(enterprise): Language Layer, Warenefluss-Hub`, `feat(auth): zentrales RBAC`, `feat(dashboard): analytische Tiefe fuer Bestand-Hotspots`. Merge cadence is healthy.
- PR #57 "phase-b-multistandort" merged recently. 12+ feature branches exist under `codex/`, `docs/`, `feat/`, `fix/` — all read-only, none checked out, no half-merged state.
- `.env` exists locally (visible in `ls -la`). `.env.example` is the only committed source. AGENTS.md requires this.
- `dist/`, `apps/cockpit/.next/`, `node_modules/` present on disk; should be gitignored.

---

## Appendix A — Authoritative ADR / Spec cross-references

| ID | Status | Surface | Section used in this doc |
|---|---|---|---|
| ADR-0014 | accepted | org identity from Supabase Auth | §6.0.1 |
| ADR-0015 | accepted | role grants bounded by actor's role | §6.0.1 |
| ADR-0016 | accepted | stock snapshots stay transactional + idempotency | §7.4 (m3) |
| ADR-0017 | accepted | `app_runtime` role enforces RLS | §5.3, §6.0.6 |
| ADR-0018 | accepted | Prisma multi-schema (`public`, `auth`) | §4 cross-module FKs |
| ADR-0019 | accepted | introspection allowlist | (out of scope) |
| ADR-0021 | accepted | Phase A spec adoption | §1, §3.4.2 |
| ADR-0022 | accepted | Phase B Rules Engine | (out of scope for this doc) |
| ADR-0023 | accepted | Automation mutation surface | §2.2 path convention, §3.5 deviation |
| ADR-0029-A | accepted | Operational Unit module | §3.1 |
| ADR-0029-B | accepted | CUBE Source-Conflict Validator | §3.2 |
| ADR-0029-C | accepted | CUBE Event-Economic Rules | §3.3 |
| ADR-0030 | accepted | Profile discriminator (CUBE_PREMIUM vs MOTORWORLD_STANDARD) | §1, §6.0.2 |
| ADR-0031 | accepted | Multi-location read surface | §2.2, §2.3 |
| ADR-0032 | proposed | Mother-concern overview endpoint | (now partially landed) |
| ADR-0049 | proposed | Motorworld Inn data model | §3.1 drift |
| ADR-0050 | proposed | CUBE Service-Slot Dashboard | §3.1, B3 |
| ADR-0055–0058 | proposed | Inquiry routing + classification + audit | §3.4.2 |
| ADR-0062 | proposed | PII-bearing inquiry detail (`/admin/inquiries/:id/full`) | §3.4.7 (deferred) |

---

## Appendix B — Slice-level next gates (out of scope for this doc)

1. **ADR for B1 fix** — choose between connection-pooler GUC injection or per-request Prisma `$extends` middleware. Block on slice owner decision.
2. **ADR for B2 fix** — introduce `useBackendFetch` shared hook; migrate all 5 client hooks; update Cockpit tests.
3. **Single-line B3 fix** — `cube-hooks.ts:46` URL. No ADR required.
4. **ADR for B4 fix** — add INSERT policy + GRANT on `OperationalNoteAuditEvent`. Update migration `20260609150001_add_operational_notes_rls`.
5. **ADR for M1** — add `app_runtime` SELECT GRANT to 5 read-only RLS migrations. Per-row decisions.
6. **ADR for M4/M5** — decide "all-locations" vs "assigned-only" staff model; update service + layout.
7. **ADR for M6/M7** — either rename KPIs to match data, or implement the join. Likely rename now, implement later.
8. **ADR for M3/M8** — per-row scope on `EventInquiry.listInquiries` + `unitId` query param on `event-inquiries`.
9. **ADR for M2** — reconcile `motorworld-inn-standortlogik.md` enum values with schema.
10. **ADR for §3.5 path convergence** — move `/operational-notes/...` to `/admin/operational-notes/...`.
11. **ADR for Phase 5.4 (EventInquiry deprecation)** — DB view migration.
12. **ADR for ADR-0062 (PII detail)** — Phase 5.5.

---

**End of doc.** PR-ready: every claim has a `file_path:line_number` reference. Blockers documented in §6.1. Drift documented in §7. Cross-references in Appendix A. Next-gate list in Appendix B.
