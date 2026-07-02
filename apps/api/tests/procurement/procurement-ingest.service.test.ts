import { describe, expect, it } from "vitest";

import {
  ProcurementIngestService,
  type ProcurementIngestDatabaseClient
} from "../../src/modules/procurement/procurement-ingest.service.js";
import type { MailSource, RawEmail } from "../../src/modules/procurement/mail.types.js";

type MailImportRow = {
  id: string;
  messageId: string;
  internetMessageId: string | null;
  graphMessageId: string | null;
  mailbox: string | null;
  folder: string | null;
  parseStatus: string;
  parseConfidence: number;
  parseErrorMsg: string | null;
  dkimPass: boolean;
};

type OrderRow = {
  id: string;
  externalOrderNumber: string;
  source: string;
  status: string;
  organizationId: string;
  sourceMailImportId: string;
  itemCount: number;
};

type MappingRow = {
  supplierName: string;
  productNameRaw: string;
  inventoryItemId: string;
};

function createFakeDb(mappings: MappingRow[] = []) {
  const imports: MailImportRow[] = [];
  const orders: OrderRow[] = [];
  const createdOrders: Array<{ items: Array<{ productNameRaw: string; mappingStatus: string; inventoryItemId?: string; taxRate?: number; unitPrice?: number }> }> = [];
  let seq = 0;

  const db: ProcurementIngestDatabaseClient = {
    procurementMailImport: {
      async findFirst({ where }) {
        const candidates = where.OR ?? [];
        const row = imports.find((entry) =>
          candidates.some((candidate) => {
            if ("messageId" in candidate) return entry.messageId === candidate.messageId;
            if ("internetMessageId" in candidate) return entry.internetMessageId === candidate.internetMessageId;
            if ("graphMessageId" in candidate) return entry.graphMessageId === candidate.graphMessageId;
            return false;
          })
        );
        return row ? { id: row.id } : null;
      },
      async create({ data }) {
        const id = `import-${++seq}`;
        imports.push({
          id,
          messageId: data.messageId,
          internetMessageId: data.internetMessageId ?? null,
          graphMessageId: data.graphMessageId ?? null,
          mailbox: data.mailbox ?? null,
          folder: data.folder ?? null,
          parseStatus: data.parseStatus,
          parseConfidence: data.parseConfidence,
          parseErrorMsg: null,
          dkimPass: data.dkimPass
        });
        return { id };
      },
      async update({ where, data }) {
        const row = imports.find((entry) => entry.id === where.id);
        if (row) {
          if (data.parseStatus) row.parseStatus = data.parseStatus;
          if (data.parseConfidence !== undefined) row.parseConfidence = data.parseConfidence;
          if (data.parseErrorMsg !== undefined) row.parseErrorMsg = data.parseErrorMsg;
        }
        return row;
      }
    },
    procurementOrder: {
      async create({ data }) {
        if (
          orders.some(
            (order) =>
              order.organizationId === data.organizationId &&
              order.externalOrderNumber === data.externalOrderNumber
          )
        ) {
          throw new Error("Unique constraint failed on organization_id, external_order_number");
        }
        const id = `order-${++seq}`;
        orders.push({
          id,
          externalOrderNumber: data.externalOrderNumber,
          source: data.source,
          status: data.status,
          organizationId: data.organizationId,
          sourceMailImportId: data.sourceMailImportId,
          itemCount: data.items.create.length
        });
        createdOrders.push({
          items: data.items.create.map((item) => ({
            productNameRaw: item.productNameRaw,
            mappingStatus: item.mappingStatus,
            inventoryItemId: item.inventoryItemId,
            taxRate: item.taxRate,
            unitPrice: item.unitPrice
          }))
        });
        return { id };
      }
    },
    articleMapping: {
      async findMany({ where }) {
        return mappings
          .filter(
            (mapping) =>
              mapping.supplierName === where.supplierName &&
              where.productNameRaw.in.includes(mapping.productNameRaw)
          )
          .map((mapping) => ({
            productNameRaw: mapping.productNameRaw,
            inventoryItemId: mapping.inventoryItemId
          }));
      }
    }
  };

  return { db, imports, orders, createdOrders };
}

class StubMailSource implements MailSource {
  public seen: string[] = [];
  public constructor(private readonly messages: RawEmail[]) {}
  async fetchUnseen(): Promise<RawEmail[]> {
    return this.messages;
  }
  async markSeen(messageId: string): Promise<void> {
    this.seen.push(messageId);
  }
}

function mail(overrides: Partial<RawEmail>): RawEmail {
  return {
    messageId: "<a@foodnotify.com>",
    from: "noreply@foodnotify.com",
    subject: "Bestellung",
    receivedAt: new Date("2026-06-02T08:00:00.000Z"),
    text: `Bestellung Nr.: FN-1000
Lieferant: Metro
1 Coca Cola 0,2l 24 Kiste
2 Wasser still 12 Kiste`,
    ...overrides
  };
}

const baseOptions = {
  organizationId: "org-1",
  confidenceMin: 0.85,
  rawMailMaxBytes: 204800,
  trustedSenderDomains: ["foodnotify.com"]
};

