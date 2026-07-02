import type { Actor } from "../auth/actor.js";
import type {
  CorrectionApprovalDto,
  CorrectionRejectionDto,
  CorrectionRequestDto,
  CreateCorrectionRequestInput
} from "./inventory.schemas.js";
import { InventoryConflictError, InventoryNotFoundError } from "./errors.js";
import type { InventoryMovementRecord } from "./inventory-movement.types.js";
import { InventoryStockService } from "./inventory-stock.service.js";

const DEFAULT_SOURCE_LABEL = "Walk-Route";

type CorrectionStatus = "open" | "approved" | "rejected";
type CorrectionMovementType = "correction_positive" | "correction_negative";

type InventoryItemRecord = {
  id: string;
  name: string;
  defaultUnit: string;
};

type CorrectionRequestRecord = {
  id: string;
  organizationId: string | null;
  storageLocationId: string | null;
  inventoryItemId: string;
  requestedById: string;
  status: CorrectionStatus;
  expectedDelta: number;
  unit: string;
  reason: string;
  note: string | null;
  sourceLabel: string | null;
};

type CorrectionTransactionClient = {
  inventoryItem: {
    findUnique(args: {
      where: {
        id: string;
      };
      select: {
        id: true;
        name: true;
        defaultUnit: true;
      };
    }): Promise<InventoryItemRecord | null>;
  };
  inventoryCorrectionRequest: {
    create(args: {
      data: {
        organizationId?: string;
        inventoryItemId: string;
        storageLocationId?: string;
        requestedById: string;
        expectedDelta: number;
        unit: string;
        reason: string;
        note?: string;
        expectedQuantity?: number;
        countedQuantity?: number;
        sourceLabel?: string;
        submittedAt?: Date;
      };
    }): Promise<{ id: string; status: CorrectionStatus }>;
    findUnique(args: {
      where: {
        id: string;
      };
    }): Promise<CorrectionRequestRecord | null>;
    update(args: {
      where: {
        id: string;
      };
      data: {
        status: "approved" | "rejected";
        relatedMovementId?: string;
        reviewedById: string;
        reviewedAt: Date;
      };
    }): Promise<unknown>;
  };
  inventoryMovement: {
    create(args: {
      data: {
        idempotencyKey: string;
        organizationId?: string;
        inventoryItemId: string;
        storageLocationId?: string;
        type: CorrectionMovementType;
        quantity: number;
        unit: string;
        actorUserId: string;
        relatedMovementId?: string;
        note: string;
      };
    }): Promise<{ id: string }>;
    findMany(args: unknown): Promise<InventoryMovementRecord[]>;
  };
  inventoryStockSnapshot: {
    upsert(args: {
      where: {
        inventoryItemId_storageLocationId: {
          inventoryItemId: string;
          storageLocationId: string;
        };
      };
      create: {
        inventoryItemId: string;
        storageLocationId: string;
        quantity: number;
        unit: string;
        calculatedAt: Date;
      };
      update: {
        quantity: number;
        unit: string;
        calculatedAt: Date;
      };
    }): Promise<unknown>;
  };
  workflowEvent: {
    create(args: {
      data: {
        type: string;
        version: number;
        source: string;
        externalId?: string;
        idempotencyKey: string;
        occurredAt: Date;
        dataJson: Record<string, unknown>;
        metadataJson?: Record<string, unknown>;
      };
    }): Promise<{ id: string }>;
  };
  workflowTask: {
    create(args: {
      data: {
        type: string;
        status: "open";
        severity: "warning";
        title: string;
        description: string;
        assignedRole: string;
        workflowEventId?: string;
      };
    }): Promise<{ id: string }>;
  };
};

export type CorrectionDatabaseClient = {
  $transaction<T>(callback: (transaction: CorrectionTransactionClient) => Promise<T>): Promise<T>;
};

export type CorrectionServicePort = {
  createRequest(input: CreateCorrectionRequestInput, actor: Actor): Promise<CorrectionRequestDto>;
  approve(id: string, actor: Actor): Promise<CorrectionApprovalDto>;
  reject(id: string, actor: Actor): Promise<CorrectionRejectionDto>;
};

export class CorrectionService implements CorrectionServicePort {
  public constructor(
    private readonly options: {
      db: CorrectionDatabaseClient;
      now?: () => Date;
    }
  ) {}

  public async createRequest(
    input: CreateCorrectionRequestInput,
    actor: Actor
  ): Promise<CorrectionRequestDto> {
    const submittedAt = this.options.now?.() ?? new Date();
    return this.options.db.$transaction(async (tx) => {
      const inventoryItem = await this.findInventoryItem(tx, input.inventoryItemId);
      const correctionRequest = await tx.inventoryCorrectionRequest.create({
        data: {
          organizationId: actor.organizationId,
          inventoryItemId: input.inventoryItemId,
          storageLocationId: input.storageLocationId,
          requestedById: actor.userId,
          expectedDelta: input.expectedDelta,
          unit: input.unit,
          reason: input.reason,
          note: input.note,
          expectedQuantity: input.expectedQuantity,
          countedQuantity: input.countedQuantity,
          sourceLabel: input.sourceLabel ?? DEFAULT_SOURCE_LABEL,
          submittedAt
        }
      });
      const workflowEvent = await tx.workflowEvent.create({
        data: {
          type: "inventory.correction.requested",
          version: 1,
          source: "system",
          externalId: correctionRequest.id,
          idempotencyKey: `inventory.correction.requested:${correctionRequest.id}`,
          occurredAt: submittedAt,
          dataJson: {
            correctionRequestId: correctionRequest.id,
            inventoryItemId: input.inventoryItemId,
            storageLocationId: input.storageLocationId ?? null,
            requestedById: actor.userId,
            expectedDelta: input.expectedDelta,
            unit: input.unit,
            sourceLabel: input.sourceLabel ?? DEFAULT_SOURCE_LABEL
          },
          metadataJson: {
            correctionRequestId: correctionRequest.id
          }
        }
      });
      const task = await tx.workflowTask.create({
        data: {
          type: "inventory.correction_request",
          status: "open",
          severity: "warning",
          title: "Bestandskorrektur prüfen",
          description: `${inventoryItem.name}: Korrektur um ${input.expectedDelta} ${input.unit} angefordert.`,
          assignedRole: "admin",
          workflowEventId: workflowEvent.id
        }
      });

      return {
        correctionRequestId: correctionRequest.id,
        status: correctionRequest.status,
        reviewTaskId: task.id
      };
    });
  }

