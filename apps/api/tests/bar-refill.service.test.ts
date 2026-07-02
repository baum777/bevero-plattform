import { describe, expect, it } from "vitest";

import { BarRefillService } from "../src/modules/inventory/bar-refill.service.js";

describe("BarRefillService", () => {
  it("updates requested quantity without creating a stock movement", async () => {
    const db = createBarRefillDbMock();
    const service = new BarRefillService({ db, now: () => new Date("2026-06-01T08:00:00.000Z") });
    const actor = { userId: "staff-1", role: "staff" as const, organizationId: "org-1" };

    const run = await service.createOrGetTodayRun(actor);
    const updated = await service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: 4 }, actor);

    expect(updated.items[0].requestedQuantity).toBe(4);
    expect(updated.items[0].status).toBe("pending");
    expect(db.movementCreateCalls).toBe(0);
  });

  it("confirms pending items idempotently and creates only one movement", async () => {
    const db = createBarRefillDbMock();
    const service = new BarRefillService({ db, now: () => new Date("2026-06-01T09:00:00.000Z") });
    const actor = { userId: "staff-1", role: "staff" as const, organizationId: "org-1" };

    const run = await service.createOrGetTodayRun(actor);
    await service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: 3 }, actor);
    const first = await service.confirmRunItem(run.runId, run.items[0].id, actor);
    const second = await service.confirmRunItem(run.runId, run.items[0].id, actor);

    expect(first.movementId).toBe("move-1");
    expect(second.movementId).toBe("move-1");
    expect(db.movementCreateCalls).toBe(1);
    expect(first.run.items[0].status).toBe("confirmed");
  });

  it("maps requested quantity 0 to cancelled and null to open", async () => {
    const db = createBarRefillDbMock();
    const service = new BarRefillService({ db, now: () => new Date("2026-06-01T08:00:00.000Z") });
    const actor = { userId: "staff-1", role: "staff" as const, organizationId: "org-1" };

    const run = await service.createOrGetTodayRun(actor);
    const cancelled = await service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: 0 }, actor);
    expect(cancelled.items[0].status).toBe("cancelled");

    const reopened = await service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: null }, actor);
    expect(reopened.items[0].status).toBe("open");
    expect(reopened.items[0].requestedQuantity).toBeUndefined();
  });

  it("does not allow editing or cancelling confirmed items", async () => {
    const db = createBarRefillDbMock();
    const service = new BarRefillService({ db, now: () => new Date("2026-06-01T09:00:00.000Z") });
    const actor = { userId: "staff-1", role: "staff" as const, organizationId: "org-1" };

    const run = await service.createOrGetTodayRun(actor);
    await service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: 2 }, actor);
    await service.confirmRunItem(run.runId, run.items[0].id, actor);

    await expect(
      service.updateRunItem(run.runId, run.items[0].id, { requestedQuantity: 1 }, actor)
    ).rejects.toThrow("confirmed run item cannot be edited");
    await expect(service.cancelRunItem(run.runId, run.items[0].id, actor)).rejects.toThrow(
      "confirmed run item cannot be cancelled"
    );
  });
});

