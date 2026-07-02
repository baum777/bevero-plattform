import type { Actor } from "../auth/actor.js";

// ADR-0029-A (accepted): CUBE Venue-Model — Operational Units (Slice 1).
// Typed contract for the operational-unit module. 3 new models
// (OperationalUnit, ServiceSlot, GroupRule) + 1 new enum (OperationalUnitType),
// shaped per 00a-cube-venue-model-spec. Read-only slice: no mutation surface.
// Profile-Discriminator per ADR-0030 §Decisions §1 is unitType — never a
// name match. priceMode / Brutto-Netto is an annotation deferred to the next
// slice (ADR-0029-A §Open Questions).

export type OperationalUnitType =
  | "RESTAURANT"
  | "BAR"
  | "EVENT"
  | "CAFE"
  | "OUTDOOR_TERRACE"
  | "HOTEL_CONTEXT"
  | "LOUNGE";

export const OPERATIONAL_UNIT_TYPES: readonly OperationalUnitType[] = [
  "RESTAURANT",
  "BAR",
  "EVENT",
  "CAFE",
  "OUTDOOR_TERRACE",
  "HOTEL_CONTEXT",
  "LOUNGE"
] as const;

export class OperationalUnitError extends Error {
  public readonly statusCode: 400 | 403 | 404;

  public constructor(message: string, statusCode: 400 | 403 | 404) {
    super(message);
    this.name = "OperationalUnitError";
    this.statusCode = statusCode;
  }
}

export type OperationalUnitRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  key: string;
  name: string;
  unitType: OperationalUnitType;
  parentContext: string | null;
  requiresManualConfirmation: boolean;
  weatherSensitive: boolean;
  outdoorCapacityRelevant: boolean;
  inventoryScopes: string[];
  dayparts: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceSlotRecord = {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  slotKind: string;
  name: string;
  daysOfWeekMask: number;
  startTimeLocal: string;
  endTimeLocal: string;
  kitchenTimeLocal: string | null;
  inventoryImpact: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type GroupRuleRecord = {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  alaCarteMaxGuests: number;
  groupMenuRequiredFrom: number;
  bankettInquiryFrom: number;
  exclusiveRentalFrom: number | null;
  seatedMenuMax: number | null;
  standingReceptionMax: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OperationalUnitListItem = {
  id: string;
  locationId: string;
  key: string;
  name: string;
  unitType: OperationalUnitType;
  parentContext: string | null;
  requiresManualConfirmation: boolean;
  weatherSensitive: boolean;
  outdoorCapacityRelevant: boolean;
  inventoryScopes: string[];
  dayparts: string[];
  sortOrder: number;
  isActive: boolean;
};

export type OperationalUnitDetailDto = OperationalUnitListItem & {
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceSlotListItem = {
  id: string;
  operationalUnitId: string;
  slotKind: string;
  name: string;
  daysOfWeekMask: number;
  startTimeLocal: string;
  endTimeLocal: string;
  kitchenTimeLocal: string | null;
  inventoryImpact: string[];
  sortOrder: number;
  isActive: boolean;
};

export type GroupRuleDto = {
  id: string;
  operationalUnitId: string;
  alaCarteMaxGuests: number;
  groupMenuRequiredFrom: number;
  bankettInquiryFrom: number;
  exclusiveRentalFrom: number | null;
  seatedMenuMax: number | null;
  standingReceptionMax: number | null;
};

export type OperationalUnitServicePort = {
  listByLocation(actor: Actor, locationId: string): Promise<OperationalUnitListItem[]>;
  getById(actor: Actor, unitId: string): Promise<OperationalUnitDetailDto | null>;
  listSlots(actor: Actor, unitId: string): Promise<ServiceSlotListItem[]>;
  getGroupRule(actor: Actor, unitId: string): Promise<GroupRuleDto | null>;
};

export type OperationalUnitDatabaseClient = {
  operationalUnit: {
    findMany(args: {
      where: { locationId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<OperationalUnitRecord[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<OperationalUnitRecord | null>;
  };
  serviceSlot: {
    findMany(args: {
      where: { operationalUnitId: string; organizationId: string; isActive?: boolean };
      orderBy: Array<Record<string, "asc" | "desc">>;
    }): Promise<ServiceSlotRecord[]>;
  };
  groupRule: {
    findFirst(args: {
      where: { operationalUnitId: string; organizationId: string };
    }): Promise<GroupRuleRecord | null>;
  };
};
