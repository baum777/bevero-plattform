import { InventoryNotFoundError } from "../inventory/errors.js";

export type ProcurementOrderListQuery = {
  status?: string;
  source?: string;
  supplierName?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

type DecimalLike = number | string | { toNumber(): number } | null | undefined;

type OrderListRecord = {
  id: string;
  externalOrderNumber: string;
  supplierName: string;
  source?: string;
  status: string;
  expectedDeliveryAt: Date | null;
  createdAt: Date;
  items: Array<{ mappingStatus: string }>;
};

type OrderDetailRecord = {
  id: string;
  externalOrderNumber: string;
  supplierName: string;
  status: string;
  source: string;
  sourceMailImportId: string | null;
  orderedAt: Date;
  expectedDeliveryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    lineNumber: number;
    productNameRaw: string;
    supplierSku: string | null;
    unit: string;
    orderedQty: DecimalLike;
    unitPrice: DecimalLike;
    inventoryItemId: string | null;
    mappingStatus: string;
    comment: string | null;
  }>;
};

type FailedImportRecord = {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  parseErrorMsg: string | null;
  parseConfidence: DecimalLike;
  createdAt: Date;
};

type OrderWhere = {
  organizationId: string;
  source?: string;
  status?: string | { in: string[] };
  supplierName?: { contains: string; mode: "insensitive" };
  expectedDeliveryAt?: { gte?: Date; lte?: Date };
  createdAt?: { gte?: Date; lt?: Date };
};

export type ProcurementReadDatabaseClient = {
  procurementOrder: {
    findMany(args: {
      where: OrderWhere;
      include: { items: { select: { mappingStatus: true } } };
      orderBy: { createdAt: "asc" | "desc" };
      skip?: number;
      take: number;
    }): Promise<OrderListRecord[]>;
    count(args: { where: OrderWhere }): Promise<number>;
    findFirst(args: {
      where: { id: string; organizationId: string };
      include: { items: { orderBy: { lineNumber: "asc" } } };
    }): Promise<OrderDetailRecord | null>;
  };
  procurementMailImport: {
    findMany(args: {
      where: { organizationId: string; parseStatus: string; createdAt: { gte: Date } };
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        messageId: true;
        subject: true;
        from: true;
        parseErrorMsg: true;
        parseConfidence: true;
        createdAt: true;
      };
    }): Promise<FailedImportRecord[]>;
    findFirst(args: {
      where: { organizationId: string };
      orderBy: { createdAt: "desc" };
      select: { createdAt: true };
    }): Promise<{ createdAt: Date } | null>;
  };
  workflowEvent: {
    findMany(args: {
      where: { type: string; occurredAt: { gte: Date } };
      orderBy: { occurredAt: "desc" };
      select: { externalId: true; occurredAt: true; dataJson: true };
    }): Promise<Array<{ externalId: string; occurredAt: Date; dataJson: unknown }>>;
  };
  inventoryStockSnapshot: {
    findMany(args: {
      where: { quantity: { lt: number } };
      select: { inventoryItemId: true; storageLocationId: true; quantity: true; unit: true };
    }): Promise<
      Array<{
        inventoryItemId: string;
        storageLocationId: string | null;
        quantity: number;
        unit: string;
      }>
    >;
  };
};

export type ProcurementOrderListItemDto = {
  id: string;
  externalOrderNumber: string;
  supplierName: string;
  status: string;
  expectedDeliveryAt?: string;
  itemCount: number;
  unmappedCount: number;
  createdAt: string;
};

