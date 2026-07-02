import { Prisma } from "@prisma/client";

import type { Actor } from "../auth/actor.js";
import { InventoryConflictError, InventoryNotFoundError } from "./errors.js";
import { InventoryStockService } from "./inventory-stock.service.js";
import type {
  BarRefillItemConfirmDto,
  BarRefillRunDto,
  BarRefillRunItemStatus,
  BarRefillRunStatus,
  UpdateBarRefillRunItemInput
} from "./inventory.schemas.js";

const berlinTimeZone = "Europe/Berlin";

type InventoryItemLookupRecord = {
  id: string;
  organizationId: string | null;
  name: string;
  defaultUnit: string;
  storageLocationId: string | null;
};

type BarRefillTemplateItemRecord = {
  id: string;
  displayOrder: number;
  productName: string;
  unit: string | null;
  targetQuantity: number | null;
  inventoryItemId: string | null;
  isMisc: boolean;
};

type BarRefillRunItemRecord = {
  id: string;
  templateItemId: string;
  inventoryItemId: string | null;
  displayOrder: number;
  productNameSnapshot: string;
  unitSnapshot: string | null;
  targetQuantity: number | null;
  requestedQuantity: number | null;
  status: BarRefillRunItemStatus;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  stockMovementId: string | null;
};

type BarRefillRunRecord = {
  id: string;
  organizationId: string;
  runDateLocal: Date;
  timezone: string;
  createdBy: string;
  status: BarRefillRunStatus;
  createdAt: Date;
  completedAt: Date | null;
  items: BarRefillRunItemRecord[];
};

type BarRefillRunItemWithRunRecord = BarRefillRunItemRecord & {
  refillRun: {
    id: string;
    organizationId: string;
  };
};

type BarRefillRunReadClient = {
  barRefillRun: {
    findFirst(args: unknown): Promise<BarRefillRunRecord | null>;
  };
};

type BarRefillMutationTransactionClient = BarRefillRunReadClient & {
  barRefillTemplateItem: {
    findMany(args: unknown): Promise<BarRefillTemplateItemRecord[]>;
  };
  barRefillRun: {
    findFirst(args: unknown): Promise<BarRefillRunRecord | null>;
    create(args: unknown): Promise<{ id: string }>;
    update(args: unknown): Promise<unknown>;
  };
  barRefillRunItem: {
    createMany(args: unknown): Promise<{ count: number }>;
    findFirst(args: unknown): Promise<BarRefillRunItemWithRunRecord | null>;
    findMany(args: unknown): Promise<Array<{ status: BarRefillRunItemStatus }>>;
    update(args: unknown): Promise<unknown>;
  };
  inventoryItem: {
    findMany(args: unknown): Promise<InventoryItemLookupRecord[]>;
    findUnique(args: unknown): Promise<InventoryItemLookupRecord | null>;
  };
  inventoryMovement: {
    create(args: unknown): Promise<{ id: string }>;
    findFirst(args: unknown): Promise<{ id: string } | null>;
    findMany(args: unknown): Promise<Array<{
      type: "goods_received" | "item_removed" | "transfer" | "correction_positive" | "correction_negative";
      quantity: number;
      storageLocationId?: string | null;
      fromStorageLocationId?: string | null;
      toStorageLocationId?: string | null;
      createdAt?: Date;
    }>>;
  };
  inventoryStockSnapshot: {
    upsert(args: unknown): Promise<unknown>;
  };
};

