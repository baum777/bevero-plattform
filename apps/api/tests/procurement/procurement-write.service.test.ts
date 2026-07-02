import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { Actor } from "../../src/modules/auth/actor.js";
import {
  InventoryConflictError,
  InventoryNotFoundError,
  InventoryValidationError
} from "../../src/modules/inventory/errors.js";
import {
  ProcurementWriteService,
  type ProcurementWriteDatabaseClient
} from "../../src/modules/procurement/procurement-write.service.js";

const now = () => new Date("2026-06-02T12:00:00.000Z");
const actor: Actor & { organizationId: string } = {
  userId: "user-1",
  role: "shift_lead",
  organizationId: "org-1"
};

type ItemSeed = {
  id: string;
  lineNumber: number;
  unit: string;
  productNameRaw: string;
  supplierSku?: string | null;
  orderedQty: number;
  deliveredQty?: number | null;
  acceptedQty?: number | null;
  inventoryItemId?: string | null;
  mappingStatus: string;
  rejectionReason?: string | null;
  comment?: string | null;
};

type OrderSeed = {
  id: string;
  organizationId?: string;
  locationId?: string | null;
  supplierName?: string;
  status: string;
  items: ItemSeed[];
};

function createDb(
  seed: OrderSeed,
  options: { knownInventoryItemIds?: string[]; duplicateMovementKeys?: string[] } = {}
) {
  const order = {
    id: seed.id,
    organizationId: seed.organizationId ?? "org-1",
    locationId: seed.locationId ?? null,
    supplierName: seed.supplierName ?? "Metro",
    status: seed.status,
    items: seed.items.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      unit: item.unit,
      productNameRaw: item.productNameRaw,
      supplierSku: item.supplierSku ?? null,
      orderedQty: item.orderedQty,
      deliveredQty: item.deliveredQty ?? null,
      acceptedQty: item.acceptedQty ?? null,
      inventoryItemId: item.inventoryItemId ?? null,
      mappingStatus: item.mappingStatus,
      rejectionReason: item.rejectionReason ?? null,
      comment: item.comment ?? null
    }))
  };

  const known = new Set(options.knownInventoryItemIds ?? []);
  const usedMovementKeys = new Set(options.duplicateMovementKeys ?? []);

  const state = {
    order,
    movements: [] as Array<Record<string, unknown>>,
    mappings: [] as Array<Record<string, unknown>>,
    snapshots: new Map<string, number>(),
    events: [] as Array<{ type: string; dataJson: unknown }>,
    orderUpdates: [] as string[]
  };

  const tx = {
    procurementOrder: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        if (args.where.id !== order.id || args.where.organizationId !== order.organizationId) {
          return null;
        }
        return order;
      },
      async update(args: { where: { id: string }; data: { status: string } }) {
        order.status = args.data.status;
        state.orderUpdates.push(args.data.status);
        return order;
      }
    },
    procurementOrderItem: {
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const item = order.items.find((candidate) => candidate.id === args.where.id);
        if (item) {
          Object.assign(item, args.data);
        }
        return item;
      }
    },
    inventoryItem: {
      async findFirst(args: { where: { id: string } }) {
        return known.has(args.where.id) ? { id: args.where.id } : null;
      }
    },
    articleMapping: {
      async upsert(args: { create: Record<string, unknown> }) {
        state.mappings.push(args.create);
        return args.create;
      }
    },
    inventoryMovement: {
      async create(args: { data: { idempotencyKey: string; inventoryItemId: string; quantity: number } }) {
        if (usedMovementKeys.has(args.data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError("duplicate", {
            code: "P2002",
            clientVersion: "test"
          });
        }
        usedMovementKeys.add(args.data.idempotencyKey);
        const id = `mv-${state.movements.length + 1}`;
        state.movements.push({ id, ...args.data });
        return { id };
      },
      async findMany(args: { where: { inventoryItemId: string } }) {
        return state.movements
          .filter((movement) => movement.inventoryItemId === args.where.inventoryItemId)
          .map((movement) => ({
            type: "goods_received" as const,
            quantity: movement.quantity as number,
            storageLocationId: (movement.storageLocationId as string | undefined) ?? null
          }));
      }
    },
    inventoryStockSnapshot: {
      async upsert(args: {
        where: { inventoryItemId_storageLocationId: { inventoryItemId: string; storageLocationId?: string | null } };
        create: { quantity: number };
      }) {
        const key = `${args.where.inventoryItemId_storageLocationId.inventoryItemId}:${
          args.where.inventoryItemId_storageLocationId.storageLocationId ?? ""
        }`;
        state.snapshots.set(key, args.create.quantity);
        return null;
      }
    },
    workflowEvent: {
      async create(args: { data: { type: string; dataJson: unknown } }) {
        state.events.push({ type: args.data.type, dataJson: args.data.dataJson });
        return null;
      }
    }
  };

  const db: ProcurementWriteDatabaseClient = {
    async $transaction(callback) {
      return callback(tx as never);
    },
    workflowEvent: {
      async create(args: { data: { type: string; dataJson: unknown } }) {
        state.events.push({ type: args.data.type, dataJson: args.data.dataJson });
        return null;
      }
    }
  };

  return { db, state };
}

