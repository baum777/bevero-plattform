import { describe, expect, it } from "vitest";

import {
  CorrectionService,
  type CorrectionDatabaseClient
} from "../src/modules/inventory/correction.service.js";

describe("CorrectionService", () => {
  it("creates a correction request and review task without changing stock", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T10:00:00.000Z");
    const tx = correctionTransaction({ calls, now });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          calls.push({ model: "db", method: "$transaction" });
          return callback(tx);
        }
      }
    });

    const result = await service.createRequest(
      {
        inventoryItemId: "item-1",
        expectedDelta: -2,
        unit: "Stück",
        reason: "count mismatch"
      },
      {
        userId: "staff-1",
        role: "staff",
        organizationId: "org-test"
      }
    );

    expect(result).toEqual({
      correctionRequestId: "correction-1",
      status: "open",
      reviewTaskId: "task-1"
    });
    expect(calls.map((call) => `${call.model}.${call.method}`)).toEqual([
      "db.$transaction",
      "inventoryItem.findUnique",
      "inventoryCorrectionRequest.create",
      "workflowEvent.create",
      "workflowTask.create"
    ]);
    expect(calls.some((call) => call.model === "inventoryMovement")).toBe(false);
    expect(calls.some((call) => call.model === "inventoryStockSnapshot")).toBe(false);
    expect(calls).toContainEqual({
      model: "inventoryCorrectionRequest",
      method: "create",
      args: {
        data: expect.objectContaining({
          organizationId: "org-test",
          storageLocationId: undefined,
          note: undefined,
          expectedQuantity: undefined,
          countedQuantity: undefined,
          sourceLabel: "Walk-Route",
          submittedAt: now
        })
      }
    });
    expect(calls).toContainEqual({
      model: "workflowEvent",
      method: "create",
      args: {
        data: {
          type: "inventory.correction.requested",
          version: 1,
          source: "system",
          externalId: "correction-1",
          idempotencyKey: "inventory.correction.requested:correction-1",
          occurredAt: now,
          dataJson: {
            correctionRequestId: "correction-1",
            inventoryItemId: "item-1",
            storageLocationId: null,
            requestedById: "staff-1",
            expectedDelta: -2,
            unit: "Stück",
            sourceLabel: "Walk-Route"
          },
          metadataJson: {
            correctionRequestId: "correction-1"
          }
        }
      }
    });
    expect(calls).toContainEqual({
      model: "workflowTask",
      method: "create",
      args: {
        data: expect.objectContaining({
          description: "Tomaten passiert 5kg: Korrektur um -2 Stück angefordert.",
          workflowEventId: "event-1"
        })
      }
    });
  });

  it("persists walk-route evidence fields when the request comes from the physical count route", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T10:15:00.000Z");
    const tx = correctionTransaction({ calls, now });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await service.createRequest(
      {
        inventoryItemId: "item-1",
        expectedDelta: -3,
        unit: "Stück",
        reason: "count mismatch",
        storageLocationId: "loc-kitchen-1",
        note: "Regal 2, 3 fehlen — wahrscheinlich verbraucht",
        expectedQuantity: 8,
        countedQuantity: 5,
        sourceLabel: "Walk-Route"
      },
      {
        userId: "shift-1",
        role: "shift_lead",
        organizationId: "org-test"
      }
    );

    expect(calls).toContainEqual({
      model: "inventoryCorrectionRequest",
      method: "create",
      args: {
        data: expect.objectContaining({
          organizationId: "org-test",
          storageLocationId: "loc-kitchen-1",
          note: "Regal 2, 3 fehlen — wahrscheinlich verbraucht",
          expectedQuantity: 8,
          countedQuantity: 5,
          sourceLabel: "Walk-Route",
          submittedAt: now
        })
      }
    });
  });

  it("approves a correction and creates the stock movement in a transaction", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T10:30:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-test",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "staff-1",
        status: "open",
        expectedDelta: -2,
        unit: "Stück",
        reason: "count mismatch",
        note: "Regal 2",
        sourceLabel: "Walk-Route"
      },
      movementsAfterApproval: [
        { type: "goods_received", quantity: 10, storageLocationId: "loc-kitchen-1", createdAt: new Date("2026-05-26T09:00:00.000Z") },
        { type: "correction_negative", quantity: 2, storageLocationId: "loc-kitchen-1", createdAt: now }
      ]
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    const result = await service.approve(
      "correction-1",
      {
        userId: "admin-1",
        role: "admin",
        organizationId: "org-test"
      }
    );

    expect(result).toEqual({
      correctionRequestId: "correction-1",
      status: "approved",
      movementId: "move-1",
      stockAfter: 8
    });
    expect(calls).toContainEqual({
      model: "inventoryMovement",
      method: "create",
      args: {
        data: {
          idempotencyKey: "inventory.correction.approved:correction-1",
          organizationId: "org-test",
          inventoryItemId: "item-1",
          storageLocationId: "loc-kitchen-1",
          type: "correction_negative",
          quantity: 2,
          unit: "Stück",
          actorUserId: "admin-1",
          relatedMovementId: undefined,
          note: "Walk-Route · count mismatch · Regal 2"
        }
      }
    });
    expect(calls).toContainEqual({
      model: "inventoryStockSnapshot",
      method: "upsert",
      args: {
        where: {
          inventoryItemId_storageLocationId: {
            inventoryItemId: "item-1",
            storageLocationId: "loc-kitchen-1"
          }
        },
        create: {
          inventoryItemId: "item-1",
          storageLocationId: "loc-kitchen-1",
          quantity: 8,
          unit: "Stück",
          calculatedAt: now
        },
        update: {
          quantity: 8,
          unit: "Stück",
          calculatedAt: now
        }
      }
    });
    expect(calls).toContainEqual({
      model: "inventoryCorrectionRequest",
      method: "update",
      args: {
        where: {
          id: "correction-1"
        },
        data: {
          status: "approved",
          relatedMovementId: "move-1",
          reviewedById: "admin-1",
          reviewedAt: now
        }
      }
    });
  });

  it("lets shift leads approve a correction request they did not raise", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T10:35:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-test",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "staff-1",
        status: "open",
        expectedDelta: -1,
        unit: "Stück",
        reason: "count mismatch"
      },
      movementsAfterApproval: [
        { type: "goods_received", quantity: 5, createdAt: now },
        { type: "correction_negative", quantity: 1, createdAt: now }
      ]
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    const result = await service.approve("correction-1", {
      userId: "shift-1",
      role: "shift_lead",
      organizationId: "org-test"
    });

    expect(result.status).toBe("approved");
    expect(result.movementId).toBe("move-1");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(true);
  });

  it("rejects cross-organization correction approvals", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T10:40:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-other",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "staff-1",
        status: "open",
        expectedDelta: -1,
        unit: "Stück",
        reason: "count mismatch"
      }
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.approve("correction-1", {
        userId: "admin-1",
        role: "admin",
        organizationId: "org-test"
      })
    ).rejects.toThrow("cross-organization correction approval");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(false);
  });

  it("rejects a correction request without changing stock", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T11:00:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-test",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "staff-1",
        status: "open",
        expectedDelta: 3,
        unit: "Stück",
        reason: "count mismatch"
      }
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    const result = await service.reject(
      "correction-1",
      {
        userId: "admin-1",
        role: "admin",
        organizationId: "org-test"
      }
    );

    expect(result).toEqual({
      correctionRequestId: "correction-1",
      status: "rejected"
    });
    expect(calls).toContainEqual({
      model: "inventoryCorrectionRequest",
      method: "update",
      args: {
        where: {
          id: "correction-1"
        },
        data: {
          status: "rejected",
          reviewedById: "admin-1",
          reviewedAt: now
        }
      }
    });
    expect(calls.some((call) => call.model === "inventoryMovement")).toBe(false);
    expect(calls.some((call) => call.model === "inventoryStockSnapshot")).toBe(false);
  });

  it("prevents staff from approving their own correction request", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T11:30:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-test",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "staff-1",
        status: "open",
        expectedDelta: 3,
        unit: "Stück",
        reason: "count mismatch"
      }
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.approve("correction-1", {
        userId: "staff-1",
        role: "staff",
        organizationId: "org-test"
      })
    ).rejects.toThrow("staff cannot approve correction requests");
    expect(calls.some((call) => call.model === "inventoryMovement")).toBe(false);
    expect(calls.some((call) => call.model === "inventoryCorrectionRequest" && call.method === "update")).toBe(false);
  });

  it("prevents shift leads from approving their own correction request", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-26T11:45:00.000Z");
    const tx = correctionTransaction({
      calls,
      now,
      existingRequest: {
        id: "correction-1",
        organizationId: "org-test",
        storageLocationId: "loc-kitchen-1",
        inventoryItemId: "item-1",
        requestedById: "shift-1",
        status: "open",
        expectedDelta: 3,
        unit: "Stück",
        reason: "count mismatch"
      }
    });
    const service = new CorrectionService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.approve("correction-1", {
        userId: "shift-1",
        role: "shift_lead",
        organizationId: "org-test"
      })
    ).rejects.toThrow("actor cannot approve own correction request");
    expect(calls.some((call) => call.model === "inventoryMovement")).toBe(false);
    expect(calls.some((call) => call.model === "inventoryCorrectionRequest" && call.method === "update")).toBe(false);
  });
});

