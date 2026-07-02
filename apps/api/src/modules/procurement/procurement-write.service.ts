import { Prisma } from "@prisma/client";

import type { Actor } from "../auth/actor.js";
import {
  InventoryConflictError,
  InventoryNotFoundError,
  InventoryValidationError
} from "../inventory/errors.js";
import type { InventoryMovementRecord } from "../inventory/inventory-movement.types.js";
import { InventoryStockService } from "../inventory/inventory-stock.service.js";
import type { PatchOrderItemInput, ReceiveOrderInput } from "./procurement.schemas.js";

const editableOrderStatuses = ["pending_receipt", "needs_mapping", "ready_to_confirm"] as const;
const receivableOrderStatuses = ["pending_receipt", "ready_to_confirm"] as const;
const mappedStatuses = new Set(["mapped", "auto_mapped"]);

type DecimalLike = number | string | { toNumber(): number } | null | undefined;

type OrderItemRecord = {
  id: string;
  unit: string;
  productNameRaw: string;
  supplierSku: string | null;
  orderedQty: DecimalLike;
  deliveredQty: DecimalLike;
  acceptedQty: DecimalLike;
  inventoryItemId: string | null;
  mappingStatus: string;
  rejectionReason: string | null;
  comment: string | null;
};

type OrderRecord = {
  id: string;
  organizationId: string;
  locationId: string | null;
  supplierName: string;
  status: string;
  items: OrderItemRecord[];
};

type OrderItemUpdateData = {
  deliveredQty?: number;
  acceptedQty?: number;
  inventoryItemId?: string | null;
  mappingStatus?: string;
  rejectionReason?: string | null;
  comment?: string | null;
};

