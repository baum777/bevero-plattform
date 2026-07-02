import type { Actor } from "../auth/actor.js";
import {
  LocationError,
  type AreaListItem,
  type AreaRecord,
  type BrandListItem,
  type BrandRecord,
  type ConnectorListItem,
  type EventSpaceListItem,
  type EventSpaceRecord,
  type ExceptionRuleListItem,
  type ExceptionRuleRecord,
  type ExceptionRuleTypeValue,
  type ExternalSystemLinkListItem,
  type ExternalSystemLinkRecord,
  type LocationDatabaseClient,
  type LocationDetailDto,
  type LocationInventoryConfigListItem,
  type LocationInventoryConfigRecord,
  type LocationListItem,
  type LocationProfileDto,
  type LocationRecord,
  type LocationServicePort,
  type LocationStorageLocationListItem,
  type LocationStorageLocationRecord,
  type OrganizationReadDto,
  type ReservationConnectorRecord,
  type TodayOverviewDto
} from "./location.types.js";

export { LocationError, type LocationServicePort, type LocationDatabaseClient } from "./location.types.js";

const EXCLUDED_STORAGE_LOCATION_NAMES = new Set([
  "Trockenlager",
  "Transferpunkt Kühlwagen",
  "Kühlhaus",
  "Gefrierschrank 1",
  "Gefrierschrank 2"
]);

export class LocationService implements LocationServicePort {
  private readonly db: LocationDatabaseClient;

  public constructor(options: { db: LocationDatabaseClient }) {
    this.db = options.db;
  }

  public async listOrganizations(actor: Actor): Promise<OrganizationReadDto[]> {
    const organizationId = requireOrganizationId(actor);
    return [{ organizationId }];
  }

  public async listBrands(actor: Actor, organizationId: string): Promise<BrandListItem[]> {
    requireSameOrganization(actor, organizationId);
    const rows = await this.db.brand.findMany({
      where: { organizationId },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toBrandListItem);
  }

  public async listLocations(
    actor: Actor,
    organizationId: string
  ): Promise<LocationListItem[]> {
    requireSameOrganization(actor, organizationId);
    const rows = await this.db.location.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toLocationListItem);
  }

