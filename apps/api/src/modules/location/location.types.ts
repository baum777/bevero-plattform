import type { Actor } from "../auth/actor.js";

// ADR-0030 (accepted) + ADR-0031 (accepted): Multi-Standort / CUBE Premium
// data model. This file is the typed contract for the location module.
// 4 new models (Brand, Location, Area, LocationMember) + 1 join
// (LocationInventoryConfig) + 2 new enums (LocationProfile,
// StoragePrecisionLevel). Existing models (InventoryItem, StorageLocation,
// OrganizationMember) are unchanged per ADR-0030 §Decisions Made Binding
// §2-3 and ADR-0031 §Decisions Made Binding §1.

export type LocationProfile =
  | "MOTORWORLD_STANDARD"
  | "CUBE_PREMIUM"
  | "EVENT_BANKETT_FUTURE";

export type StoragePrecisionLevel = "BASIC" | "DETAILED" | "PREMIUM_TRACEABLE";

export const LOCATION_PROFILES: readonly LocationProfile[] = [
  "MOTORWORLD_STANDARD",
  "CUBE_PREMIUM",
  "EVENT_BANKETT_FUTURE"
] as const;

export const STORAGE_PRECISION_LEVELS: readonly StoragePrecisionLevel[] = [
  "BASIC",
  "DETAILED",
  "PREMIUM_TRACEABLE"
] as const;

export class LocationError extends Error {
  public readonly statusCode: 400 | 403 | 404;

  public constructor(message: string, statusCode: 400 | 403 | 404) {
    super(message);
    this.name = "LocationError";
    this.statusCode = statusCode;
  }
}