describe("ProcurementWriteService.updateItem", () => {
  it("maps an item, persists the article mapping and promotes the order to ready_to_confirm", async () => {
    const { db, state } = createDb(
      {
        id: "order-1",
        status: "needs_mapping",
        items: [
          { id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "Coca Cola 0,2l", orderedQty: 24, mappingStatus: "pending" }
        ]
      },
      { knownInventoryItemIds: ["inv-1"] }
    );
    const service = new ProcurementWriteService({ db, now });

    const result = await service.updateItem("org-1", "order-1", "item-1", { inventory_item_id: "inv-1" }, actor);

    expect(result.orderStatus).toBe("ready_to_confirm");
    expect(result.item).toMatchObject({ inventoryItemId: "inv-1", mappingStatus: "mapped" });
    expect(state.mappings).toHaveLength(1);
    expect(state.mappings[0]).toMatchObject({
      organizationId: "org-1",
      supplierName: "Metro",
      productNameRaw: "coca cola 0,2l",
      inventoryItemId: "inv-1",
      createdBy: "user-1"
    });
  });

  it("rejects an unknown inventory_item_id with a 422", async () => {
    const { db } = createDb({
      id: "order-1",
      status: "needs_mapping",
      items: [{ id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "X", orderedQty: 1, mappingStatus: "pending" }]
    });
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.updateItem("org-1", "order-1", "item-1", { inventory_item_id: "ghost" }, actor)
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });

  it("refuses to edit an already-confirmed item", async () => {
    const { db } = createDb({
      id: "order-1",
      status: "ready_to_confirm",
      items: [
        { id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "X", orderedQty: 1, acceptedQty: 1, inventoryItemId: "inv-1", mappingStatus: "mapped" }
      ]
    });
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.updateItem("org-1", "order-1", "item-1", { comment: "late" }, actor)
    ).rejects.toBeInstanceOf(InventoryConflictError);
  });

  it("refuses to edit an order that is already received", async () => {
    const { db } = createDb({
      id: "order-1",
      status: "received",
      items: [{ id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "X", orderedQty: 1, mappingStatus: "mapped", inventoryItemId: "inv-1" }]
    });
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.updateItem("org-1", "order-1", "item-1", { comment: "x" }, actor)
    ).rejects.toBeInstanceOf(InventoryConflictError);
  });

  it("returns a 404 when the order is not in the actor's organization", async () => {
    const { db } = createDb({
      id: "order-1",
      organizationId: "other-org",
      status: "needs_mapping",
      items: [{ id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "X", orderedQty: 1, mappingStatus: "pending" }]
    });
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.updateItem("org-1", "order-1", "item-1", { comment: "x" }, actor)
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
  });
});

