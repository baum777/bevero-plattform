import {
  BusinessUnitName,
  EventConceptName,
  ExternalCatalogEntryType,
  CateringMode,
} from "@prisma/client";
import type { Actor } from "../auth/actor.js";

export {
  BusinessUnitName,
  EventConceptName,
  ExternalCatalogEntryType,
  CateringMode,
};

export type BusinessUnitNameValue =
  (typeof BusinessUnitName)[keyof typeof BusinessUnitName];
export type EventConceptNameValue =
  (typeof EventConceptName)[keyof typeof EventConceptName];

export class OrganizationError extends Error {
  public readonly statusCode: 400 | 403 | 404;

  public constructor(message: string, statusCode: 400 | 403 | 404) {
    super(message);
    this.name = "OrganizationError";
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Record types (DB layer)
// ============================================================================

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  headquartersAddress: string | null;
  headquartersPhone: string | null;
  headquartersEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessUnitRecord = {
  id: string;
  organizationId: string;
  name: BusinessUnitNameValue;
  slug: string;
  description: string | null;
  defaultWorkflowKey: string;
  requiredInquiryFields: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type EventConceptRecord = {
  id: string;
  organizationId: string;
  name: EventConceptNameValue;
  customName: string | null;
  description: string | null;
  themeTags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ExternalCatalogEntryRecord = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  city: string;
  region: string;
  type: ExternalCatalogEntryType;
  capacityMin: number | null;
  capacityMax: number | null;
  cateringMode: CateringMode;
  logisticsProfile: unknown;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// DTOs (API layer)
// ============================================================================

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  headquartersAddress: string | null;
  headquartersPhone: string | null;
  headquartersEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessUnitDto = {
  id: string;
  organizationId: string;
  name: BusinessUnitNameValue;
  slug: string;
  description: string | null;
  defaultWorkflowKey: string;
  requiredInquiryFields: unknown;
  createdAt: string;
  updatedAt: string;
};

export type EventConceptDto = {
  id: string;
  organizationId: string;
  name: EventConceptNameValue;
  customName: string | null;
  description: string | null;
  themeTags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExternalCatalogEntryDto = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  city: string;
  region: string;
  type: ExternalCatalogEntryType;
  capacityMin: number | null;
  capacityMax: number | null;
  cateringMode: CateringMode;
  logisticsProfile: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Overview aggregate (Task 12 / ADR-0057)
// ============================================================================

export type BusinessUnitCounts = Record<BusinessUnitNameValue, number>;

export type InquiryStats = {
  total: number;
  byStatus: Record<string, number>;
  byBusinessUnit: Record<string, number>;
  last7Days: number;
  last30Days: number;
};

export type CriticalStockLocation = {
  locationId: string;
  locationName: string;
  criticalStockAlerts: number;
};

export type ActiveExceptionRule = {
  id: string;
  type: string;
  title: string;
  locationId: string;
  locationName: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type UpcomingEventHeader = {
  id: string;
  subject: string;
  guestCount: number | null;
  preferredDate: string | null;
  businessUnitHint: BusinessUnitNameValue | null;
  status: string;
  source: string;
  contactNameInitials: string;
};

export type LocationComparisonRow = {
  locationId: string;
  locationName: string;
  isExternal: boolean;
  brandId: string | null;
  city: string | null;
  criticalStockAlerts: number;
  activeExceptionRules: number;
  openInquiries: number;
  signatureAssetCount: number;
};

export type OrganizationOverviewDto = {
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  businessUnitCounts: BusinessUnitCounts;
  locationCount: number;
  externalLocationCount: number;
  signatureAssetCount: number;
  inquiryStats: InquiryStats;
  criticalStockLocations: CriticalStockLocation[];
  activeExceptionRules: ActiveExceptionRule[];
  upcomingEvents: UpcomingEventHeader[];
  locationComparison: LocationComparisonRow[];
};

export type CompatibleLocationRow = {
  compatibilityId: string;
  compatibilityScore: number | null;
  notes: string | null;
  location: {
    id: string;
    name: string;
    city: string | null;
    profile: string;
    brandId: string;
    isExternal: false;
  } | {
    id: string;
    name: string;
    city: string;
    type: string;
    capacityMin: number | null;
    capacityMax: number | null;
    cateringMode: string;
    isExternal: true;
  };
};

// ============================================================================
// Database client interface
// ============================================================================

export type OrganizationDatabaseClient = {
  organization: {
    findFirst: (args: {
      where: { id?: string; slug?: string };
    }) => Promise<OrganizationRecord | null>;
    findMany: (args?: {
      where?: { id?: string };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<OrganizationRecord[]>;
  };
  businessUnit: {
    findMany: (args: {
      where: { organizationId: string };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<BusinessUnitRecord[]>;
  };
  eventConcept: {
    findMany: (args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<EventConceptRecord[]>;
    findFirst: (args: {
      where: { id: string; organizationId: string };
    }) => Promise<EventConceptRecord | null>;
  };
  externalCatalogEntry: {
    findMany: (args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<ExternalCatalogEntryRecord[]>;
  };
  eventConceptLocationCompatibility: {
    findMany: (args: {
      where: { eventConceptId: string };
    }) => Promise<EventConceptCompatibilityRecord[]>;
  };
  location: {
    findMany: (args: {
      where: { organizationId: string; isActive?: boolean };
      orderBy?: Array<Record<string, "asc" | "desc">>;
    }) => Promise<LocationSummaryRecord[]>;
  };
  exceptionRule: {
    findMany: (args: {
      where: { organizationId: string; isActive: boolean };
      orderBy?: Array<Record<string, "asc" | "desc">>;
      take?: number;
    }) => Promise<ExceptionRuleRecord[]>;
  };
  inquiry: {
    count: (args: {
      where: { organizationId: string; createdAt?: { gte: Date } };
    }) => Promise<number>;
    groupBy: (args: {
      by: Array<"status" | "businessUnitHint">;
      where: { organizationId: string };
      _count: { _all: true };
    }) => Promise<Array<{ status?: string; businessUnitHint?: string; _count: { _all: number } }>>;
    findMany: (args: {
      where: { organizationId: string; status?: { in: string[] }; preferredDate?: { gte: Date; lte: Date } };
      orderBy?: Array<Record<string, "asc" | "desc">>;
      take?: number;
    }) => Promise<UpcomingInquiryRecord[]>;
  };
  workflowEvent: {
    findMany: (args: {
      where?: { type?: { startsWith?: string } };
      orderBy?: Array<Record<string, "asc" | "desc">>;
      take?: number;
    }) => Promise<WorkflowEventHeaderRecord[]>;
  };
};

export type EventConceptCompatibilityRecord = {
  id: string;
  eventConceptId: string;
  locationId: string | null;
  externalCatalogEntryId: string | null;
  compatibilityScore: number | null;
  notes: string | null;
};

export type LocationSummaryRecord = {
  id: string;
  organizationId: string;
  brandId: string;
  name: string;
  slug: string;
  profile: string;
  signatureAssets: string[];
  isActive: boolean;
};

export type ExceptionRuleRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  type: string;
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  location?: { name: string } | null;
};

export type UpcomingInquiryRecord = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue | null;
  source: string;
  subject: string;
  guestCount: number | null;
  contactName: string;
  preferredDate: Date | null;
  status: string;
};

export type WorkflowEventHeaderRecord = {
  id: string;
  type: string;
  source: string;
  occurredAt: Date;
  createdAt: Date;
};

// ============================================================================
// Service port
// ============================================================================

export type OrganizationServicePort = {
  getOrganization: (actor: Actor) => Promise<OrganizationDto | null>;
  listBusinessUnits: (actor: Actor) => Promise<BusinessUnitDto[]>;
  listEventConcepts: (
    actor: Actor,
    options?: { businessUnitId?: string }
  ) => Promise<EventConceptDto[]>;
  listExternalCatalogEntries: (actor: Actor) => Promise<ExternalCatalogEntryDto[]>;
  listCompatibleLocations: (
    actor: Actor,
    eventConceptId: string
  ) => Promise<CompatibleLocationRow[]>;
  getOverview: (actor: Actor) => Promise<OrganizationOverviewDto | null>;
};
