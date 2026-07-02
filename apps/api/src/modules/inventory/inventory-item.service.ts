import type { PrismaClient } from "@prisma/client";
import type {
  CreateInventoryItemInput,
  InventoryItemReadDto,
  UpdateInventoryItemInput
} from "./inventory.schemas.js";
import {
  inventoryItemReadInclude,
  mapInventoryItemRead,
  type InventoryItemReadRecord
} from "./inventory-item.read-model.js";
import { InventoryNotFoundError } from "./errors.js";

export type InventoryItemDatabaseClient = Pick<PrismaClient, "inventoryItem">;

export type InventoryItemServicePort = {
  create(input: CreateInventoryItemInput): Promise<InventoryItemReadDto>;
  list(): Promise<InventoryItemReadDto[]>;
  get(id: string): Promise<InventoryItemReadDto>;
  update(id: string, input: UpdateInventoryItemInput): Promise<InventoryItemReadDto>;
  deactivate(id: string): Promise<InventoryItemReadDto>;
};

export class InventoryItemService implements InventoryItemServicePort {
  public constructor(private readonly options: { db: InventoryItemDatabaseClient }) {}

  public async create(input: CreateInventoryItemInput): Promise<InventoryItemReadDto> {
    const item = await this.options.db.inventoryItem.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        defaultUnit: input.defaultUnit,
        minStock: input.minStock,
        storageLocationId: input.storageLocationId
      },
      include: inventoryItemReadInclude
    });

    return mapInventoryItemRead(item);
  }

  public async list(): Promise<InventoryItemReadDto[]> {
    const items = await this.options.db.inventoryItem.findMany({
      include: inventoryItemReadInclude,
      orderBy: {
        name: "asc"
      }
    });

    return items.map(mapInventoryItemRead);
  }

  public async get(id: string): Promise<InventoryItemReadDto> {
    const item = await this.options.db.inventoryItem.findUnique({
      where: {
        id
      },
      include: inventoryItemReadInclude
    });

    if (!item) {
      throw new InventoryNotFoundError("inventory item not found");
    }

    return mapInventoryItemRead(item);
  }

  public async update(
    id: string,
    input: UpdateInventoryItemInput
  ): Promise<InventoryItemReadDto> {
    const item = await this.options.db.inventoryItem.update({
      where: {
        id
      },
      data: input,
      include: inventoryItemReadInclude
    });

    return mapInventoryItemRead(item);
  }

  public async deactivate(id: string): Promise<InventoryItemReadDto> {
    const item = await this.options.db.inventoryItem.update({
      where: {
        id
      },
      data: {
        isActive: false
      },
      include: inventoryItemReadInclude
    });

    return mapInventoryItemRead(item);
  }
}
