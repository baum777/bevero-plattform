import type { Actor } from "../auth/actor.js";
import {
  OperationalUnitError,
  type GroupRuleDto,
  type GroupRuleRecord,
  type OperationalUnitDatabaseClient,
  type OperationalUnitDetailDto,
  type OperationalUnitListItem,
  type OperationalUnitRecord,
  type OperationalUnitServicePort,
  type ServiceSlotListItem,
  type ServiceSlotRecord
} from "./operational-unit.types.js";

export {
  OperationalUnitError,
  type OperationalUnitServicePort,
  type OperationalUnitDatabaseClient
} from "./operational-unit.types.js";

export class OperationalUnitService implements OperationalUnitServicePort {
  private readonly db: OperationalUnitDatabaseClient;

  public constructor(options: { db: OperationalUnitDatabaseClient }) {
    this.db = options.db;
  }

  public async listByLocation(
    actor: Actor,
    locationId: string
  ): Promise<OperationalUnitListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const rows = await this.db.operationalUnit.findMany({
      where: { locationId, organizationId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return rows.map(toOperationalUnitListItem);
  }

  public async getById(
    actor: Actor,
    unitId: string
  ): Promise<OperationalUnitDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.operationalUnit.findFirst({
      where: { id: unitId, organizationId }
    });
    if (!row) {
      return null;
    }
    return toOperationalUnitDetailDto(row);
  }

  public async listSlots(actor: Actor, unitId: string): Promise<ServiceSlotListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const unit = await this.db.operationalUnit.findFirst({
      where: { id: unitId, organizationId }
    });
    if (!unit) {
      return [];
    }
    const rows = await this.db.serviceSlot.findMany({
      where: { operationalUnitId: unitId, organizationId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return rows.map(toServiceSlotListItem);
  }

  public async getGroupRule(actor: Actor, unitId: string): Promise<GroupRuleDto | null> {
    const organizationId = requireOrganizationId(actor);
    const unit = await this.db.operationalUnit.findFirst({
      where: { id: unitId, organizationId }
    });
    if (!unit) {
      return null;
    }
    const row = await this.db.groupRule.findFirst({
      where: { operationalUnitId: unitId, organizationId }
    });
    if (!row) {
      return null;
    }
    return toGroupRuleDto(row);
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new OperationalUnitError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function toOperationalUnitListItem(record: OperationalUnitRecord): OperationalUnitListItem {
  return {
    id: record.id,
    locationId: record.locationId,
    key: record.key,
    name: record.name,
    unitType: record.unitType,
    parentContext: record.parentContext,
    requiresManualConfirmation: record.requiresManualConfirmation,
    weatherSensitive: record.weatherSensitive,
    outdoorCapacityRelevant: record.outdoorCapacityRelevant,
    inventoryScopes: [...record.inventoryScopes],
    dayparts: [...record.dayparts],
    sortOrder: record.sortOrder,
    isActive: record.isActive
  };
}

function toOperationalUnitDetailDto(record: OperationalUnitRecord): OperationalUnitDetailDto {
  return {
    ...toOperationalUnitListItem(record),
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toServiceSlotListItem(record: ServiceSlotRecord): ServiceSlotListItem {
  return {
    id: record.id,
    operationalUnitId: record.operationalUnitId,
    slotKind: record.slotKind,
    name: record.name,
    daysOfWeekMask: record.daysOfWeekMask,
    startTimeLocal: record.startTimeLocal,
    endTimeLocal: record.endTimeLocal,
    kitchenTimeLocal: record.kitchenTimeLocal,
    inventoryImpact: [...record.inventoryImpact],
    sortOrder: record.sortOrder,
    isActive: record.isActive
  };
}

function toGroupRuleDto(record: GroupRuleRecord): GroupRuleDto {
  return {
    id: record.id,
    operationalUnitId: record.operationalUnitId,
    alaCarteMaxGuests: record.alaCarteMaxGuests,
    groupMenuRequiredFrom: record.groupMenuRequiredFrom,
    bankettInquiryFrom: record.bankettInquiryFrom,
    exclusiveRentalFrom: record.exclusiveRentalFrom,
    seatedMenuMax: record.seatedMenuMax,
    standingReceptionMax: record.standingReceptionMax
  };
}
