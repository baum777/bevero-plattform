import type { Actor } from "../auth/actor.js";
import {
  MenuError,
  type MenuDatabaseClient,
  type MenuDetailDto,
  type MenuItemAllergenDto,
  type MenuItemAllergenRecord,
  type MenuItemDetailDto,
  type MenuItemDto,
  type MenuItemIngredientDto,
  type MenuItemIngredientRecord,
  type MenuItemRecord,
  type MenuListItem,
  type MenuListOptions,
  type MenuRecord,
  type MenuServicePort,
} from "./menu.types.js";

export {
  MenuError,
  type MenuServicePort,
  type MenuDatabaseClient,
} from "./menu.types.js";

export class MenuService implements MenuServicePort {
  private readonly db: MenuDatabaseClient;

  public constructor(options: { db: MenuDatabaseClient }) {
    this.db = options.db;
  }

  public async listByUnitAndSlot(
    actor: Actor,
    unitId: string,
    options?: MenuListOptions
  ): Promise<MenuListItem[]> {
    const organizationId = requireOrganizationId(actor);
    const unit = await this.db.operationalUnit.findFirst({
      where: { id: unitId, organizationId }
    });
    if (!unit) {
      return [];
    }
    const where: Parameters<MenuDatabaseClient["menu"]["findMany"]>[0]["where"] = {
      operationalUnitId: unitId,
      organizationId
    };
    if (options?.activeOnly !== false) {
      where.isActive = true;
    }
    if (options?.slotKind) {
      where.slotKind = options.slotKind;
    }
    const rows = await this.db.menu.findMany({
      where,
      orderBy: [{ validFrom: "desc" }, { name: "asc" }]
    });
    return rows.map(toMenuListItem);
  }

  public async getById(actor: Actor, menuId: string): Promise<MenuDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.menu.findFirst({
      where: { id: menuId, organizationId },
      include: { items: true }
    });
    if (!row) {
      return null;
    }
    return toMenuDetailDto(row);
  }

  public async getItemWithDetails(
    actor: Actor,
    itemId: string
  ): Promise<MenuItemDetailDto | null> {
    const organizationId = requireOrganizationId(actor);
    const row = await this.db.menuItem.findFirst({
      where: { id: itemId, organizationId },
      include: { ingredients: true, allergens: true }
    });
    if (!row) {
      return null;
    }
    return toMenuItemDetailDto(row);
  }
}

function requireOrganizationId(actor: Actor): string {
  if (!actor.organizationId) {
    throw new MenuError("actor has no active organization", 403);
  }
  return actor.organizationId;
}

function toMenuListItem(record: MenuRecord): MenuListItem {
  return {
    id: record.id,
    operationalUnitId: record.operationalUnitId,
    name: record.name,
    slotKind: record.slotKind,
    courseCount: record.courseCount,
    priceMode: record.priceMode,
    scope: record.scope,
    validFrom: record.validFrom ? record.validFrom.toISOString() : null,
    validUntil: record.validUntil ? record.validUntil.toISOString() : null,
    isActive: record.isActive
  };
}

function toMenuDetailDto(
  record: MenuRecord & { items?: MenuItemRecord[] }
): MenuDetailDto {
  return {
    ...toMenuListItem(record),
    organizationId: record.organizationId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    items: (record.items ?? []).map(toMenuItemDto)
  };
}

function toMenuItemDto(record: MenuItemRecord): MenuItemDto {
  return {
    id: record.id,
    menuId: record.menuId,
    name: record.name,
    position: record.position,
    category: record.category,
    pricePerPersonCents: record.pricePerPersonCents,
    isVeganPossible: record.isVeganPossible,
    isVegetarian: record.isVegetarian,
    description: record.description,
    imageUrl: record.imageUrl
  };
}

function toIngredientDto(record: MenuItemIngredientRecord): MenuItemIngredientDto {
  return {
    id: record.id,
    inventoryItemId: record.inventoryItemId,
    quantityPerPerson: record.quantityPerPerson,
    unit: record.unit,
    isPremium: record.isPremium,
    notes: record.notes
  };
}

function toAllergenDto(record: MenuItemAllergenRecord): MenuItemAllergenDto {
  return {
    id: record.id,
    allergenCode: record.allergenCode,
    isTrace: record.isTrace
  };
}

function toMenuItemDetailDto(
  record: MenuItemRecord & {
    ingredients?: MenuItemIngredientRecord[];
    allergens?: MenuItemAllergenRecord[];
  }
): MenuItemDetailDto {
  return {
    ...toMenuItemDto(record),
    ingredients: (record.ingredients ?? []).map(toIngredientDto),
    allergens: (record.allergens ?? []).map(toAllergenDto)
  };
}
