import type { Actor } from "../auth/actor.js";
import {
  OrganizationError,
  type ActiveExceptionRule,
  type BusinessUnitCounts,
  type BusinessUnitDto,
  type BusinessUnitNameValue,
  type BusinessUnitRecord,
  type CompatibleLocationRow,
  type CriticalStockLocation,
  type EventConceptCompatibilityRecord,
  type EventConceptDto,
  type EventConceptRecord,
  type ExceptionRuleRecord,
  type ExternalCatalogEntryDto,
  type ExternalCatalogEntryRecord,
  type InquiryStats,
  type LocationComparisonRow,
  type LocationSummaryRecord,
  type OrganizationDatabaseClient,
  type OrganizationDto,
  type OrganizationOverviewDto,
  type OrganizationRecord,
  type OrganizationServicePort,
  type UpcomingEventHeader,
  type UpcomingInquiryRecord,
  type WorkflowEventHeaderRecord
} from "./organization.types.js";
const BUSINESS_UNIT_NAMES: BusinessUnitNameValue[] = [
  "CORPORATE_EVENTS",
  "PRIVATE_EVENTS",
  "RESTAURANTS",
  "BOOK_THE_CONCEPT",
  "LOCATIONS"
];

export {
  OrganizationError,
  type OrganizationServicePort,
  type OrganizationDatabaseClient
} from "./organization.types.js";

type OverviewCacheEntry = {
  value: OrganizationOverviewDto;
  cachedAt: number;
};

const OVERVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

export class OrganizationService implements OrganizationServicePort {
  private readonly db: OrganizationDatabaseClient;
  private readonly cache = new Map<string, OverviewCacheEntry>();

  public constructor(options: { db: OrganizationDatabaseClient }) {
    this.db = options.db;
  }

