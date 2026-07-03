import type {
  AdminStockRow,
  InventoryMovementRow,
  ReviewTaskRow
} from "./inventory.schemas.js";
import type { InventoryMovementType } from "./inventory-movement.types.js";
import { signedQuantity } from "./inventory-stock.service.js";

type InventoryItemWithReadRelations = {
  id: string;
  name: string;
  category: string | null;
  defaultUnit: string;
  minStock: number | null;
  storageLocation?: {
    name: string;
  } | null;
  movements: Array<{
    type: InventoryMovementType;
    quantity: number;
    unit: string;
    createdAt: Date;
    storageLocation?: {
      name: string;
    } | null;
  }>;
};

type MovementReadRecord = {
  id: string;
  inventoryItemId: string;
  inventoryItem?: {
    name: string;
  } | null;
  type: string;
  quantity: number;
  unit: string;
  actorUserId: string;
  storageLocation?: {
    name: string;
  } | null;
  fromStorageLocationId: string | null;
  fromStorageLocation?: {
    name: string;
  } | null;
  toStorageLocationId: string | null;
  toStorageLocation?: {
    name: string;
  } | null;
  purchaseOrderId: string | null;
  goodsReceiptId: string | null;
  barRefillRunItemId: string | null;
  relatedMovementId: string | null;
  note: string | null;
  createdAt: Date;
};

type ReviewTaskRecord = {
  id: string;
  type: string;
  status: string;
  severity: string;
  title: string;
  description: string | null;
  workflowEvent?: {
    metadataJson: unknown;
  } | null;
  createdAt: Date;
  resolvedAt?: Date | null;
};

type CorrectionRequestListRecord = {
  id: string;
  organizationId: string | null;
  storageLocationId: string | null;
  inventoryItemId: string;
  inventoryItem: { name: string; storageLocation: { name: string } | null } | null;
  requestedById: string;
  status: string;
  expectedDelta: number;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  unit: string;
  reason: string;
  note: string | null;
  sourceLabel: string | null;
  submittedAt: Date | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  relatedMovementId: string | null;
  createdAt: Date;
};

type StockSnapshotRecord = {
  inventoryItemId: string;
  inventoryItem: {
    name: string;
    category: string | null;
    defaultUnit: string;
    minStock: number | null;
  };
  quantity: number;
  unit: string;
};

type StorageLocationWithSnapshots = {
  id: string;
  name: string;
  temperatureZone: string | null;
  floor: number | null;
  walkOrder: number | null;
  isTransferPoint: boolean;
  inventoryStockSnapshots: StockSnapshotRecord[];
};

const EXCLUDED_STORAGE_LOCATION_NAMES = [
  "Trockenlager",
  "Transferpunkt Kühlwagen",
  "Kühlhaus",
  "Gefrierschrank 1",
  "Gefrierschrank 2"
];

export type CorrectionRequestListItem = {
  id: string;
  organizationId: string | null;
  storageLocationId: string | null;
  storageLocationName: string | null;
  inventoryItemId: string;
  inventoryItemName: string;
  status: string;
  expectedDelta: number;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  unit: string;
  reason: string;
  note: string | null;
  sourceLabel: string | null;
  submittedAt: string | null;
  requestedById: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  relatedMovementId: string | null;
  createdAt: string;
};

export type StockByLocationItem = {
  inventoryItemId: string;
  name: string;
  unit: string;
  category: string | null;
  currentStock: number;
  minStock: number | null;
  status: "ok" | "low" | "negative" | "unknown";
};

export type StockByLocationEntry = {
  id: string;
  name: string;
  temperatureZone: string | null;
  floor: number;
  walkOrder: number | null;
  isTransferPoint: boolean;
  items: StockByLocationItem[];
};

export type InventoryReadDatabaseClient = {
  inventoryItem: {
    findMany(args: unknown): Promise<InventoryItemWithReadRelations[]>;
  };
  inventoryMovement: {
    findMany(args: unknown): Promise<MovementReadRecord[]>;
  };
  workflowTask: {
    findMany(args: unknown): Promise<ReviewTaskRecord[]>;
  };
  inventoryCorrectionRequest: {
    findMany(args: {
      where?: { organizationId?: string; status?: string };
      include?: {
        inventoryItem: {
          select: {
            name: true;
            storageLocation: { select: { name: true } };
          };
        };
      };
      orderBy?: { createdAt: "desc" };
      take?: number;
    }): Promise<CorrectionRequestListRecord[]>;
  };
  storageLocation: {
    findMany(args: {
      where: { workspaceGroupId: string; isActive?: boolean; name?: { notIn: string[] } };
      include: {
        inventoryStockSnapshots: {
          include: {
            inventoryItem: { select: { name: true; category: true; defaultUnit: true; minStock: true } };
          };
        };
      };
      orderBy: { walkOrder: "asc" };
    }): Promise<StorageLocationWithSnapshots[]>;
  };
};