  public async getLocation(actor: Actor, locationId: string): Promise<LocationDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!row) {
      return null;
    }
    return toLocationDetailDto(row);
  }

  public async getLocationProfile(
    actor: Actor,
    locationId: string
  ): Promise<LocationProfileDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!row) {
      return null;
    }
    return {
      locationId: row.id,
      name: row.name,
      profile: row.profile,
      precisionLevel: row.precisionLevel,
      isActive: row.isActive
    };
  }

  public async listAreas(actor: Actor, locationId: string): Promise<AreaListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) {
      return [];
    }
    const rows = await this.db.area.findMany({
      where: { locationId, organizationId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return rows.map(toAreaListItem);
  }

  public async listStorageLocations(
    actor: Actor,
    locationId: string
  ): Promise<LocationStorageLocationListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) {
      return [];
    }
    const areas = await this.db.area.findMany({
      where: { locationId, organizationId },
      orderBy: [{ sortOrder: "asc" }]
    });
    const storageLocationIds = areas
      .map((area) => area.storageLocationId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (storageLocationIds.length === 0) {
      return [];
    }
    const storageLocations = await this.db.storageLocation.findMany({
      where: { id: { in: storageLocationIds } }
    });
    return storageLocations
      .filter((storageLocation) => !EXCLUDED_STORAGE_LOCATION_NAMES.has(storageLocation.name))
      .map(toLocationStorageLocationListItem);
  }

  public async listInventoryConfig(
    actor: Actor,
    locationId: string
  ): Promise<LocationInventoryConfigListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) {
      return [];
    }
    const rows = await this.db.locationInventoryConfig.findMany({
      where: { locationId, organizationId, isActive: true },
      orderBy: [{ createdAt: "asc" }]
    });
    return rows.map(toLocationInventoryConfigListItem);
  }

  public async listEventSpaces(
    actor: Actor,
    locationId: string
  ): Promise<EventSpaceListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) return [];
    const rows = await this.db.eventSpace.findMany({
      where: { locationId, organizationId, isActive: true },
      orderBy: [{ name: "asc" }]
    });
    return rows.map(toEventSpaceListItem);
  }

  public async listExceptionRules(
    actor: Actor,
    locationId: string,
    options?: { dateFrom?: string; dateTo?: string; type?: ExceptionRuleTypeValue }
  ): Promise<ExceptionRuleListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) return [];

    const where: Parameters<typeof this.db.exceptionRule.findMany>[0]["where"] = {
      locationId,
      organizationId,
      isActive: true
    };
    if (options?.type) {
      where.type = options.type;
    }
    if (options?.dateFrom) {
      where.startsAt = { lte: new Date(options.dateFrom) };
    }
    if (options?.dateTo) {
      where.OR = [{ endsAt: { gte: new Date(options.dateTo) } }, { endsAt: null }];
    }

    const rows = await this.db.exceptionRule.findMany({
      where,
      orderBy: [{ startsAt: "asc" }]
    });
    return rows.map(toExceptionRuleListItem);
  }

  public async listReservationConnectors(
    actor: Actor,
    locationId: string
  ): Promise<ConnectorListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) return [];
    const rows = await this.db.reservationConnector.findMany({
      where: { locationId, organizationId, isActive: true },
      orderBy: [{ provider: "asc" }]
    });
    return rows.map(toConnectorListItem);
  }

  public async listExternalSystemLinks(
    actor: Actor,
    locationId: string
  ): Promise<ExternalSystemLinkListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) return [];
    const rows = await this.db.externalSystemLink.findMany({
      where: { locationId, organizationId, isActive: true },
      orderBy: [{ kind: "asc" }]
    });
    return rows.map(toExternalSystemLinkListItem);
  }

  public async getTodayOverview(
    actor: Actor,
    locationId: string,
    date: string
  ): Promise<TodayOverviewDto | null> {
    const organizationId = requireOrganizationId(actor);
    const location = await this.db.location.findFirst({
      where: { id: locationId, organizationId }
    });
    if (!location) return null;

    const now = new Date();
    const dateStart = new Date(`${date}T00:00:00.000Z`);
    const dateEnd = new Date(`${date}T23:59:59.999Z`);

    const [exceptionRows, connectorRows, linkRows] = await Promise.all([
      this.db.exceptionRule.findMany({
        where: {
          locationId,
          organizationId,
          isActive: true,
          startsAt: { lte: dateEnd },
          OR: [{ endsAt: { gte: dateStart } }, { endsAt: null }]
        },
        orderBy: [{ startsAt: "asc" }]
      }),
      this.db.reservationConnector.findMany({
        where: { locationId, organizationId, isActive: true },
        orderBy: [{ provider: "asc" }]
      }),
      this.db.externalSystemLink.findMany({
        where: { locationId, organizationId, isActive: true },
        orderBy: [{ kind: "asc" }]
      })
    ]);

    // Active service slots: find slots whose time window overlaps current time
    const localHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const dayBit = 1 << dayOfWeek;

    let activeSlots: TodayOverviewDto["activeServiceSlots"] = [];
    if (this.db.serviceSlot) {
      const slots = await this.db.serviceSlot.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ startTimeLocal: "asc" }]
      });
      activeSlots = slots
        .filter(
          (s) =>
            (s.daysOfWeekMask & dayBit) !== 0 &&
            s.startTimeLocal <= localHHMM &&
            s.endTimeLocal >= localHHMM
        )
        .map((s) => ({
          id: s.id,
          name: s.name,
          slotKind: s.slotKind,
          startTimeLocal: s.startTimeLocal,
          endTimeLocal: s.endTimeLocal
        }));
    }

    // Open inquiries (PII-free header only)
    let openInquiries: TodayOverviewDto["openInquiries"] = { count: 0, items: [] };
    if (this.db.eventInquiry) {
      const inquiryRows = await this.db.eventInquiry.findMany({
        where: {
          organizationId,
          status: { in: ["NEW", "NEEDS_REVIEW"] }
        },
        orderBy: [{ createdAt: "desc" }],
        take: 5
      });
      openInquiries = {
        count: inquiryRows.length,
        items: inquiryRows.map((i) => ({
          id: i.id,
          subject: i.subject,
          guestCount: i.guestCount,
          preferredDate: i.preferredDate ? i.preferredDate.toISOString() : null,
          status: i.status,
          assignedToUserId: i.assignedToUserId
        }))
      };
    }

    return {
      locationId,
      date,
      activeServiceSlots: activeSlots,
      activeExceptionRules: exceptionRows.map(toExceptionRuleListItem),
      openInquiries,
      reservationConnectors: connectorRows.map(toConnectorListItem),
      externalSystemLinks: linkRows.map(toExternalSystemLinkListItem),
      signatureAssets: location.signatureAssets,
      weatherSensitive: location.weatherSensitive,
      cachedAt: now.toISOString()
    };
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new LocationError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function requireSameOrganization(actor: Actor, organizationId: string): void {
  const actorOrgId = requireOrganizationId(actor);
  if (actorOrgId !== organizationId) {
    throw new LocationError("organization scope mismatch", 403);
  }
}

