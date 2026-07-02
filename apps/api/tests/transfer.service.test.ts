import { describe, expect, it } from "vitest";

import { TransferService } from "../src/modules/inventory/transfer.service.js";

describe("TransferService", () => {
  it("creates an atomic transfer movement and refreshes both snapshots", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-1",
      movementsByLocation: {
        "loc-a": [{ type: "goods_received", quantity: 10, storageLocationId: "loc-a", createdAt: now }],
        "loc-b": [{ type: "goods_received", quantity: 2, storageLocationId: "loc-b", createdAt: now }]
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    const result = await service.create(
      {
        inventoryItemId: "item-1",
        quantity: 3,
        unit: "Stück",
        fromStorageLocationId: "loc-a",
        toStorageLocationId: "loc-b"
      },
      {
        userId: "staff-1",
        role: "staff",
        organizationId: "org-1"
      }
    );

    expect(result).toEqual({
      movementId: "move-transfer-1",
      stockFromAfter: 7,
      stockToAfter: 5
    });
    expect(calls).toContainEqual({
      model: "inventoryMovement",
      method: "create",
      args: {
        data: {
          idempotencyKey: expect.stringContaining("inventory.transfer.created:staff-1"),
          organizationId: "org-1",
          inventoryItemId: "item-1",
          type: "transfer",
          quantity: 3,
          unit: "Stück",
          actorUserId: "staff-1",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b",
          note: undefined
        }
      }
    });
  });

  it("rejects transfers that would create negative stock at source", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-1",
      movementsByLocation: {
        "loc-a": [{ type: "goods_received", quantity: 2, storageLocationId: "loc-a", createdAt: now }],
        "loc-b": []
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 4,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("transfer would result in negative stock at source");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(
      false
    );
  });

  it("rejects transfers that keep source and target identical", async () => {
    const service = new TransferService({
      db: {
        async $transaction<T>(_callback: (transaction: unknown) => Promise<T>): Promise<T> {
          throw new Error("transaction should not start for invalid payload");
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 1,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-a"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("source and target location must differ");
  });

  it("rejects transfers when inventory item ownership mismatches actor organization", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-2",
      movementsByLocation: {
        "loc-a": [],
        "loc-b": []
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 2,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("inventory item organization mismatch");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(
      false
    );
    expect(
      calls.some((call) => call.model === "inventoryStockSnapshot" && call.method === "upsert")
    ).toBe(false);
  });

  it("rejects transfers when source location ownership mismatches actor organization", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-1",
      sourceLocationOrganizationId: "org-2",
      movementsByLocation: {
        "loc-a": [],
        "loc-b": []
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 2,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("source storage location organization mismatch");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(
      false
    );
    expect(
      calls.some((call) => call.model === "inventoryStockSnapshot" && call.method === "upsert")
    ).toBe(false);
  });

  it("rejects transfers when target location ownership mismatches actor organization", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-1",
      targetLocationOrganizationId: "org-2",
      movementsByLocation: {
        "loc-a": [],
        "loc-b": []
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 2,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("target storage location organization mismatch");
    expect(calls.some((call) => call.model === "inventoryMovement" && call.method === "create")).toBe(
      false
    );
    expect(
      calls.some((call) => call.model === "inventoryStockSnapshot" && call.method === "upsert")
    ).toBe(false);
  });

  it("rejects actors without an organization context", async () => {
    const service = new TransferService({
      db: {
        async $transaction<T>(_callback: (transaction: unknown) => Promise<T>): Promise<T> {
          throw new Error("transaction should not start without organization context");
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 1,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff"
        }
      )
    ).rejects.toThrow("actor has no organization context");
  });

  it("keeps transfer atomic when movement creation fails", async () => {
    const calls: Array<{ model: string; method: string; args?: unknown }> = [];
    const now = new Date("2026-05-31T09:00:00.000Z");
    const tx = transferTransaction({
      calls,
      now,
      organizationId: "org-1",
      failMovementCreate: true,
      movementsByLocation: {
        "loc-a": [{ type: "goods_received", quantity: 10, storageLocationId: "loc-a", createdAt: now }],
        "loc-b": []
      }
    });
    const service = new TransferService({
      now: () => now,
      db: {
        async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
          return callback(tx);
        }
      }
    });

    await expect(
      service.create(
        {
          inventoryItemId: "item-1",
          quantity: 3,
          unit: "Stück",
          fromStorageLocationId: "loc-a",
          toStorageLocationId: "loc-b"
        },
        {
          userId: "staff-1",
          role: "staff",
          organizationId: "org-1"
        }
      )
    ).rejects.toThrow("movement failed");
    expect(
      calls.some((call) => call.model === "inventoryStockSnapshot" && call.method === "upsert")
    ).toBe(false);
  });
});

function transferTransaction(input: {
  calls: Array<{ model: string; method: string; args?: unknown }>;
  now: Date;
  organizationId: string;
  sourceLocationOrganizationId?: string;
  targetLocationOrganizationId?: string;
  failMovementCreate?: boolean;
  movementsByLocation: Record<string, Array<{ type: string; quantity: number; storageLocationId?: string; createdAt: Date }>>;
}) {
  const createdMovements: Array<{
    type: "goods_received" | "item_removed" | "transfer" | "correction_positive" | "correction_negative";
    quantity: number;
    storageLocationId?: string | null;
    fromStorageLocationId?: string | null;
    toStorageLocationId?: string | null;
    createdAt: Date;
  }> = [];

  return {
    inventoryItem: {
      async findFirst(args: { where: { id: string } }) {
        input.calls.push({ model: "inventoryItem", method: "findFirst", args });
        return { id: "item-1", organizationId: input.organizationId };
      }
    },
    storageLocation: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        input.calls.push({ model: "storageLocation", method: "findFirst", args });
        if (
          args.where.id === "loc-a" &&
          args.where.organizationId !== (input.sourceLocationOrganizationId ?? input.organizationId)
        ) {
          return null;
        }
        if (
          args.where.id === "loc-b" &&
          args.where.organizationId !== (input.targetLocationOrganizationId ?? input.organizationId)
        ) {
          return null;
        }
        return {
          id: args.where.id,
          organizationId:
            args.where.id === "loc-a"
              ? (input.sourceLocationOrganizationId ?? input.organizationId)
              : (input.targetLocationOrganizationId ?? input.organizationId)
        };
      }
    },
    inventoryMovement: {
      async create(args: {
        data: {
          type: "transfer";
          quantity: number;
          fromStorageLocationId: string;
          toStorageLocationId: string;
        };
      }) {
        input.calls.push({ model: "inventoryMovement", method: "create", args });
        if (input.failMovementCreate) {
          throw new Error("movement failed");
        }
        createdMovements.push({
          type: args.data.type,
          quantity: args.data.quantity,
          fromStorageLocationId: args.data.fromStorageLocationId,
          toStorageLocationId: args.data.toStorageLocationId,
          createdAt: input.now
        });
        return { id: "move-transfer-1" };
      },
      async findMany(args: { where: { inventoryItemId: string; organizationId?: string } }) {
        input.calls.push({ model: "inventoryMovement", method: "findMany", args });
        const all = [
          ...(input.movementsByLocation["loc-a"] ?? []),
          ...(input.movementsByLocation["loc-b"] ?? []),
          ...createdMovements
        ];
        if (!args.where.inventoryItemId) {
          return [];
        }
        return all as Array<{
          type: "goods_received" | "item_removed" | "transfer" | "correction_positive" | "correction_negative";
          quantity: number;
          storageLocationId?: string | null;
          fromStorageLocationId?: string | null;
          toStorageLocationId?: string | null;
          createdAt: Date;
        }>;
      }
    },
    inventoryStockSnapshot: {
      async upsert(args: unknown) {
        input.calls.push({ model: "inventoryStockSnapshot", method: "upsert", args });
        return { id: "snapshot-1" };
      }
    }
  };
}
