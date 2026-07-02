import type { MenuCategory } from "@prisma/client";
import type { Actor } from "../auth/actor.js";

export { MenuCategory };
export type MenuCategoryValue = (typeof MenuCategory)[keyof typeof MenuCategory];

export class MenuError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 422) {
    super(message);
    this.name = "MenuError";
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Record types (Prisma row shapes)
// ============================================================================

export type MenuRecord = {
  id: string;
  organizationId: string;
  operationalUnitId: string;
  name: string;
  slotKind: string;
  courseCount: number;
  priceMode: string;
  scope: string;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuItemRecord = {
  id: string;
  organizationId: string;
  menuId: string;
  name: string;
  position: number;
  category: MenuCategoryValue;
  pricePerPersonCents: number | null;
  isVeganPossible: boolean;
  isVegetarian: boolean;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuItemIngredientRecord = {
  id: string;
  organizationId: string;
  menuItemId: string;
  inventoryItemId: string;
  quantityPerPerson: number;
  unit: string;
  isPremium: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuItemAllergenRecord = {
  id: string;
  organizationId: string;
  menuItemId: string;
  allergenCode: string;
  isTrace: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// DTOs
// ============================================================================

export type MenuListItem = {
  id: string;
  operationalUnitId: string;
  name: string;
  slotKind: string;
  courseCount: number;
  priceMode: string;
  scope: string;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
};

export type MenuItemDto = {
  id: string;
  menuId: string;
  name: string;
  position: number;
  category: MenuCategoryValue;
  pricePerPersonCents: number | null;
  isVeganPossible: boolean;
  isVegetarian: boolean;
  description: string | null;
  imageUrl: string | null;
};

export type MenuItemIngredientDto = {
  id: string;
  inventoryItemId: string;
  quantityPerPerson: number;
  unit: string;
  isPremium: boolean;
  notes: string | null;
};

export type MenuItemAllergenDto = {
  id: string;
  allergenCode: string;
  isTrace: boolean;
};

export type MenuItemDetailDto = MenuItemDto & {
  ingredients: MenuItemIngredientDto[];
  allergens: MenuItemAllergenDto[];
};

export type MenuDetailDto = MenuListItem & {
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  items: MenuItemDto[];
};

// ============================================================================
// Service port + database client
// ============================================================================

export type MenuListOptions = {
  slotKind?: string;
  activeOnly?: boolean;
};

export type MenuDatabaseClient = {
  menu: {
    findMany(args: {
      where: { operationalUnitId: string; organizationId: string; isActive?: boolean; slotKind?: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
      include?: { items?: boolean };
    }): Promise<(MenuRecord & { items?: MenuItemRecord[] })[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
      include?: { items?: boolean };
    }): Promise<(MenuRecord & { items?: MenuItemRecord[] }) | null>;
  };
  menuItem: {
    findMany(args: {
      where: { menuId: string; organizationId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
      include?: { ingredients?: boolean; allergens?: boolean };
    }): Promise<(MenuItemRecord & { ingredients?: MenuItemIngredientRecord[]; allergens?: MenuItemAllergenRecord[] })[]>;
    findFirst(args: {
      where: { id: string; organizationId: string };
      include?: { ingredients?: boolean; allergens?: boolean };
    }): Promise<(MenuItemRecord & { ingredients?: MenuItemIngredientRecord[]; allergens?: MenuItemAllergenRecord[] }) | null>;
  };
  operationalUnit: {
    findFirst(args: {
      where: { id: string; organizationId: string };
    }): Promise<{ id: string } | null>;
  };
};

export type MenuServicePort = {
  listByUnitAndSlot(
    actor: Actor,
    unitId: string,
    options?: MenuListOptions
  ): Promise<MenuListItem[]>;
  getById(actor: Actor, menuId: string): Promise<MenuDetailDto | null>;
  getItemWithDetails(actor: Actor, itemId: string): Promise<MenuItemDetailDto | null>;
};