export type BrandRecord = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationRecord = {
  id: string;
  organizationId: string;
  brandId: string;
  name: string;
  slug: string;
  type: string | null;
  profile: LocationProfile;
  precisionLevel: StoragePrecisionLevel;
  signatureAssets: string[];
  weatherSensitive: boolean;
  cinemaAvailable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AreaRecord = {
  id: string;
  locationId: string;
  organizationId: string;
  name: string;
  type: string | null;
  storageLocationId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationMemberRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  userId: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationInventoryConfigRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  inventoryItemId: string;
  areaId: string | null;
  storageLocationId: string | null;
  targetQuantity: number | null;
  minimumQuantity: number | null;
  premiumHandlingRequired: boolean;
  qualityNoteRequired: boolean;
  batchNoteAllowed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationStorageLocationRecord = {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean;
  organizationId: string | null;
};

export type OrganizationReadDto = {
  organizationId: string;
};

export type BrandListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationListItem = {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  type: string | null;
  profile: LocationProfile;
  precisionLevel: StoragePrecisionLevel;
  signatureAssets: string[];
  weatherSensitive: boolean;
  cinemaAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocationDetailDto = LocationListItem & {
  organizationId: string;
};

export type LocationProfileDto = {
  locationId: string;
  name: string;
  profile: LocationProfile;
  precisionLevel: StoragePrecisionLevel;
  isActive: boolean;
};

export type AreaListItem = {
  id: string;
  name: string;
  type: string | null;
  sortOrder: number;
  storageLocationId: string | null;
};

export type LocationStorageLocationListItem = {
  id: string;
  name: string;
  type: string | null;
  isActive: boolean;
  organizationId: string | null;
};

export type LocationInventoryConfigListItem = {
  id: string;
  inventoryItemId: string;
  areaId: string | null;
  storageLocationId: string | null;
  targetQuantity: number | null;
  minimumQuantity: number | null;
  premiumHandlingRequired: boolean;
  qualityNoteRequired: boolean;
  batchNoteAllowed: boolean;
  isActive: boolean;
};

export type EventSpaceSupportValue =
  | "PRIVATE_EVENT"
  | "COMPANY_EVENT"
  | "WEDDING"
  | "CONFERENCE"
  | "PRODUCT_PRESENTATION"
  | "CINEMA"
  | "DINNER_THEATER"
  | "WORKSHOP"
  | "SEMINAR"
  | "PRESENTATION_PITCH"
  | "TRAINING"
  | "EVENT_ADDON";

export type ExceptionRuleTypeValue =
  | "EXCLUSIVE_EVENT_CLOSURE"
  | "BRUNCH_BLOCKS_REGULAR_SERVICE"
  | "OECHSLE_BUFFET_OVERRIDE"
  | "WEATHER_OUTDOOR_CHANGE"
  | "HOLIDAY_SCHEDULE"
  | "HOTEL_OPERATIONAL_HOLIDAY"
  | "BRUNCH_SUNDAY_LATE_START"
  | "EVENT_CLOSURE_PRIVATE";

export type ReservationProviderValue =
  | "GASTRONAUT"
  | "GASTRONOVI"
  | "PHONE"
  | "WALK_IN"
  | "EVENT_INQUIRY"
  | "EVIIVO"
  | "OTHER";

export type ExternalSystemLinkKindValue =
  | "GUTSCHEINE_AMADEUS360"
  | "HOTEL_EVIIVO"
  | "OECHSLE_SCHEDULE"
  | "FOODNOTIFY_BRIDGE"
  | "GASTRONOVI_BRIDGE"
  | "GASTRONAUT_BRIDGE"
  | "OTHER";

export type EventSpaceRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  name: string;
  slug: string;
  capacitySeated: number | null;
  capacityStanding: number | null;
  capacityIndoor: number | null;
  capacityOutdoor: number | null;
  hasOwnBar: boolean;
  hasRestrooms: boolean;
  supports: EventSpaceSupportValue[];
  metadata: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExceptionRuleRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  type: ExceptionRuleTypeValue;
  title: string;
  description: string | null;
  affectedUnitIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  source: string;
  requiresConfirmation: boolean;
  confirmedByUserId: string | null;
  confirmedAt: Date | null;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type ReservationConnectorRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  provider: ReservationProviderValue;
  externalUrl: string | null;
  externalRef: string | null;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type ExternalSystemLinkRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  kind: ExternalSystemLinkKindValue;
  url: string;
  externalRef: string | null;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type EventSpaceListItem = {
  id: string;
  name: string;
  slug: string;
  capacitySeated: number | null;
  capacityStanding: number | null;
  capacityIndoor: number | null;
  capacityOutdoor: number | null;
  hasOwnBar: boolean;
  hasRestrooms: boolean;
  supports: EventSpaceSupportValue[];
  isActive: boolean;
};

export type ExceptionRuleListItem = {
  id: string;
  type: ExceptionRuleTypeValue;
  title: string;
  description: string | null;
  affectedUnitIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  source: string;
  requiresConfirmation: boolean;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  isActive: boolean;
};

export type ConnectorListItem = {
  id: string;
  provider: ReservationProviderValue;
  externalUrl: string | null;
  externalRef: string | null;
  isActive: boolean;
};

export type ExternalSystemLinkListItem = {
  id: string;
  kind: ExternalSystemLinkKindValue;
  url: string;
  externalRef: string | null;
  isActive: boolean;
};

export type OpenInquiryHeader = {
  id: string;
  subject: string;
  guestCount: number | null;
  preferredDate: string | null;
  status: string;
  assignedToUserId: string | null;
};

export type TodayOverviewDto = {
  locationId: string;
  date: string;
  activeServiceSlots: Array<{ id: string; name: string; slotKind: string; startTimeLocal: string; endTimeLocal: string }>;
  activeExceptionRules: ExceptionRuleListItem[];
  openInquiries: { count: number; items: OpenInquiryHeader[] };
  reservationConnectors: ConnectorListItem[];
  externalSystemLinks: ExternalSystemLinkListItem[];
  signatureAssets: string[];
  weatherSensitive: boolean;
  cachedAt: string;
};

export type LocationServicePort = {
  listOrganizations(actor: Actor): Promise<OrganizationReadDto[]>;
  listBrands(actor: Actor, organizationId: string): Promise<BrandListItem[]>;
  listLocations(actor: Actor, organizationId: string): Promise<LocationListItem[]>;
  getLocation(actor: Actor, locationId: string): Promise<LocationDetailDto | null>;
  getLocationProfile(actor: Actor, locationId: string): Promise<LocationProfileDto | null>;
  listAreas(actor: Actor, locationId: string): Promise<AreaListItem[]>;
  listStorageLocations(
    actor: Actor,
    locationId: string
  ): Promise<LocationStorageLocationListItem[]>;
  listInventoryConfig(
    actor: Actor,
    locationId: string
  ): Promise<LocationInventoryConfigListItem[]>;
  listEventSpaces(actor: Actor, locationId: string): Promise<EventSpaceListItem[]>;
  listExceptionRules(
    actor: Actor,
    locationId: string,
    options?: { dateFrom?: string; dateTo?: string; type?: ExceptionRuleTypeValue }
  ): Promise<ExceptionRuleListItem[]>;
  listReservationConnectors(actor: Actor, locationId: string): Promise<ConnectorListItem[]>;
  listExternalSystemLinks(actor: Actor, locationId: string): Promise<ExternalSystemLinkListItem[]>;
  getTodayOverview(actor: Actor, locationId: string, date: string): Promise<TodayOverviewDto | null>;
};

export type LocationDatabaseClient = {
  brand: {
    findMany(args: {
      where: { organizationId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<BrandRecord[]>;
  };
  location: {
    findMany(args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<LocationRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<LocationRecord | null>;
  };
  area: {
    findMany(args: {
      where: { locationId: string; organizationId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<AreaRecord[]>;
  };
  storageLocation: {
    findMany(args: {
      where: { id: { in: string[] } };
    }): Promise<LocationStorageLocationRecord[]>;
  };
  locationInventoryConfig: {
    findMany(args: {
      where: { locationId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<LocationInventoryConfigRecord[]>;
  };
  eventSpace: {
    findMany(args: {
      where: { locationId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<EventSpaceRecord[]>;
  };
  exceptionRule: {
    findMany(args: {
      where: {
        locationId: string;
        organizationId: string;
        isActive?: boolean;
        type?: ExceptionRuleTypeValue;
        startsAt?: { lte?: Date };
        endsAt?: { gte?: Date } | null;
        OR?: Array<{ endsAt?: { gte?: Date } | null }>;
      };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<ExceptionRuleRecord[]>;
  };
  reservationConnector: {
    findMany(args: {
      where: { locationId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<ReservationConnectorRecord[]>;
  };
  externalSystemLink: {
    findMany(args: {
      where: { locationId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<ExternalSystemLinkRecord[]>;
  };
  serviceSlot: {
    findMany(args: {
      where: { operationalUnitId?: string; organizationId?: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<Array<{ id: string; name: string; slotKind: string; startTimeLocal: string; endTimeLocal: string; daysOfWeekMask: number; operationalUnitId: string; isActive: boolean }>>
  };
  eventInquiry?: {
    findMany(args: {
      where: { organizationId: string; operationalUnitId?: string; status?: { in: string[] } };
      orderBy: Array<Record<string, "asc" | "desc">>;
      take?: number;
    }): Promise<Array<{ id: string; subject: string; guestCount: number | null; preferredDate: Date | null; status: string; assignedToUserId: string | null }>>;
  };
};