  public async approve(id: string, actor: Actor): Promise<CorrectionApprovalDto> {
    return this.options.db.$transaction(async (tx) => {
      const correctionRequest = await this.findOpenCorrectionRequest(tx, id);

      if (actor.role === "staff" && correctionRequest.requestedById === actor.userId) {
        throw new InventoryConflictError("staff cannot approve correction requests");
      }

      if (actor.role === "shift_lead" && correctionRequest.requestedById === actor.userId) {
        throw new InventoryConflictError("actor cannot approve own correction request");
      }

      if (
        correctionRequest.organizationId !== null &&
        correctionRequest.organizationId !== actor.organizationId
      ) {
        throw new InventoryConflictError("cross-organization correction approval");
      }

      const movementType = correctionMovementType(correctionRequest.expectedDelta);
      const movementNote = buildMovementNote({
        reason: correctionRequest.reason,
        sourceLabel: correctionRequest.sourceLabel,
        note: correctionRequest.note
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          idempotencyKey: `inventory.correction.approved:${correctionRequest.id}`,
          organizationId: actor.organizationId,
          inventoryItemId: correctionRequest.inventoryItemId,
          storageLocationId: correctionRequest.storageLocationId ?? undefined,
          type: movementType,
          quantity: Math.abs(correctionRequest.expectedDelta),
          unit: correctionRequest.unit,
          actorUserId: actor.userId,
          relatedMovementId: undefined,
          note: movementNote
        }
      });
      const stockService = new InventoryStockService({
        db: tx,
        now: this.options.now
      });
      const stockAfter = correctionRequest.storageLocationId
        ? await stockService.refreshSnapshot({
            inventoryItemId: correctionRequest.inventoryItemId,
            storageLocationId: correctionRequest.storageLocationId,
            unit: correctionRequest.unit,
            organizationId: actor.organizationId
          })
        : await stockService.refreshSnapshot({
            inventoryItemId: correctionRequest.inventoryItemId,
            unit: correctionRequest.unit,
            organizationId: actor.organizationId
          });
      const reviewedAt = this.options.now?.() ?? new Date();

      await tx.inventoryCorrectionRequest.update({
        where: {
          id
        },
        data: {
          status: "approved",
          relatedMovementId: movement.id,
          reviewedById: actor.userId,
          reviewedAt
        }
      });

      return {
        correctionRequestId: id,
        status: "approved",
        movementId: movement.id,
        stockAfter
      };
    });
  }

  public async reject(id: string, actor: Actor): Promise<CorrectionRejectionDto> {
    return this.options.db.$transaction(async (tx) => {
      const correctionRequest = await this.findOpenCorrectionRequest(tx, id);

      if (
        correctionRequest.organizationId !== null &&
        correctionRequest.organizationId !== actor.organizationId
      ) {
        throw new InventoryConflictError("cross-organization correction approval");
      }

      const reviewedAt = this.options.now?.() ?? new Date();

      await tx.inventoryCorrectionRequest.update({
        where: {
          id
        },
        data: {
          status: "rejected",
          reviewedById: actor.userId,
          reviewedAt
        }
      });

      return {
        correctionRequestId: id,
        status: "rejected"
      };
    });
  }

  private async findInventoryItem(
    tx: CorrectionTransactionClient,
    inventoryItemId: string
  ): Promise<InventoryItemRecord> {
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        id: inventoryItemId
      },
      select: {
        id: true,
        name: true,
        defaultUnit: true
      }
    });

    if (!inventoryItem) {
      throw new InventoryNotFoundError("inventory item not found");
    }

    return inventoryItem;
  }

  private async findOpenCorrectionRequest(
    tx: CorrectionTransactionClient,
    id: string
  ): Promise<CorrectionRequestRecord> {
    const correctionRequest = await tx.inventoryCorrectionRequest.findUnique({
      where: {
        id
      }
    });

    if (!correctionRequest) {
      throw new InventoryNotFoundError("correction request not found");
    }

    if (correctionRequest.status !== "open") {
      throw new InventoryConflictError("correction request is not open");
    }

    return correctionRequest;
  }
}

function correctionMovementType(expectedDelta: number): CorrectionMovementType {
  return expectedDelta > 0 ? "correction_positive" : "correction_negative";
}

function buildMovementNote(input: {
  reason: string;
  sourceLabel: string | null;
  note: string | null;
}): string {
  const segments: string[] = [];
  const source = input.sourceLabel ?? DEFAULT_SOURCE_LABEL;
  segments.push(source);
  segments.push(input.reason);
  if (input.note && input.note.trim() !== "") {
    segments.push(input.note);
  }
  return segments.join(" · ");
}