export type InventoryReadServicePort = {
  listStock(): Promise<AdminStockRow[]>;
  listMovements(): Promise<InventoryMovementRow[]>;
  listOpenReviewTasks(options?: { windowDays?: number }): Promise<ReviewTaskRow[]>;
  listCorrectionRequests(filters: {
    status?: string;
    limit?: number;
  }): Promise<CorrectionRequestListItem[]>;
  listStockByLocation(workspaceGroupId: string): Promise<StockByLocationEntry[]>;
};

export class InventoryReadService implements InventoryReadServicePort {
  public constructor(private readonly db: InventoryReadDatabaseClient) {}

  public async listStock(): Promise<AdminStockRow[]> {
    const items = await this.db.inventoryItem.findMany({
      where: {
        isActive: true
      },
      include: {
        storageLocation: {
          select: {
            name: true
          }
        },
        movements: {
          select: {
            type: true,
            quantity: true,
            unit: true,
            createdAt: true,
            storageLocation: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return items.map((item) => {
      const currentStock = item.movements.reduce(
        (total, movement) => total + signedQuantity(movement),
        0
      );
      const lastMovement = item.movements[0];

      return {
        inventoryItemId: item.id,
        name: item.name,
        category: item.category ?? undefined,
        storageLocationName: item.storageLocation?.name,
        currentStock,
        unit: lastMovement?.unit ?? item.defaultUnit,
        minStock: item.minStock ?? undefined,
        status: calculateStockStatus(currentStock, item.minStock, item.movements.length),
        lastMovementAt: lastMovement?.createdAt.toISOString()
      };
    });
  }

  public async listMovements(): Promise<InventoryMovementRow[]> {
    const movements = await this.db.inventoryMovement.findMany({
      include: {
        inventoryItem: {
          select: {
            name: true
          }
        },
        storageLocation: {
          select: {
            name: true
          }
        },
        fromStorageLocation: {
          select: {
            name: true
          }
        },
        toStorageLocation: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return movements.map((movement) => ({
      id: movement.id,
      inventoryItemId: movement.inventoryItemId,
      inventoryItemName: movement.inventoryItem?.name ?? undefined,
      type: movement.type,
      quantity: movement.quantity,
      unit: movement.unit,
      actorUserId: movement.actorUserId,
      storageLocationName: movement.storageLocation?.name ?? undefined,
      fromStorageLocationId: movement.fromStorageLocationId ?? undefined,
      fromStorageLocationName: movement.fromStorageLocation?.name ?? undefined,
      toStorageLocationId: movement.toStorageLocationId ?? undefined,
      toStorageLocationName: movement.toStorageLocation?.name ?? undefined,
      purchaseOrderId: movement.purchaseOrderId ?? undefined,
      goodsReceiptId: movement.goodsReceiptId ?? undefined,
      barRefillRunItemId: movement.barRefillRunItemId ?? undefined,
      relatedMovementId: movement.relatedMovementId ?? undefined,
      idempotencyKey: deriveMovementIdempotencyKey(movement),
      correlationId: deriveMovementCorrelationId(movement),
      sourceType: deriveMovementSourceType(movement),
      sourceId: deriveMovementSourceId(movement),
      note: movement.note ?? undefined,
      createdAt: movement.createdAt.toISOString()
    }));
  }

  public async listOpenReviewTasks(options?: { windowDays?: number }): Promise<ReviewTaskRow[]> {
    const openStatusFilter = {
      status: {
        in: ["open", "in_review"]
      }
    };
    // windowDays additionally includes tasks created or resolved within the
    // window, so KPI consumers get resolution history without a second read.
    const windowStart =
      options?.windowDays === undefined
        ? undefined
        : new Date(Date.now() - options.windowDays * 24 * 60 * 60 * 1000);
    const where =
      windowStart === undefined
        ? {
            ...openStatusFilter,
            type: {
              startsWith: "inventory."
            }
          }
        : {
            type: {
              startsWith: "inventory."
            },
            OR: [
              openStatusFilter,
              { createdAt: { gte: windowStart } },
              { resolvedAt: { gte: windowStart } }
            ]
          };
    const tasks = await this.db.workflowTask.findMany({
      where,
      include: {
        workflowEvent: {
          select: {
            metadataJson: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return tasks.map((task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
      severity: task.severity,
      title: task.title,
      description: task.description ?? undefined,
      correctionRequestId: extractCorrectionRequestId(task),
      createdAt: task.createdAt.toISOString(),
      resolvedAt: task.resolvedAt ? task.resolvedAt.toISOString() : null
    }));
  }

  public async listCorrectionRequests(filters: {
    status?: string;
    limit?: number;
  }): Promise<CorrectionRequestListItem[]> {
    const rows = await this.db.inventoryCorrectionRequest.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {})
      },
      include: {
        inventoryItem: {
          select: {
            name: true,
            storageLocation: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50
    });

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      storageLocationId: r.storageLocationId,
      storageLocationName: r.inventoryItem?.storageLocation?.name ?? null,
      inventoryItemId: r.inventoryItemId,
      inventoryItemName: r.inventoryItem?.name ?? "–",
      status: r.status,
      expectedDelta: r.expectedDelta,
      expectedQuantity: r.expectedQuantity,
      countedQuantity: r.countedQuantity,
      unit: r.unit,
      reason: r.reason,
      note: r.note,
      sourceLabel: r.sourceLabel,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      requestedById: r.requestedById,
      reviewedById: r.reviewedById,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      relatedMovementId: r.relatedMovementId,
      createdAt: r.createdAt.toISOString()
    }));
  }

  public async listStockByLocation(workspaceGroupId: string): Promise<StockByLocationEntry[]> {
    const locations = await this.db.storageLocation.findMany({
      where: { workspaceGroupId, isActive: true, name: { notIn: EXCLUDED_STORAGE_LOCATION_NAMES } },
      include: {
        inventoryStockSnapshots: {
          include: {
            inventoryItem: {
              select: { name: true, category: true, defaultUnit: true, minStock: true }
            }
          }
        }
      },
      orderBy: { walkOrder: "asc" }
    });

    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      temperatureZone: loc.temperatureZone,
      floor: loc.floor ?? 0,
      walkOrder: loc.walkOrder,
      isTransferPoint: loc.isTransferPoint,
      items: loc.inventoryStockSnapshots.map((snap) => {
        const stock = snap.quantity;
        const min = snap.inventoryItem.minStock;
        return {
          inventoryItemId: snap.inventoryItemId,
          name: snap.inventoryItem.name,
          unit: snap.unit,
          category: snap.inventoryItem.category,
          currentStock: stock,
          minStock: min,
          status: calculateStockStatus(stock, min, 1)
        };
      })
    }));
  }
}

function extractCorrectionRequestId(task: ReviewTaskRecord): string | undefined {
  if (task.type !== "inventory.correction_request") {
    return undefined;
  }

  const metadata = task.workflowEvent?.metadataJson;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const candidate = (metadata as Record<string, unknown>).correctionRequestId;
  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

function deriveMovementIdempotencyKey(movement: MovementReadRecord): string | undefined {
  if (movement.goodsReceiptId) {
    return `inventory.goods_receipt.recorded:${movement.goodsReceiptId}`;
  }

  return undefined;
}

function deriveMovementCorrelationId(movement: MovementReadRecord): string | undefined {
  if (movement.relatedMovementId) {
    return movement.relatedMovementId;
  }
  if (movement.goodsReceiptId) {
    return movement.goodsReceiptId;
  }
  if (movement.purchaseOrderId) {
    return movement.purchaseOrderId;
  }

  return undefined;
}

function deriveMovementSourceType(movement: MovementReadRecord): string {
  if (movement.goodsReceiptId) {
    return "goods_receipt";
  }
  if (movement.barRefillRunItemId) {
    return "bar_refill";
  }
  if (movement.purchaseOrderId) {
    return "purchase_order";
  }
  if (movement.type === "correction_positive" || movement.type === "correction_negative") {
    return "correction_movement";
  }
  if (movement.type === "item_removed") {
    return "withdrawal";
  }
  if (movement.type === "transfer") {
    return "transfer";
  }

  return "inventory_movement";
}

function deriveMovementSourceId(movement: MovementReadRecord): string {
  return movement.barRefillRunItemId || movement.goodsReceiptId || movement.purchaseOrderId || movement.id;
}

function calculateStockStatus(
  currentStock: number,
  minStock: number | null,
  movementCount: number
): AdminStockRow["status"] {
  if (movementCount === 0) {
    return "unknown";
  }

  if (currentStock < 0) {
    return "negative";
  }

  if (minStock !== null && currentStock <= minStock) {
    return "low";
  }

  return "ok";
}