export type BarRefillDatabaseClient = BarRefillRunReadClient & {
  $transaction<T>(
    callback: (transaction: BarRefillMutationTransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<T>;
};

export type BarRefillServicePort = {
  getTodayRun(actor: Actor): Promise<BarRefillRunDto | null>;
  createOrGetTodayRun(actor: Actor): Promise<BarRefillRunDto>;
  getRun(runId: string, actor: Actor): Promise<BarRefillRunDto>;
  updateRunItem(
    runId: string,
    runItemId: string,
    input: UpdateBarRefillRunItemInput,
    actor: Actor
  ): Promise<BarRefillRunDto>;
  confirmRunItem(runId: string, runItemId: string, actor: Actor): Promise<BarRefillItemConfirmDto>;
  cancelRunItem(runId: string, runItemId: string, actor: Actor): Promise<BarRefillRunDto>;
};

export class BarRefillService implements BarRefillServicePort {
  public constructor(
    private readonly options: {
      db: BarRefillDatabaseClient;
      now?: () => Date;
    }
  ) {}

  public async getTodayRun(actor: Actor): Promise<BarRefillRunDto | null> {
    const organizationId = requireOrganization(actor);
    const runDateLocal = localDayDate(this.now());

    const existing = await this.options.db.barRefillRun.findFirst({
      where: {
        organizationId,
        runDateLocal,
        status: { in: ["open", "partially_confirmed"] }
      },
      include: { items: { orderBy: { displayOrder: "asc" } } }
    });

    return existing ? mapRun(existing) : null;
  }

  public async createOrGetTodayRun(actor: Actor): Promise<BarRefillRunDto> {
    const organizationId = requireOrganization(actor);
    const now = this.now();
    const runDateLocal = localDayDate(now);

    return this.options.db.$transaction(async (tx) => {
      const existing = await tx.barRefillRun.findFirst({
        where: {
          organizationId,
          runDateLocal,
          status: {
            in: ["open", "partially_confirmed"]
          }
        },
        include: {
          items: {
            orderBy: {
              displayOrder: "asc"
            }
          }
        }
      });

      if (existing) {
        return mapRun(existing);
      }

      const templateItems = await this.resolveTemplateItems(tx, organizationId);
      const run = await tx.barRefillRun.create({
        data: {
          organizationId,
          runDateLocal,
          timezone: berlinTimeZone,
          createdBy: actor.userId,
          status: "open"
        }
      });

      const mappedItems = await this.mapTemplateItemsToInventoryItems(tx, organizationId, templateItems);
      if (mappedItems.unresolvedNames.length > 0) {
        throw new InventoryConflictError(
          `missing inventory item mapping for template entries: ${mappedItems.unresolvedNames.join(", ")}`
        );
      }

      await tx.barRefillRunItem.createMany({
        data: mappedItems.items.map((item) => ({
          refillRunId: run.id,
          templateItemId: item.templateItemId,
          inventoryItemId: item.inventoryItemId,
          displayOrder: item.displayOrder,
          productNameSnapshot: item.productName,
          unitSnapshot: item.unit,
          targetQuantity: item.targetQuantity,
          requestedQuantity: null,
          status: "open"
        }))
      });

      const created = await tx.barRefillRun.findFirst({
        where: {
          id: run.id,
          organizationId
        },
        include: {
          items: {
            orderBy: {
              displayOrder: "asc"
            }
          }
        }
      });

      if (!created) {
        throw new InventoryNotFoundError("bar refill run not found");
      }

      return mapRun(created);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public async getRun(runId: string, actor: Actor): Promise<BarRefillRunDto> {
    const organizationId = requireOrganization(actor);
    const run = await this.options.db.barRefillRun.findFirst({
      where: {
        id: runId,
        organizationId
      },
      include: {
        items: {
          orderBy: {
            displayOrder: "asc"
          }
        }
      }
    });

    if (!run) {
      throw new InventoryNotFoundError("bar refill run not found");
    }

    return mapRun(run);
  }

  public async updateRunItem(
    runId: string,
    runItemId: string,
    input: UpdateBarRefillRunItemInput,
    actor: Actor
  ): Promise<BarRefillRunDto> {
    const organizationId = requireOrganization(actor);
    return this.options.db.$transaction(async (tx) => {
      const runItem = await this.getRunItem(tx, organizationId, runId, runItemId);

      if (runItem.status === "confirmed") {
        throw new InventoryConflictError("confirmed run item cannot be edited");
      }

      const requestedQuantity = input.requestedQuantity;
      const { nextStatus, normalizedRequestedQuantity } = deriveRequestedStatus(requestedQuantity);

      await tx.barRefillRunItem.update({
        where: {
          id: runItem.id
        },
        data: {
          requestedQuantity: normalizedRequestedQuantity,
          status: nextStatus
        }
      });

      await this.refreshRunStatus(tx, runId);
      return this.readRunOrThrow(tx, organizationId, runId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public async confirmRunItem(
    runId: string,
    runItemId: string,
    actor: Actor
  ): Promise<BarRefillItemConfirmDto> {
    const organizationId = requireOrganization(actor);

    return this.options.db.$transaction(async (tx) => {
      const runItem = await this.getRunItem(tx, organizationId, runId, runItemId);
      const runItemStatus = runItem.status;
      const requestedQuantity = runItem.requestedQuantity ?? 0;

      if (runItemStatus === "confirmed" && runItem.stockMovementId) {
        const run = await this.readRunOrThrow(tx, organizationId, runId);
        return {
          run,
          movementId: runItem.stockMovementId,
          stockAfter: 0
        };
      }

      if (runItemStatus !== "pending") {
        throw new InventoryConflictError("run item must be pending before confirmation");
      }

      if (requestedQuantity <= 0) {
        throw new InventoryConflictError("requested quantity must be greater than 0");
      }

      if (!runItem.inventoryItemId) {
        throw new InventoryConflictError("run item has no inventory item mapping");
      }

      const inventoryItem = await tx.inventoryItem.findUnique({
        where: {
          id: runItem.inventoryItemId
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          defaultUnit: true,
          storageLocationId: true
        }
      });

      if (!inventoryItem) {
        throw new InventoryNotFoundError("inventory item for run item not found");
      }
      if (inventoryItem.organizationId !== null && inventoryItem.organizationId !== organizationId) {
        throw new InventoryConflictError("inventory item organization mismatch");
      }

      const idempotencyKey = `inventory.bar_refill.confirmed:${runItem.id}`;
      const movementUnit = runItem.unitSnapshot || inventoryItem.defaultUnit;

      let movementId: string;
      try {
        const movement = await tx.inventoryMovement.create({
          data: {
            idempotencyKey,
            organizationId,
            inventoryItemId: runItem.inventoryItemId,
            type: "item_removed",
            quantity: requestedQuantity,
            unit: movementUnit,
            actorUserId: actor.userId,
            storageLocationId: inventoryItem.storageLocationId ?? undefined,
            barRefillRunItemId: runItem.id,
            note: `bar_refill:${runId}:${runItem.displayOrder}`
          }
        });
        movementId = movement.id;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          const existing = await tx.inventoryMovement.findFirst({
            where: {
              idempotencyKey
            },
            select: {
              id: true
            }
          });
          if (!existing) {
            throw error;
          }
          movementId = existing.id;
        } else {
          throw error;
        }
      }

      const stockService = new InventoryStockService({
        db: tx,
        now: this.options.now
      });
      const stockAfter = await stockService.refreshSnapshot({
        inventoryItemId: runItem.inventoryItemId,
        storageLocationId: inventoryItem.storageLocationId ?? undefined,
        unit: movementUnit,
        organizationId
      });

      await tx.barRefillRunItem.update({
        where: {
          id: runItem.id
        },
        data: {
          status: "confirmed",
          confirmedBy: actor.userId,
          confirmedAt: this.now(),
          stockMovementId: movementId
        }
      });

      await this.refreshRunStatus(tx, runId);
      const run = await this.readRunOrThrow(tx, organizationId, runId);

      return {
        run,
        movementId,
        stockAfter
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  public async cancelRunItem(runId: string, runItemId: string, actor: Actor): Promise<BarRefillRunDto> {
    const organizationId = requireOrganization(actor);
    return this.options.db.$transaction(async (tx) => {
      const runItem = await this.getRunItem(tx, organizationId, runId, runItemId);
      if (runItem.status === "confirmed") {
        throw new InventoryConflictError("confirmed run item cannot be cancelled");
      }

      await tx.barRefillRunItem.update({
        where: {
          id: runItem.id
        },
        data: {
          status: "cancelled",
          requestedQuantity: 0
        }
      });

      await this.refreshRunStatus(tx, runId);
      return this.readRunOrThrow(tx, organizationId, runId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async resolveTemplateItems(
    tx: BarRefillMutationTransactionClient,
    organizationId: string
  ): Promise<BarRefillTemplateItemRecord[]> {
    const organizationItems = await tx.barRefillTemplateItem.findMany({
      where: {
        organizationId,
        active: true
      },
      orderBy: {
        displayOrder: "asc"
      }
    });

    if (organizationItems.length > 0) {
      return organizationItems;
    }

    return tx.barRefillTemplateItem.findMany({
      where: {
        organizationId: null,
        active: true
      },
      orderBy: {
        displayOrder: "asc"
      }
    });
  }

  private async mapTemplateItemsToInventoryItems(
    tx: BarRefillMutationTransactionClient,
    organizationId: string,
    templateItems: BarRefillTemplateItemRecord[]
  ): Promise<{
    unresolvedNames: string[];
    items: Array<{
      templateItemId: string;
      inventoryItemId?: string;
      displayOrder: number;
      productName: string;
      unit?: string;
      targetQuantity?: number;
    }>;
  }> {
    const inventoryItems = await tx.inventoryItem.findMany({
      where: {
        organizationId,
        isActive: true
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        defaultUnit: true,
        storageLocationId: true
      }
    });

    const itemKeyLookup = new Map<string, string>();
    for (const item of inventoryItems) {
      itemKeyLookup.set(normalizedItemKey(item.name, item.defaultUnit), item.id);
    }

    const unresolvedNames: string[] = [];
    const items = templateItems.map((templateItem) => {
      let inventoryItemId = templateItem.inventoryItemId ?? undefined;
      if (!templateItem.isMisc && !inventoryItemId) {
        inventoryItemId = itemKeyLookup.get(
          normalizedItemKey(templateItem.productName, templateItem.unit ?? "")
        );
      }

      if (!templateItem.isMisc && !inventoryItemId) {
        unresolvedNames.push(
          `${templateItem.displayOrder}. ${templateItem.productName}${templateItem.unit ? ` (${templateItem.unit})` : ""}`
        );
      }

      return {
        templateItemId: templateItem.id,
        inventoryItemId,
        displayOrder: templateItem.displayOrder,
        productName: templateItem.productName,
        unit: templateItem.unit ?? undefined,
        targetQuantity: templateItem.targetQuantity ?? undefined
      };
    });

    return {
      unresolvedNames,
      items
    };
  }

  private async getRunItem(
    tx: BarRefillMutationTransactionClient,
    organizationId: string,
    runId: string,
    runItemId: string
  ): Promise<BarRefillRunItemWithRunRecord> {
    const runItem = await tx.barRefillRunItem.findFirst({
      where: {
        id: runItemId,
        refillRunId: runId,
        refillRun: {
          organizationId
        }
      },
      include: {
        refillRun: {
          select: {
            id: true,
            organizationId: true
          }
        }
      }
    });

    if (!runItem) {
      throw new InventoryNotFoundError("bar refill run item not found");
    }

    return runItem;
  }

  private async readRunOrThrow(
    tx: BarRefillRunReadClient,
    organizationId: string,
    runId: string
  ): Promise<BarRefillRunDto> {
    const run = await tx.barRefillRun.findFirst({
      where: {
        id: runId,
        organizationId
      },
      include: {
        items: {
          orderBy: {
            displayOrder: "asc"
          }
        }
      }
    });

    if (!run) {
      throw new InventoryNotFoundError("bar refill run not found");
    }

    return mapRun(run);
  }

  private async refreshRunStatus(tx: BarRefillMutationTransactionClient, runId: string): Promise<void> {
    const statuses = await tx.barRefillRunItem.findMany({
      where: {
        refillRunId: runId
      },
      select: {
        status: true
      }
    });

    const hasPending = statuses.some((item) => item.status === "pending");
    const hasConfirmed = statuses.some((item) => item.status === "confirmed");
    const hasCancelled = statuses.some((item) => item.status === "cancelled");

    let status: BarRefillRunStatus = "open";
    if (!hasPending && (hasConfirmed || hasCancelled)) {
      status = "completed";
    } else if (hasConfirmed) {
      status = "partially_confirmed";
    }

    await tx.barRefillRun.update({
      where: {
        id: runId
      },
      data: {
        status,
        completedAt: status === "completed" ? this.now() : null
      }
    });
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }
}

function deriveRequestedStatus(requestedQuantity: number | null): {
  nextStatus: BarRefillRunItemStatus;
  normalizedRequestedQuantity: number | null;
} {
  if (requestedQuantity === null) {
    return { nextStatus: "open", normalizedRequestedQuantity: null };
  }
  if (requestedQuantity === 0) {
    return { nextStatus: "cancelled", normalizedRequestedQuantity: 0 };
  }
  return { nextStatus: "pending", normalizedRequestedQuantity: requestedQuantity };
}

function mapRun(run: BarRefillRunRecord): BarRefillRunDto {
  return {
    runId: run.id,
    organizationId: run.organizationId,
    runDateLocal: run.runDateLocal.toISOString().slice(0, 10),
    timezone: run.timezone,
    createdBy: run.createdBy,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    items: run.items.map((item) => ({
      id: item.id,
      templateItemId: item.templateItemId,
      inventoryItemId: item.inventoryItemId ?? undefined,
      displayOrder: item.displayOrder,
      productName: item.productNameSnapshot,
      unit: item.unitSnapshot ?? undefined,
      targetQuantity: item.targetQuantity ?? undefined,
      requestedQuantity: item.requestedQuantity ?? undefined,
      status: item.status,
      confirmedBy: item.confirmedBy ?? undefined,
      confirmedAt: item.confirmedAt?.toISOString(),
      stockMovementId: item.stockMovementId ?? undefined
    }))
  };
}

function normalizedItemKey(name: string, unit: string): string {
  return `${normalizeToken(name)}|${normalizeToken(unit)}`;
}

function normalizeToken(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function localDayDate(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: berlinTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const [year, month, day] = formatter.format(date).split("-");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

function requireOrganization(actor: Actor): string {
  if (!actor.organizationId) {
    throw new InventoryConflictError("actor has no organization context");
  }

  return actor.organizationId;
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