describe("ProcurementIngestService", () => {
  it("does not call the mail source while FoodNotify import is disabled", async () => {
    class ThrowingSource implements MailSource {
      async fetchUnseen(): Promise<RawEmail[]> {
        throw new Error("mail source must not be called");
      }
    }
    const { db } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new ThrowingSource(),
      importEnabled: false,
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({
      found: 0,
      polled: 0,
      imported: 0,
      failed: 0,
      duplicates: 0,
      ignored: 0,
      skippedDisabled: 1
    });
  });

  it("imports a high-confidence order with items as pending_receipt", async () => {
    const { db, imports, orders } = createFakeDb();
    const source = new StubMailSource([mail({})]);
    const service = new ProcurementIngestService({ db, mailSource: source, ...baseOptions });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ found: 1, polled: 1, imported: 1, failed: 0, skippedDkim: 0 });
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      externalOrderNumber: "FN-1000",
      source: "foodnotify_email",
      status: "pending_receipt",
      itemCount: 2
    });
    expect(imports[0].parseStatus).toBe("ok");
    expect(source.seen).toEqual(["<a@foodnotify.com>"]);
  });

  it("is idempotent on message_id (duplicate mail is skipped)", async () => {
    const { db, orders } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([mail({}), mail({})]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ polled: 2, imported: 1, duplicates: 1 });
    expect(orders).toHaveLength(1);
  });

  it("is idempotent on internet_message_id and graph_message_id", async () => {
    const { db, orders } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([
        mail({
          messageId: "graph-1",
          internetMessageId: "<same@foodnotify.com>",
          graphMessageId: "graph-1"
        }),
        mail({
          messageId: "graph-2",
          internetMessageId: "<same@foodnotify.com>",
          graphMessageId: "graph-2"
        }),
        mail({
          messageId: "graph-3",
          internetMessageId: "<different@foodnotify.com>",
          graphMessageId: "graph-1"
        })
      ]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ found: 3, imported: 1, duplicates: 2 });
    expect(orders).toHaveLength(1);
  });

  it("skips parsing and creates no order when DKIM domain check fails", async () => {
    const { db, imports, orders } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([mail({ from: "spoof@evil.example", dkimSignature: undefined })]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ skippedDkim: 1, imported: 0 });
    expect(orders).toHaveLength(0);
    expect(imports[0].parseStatus).toBe("skipped_dkim");
  });

  it("marks parse_failed when confidence is below the threshold", async () => {
    const { db, imports, orders } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([
        mail({ text: "Hallo, nur ein Newsletter ohne Bestellnummer." })
      ]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ failed: 1, imported: 0 });
    expect(orders).toHaveLength(0);
    expect(imports[0].parseStatus).toBe("failed");
    expect(imports[0].parseErrorMsg).toContain("low confidence");
  });

  it("records a failure (not a crash) when the order number already exists", async () => {
    const { db, imports } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([
        mail({ messageId: "<x1@foodnotify.com>" }),
        mail({ messageId: "<x2@foodnotify.com>" })
      ]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary).toMatchObject({ polled: 2, imported: 1, failed: 1 });
    expect(imports[1].parseStatus).toBe("failed");
    expect(imports[1].parseErrorMsg).toContain("Unique constraint");
  });

  it("auto-maps items that already have an article mapping for the supplier", async () => {
    const { db, createdOrders } = createFakeDb([
      { supplierName: "Metro", productNameRaw: "coca cola 0,2l", inventoryItemId: "inv-cola" }
    ]);
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([mail({})]),
      ...baseOptions
    });

    await service.ingestPoll();

    const items = createdOrders[0].items;
    const cola = items.find((item) => item.productNameRaw === "Coca Cola 0,2l");
    const wasser = items.find((item) => item.productNameRaw === "Wasser still");
    expect(cola).toMatchObject({ mappingStatus: "auto_mapped", inventoryItemId: "inv-cola" });
    expect(wasser).toMatchObject({ mappingStatus: "pending" });
    expect(wasser?.inventoryItemId).toBeUndefined();
  });

  it("stores taxRate and unitPrice on items when present in the mail body", async () => {
    const { db, createdOrders } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([
        mail({
          text: `Bestellung Nr.: FN-TAX-1
Lieferant: Metro
1 Coca Cola 0,2l 24 Kiste 6,50€ 19%
2 Wasser still 12 Kiste 3,20€ 7%`
        })
      ]),
      ...baseOptions
    });

    await service.ingestPoll();

    const items = createdOrders[0].items;
    const cola = items.find((item) => item.productNameRaw === "Coca Cola 0,2l");
    const wasser = items.find((item) => item.productNameRaw === "Wasser still");
    expect(cola?.taxRate).toBe(19);
    expect(cola?.unitPrice).toBe(6.5);
    expect(wasser?.taxRate).toBe(7);
    expect(wasser?.unitPrice).toBe(3.2);
  });

  it("never writes to InventoryMovement or InventoryStockSnapshot during import", async () => {
    const { db } = createFakeDb();

    // The fake DB intentionally has no inventoryMovement or stockSnapshot tables.
    // This assertion verifies that ProcurementIngestService does not call any
    // method that would write stock state — structural proof by absence.
    expect((db as Record<string, unknown>)["inventoryMovement"]).toBeUndefined();
    expect((db as Record<string, unknown>)["inventoryStockSnapshot"]).toBeUndefined();

    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([mail({})]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    // Import still succeeds — confirms the ingest path does not need stock tables.
    expect(summary.imported).toBe(1);
  });

  it("skippedDisabled is 0 for a normal enabled run", async () => {
    const { db } = createFakeDb();
    const service = new ProcurementIngestService({
      db,
      mailSource: new StubMailSource([mail({})]),
      ...baseOptions
    });

    const summary = await service.ingestPoll();

    expect(summary.skippedDisabled).toBe(0);
  });
});