export type ProcurementOrderListDto = {
  data: ProcurementOrderListItemDto[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
};

export type ProcurementOrderDetailDto = {
  order: {
    id: string;
    externalOrderNumber: string;
    supplierName: string;
    status: string;
    source: string;
    sourceMailImportId?: string;
    orderedAt: string;
    expectedDeliveryAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: Array<{
    id: string;
    lineNumber: number;
    productNameRaw: string;
    supplierSku?: string;
    unit: string;
    orderedQty: number;
    unitPrice?: number;
    inventoryItemId?: string;
    mappingStatus: string;
    comment?: string;
  }>;
};

export type ParseFailureAlertDto = {
  failureCount: number;
  lastFailureAt: string;
  failedMailIds: string[];
  suggestedAction: string;
};

export type ProcurementMailStatusDto = {
  lastPollAt?: string;
  failureCount24h: number;
  status: "healthy" | "alert";
};

export type StuckOrdersDto = {
  count: number;
  thresholdHours: number;
  orders: Array<{
    id: string;
    externalOrderNumber: string;
    supplierName: string;
    status: string;
    ageHours: number;
    expectedDeliveryAt?: string;
  }>;
};

export type ReceiveErrorsDto = {
  count: number;
  errors: Array<{ orderId: string; occurredAt: string; reason?: string }>;
};

export type SnapshotIntegrityDto = {
  ok: boolean;
  violationCount: number;
  violations: Array<{
    inventoryItemId: string;
    storageLocationId?: string;
    quantity: number;
    unit: string;
  }>;
};

const stuckOrderStatuses = [
  "pending_receipt",
  "needs_mapping",
  "ready_to_confirm",
  "partially_received"
];
const stuckThresholdHours = 48;

export class ProcurementReadService {
  public constructor(
    private readonly options: {
      db: ProcurementReadDatabaseClient;
      failureAlertThreshold: number;
      now?: () => Date;
    }
  ) {}

  public async listOrders(
    organizationId: string,
    query: ProcurementOrderListQuery
  ): Promise<ProcurementOrderListDto> {
    const where: OrderWhere = { organizationId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.source) {
      where.source = query.source;
    }
    if (query.supplierName) {
      where.supplierName = { contains: query.supplierName, mode: "insensitive" };
    }
    if (query.fromDate || query.toDate) {
      where.expectedDeliveryAt = {
        ...(query.fromDate ? { gte: query.fromDate } : {}),
        ...(query.toDate ? { lte: query.toDate } : {})
      };
    }

    const [records, total] = await Promise.all([
      this.options.db.procurementOrder.findMany({
        where,
        include: { items: { select: { mappingStatus: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.options.db.procurementOrder.count({ where })
    ]);

    return {
      data: records.map(mapOrderListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasMore: query.page * query.limit < total
      }
    };
  }

  public async getOrder(
    organizationId: string,
    id: string
  ): Promise<ProcurementOrderDetailDto> {
    const record = await this.options.db.procurementOrder.findFirst({
      where: { id, organizationId },
      include: { items: { orderBy: { lineNumber: "asc" } } }
    });

    if (!record) {
      throw new InventoryNotFoundError("procurement order not found");
    }

    return {
      order: {
        id: record.id,
        externalOrderNumber: record.externalOrderNumber,
        supplierName: record.supplierName,
        status: record.status,
        source: record.source,
        sourceMailImportId: record.sourceMailImportId ?? undefined,
        orderedAt: record.orderedAt.toISOString(),
        expectedDeliveryAt: record.expectedDeliveryAt?.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      },
      items: record.items.map((item) => ({
        id: item.id,
        lineNumber: item.lineNumber,
        productNameRaw: item.productNameRaw,
        supplierSku: item.supplierSku ?? undefined,
        unit: item.unit,
        orderedQty: decimalToNumber(item.orderedQty) ?? 0,
        unitPrice: decimalToNumber(item.unitPrice),
        inventoryItemId: item.inventoryItemId ?? undefined,
        mappingStatus: item.mappingStatus,
        comment: item.comment ?? undefined
      }))
    };
  }

  public async parseFailures24h(organizationId: string): Promise<ParseFailureAlertDto | null> {
    const since = this.cutoff24h();
    const failures = await this.options.db.procurementMailImport.findMany({
      where: { organizationId, parseStatus: "failed", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        messageId: true,
        subject: true,
        from: true,
        parseErrorMsg: true,
        parseConfidence: true,
        createdAt: true
      }
    });

    if (failures.length <= this.options.failureAlertThreshold) {
      return null;
    }

    return {
      failureCount: failures.length,
      lastFailureAt: failures[0].createdAt.toISOString(),
      failedMailIds: failures.map((failure) => failure.id),
      suggestedAction:
        "Review the failed mails in procurement_mail_imports; adjust parser patterns or import the order manually."
    };
  }

  public async mailStatus(organizationId: string): Promise<ProcurementMailStatusDto> {
    const since = this.cutoff24h();
    const [latest, failures] = await Promise.all([
      this.options.db.procurementMailImport.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      }),
      this.options.db.procurementMailImport.findMany({
        where: { organizationId, parseStatus: "failed", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          messageId: true,
          subject: true,
          from: true,
          parseErrorMsg: true,
          parseConfidence: true,
          createdAt: true
        }
      })
    ]);

    return {
      lastPollAt: latest?.createdAt.toISOString(),
      failureCount24h: failures.length,
      status: failures.length > this.options.failureAlertThreshold ? "alert" : "healthy"
    };
  }

  public async stuckOrders(organizationId: string): Promise<StuckOrdersDto> {
    const now = this.options.now?.() ?? new Date();
    const cutoff = new Date(now.getTime() - stuckThresholdHours * 60 * 60 * 1000);

    const records = await this.options.db.procurementOrder.findMany({
      where: {
        organizationId,
        status: { in: stuckOrderStatuses },
        createdAt: { lt: cutoff }
      },
      include: { items: { select: { mappingStatus: true } } },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    return {
      count: records.length,
      thresholdHours: stuckThresholdHours,
      orders: records.map((record) => ({
        id: record.id,
        externalOrderNumber: record.externalOrderNumber,
        supplierName: record.supplierName,
        status: record.status,
        ageHours: Math.floor((now.getTime() - record.createdAt.getTime()) / (60 * 60 * 1000)),
        expectedDeliveryAt: record.expectedDeliveryAt?.toISOString()
      }))
    };
  }

  public async receiveErrors(organizationId: string): Promise<ReceiveErrorsDto> {
    const since = this.cutoff24h();
    const events = await this.options.db.workflowEvent.findMany({
      where: { type: "procurement.receive_conflict", occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      select: { externalId: true, occurredAt: true, dataJson: true }
    });

    const scoped = events.filter((event) => readEventOrganizationId(event.dataJson) === organizationId);

    return {
      count: scoped.length,
      errors: scoped.map((event) => ({
        orderId: event.externalId,
        occurredAt: event.occurredAt.toISOString(),
        reason: readEventReason(event.dataJson)
      }))
    };
  }

  public async snapshotIntegrity(_organizationId: string): Promise<SnapshotIntegrityDto> {
    const violations = await this.options.db.inventoryStockSnapshot.findMany({
      where: { quantity: { lt: 0 } },
      select: { inventoryItemId: true, storageLocationId: true, quantity: true, unit: true }
    });

    return {
      ok: violations.length === 0,
      violationCount: violations.length,
      violations: violations.map((violation) => ({
        inventoryItemId: violation.inventoryItemId,
        storageLocationId: violation.storageLocationId ?? undefined,
        quantity: violation.quantity,
        unit: violation.unit
      }))
    };
  }

  private cutoff24h(): Date {
    const now = this.options.now?.() ?? new Date();
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function readEventOrganizationId(dataJson: unknown): string | undefined {
  if (dataJson && typeof dataJson === "object" && "organizationId" in dataJson) {
    const value = (dataJson as { organizationId?: unknown }).organizationId;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function readEventReason(dataJson: unknown): string | undefined {
  if (dataJson && typeof dataJson === "object" && "reason" in dataJson) {
    const value = (dataJson as { reason?: unknown }).reason;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function mapOrderListItem(record: OrderListRecord): ProcurementOrderListItemDto {
  return {
    id: record.id,
    externalOrderNumber: record.externalOrderNumber,
    supplierName: record.supplierName,
    status: record.status,
    expectedDeliveryAt: record.expectedDeliveryAt?.toISOString(),
    itemCount: record.items.length,
    unmappedCount: record.items.filter((item) => item.mappingStatus !== "mapped").length,
    createdAt: record.createdAt.toISOString()
  };
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