describe("ProcurementWriteService.receiveOrder", () => {
  const mappedOrder = (): OrderSeed => ({
    id: "order-1",
    status: "ready_to_confirm",
    locationId: "loc-1",
    items: [
      { id: "item-1", lineNumber: 1, unit: "Kiste", productNameRaw: "Cola", orderedQty: 24, deliveredQty: 24, inventoryItemId: "inv-1", mappingStatus: "mapped" },
      { id: "item-2", lineNumber: 2, unit: "Kiste", productNameRaw: "Wasser", orderedQty: 12, deliveredQty: 12, inventoryItemId: "inv-2", mappingStatus: "mapped" }
    ]
  });

  it("books stock for accepted items and marks the order received", async () => {
    const { db, state } = createDb(mappedOrder());
    const service = new ProcurementWriteService({ db, now });

    const result = await service.receiveOrder(
      "org-1",
      "order-1",
      { items: [{ item_id: "item-1", accepted_qty: 24 }, { item_id: "item-2", accepted_qty: 12 }] },
      actor
    );

    expect(result.order.status).toBe("received");
    expect(result.movements).toHaveLength(2);
    expect(state.movements[0]).toMatchObject({ idempotencyKey: "procurement.receive.item:item-1", storageLocationId: "loc-1" });
    expect(state.events.some((event) => event.type === "procurement.order_received")).toBe(true);
  });

  it("marks the order partially_received when an item is rejected", async () => {
    const { db } = createDb(mappedOrder());
    const service = new ProcurementWriteService({ db, now });

    const result = await service.receiveOrder(
      "org-1",
      "order-1",
      {
        items: [
          { item_id: "item-1", accepted_qty: 24 },
          { item_id: "item-2", accepted_qty: 0, rejection_reason: "damaged" }
        ]
      },
      actor
    );

    expect(result.order.status).toBe("partially_received");
    expect(result.movements).toHaveLength(1);
  });

  it("requires every order item to appear in the payload", async () => {
    const { db } = createDb(mappedOrder());
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder("org-1", "order-1", { items: [{ item_id: "item-1", accepted_qty: 24 }] }, actor)
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });

  it("rejects accepted_qty greater than the delivered quantity", async () => {
    const { db } = createDb(mappedOrder());
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder(
        "org-1",
        "order-1",
        { items: [{ item_id: "item-1", accepted_qty: 99 }, { item_id: "item-2", accepted_qty: 12 }] },
        actor
      )
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });

  it("refuses to receive an unmapped item", async () => {
    const seed = mappedOrder();
    seed.items[0].inventoryItemId = null;
    seed.items[0].mappingStatus = "pending";
    const { db } = createDb(seed);
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder(
        "org-1",
        "order-1",
        { items: [{ item_id: "item-1", accepted_qty: 24 }, { item_id: "item-2", accepted_qty: 12 }] },
        actor
      )
    ).rejects.toBeInstanceOf(InventoryValidationError);
  });

  it("rejects duplicate item_ids in the payload", async () => {
    const { db } = createDb(mappedOrder());
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder(
        "org-1",
        "order-1",
        { items: [{ item_id: "item-1", accepted_qty: 1 }, { item_id: "item-1", accepted_qty: 1 }] },
        actor
      )
    ).rejects.toBeInstanceOf(InventoryConflictError);
  });

  it("rejects receiving an order that is no longer receivable", async () => {
    const seed = mappedOrder();
    seed.status = "received";
    const { db } = createDb(seed);
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder(
        "org-1",
        "order-1",
        { items: [{ item_id: "item-1", accepted_qty: 24 }, { item_id: "item-2", accepted_qty: 12 }] },
        actor
      )
    ).rejects.toBeInstanceOf(InventoryConflictError);
  });

  it("converts a duplicate-movement unique violation into a 409 and records a conflict breadcrumb", async () => {
    const { db, state } = createDb(mappedOrder(), {
      duplicateMovementKeys: ["procurement.receive.item:item-1"]
    });
    const service = new ProcurementWriteService({ db, now });

    await expect(
      service.receiveOrder(
        "org-1",
        "order-1",
        { items: [{ item_id: "item-1", accepted_qty: 24 }, { item_id: "item-2", accepted_qty: 12 }] },
        actor
      )
    ).rejects.toBeInstanceOf(InventoryConflictError);

    expect(state.events.some((event) => event.type === "procurement.receive_conflict")).toBe(true);
  });
});