function createBarRefillDbMock() {
  const templateItems = [
    {
      id: "tmpl-1",
      organizationId: null,
      displayOrder: 1,
      productName: "Coca Cola",
      unit: "0,2l",
      targetQuantity: 24,
      inventoryItemId: null,
      isMisc: false
    },
    {
      id: "tmpl-43",
      organizationId: null,
      displayOrder: 43,
      productName: "Sonstiges",
      unit: "-",
      targetQuantity: null,
      inventoryItemId: null,
      isMisc: true
    }
  ];
  const inventoryItems = [
    {
      id: "item-1",
      organizationId: "org-1",
      name: "Coca Cola",
      defaultUnit: "0,2l",
      storageLocationId: "loc-1"
    }
  ];
  const runs: any[] = [];
  const runItems: any[] = [];
  const movements: any[] = [];
  let runSequence = 1;
  let runItemSequence = 1;
  let movementSequence = 1;
  let movementCreateCalls = 0;

  const tx = {
    barRefillTemplateItem: {
      async findMany(args: any) {
        return templateItems
          .filter((item) => {
            if (args.where.organizationId === null) {
              return item.organizationId === null;
            }
            return item.organizationId === args.where.organizationId;
          })
          .filter((item) => (args.where.active === undefined ? true : args.where.active))
          .sort((a, b) => a.displayOrder - b.displayOrder);
      }
    },
    barRefillRun: {
      async findFirst(args: any) {
        const found = runs.find((run) => {
          if (args.where.id && run.id !== args.where.id) return false;
          if (args.where.organizationId && run.organizationId !== args.where.organizationId) return false;
          if (args.where.runDateLocal && run.runDateLocal.valueOf() !== args.where.runDateLocal.valueOf()) {
            return false;
          }
          const statuses = args.where.status?.in;
          if (statuses && !statuses.includes(run.status)) return false;
          return true;
        });
        if (!found) return null;
        return {
          ...found,
          items: runItems.filter((item) => item.refillRunId === found.id).sort((a, b) => a.displayOrder - b.displayOrder)
        };
      },
      async create(args: any) {
        const run = {
          id: `run-${runSequence++}`,
          organizationId: args.data.organizationId,
          runDateLocal: args.data.runDateLocal,
          timezone: args.data.timezone,
          createdBy: args.data.createdBy,
          status: args.data.status,
          createdAt: new Date("2026-06-01T08:00:00.000Z"),
          completedAt: null
        };
        runs.push(run);
        return { id: run.id };
      },
      async update(args: any) {
        const run = runs.find((item) => item.id === args.where.id);
        if (!run) return null;
        Object.assign(run, args.data);
        return run;
      }
    },
    barRefillRunItem: {
      async createMany(args: any) {
        for (const row of args.data) {
          runItems.push({
            id: `run-item-${runItemSequence++}`,
            ...row,
            confirmedBy: null,
            confirmedAt: null,
            stockMovementId: null,
            createdAt: new Date("2026-06-01T08:00:00.000Z"),
            updatedAt: new Date("2026-06-01T08:00:00.000Z")
          });
        }
        return { count: args.data.length };
      },
      async findFirst(args: any) {
        const found = runItems.find((item) => {
          if (args.where.id && item.id !== args.where.id) return false;
          if (args.where.refillRunId && item.refillRunId !== args.where.refillRunId) return false;
          if (args.where.refillRun?.organizationId) {
            const run = runs.find((candidate) => candidate.id === item.refillRunId);
            if (!run || run.organizationId !== args.where.refillRun.organizationId) return false;
          }
          return true;
        });
        if (!found) return null;
        const run = runs.find((candidate) => candidate.id === found.refillRunId);
        return {
          ...found,
          refillRun: {
            id: run.id,
            organizationId: run.organizationId
          }
        };
      },
      async findMany(args: any) {
        return runItems
          .filter((item) => item.refillRunId === args.where.refillRunId)
          .map((item) => ({ status: item.status }));
      },
      async update(args: any) {
        const item = runItems.find((candidate) => candidate.id === args.where.id);
        if (!item) return null;
        Object.assign(item, args.data, { updatedAt: new Date("2026-06-01T09:00:00.000Z") });
        return item;
      }
    },
    inventoryItem: {
      async findMany(args: any) {
        return inventoryItems.filter((item) => item.organizationId === args.where.organizationId);
      },
      async findUnique(args: any) {
        return inventoryItems.find((item) => item.id === args.where.id) ?? null;
      }
    },
    inventoryMovement: {
      async create(args: any) {
        movementCreateCalls += 1;
        const existing = movements.find((movement) => movement.idempotencyKey === args.data.idempotencyKey);
        if (existing) {
          const error = new Error("duplicate") as Error & { code?: string };
          error.code = "P2002";
          throw error;
        }
        const movement = {
          id: `move-${movementSequence++}`,
          ...args.data,
          createdAt: new Date("2026-06-01T09:00:00.000Z")
        };
        movements.push(movement);
        return { id: movement.id };
      },
      async findFirst(args: any) {
        const movement = movements.find((item) => item.idempotencyKey === args.where.idempotencyKey);
        return movement ? { id: movement.id } : null;
      },
      async findMany(args: any) {
        return movements
          .filter(
            (movement) =>
              movement.inventoryItemId === args.where.inventoryItemId &&
              movement.organizationId === args.where.organizationId
          )
          .map((movement) => ({
            type: movement.type,
            quantity: movement.quantity,
            storageLocationId: movement.storageLocationId ?? null,
            fromStorageLocationId: movement.fromStorageLocationId ?? null,
            toStorageLocationId: movement.toStorageLocationId ?? null,
            createdAt: movement.createdAt
          }));
      }
    },
    inventoryStockSnapshot: {
      async upsert() {
        return { id: "snapshot-1" };
      }
    }
  };

  return {
    get movementCreateCalls() {
      return movementCreateCalls;
    },
    barRefillRun: {
      async findFirst(args: any) {
        return tx.barRefillRun.findFirst(args);
      }
    },
    async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>): Promise<T> {
      return callback(tx);
    }
  };
}
