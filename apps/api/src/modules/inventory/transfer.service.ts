import { Prisma } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { InventoryConflictError } from "./errors.js";
import type { InventoryMovementRecord } from "./inventory-movement.types.js";
import type { CreateTransferInput, TransferDto } from "./inventory.schemas.js";
import { InventoryStockService } from "./inventory-stock.service.js";

type InventoryItemRecord = {
  id: string;
  organizationId: string | null;
};

type StorageLocationRecord = {
  id: string;
  organizationId: string | null;
};

type TransferTransactionClient = {
  inventoryItem: {
    findFirst(args: {
      where: { id: string };
      select: { id: true; organizationId: true };
    }): Promise<InventoryItemRecord | null>;
  };
  storageLocation: {
    findFirst(args: {
      where: { id: string; organizationId: string };
      select: { id: true; organizationId: true };
    }): Promise<StorageLocationRecord | null>;
  };
  inventoryMovement: {
    create(args: {
      data: {
        idempotencyKey: string;
        organizationId?: string;
        inventoryItemId: string;
        type: "transfer";
        quantity: number;
        unit: string;
        actorUserId: string;
        fromStorageLocationId: string;
        toStorageLocationId: string;
        note?: string;
      };
    }): Promise<{ id: string }>;
    findFirst?(args: {
      where: {
        idempotencyKey: string;
      };
      select: {
        id: true;
      };
    }): Promise<{ id: string } | null>;
    findMany(args: unknown): Promise<InventoryMovementRecord[]>;
  };
  inventoryStockSnapshot: {
    upsert(args: unknown): Promise<unknown>;
  };
};

export type TransferDatabaseClient = {
  $transaction<T>(
    callback: (transaction: unknown) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<T>;
};

export type TransferServicePort = {
  create(input: CreateTransferInput, actor: Actor): Promise<TransferDto>;
};

export class TransferService implements TransferServicePort {
  public constructor(
    private readonly options: {
      db: TransferDatabaseClient;
      now?: () => Date;
    }
  ) {}

  public async create(input: CreateTransferInput, actor: Actor): Promise<TransferDto> {
    if (!actor.organizationId) {
      throw new InventoryConflictError("actor has no organization context");
    }
    const organizationId = actor.organizationId;
    if (input.fromStorageLocationId === input.toStorageLocationId) {
      throw new InventoryConflictError("source and target location must differ");
    }
    if (input.quantity <= 0) {
      throw new InventoryConflictError("transfer quantity must be greater than zero");
    }

    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `inventory.transfer.created:${actor.userId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

    return this.options.db.$transaction(async (transaction) => {
      const tx = transaction as TransferTransactionClient;
      const [item, fromLocation, toLocation] = await Promise.all([
        tx.inventoryItem.findFirst({
          where: {
            id: input.inventoryItemId
          },
          select: {
            id: true,
            organizationId: true
          }
        }),
        tx.storageLocation.findFirst({
          where: {
            id: input.fromStorageLocationId,
            organizationId
          },
          select: {
            id: true,
            organizationId: true
          }
        }),
        tx.storageLocation.findFirst({
          where: {
            id: input.toStorageLocationId,
            organizationId
          },
          select: {
            id: true,
            organizationId: true
          }
        })
      ]);

      if (!item) {
        throw new InventoryConflictError("inventory item not found");
      }
      if (item.organizationId !== null && item.organizationId !== organizationId) {
        throw new InventoryConflictError("inventory item organization mismatch");
      }
      if (!fromLocation) {
        throw new InventoryConflictError("source storage location organization mismatch");
      }
      if (!toLocation) {
        throw new InventoryConflictError("target storage location organization mismatch");
      }

      const stockService = new InventoryStockService({
        db: tx,
        now: this.options.now
      });
      const stockAtSourceBefore = await stockService.calculateStock({
        inventoryItemId: input.inventoryItemId,
        storageLocationId: input.fromStorageLocationId,
        organizationId
      });

      if (stockAtSourceBefore - input.quantity < 0) {
        throw new InventoryConflictError("transfer would result in negative stock at source");
      }

      let movementId: string;
      try {
        const movement = await tx.inventoryMovement.create({
          data: {
            idempotencyKey,
            organizationId,
            inventoryItemId: input.inventoryItemId,
            type: "transfer",
            quantity: input.quantity,
            unit: input.unit,
            actorUserId: actor.userId,
            fromStorageLocationId: input.fromStorageLocationId,
            toStorageLocationId: input.toStorageLocationId,
            note: input.note
          }
        });
        movementId = movement.id;
      } catch (error) {
        if (
          input.idempotencyKey &&
          isUniqueConstraintError(error) &&
          tx.inventoryMovement.findFirst
        ) {
          const existing = await tx.inventoryMovement.findFirst({
            where: { idempotencyKey: input.idempotencyKey },
            select: { id: true }
          });
          if (!existing) {
            throw error;
          }
          movementId = existing.id;
        } else {
          throw error;
        }
      }

      const stockFromAfter = await stockService.refreshSnapshot({
        inventoryItemId: input.inventoryItemId,
        storageLocationId: input.fromStorageLocationId,
        unit: input.unit,
        organizationId
      });
      const stockToAfter = await stockService.refreshSnapshot({
        inventoryItemId: input.inventoryItemId,
        storageLocationId: input.toStorageLocationId,
        unit: input.unit,
        organizationId
      });

      return {
        movementId,
        stockFromAfter,
        stockToAfter
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