function toBrandListItem(record: BrandRecord): BrandListItem {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toLocationListItem(record: LocationRecord): LocationListItem {
  return {
    id: record.id,
    brandId: record.brandId,
    name: record.name,
    slug: record.slug,
    type: record.type,
    profile: record.profile,
    precisionLevel: record.precisionLevel,
    signatureAssets: record.signatureAssets,
    weatherSensitive: record.weatherSensitive,
    cinemaAvailable: record.cinemaAvailable,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toLocationDetailDto(record: LocationRecord): LocationDetailDto {
  return {
    ...toLocationListItem(record),
    organizationId: record.organizationId
  };
}

function toAreaListItem(record: AreaRecord): AreaListItem {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    sortOrder: record.sortOrder,
    storageLocationId: record.storageLocationId
  };
}

function toLocationStorageLocationListItem(
  record: LocationStorageLocationRecord
): LocationStorageLocationListItem {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    isActive: record.isActive,
    organizationId: record.organizationId
  };
}

function toLocationInventoryConfigListItem(
  record: LocationInventoryConfigRecord
): LocationInventoryConfigListItem {
  return {
    id: record.id,
    inventoryItemId: record.inventoryItemId,
    areaId: record.areaId,
    storageLocationId: record.storageLocationId,
    targetQuantity: record.targetQuantity,
    minimumQuantity: record.minimumQuantity,
    premiumHandlingRequired: record.premiumHandlingRequired,
    qualityNoteRequired: record.qualityNoteRequired,
    batchNoteAllowed: record.batchNoteAllowed,
    isActive: record.isActive
  };
}

function toEventSpaceListItem(record: EventSpaceRecord): EventSpaceListItem {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    capacitySeated: record.capacitySeated,
    capacityStanding: record.capacityStanding,
    capacityIndoor: record.capacityIndoor,
    capacityOutdoor: record.capacityOutdoor,
    hasOwnBar: record.hasOwnBar,
    hasRestrooms: record.hasRestrooms,
    supports: record.supports,
    isActive: record.isActive
  };
}

function toExceptionRuleListItem(record: ExceptionRuleRecord): ExceptionRuleListItem {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    description: record.description,
    affectedUnitIds: record.affectedUnitIds,
    startsAt: record.startsAt ? record.startsAt.toISOString() : null,
    endsAt: record.endsAt ? record.endsAt.toISOString() : null,
    source: record.source,
    requiresConfirmation: record.requiresConfirmation,
    confirmedByUserId: record.confirmedByUserId,
    confirmedAt: record.confirmedAt ? record.confirmedAt.toISOString() : null,
    isActive: record.isActive
  };
}

function toConnectorListItem(record: ReservationConnectorRecord): ConnectorListItem {
  return {
    id: record.id,
    provider: record.provider,
    externalUrl: record.externalUrl,
    externalRef: record.externalRef,
    isActive: record.isActive
  };
}

function toExternalSystemLinkListItem(record: ExternalSystemLinkRecord): ExternalSystemLinkListItem {
  return {
    id: record.id,
    kind: record.kind,
    url: record.url,
    externalRef: record.externalRef,
    isActive: record.isActive
  };
}