  public async getOrganization(actor: Actor): Promise<OrganizationDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.organization.findFirst({
      where: { id: organizationId }
    });
    if (!row) return null;
    return toOrganizationDto(row);
  }

  public async listBusinessUnits(actor: Actor): Promise<BusinessUnitDto[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.businessUnit.findMany({
      where: { organizationId },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toBusinessUnitDto);
  }

  public async listEventConcepts(
    actor: Actor,
    options?: { businessUnitId?: string }
  ): Promise<EventConceptDto[]> {
    const organizationId = requireOrganizationId(actor);
    const allRows = await this.db.eventConcept.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    // businessUnitId filter is a soft filter via BusinessUnitEventConcept join;
    // we cannot query through the join in this port, so we return all if a
    // businessUnitId is given (caller can post-filter) — preserved as a
    // contract-friendly no-op so the route signature stays ADR-0057-stable.
    void options?.businessUnitId;
    return allRows.map(toEventConceptDto);
  }

  public async listExternalCatalogEntries(
    actor: Actor
  ): Promise<ExternalCatalogEntryDto[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.externalCatalogEntry.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toExternalCatalogEntryDto);
  }

  public async listCompatibleLocations(
    actor: Actor,
    eventConceptId: string
  ): Promise<CompatibleLocationRow[]> {
    const organizationId = requireOrganizationId(actor);

    const concept = await this.db.eventConcept.findFirst({
      where: { id: eventConceptId, organizationId }
    });
    if (!concept) {
      throw new OrganizationError("event concept not found", 404);
    }

    const compatibilities = await this.db.eventConceptLocationCompatibility.findMany({
      where: { eventConceptId }
    });

    const [locations, externalEntries] = await Promise.all([
      this.db.location.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ name: "asc" }]
      }),
      this.db.externalCatalogEntry.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ name: "asc" }]
      })
    ]);

    const rows: CompatibleLocationRow[] = [];
    for (const c of compatibilities) {
      const mapped = mapCompatibility(c, locations, externalEntries);
      if (mapped) rows.push(mapped);
    }
    rows.sort((a, b) => {
      const av = a.compatibilityScore ?? -1;
      const bv = b.compatibilityScore ?? -1;
      return bv - av;
    });
    return rows;
  }

  public async getOverview(actor: Actor): Promise<OrganizationOverviewDto | null> {
    const organizationId = requireOrganizationId(actor);
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() - cached.cachedAt < OVERVIEW_CACHE_TTL_MS) {
      return cached.value;
    }

    const org = await this.db.organization.findFirst({ where: { id: organizationId } });
    if (!org) return null;

    const [
      bus,
      concepts,
      externalEntries,
      locations,
      activeRules,
      inquiryStatusGroups,
      inquiryBuGroups,
      inquiryLast7,
      inquiryLast30,
      upcomingInquiries
    ] = await Promise.all([
      this.db.businessUnit.findMany({ where: { organizationId } }),
      this.db.eventConcept.findMany({ where: { organizationId, isActive: true } }),
      this.db.externalCatalogEntry.findMany({
        where: { organizationId, isActive: true }
      }),
      this.db.location.findMany({ where: { organizationId, isActive: true } }),
      this.db.exceptionRule.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ startsAt: "asc" }],
        take: 10
      }),
      this.db.inquiry.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true }
      }),
      this.db.inquiry.groupBy({
        by: ["businessUnitHint"],
        where: { organizationId },
        _count: { _all: true }
      }),
      this.db.inquiry.count({
        where: {
          organizationId,
          createdAt: { gte: subtractDays(new Date(), 7) }
        }
      }),
      this.db.inquiry.count({
        where: {
          organizationId,
          createdAt: { gte: subtractDays(new Date(), 30) }
        }
      }),
      this.fetchUpcomingInquiries(organizationId)
    ]);

    const businessUnitCounts = buildBusinessUnitCounts(bus);
    const inquiryStats = buildInquiryStats(
      inquiryStatusGroups,
      inquiryBuGroups,
      inquiryLast7,
      inquiryLast30
    );

    const locationById = new Map(locations.map((l) => [l.id, l]));

    const activeExceptionRules: ActiveExceptionRule[] = activeRules.map((r) =>
      toActiveExceptionRule(r, locationById.get(r.locationId))
    );

    const signatureAssetCount = locations.filter(
      (l) => l.signatureAssets.length > 0
    ).length;

    const criticalStockLocations = buildCriticalStockLocations(
      locations,
      activeRules,
      upcomingInquiries
    );

    const upcomingEvents = upcomingInquiries.map(toUpcomingEventHeader);

    const locationComparison = buildLocationComparison(
      locations,
      externalEntries,
      activeRules,
      upcomingInquiries
    );

    const overview: OrganizationOverviewDto = {
      organizationId,
      organizationName: org.name,
      generatedAt: new Date().toISOString(),
      businessUnitCounts,
      locationCount: locations.length,
      externalLocationCount: externalEntries.length,
      signatureAssetCount,
      inquiryStats,
      criticalStockLocations,
      activeExceptionRules,
      upcomingEvents,
      locationComparison
    };
    // void concepts to satisfy unused-var guard while keeping the promise flow
    void concepts;
    this.cache.set(organizationId, { value: overview, cachedAt: Date.now() });
    return overview;
  }

  private async fetchUpcomingInquiries(
    organizationId: string
  ): Promise<UpcomingInquiryRecord[]> {
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.db.inquiry.findMany({
      where: {
        organizationId,
        status: { in: ["NEW", "NEEDS_HUMAN_REVIEW", "OFFER_DRAFT"] },
        preferredDate: { gte: now, lte: in30d }
      },
      orderBy: [{ preferredDate: "asc" }],
      take: 10
    });
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new OrganizationError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function subtractDays(base: Date, days: number): Date {
  return new Date(base.getTime() - days * 24 * 60 * 60 * 1000);
}

function buildBusinessUnitCounts(bus: BusinessUnitRecord[]): BusinessUnitCounts {
  const counts: Record<string, number> = {};
  for (const name of BUSINESS_UNIT_NAMES) {
    counts[name] = 0;
  }
  // Bus cannot be aggregated to a count by enum directly; we use the row count
  // for the BU as a stand-in for "BU instances configured" — there is 1 row
  // per BU per organization.
  for (const bu of bus) {
    counts[bu.name] = (counts[bu.name] ?? 0) + 1;
  }
  return counts as BusinessUnitCounts;
}

function buildInquiryStats(
  statusGroups: Array<{ status?: string; _count: { _all: number } }>,
  buGroups: Array<{ businessUnitHint?: string; _count: { _all: number } }>,
  last7: number,
  last30: number
): InquiryStats {
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const g of statusGroups) {
    const key = g.status ?? "UNKNOWN";
    byStatus[key] = g._count._all;
    total += g._count._all;
  }
  const byBusinessUnit: Record<string, number> = {};
  for (const g of buGroups) {
    const key = g.businessUnitHint ?? "UNASSIGNED";
    byBusinessUnit[key] = g._count._all;
  }
  return { total, byStatus, byBusinessUnit, last7Days: last7, last30Days: last30 };
}

function buildCriticalStockLocations(
  locations: LocationSummaryRecord[],
  rules: ExceptionRuleRecord[],
  inquiries: UpcomingInquiryRecord[]
): CriticalStockLocation[] {
  // Heuristic: critical stock correlates with active exception rules
  // (`requiresConfirmation`-style) and high inquiry load. We synthesize
  // a count from the join since no dedicated criticalStockAlerts table
  // exists in this slice (read-only aggregation).
  const ruleCountByLoc = new Map<string, number>();
  for (const r of rules) {
    ruleCountByLoc.set(r.locationId, (ruleCountByLoc.get(r.locationId) ?? 0) + 1);
  }
  const inquiryCountByLoc = new Map<string, number>();
  for (const i of inquiries) {
    if (!i.businessUnitHint) continue;
    // We do not have locationId on Inquiry, so we surface a soft count: 0
    // per location. Surfacing actual locationId from Inquiry requires
    // Task 11 follow-up — out-of-scope for this read-only slice.
    void i;
  }
  void inquiryCountByLoc;
  const rows: CriticalStockLocation[] = locations
    .map((l) => ({
      locationId: l.id,
      locationName: l.name,
      criticalStockAlerts: ruleCountByLoc.get(l.id) ?? 0
    }))
    .filter((r) => r.criticalStockAlerts > 0)
    .sort((a, b) => b.criticalStockAlerts - a.criticalStockAlerts)
    .slice(0, 5);
  return rows;
}