type ProcurementWriteTransactionClient = {
  procurementOrder: {
    findFirst(args: {
      where: { id: string; organizationId: string };
      include: { items: { orderBy: { lineNumber: "asc" } } };
    }): Promise<OrderRecord | null>;
    update(args: {
      where: { id: string };
      data: { status: string };
    }): Promise<unknown>;
  };
  procurementOrderItem: {
    update(args: { where: { id: string }; data: OrderItemUpdateData }): Promise<unknown>;
  };
  inventoryItem: {
    findFirst(args: {
      where: { id: string; organizationId?: string | null };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  articleMapping: {
    upsert(args: {
      where: {
        organizationId_supplierName_productNameRaw: {
          organizationId: string;
          supplierName: string;
          productNameRaw: string;
        };
      };
      create: {
        organizationId: string;
        supplierName: string;
        productNameRaw: string;
        supplierSku?: string | null;
        inventoryItemId: string;
        createdBy?: string | null;
      };
      update: { inventoryItemId: string; supplierSku?: string | null; createdBy?: string | null };
    }): Promise<unknown>;
  };
  inventoryMovement: {
    create(args: {
      data: {
        idempotencyKey: string;
        organizationId?: string;
        inventoryItemId: string;
        type: "goods_received";
        quantity: number;
        unit: string;
        actorUserId: string;
        storageLocationId?: string;
        procurementOrderItemId: string;
        note?: string;
      };
    }): Promise<{ id: string }>;
    findMany(args: unknown): Promise<InventoryMovementRecord[]>;
  };
  inventoryStockSnapshot: {
    upsert(args: unknown): Promise<unknown>;
  };
  workflowEvent: {
    create(args: {
      data: {
        type: string;
        version: number;
        source: string;
        externalId: string;
        idempotencyKey: string;
        occurredAt: Date;
        dataJson: unknown;
        metadataJson?: unknown;
      };
    }): Promise<unknown>;
  };
};

export type ProcurementWriteDatabaseClient = {
  $transaction<T>(
    callback: (transaction: ProcurementWriteTransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<T>;
  workflowEvent: {
    create(args: {
      data: {
        type: string;
        version: number;
        source: string;
        externalId: string;
        idempotencyKey: string;
        occurredAt: Date;
        dataJson: unknown;
        metadataJson?: unknown;
      };
    }): Promise<unknown>;
  };
};

export type UpdateOrderItemResult = {
  item: {
    id: string;
    deliveredQty?: number;
    acceptedQty?: number;
    inventoryItemId?: string;
    mappingStatus: string;
    rejectionReason?: string;
    comment?: string;
  };
  orderStatus: string;
  changed: boolean;
};

export type ReceiveOrderResult = {
  order: { id: string; status: string; confirmedAt: string };
  movements: string[];
  stockUpdates: Array<{ inventoryItemId: string; storageLocationId?: string; quantity: number }>;
};

export class ProcurementWriteService {
  public constructor(
    private readonly options: {
      db: ProcurementWriteDatabaseClient;
      now?: () => Date;
    }
  ) {}

  public async updateItem(
    organizationId: string,
    orderId: string,
    itemId: string,
    input: PatchOrderItemInput,
    actor: Actor
  ): Promise<UpdateOrderItemResult> {
    return this.options.db.$transaction(
      async (tx) => {
        const order = await tx.procurementOrder.findFirst({
          where: { id: orderId, organizationId },
          include: { items: { orderBy: { lineNumber: "asc" } } }
        });

        if (!order) {
          throw new InventoryNotFoundError("procurement order not found");
        }

        const item = order.items.find((candidate) => candidate.id === itemId);
        if (!item) {
          throw new InventoryNotFoundError("procurement order item not found");
        }

        if (!(editableOrderStatuses as readonly string[]).includes(order.status)) {
          throw new InventoryConflictError(
            `order in status "${order.status}" can no longer be edited`
          );
        }

        if (item.acceptedQty !== null && item.acceptedQty !== undefined) {
          throw new InventoryConflictError("item already confirmed and cannot be edited");
        }

        const update: OrderItemUpdateData = {};
        let nextMappingStatus = item.mappingStatus;
        let nextInventoryItemId = item.inventoryItemId;

        if (input.delivered_qty !== undefined) {
          update.deliveredQty = input.delivered_qty;
        }

        if (input.comment !== undefined) {
          update.comment = input.comment;
        }

        if (input.rejection_reason !== undefined) {
          update.rejectionReason = input.rejection_reason;
        }

        if (input.inventory_item_id !== undefined) {
          if (input.inventory_item_id === null) {
            update.inventoryItemId = null;
            update.mappingStatus = "needs_review";
            nextInventoryItemId = null;
            nextMappingStatus = "needs_review";
          } else {
            const inventoryItem = await tx.inventoryItem.findFirst({
              where: { id: input.inventory_item_id, organizationId },
              select: { id: true }
            });
            if (!inventoryItem) {
              throw new InventoryValidationError("inventory_item_id does not reference a known item");
            }

            update.inventoryItemId = input.inventory_item_id;
            update.mappingStatus = "mapped";
            nextInventoryItemId = input.inventory_item_id;
            nextMappingStatus = "mapped";

            await tx.articleMapping.upsert({
              where: {
                organizationId_supplierName_productNameRaw: {
                  organizationId,
                  supplierName: order.supplierName,
                  productNameRaw: normalizeProductName(item.productNameRaw)
                }
              },
              create: {
                organizationId,
                supplierName: order.supplierName,
                productNameRaw: normalizeProductName(item.productNameRaw),
                supplierSku: item.supplierSku,
                inventoryItemId: input.inventory_item_id,
                createdBy: actor.userId
              },
              update: {
                inventoryItemId: input.inventory_item_id,
                supplierSku: item.supplierSku,
                createdBy: actor.userId
              }
            });
          }
        }

        const changed = Object.keys(update).length > 0;

        if (changed) {
          await tx.procurementOrderItem.update({ where: { id: itemId }, data: update });
        }

        const orderStatus = this.recalculateOrderStatus(order.items, {
          itemId,
          mappingStatus: nextMappingStatus
        });

        if (orderStatus !== order.status) {
          await tx.procurementOrder.update({
            where: { id: orderId },
            data: { status: orderStatus }
          });
        }

        return {
          item: {
            id: itemId,
            deliveredQty:
              update.deliveredQty ?? decimalToNumber(item.deliveredQty),
            acceptedQty: decimalToNumber(item.acceptedQty),
            inventoryItemId: nextInventoryItemId ?? undefined,
            mappingStatus: nextMappingStatus,
            rejectionReason:
              (update.rejectionReason ?? item.rejectionReason) ?? undefined,
            comment: (update.comment ?? item.comment) ?? undefined
          },
          orderStatus,
          changed
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  public async receiveOrder(
    organizationId: string,
    orderId: string,
    input: ReceiveOrderInput,
    actor: Actor
  ): Promise<ReceiveOrderResult> {
    const requestItemIds = input.items.map((item) => item.item_id);
    const uniqueRequestItemIds = new Set(requestItemIds);
    if (uniqueRequestItemIds.size !== requestItemIds.length) {
      throw new InventoryConflictError("duplicate item_id in receive payload");
    }

    try {
      return await this.options.db.$transaction(
        async (tx) => {
          const order = await tx.procurementOrder.findFirst({
            where: { id: orderId, organizationId },
            include: { items: { orderBy: { lineNumber: "asc" } } }
          });

          if (!order) {
            throw new InventoryNotFoundError("procurement order not found");
          }

          if (!(receivableOrderStatuses as readonly string[]).includes(order.status)) {
            throw new InventoryConflictError("order was modified, please reload");
          }

          const itemsById = new Map(order.items.map((item) => [item.id, item]));

          if (uniqueRequestItemIds.size !== order.items.length) {
            throw new InventoryValidationError("receive payload must cover every order item");
          }
          for (const orderItem of order.items) {
            if (!uniqueRequestItemIds.has(orderItem.id)) {
              throw new InventoryValidationError("receive payload must cover every order item");
            }
          }

          const stockService = new InventoryStockService({ db: tx, now: this.options.now });
          const movements: string[] = [];
          const stockUpdates: ReceiveOrderResult["stockUpdates"] = [];
          let hasShortfall = false;

          for (const requested of input.items) {
            const orderItem = itemsById.get(requested.item_id);
            if (!orderItem) {
              throw new InventoryValidationError("unknown item_id in receive payload");
            }

            if (orderItem.acceptedQty !== null && orderItem.acceptedQty !== undefined) {
              throw new InventoryConflictError("item already confirmed");
            }

            if (!orderItem.inventoryItemId) {
              throw new InventoryValidationError(
                `item ${orderItem.id} is not mapped to an inventory item`
              );
            }

            const effectiveDelivered =
              decimalToNumber(orderItem.deliveredQty) ?? decimalToNumber(orderItem.orderedQty) ?? 0;
            if (requested.accepted_qty > effectiveDelivered) {
              throw new InventoryValidationError(
                `accepted_qty exceeds delivered quantity for item ${orderItem.id}`
              );
            }

            if (requested.accepted_qty < effectiveDelivered || requested.rejection_reason) {
              hasShortfall = true;
            }

            await tx.procurementOrderItem.update({
              where: { id: orderItem.id },
              data: {
                acceptedQty: requested.accepted_qty,
                ...(requested.comment !== undefined ? { comment: requested.comment } : {}),
                ...(requested.rejection_reason !== undefined
                  ? { rejectionReason: requested.rejection_reason }
                  : {})
              }
            });

            if (requested.accepted_qty > 0) {
              const storageLocationId = order.locationId ?? undefined;
              const movement = await tx.inventoryMovement.create({
                data: {
                  idempotencyKey: `procurement.receive.item:${orderItem.id}`,
                  organizationId,
                  inventoryItemId: orderItem.inventoryItemId,
                  type: "goods_received",
                  quantity: requested.accepted_qty,
                  unit: orderItem.unit,
                  actorUserId: actor.userId,
                  storageLocationId,
                  procurementOrderItemId: orderItem.id,
                  note: requested.comment
                }
              });
              movements.push(movement.id);

              const quantity = await stockService.refreshSnapshot({
                inventoryItemId: orderItem.inventoryItemId,
                storageLocationId,
                unit: orderItem.unit,
                organizationId
              });
              stockUpdates.push({
                inventoryItemId: orderItem.inventoryItemId,
                storageLocationId,
                quantity
              });
            }
          }

          const status = hasShortfall ? "partially_received" : "received";
          await tx.procurementOrder.update({ where: { id: orderId }, data: { status } });

          const occurredAt = this.options.now?.() ?? new Date();
          await tx.workflowEvent.create({
            data: {
              type: "procurement.order_received",
              version: 1,
              source: "system",
              externalId: orderId,
              idempotencyKey: `procurement.receive.order:${orderId}`,
              occurredAt,
              dataJson: {
                orderId,
                organizationId,
                actorUserId: actor.userId,
                status,
                acceptedItems: input.items.length,
                movementCount: movements.length
              },
              metadataJson: undefined
            }
          });

          return {
            order: { id: orderId, status, confirmedAt: occurredAt.toISOString() },
            movements,
            stockUpdates
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const isDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      const conflict = isDuplicate
        ? new InventoryConflictError("order already confirmed (duplicate receive)")
        : error;

      if (conflict instanceof InventoryConflictError) {
        await this.recordReceiveConflict(organizationId, orderId, actor, conflict.message);
      }

      throw conflict;
    }
  }

  private async recordReceiveConflict(
    organizationId: string,
    orderId: string,
    actor: Actor,
    reason: string
  ): Promise<void> {
    const occurredAt = this.options.now?.() ?? new Date();
    try {
      await this.options.db.workflowEvent.create({
        data: {
          type: "procurement.receive_conflict",
          version: 1,
          source: "system",
          externalId: orderId,
          idempotencyKey: `procurement.receive_conflict:${orderId}:${occurredAt.getTime()}`,
          occurredAt,
          dataJson: { orderId, organizationId, actorUserId: actor.userId, reason },
          metadataJson: undefined
        }
      });
    } catch {
      // Monitoring breadcrumb is best-effort; never mask the original conflict.
    }
  }

  private recalculateOrderStatus(
    items: OrderItemRecord[],
    override: { itemId: string; mappingStatus: string }
  ): string {
    const allMapped = items.every((item) => {
      const status = item.id === override.itemId ? override.mappingStatus : item.mappingStatus;
      return mappedStatuses.has(status);
    });

    return allMapped ? "ready_to_confirm" : "needs_mapping";
  }
}

export function normalizeProductName(value: string): string {
  return value.trim().toLowerCase();
}

function decimalToNumber(value: DecimalLike): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return value.toNumber();
}