function correctionTransaction(input: {
  calls: Array<{ model: string; method: string; args?: unknown }>;
  now: Date;
  existingRequest?: ExistingRequestInput;
  movementsAfterApproval?: Array<{
    type: "goods_received" | "item_removed" | "correction_positive" | "correction_negative";
    quantity: number;
    storageLocationId?: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    inventoryItem: {
      async findUnique(args: unknown) {
        input.calls.push({ model: "inventoryItem", method: "findUnique", args });
        return {
          id: "item-1",
          name: "Tomaten passiert 5kg",
          defaultUnit: "Stück"
        };
      }
    },
    inventoryCorrectionRequest: {
      async create(args: unknown) {
        input.calls.push({ model: "inventoryCorrectionRequest", method: "create", args });
        return {
          id: "correction-1",
          status: "open" as const
        };
      },
      async findUnique(args: unknown) {
        input.calls.push({ model: "inventoryCorrectionRequest", method: "findUnique", args });
        if (!input.existingRequest) return null;
        const fallback: CorrectionRequestRecord = {
          id: input.existingRequest.id,
          organizationId: input.existingRequest.organizationId ?? null,
          storageLocationId: input.existingRequest.storageLocationId ?? null,
          inventoryItemId: input.existingRequest.inventoryItemId,
          requestedById: input.existingRequest.requestedById,
          status: input.existingRequest.status,
          expectedDelta: input.existingRequest.expectedDelta,
          unit: input.existingRequest.unit,
          reason: input.existingRequest.reason,
          note: input.existingRequest.note ?? null,
          sourceLabel: input.existingRequest.sourceLabel ?? null
        };
        return fallback;
      },
      async update(args: unknown) {
        input.calls.push({ model: "inventoryCorrectionRequest", method: "update", args });
        return {};
      }
    },
    inventoryMovement: {
      async create(args: unknown) {
        input.calls.push({ model: "inventoryMovement", method: "create", args });
        return { id: "move-1" };
      },
      async findMany(args: unknown) {
        input.calls.push({ model: "inventoryMovement", method: "findMany", args });
        return input.movementsAfterApproval ?? [];
      }
    },
    inventoryStockSnapshot: {
      async upsert(args: unknown) {
        input.calls.push({ model: "inventoryStockSnapshot", method: "upsert", args });
        return { id: "snapshot-1" };
      }
    },
    workflowTask: {
      async create(args: unknown) {
        input.calls.push({ model: "workflowTask", method: "create", args });
        return { id: "task-1" };
      }
    },
    workflowEvent: {
      async create(args: unknown) {
        input.calls.push({ model: "workflowEvent", method: "create", args });
        return { id: "event-1" };
      }
    }
  };
}

type CorrectionRequestRecord = {
  id: string;
  organizationId: string | null;
  storageLocationId: string | null;
  inventoryItemId: string;
  requestedById: string;
  status: "open" | "approved" | "rejected";
  expectedDelta: number;
  unit: string;
  reason: string;
  note: string | null;
  sourceLabel: string | null;
};

type ExistingRequestInput = {
  id: string;
  organizationId?: string | null;
  storageLocationId?: string | null;
  inventoryItemId: string;
  requestedById: string;
  status: "open" | "approved" | "rejected";
  expectedDelta: number;
  unit: string;
  reason: string;
  note?: string | null;
  sourceLabel?: string | null;
};