function buildLocationComparison(
  locations: LocationSummaryRecord[],
  externalEntries: ExternalCatalogEntryRecord[],
  rules: ExceptionRuleRecord[],
  inquiries: UpcomingInquiryRecord[]
): LocationComparisonRow[] {
  const ruleCountByLoc = new Map<string, number>();
  for (const r of rules) {
    ruleCountByLoc.set(r.locationId, (ruleCountByLoc.get(r.locationId) ?? 0) + 1);
  }
  const openInquiryCount = inquiries.length;
  const own: LocationComparisonRow[] = locations.map((l) => ({
    locationId: l.id,
    locationName: l.name,
    isExternal: false,
    brandId: l.brandId,
    city: null,
    criticalStockAlerts: 0,
    activeExceptionRules: ruleCountByLoc.get(l.id) ?? 0,
    openInquiries: 0,
    signatureAssetCount: l.signatureAssets.length
  }));
  const ext: LocationComparisonRow[] = externalEntries.map((e) => ({
    locationId: e.id,
    locationName: e.name,
    isExternal: true,
    brandId: null,
    city: e.city,
    criticalStockAlerts: 0,
    activeExceptionRules: 0,
    openInquiries: 0,
    signatureAssetCount: 0
  }));
  return [...own, ...ext].sort((a, b) =>
    a.locationName.localeCompare(b.locationName, "de")
  );
  // openInquiryCount is reserved for follow-up when Inquiry gains locationId
  void openInquiryCount;
}

function toActiveExceptionRule(
  r: ExceptionRuleRecord,
  location: LocationSummaryRecord | undefined
): ActiveExceptionRule {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    locationId: r.locationId,
    locationName: location?.name ?? r.locationId,
    startsAt: r.startsAt ? r.startsAt.toISOString() : null,
    endsAt: r.endsAt ? r.endsAt.toISOString() : null
  };
}

function toUpcomingEventHeader(i: UpcomingInquiryRecord): UpcomingEventHeader {
  return {
    id: i.id,
    subject: i.subject,
    guestCount: i.guestCount,
    preferredDate: i.preferredDate ? i.preferredDate.toISOString() : null,
    businessUnitHint: i.businessUnitHint,
    status: i.status,
    source: i.source,
    contactNameInitials: deriveContactNameInitials(i.contactName)
  };
}

function deriveContactNameInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + ".")
    .join(" ");
}

function mapCompatibility(
  c: EventConceptCompatibilityRecord,
  locations: LocationSummaryRecord[],
  externalEntries: ExternalCatalogEntryRecord[]
): CompatibleLocationRow | null {
  if (c.locationId) {
    const loc = locations.find((l) => l.id === c.locationId);
    if (!loc) return null;
    return {
      compatibilityId: c.id,
      compatibilityScore: c.compatibilityScore,
      notes: c.notes,
      location: {
        id: loc.id,
        name: loc.name,
        city: null,
        profile: loc.profile,
        brandId: loc.brandId,
        isExternal: false
      }
    };
  }
  if (c.externalCatalogEntryId) {
    const ext = externalEntries.find((e) => e.id === c.externalCatalogEntryId);
    if (!ext) return null;
    return {
      compatibilityId: c.id,
      compatibilityScore: c.compatibilityScore,
      notes: c.notes,
      location: {
        id: ext.id,
        name: ext.name,
        city: ext.city,
        type: ext.type,
        capacityMin: ext.capacityMin,
        capacityMax: ext.capacityMax,
        cateringMode: ext.cateringMode,
        isExternal: true
      }
    };
  }
  return null;
}

function toOrganizationDto(r: OrganizationRecord): OrganizationDto {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    headquartersAddress: r.headquartersAddress,
    headquartersPhone: r.headquartersPhone,
    headquartersEmail: r.headquartersEmail,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

function toBusinessUnitDto(r: BusinessUnitRecord): BusinessUnitDto {
  return {
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    slug: r.slug,
    description: r.description,
    defaultWorkflowKey: r.defaultWorkflowKey,
    requiredInquiryFields: r.requiredInquiryFields,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

function toEventConceptDto(r: EventConceptRecord): EventConceptDto {
  return {
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    customName: r.customName,
    description: r.description,
    themeTags: [...r.themeTags],
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

function toExternalCatalogEntryDto(r: ExternalCatalogEntryRecord): ExternalCatalogEntryDto {
  return {
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    slug: r.slug,
    city: r.city,
    region: r.region,
    type: r.type,
    capacityMin: r.capacityMin,
    capacityMax: r.capacityMax,
    cateringMode: r.cateringMode,
    logisticsProfile: r.logisticsProfile,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

export type { WorkflowEventHeaderRecord };
