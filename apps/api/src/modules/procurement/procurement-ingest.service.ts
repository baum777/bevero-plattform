import { DkimValidator } from "./dkim-validator.js";
import { FoodNotifyParser, type ParseResult } from "./foodnotify-parser.js";
import type { MailSource, RawEmail } from "./mail.types.js";
import { normalizeProductName } from "./procurement-write.service.js";

export type ProcurementParseStatus = "pending" | "ok" | "failed" | "skipped_dkim";

type MailImportCreateData = {
  organizationId: string;
  messageId: string;
  internetMessageId?: string;
  graphMessageId?: string;
  mailbox?: string;
  folder?: string;
  from: string;
  subject: string;
  receivedAt: Date;
  dkimPass: boolean;
  dkimSignature?: string;
  parseStatus: ProcurementParseStatus;
  parseConfidence: number;
  rawText?: string;
  rawHtml?: string;
};

type MailImportUpdateData = {
  parseStatus?: ProcurementParseStatus;
  parseConfidence?: number;
  parseErrorMsg?: string | null;
};

type OrderItemCreateData = {
  lineNumber: number;
  productNameRaw: string;
  supplierSku?: string;
  unit: string;
  orderedQty: number;
  unitPrice?: number;
  taxRate?: number;
  inventoryItemId?: string;
  mappingStatus: "pending" | "auto_mapped";
};

type OrderCreateData = {
  organizationId: string;
  source: "mail" | "foodnotify_email";
  sourceMailImportId: string;
  externalOrderNumber: string;
  supplierName: string;
  orderedAt: Date;
  expectedDeliveryAt?: Date;
  status: "pending_receipt";
  rawSnapshot: unknown;
  items: { create: OrderItemCreateData[] };
};

export type ProcurementIngestDatabaseClient = {
  procurementMailImport: {
    findFirst(args: {
      where: {
        OR: Array<
          | { messageId: string }
          | { internetMessageId: string }
          | { graphMessageId: string }
        >;
      };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: MailImportCreateData; select: { id: true } }): Promise<{ id: string }>;
    update(args: { where: { id: string }; data: MailImportUpdateData }): Promise<unknown>;
  };
  procurementOrder: {
    create(args: { data: OrderCreateData; select: { id: true } }): Promise<{ id: string }>;
  };
  articleMapping: {
    findMany(args: {
      where: { organizationId: string; supplierName: string; productNameRaw: { in: string[] } };
      select: { productNameRaw: true; inventoryItemId: true };
    }): Promise<Array<{ productNameRaw: string; inventoryItemId: string }>>;
  };
};

export type IngestLogger = {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
};

const noopLogger: IngestLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

export type ProcurementIngestSummary = {
  found: number;
  polled: number;
  imported: number;
  failed: number;
  skippedDkim: number;
  duplicates: number;
  ignored: number;
  skippedDisabled: number;
};

export type ProcurementIngestOptions = {
  db: ProcurementIngestDatabaseClient;
  mailSource: MailSource;
  organizationId: string;
  confidenceMin: number;
  rawMailMaxBytes: number;
  trustedSenderDomains: string[];
  importEnabled?: boolean;
  parser?: FoodNotifyParser;
  dkimValidator?: DkimValidator;
  logger?: IngestLogger;
  now?: () => Date;
};

export class ProcurementIngestService {
  private readonly parser: FoodNotifyParser;
  private readonly dkim: DkimValidator;
  private readonly logger: IngestLogger;

  public constructor(private readonly options: ProcurementIngestOptions) {
    this.parser = options.parser ?? new FoodNotifyParser();
    this.dkim =
      options.dkimValidator ??
      new DkimValidator({ trustedSenderDomains: options.trustedSenderDomains });
    this.logger = options.logger ?? noopLogger;
  }

  public async ingestPoll(): Promise<ProcurementIngestSummary> {
    if (this.options.importEnabled === false) {
      const summary = { ...emptySummary(), skippedDisabled: 1 };
      this.logger.info({ ...summary }, "procurement mail ingest disabled");
      return summary;
    }

    const messages = await this.options.mailSource.fetchUnseen();
    const summary: ProcurementIngestSummary = {
      found: messages.length,
      polled: messages.length,
      imported: 0,
      failed: 0,
      skippedDkim: 0,
      duplicates: 0,
      ignored: 0,
      skippedDisabled: 0
    };

    for (const message of messages) {
      const outcome = await this.ingestOne(message);
      summary[outcome] += 1;

      if (this.options.mailSource.markSeen) {
        await this.options.mailSource.markSeen(message.messageId);
      }
    }

    this.logger.info({ ...summary }, "procurement mail ingest poll complete");
    return summary;
  }

  private async ingestOne(
    message: RawEmail
  ): Promise<"imported" | "failed" | "skippedDkim" | "duplicates"> {
    const existing = await this.options.db.procurementMailImport.findFirst({
      where: {
        OR: duplicateKeysFor(message)
      },
      select: { id: true }
    });

    if (existing) {
      this.logger.info(
        { messageId: message.messageId },
        "procurement mail already processed, skipping"
      );
      return "duplicates";
    }

    const dkimPass = this.dkim.validate(message);
    const parseResult = dkimPass ? this.parser.parse(message) : undefined;
    const confidence = roundConfidence(parseResult?.confidence ?? 0);

    const initialStatus: ProcurementParseStatus = !dkimPass
      ? "skipped_dkim"
      : confidence >= this.options.confidenceMin
        ? "pending"
        : "failed";

    const mailImport = await this.options.db.procurementMailImport.create({
      data: {
        organizationId: this.options.organizationId,
        messageId: message.messageId,
        internetMessageId: message.internetMessageId,
        graphMessageId: message.graphMessageId,
        mailbox: message.mailbox,
        folder: message.folder,
        from: message.from,
        subject: message.subject,
        receivedAt: message.receivedAt,
        dkimPass,
        dkimSignature: message.dkimSignature,
        parseStatus: initialStatus,
        parseConfidence: confidence,
        rawText: truncate(message.text, this.options.rawMailMaxBytes),
        rawHtml: truncate(message.html ?? "", this.options.rawMailMaxBytes)
      },
      select: { id: true }
    });

    if (!dkimPass) {
      this.logger.warn(
        { messageId: message.messageId, from: message.from },
        "procurement mail failed DKIM domain check, skipping parse"
      );
      return "skippedDkim";
    }

    if (!parseResult || confidence < this.options.confidenceMin) {
      const reason = (parseResult?.errors ?? ["parse failed"]).join("; ");
      await this.options.db.procurementMailImport.update({
        where: { id: mailImport.id },
        data: { parseStatus: "failed", parseErrorMsg: `low confidence (${confidence}): ${reason}` }
      });
      this.logger.error(
        { messageId: message.messageId, confidence, reason },
        "procurement mail parse below confidence threshold"
      );
      return "failed";
    }

    try {
      await this.createOrder(mailImport.id, message, parseResult);
      await this.options.db.procurementMailImport.update({
        where: { id: mailImport.id },
        data: { parseStatus: "ok", parseErrorMsg: null }
      });
      this.logger.info(
        {
          messageId: message.messageId,
          orderNumber: parseResult.externalOrderNumber,
          items: parseResult.items.length
        },
        "procurement order imported"
      );
      return "imported";
    } catch (error) {
      const reason = error instanceof Error ? error.message : "order creation failed";
      await this.options.db.procurementMailImport.update({
        where: { id: mailImport.id },
        data: { parseStatus: "failed", parseErrorMsg: reason }
      });
      this.logger.error(
        { messageId: message.messageId, reason },
        "procurement order creation failed"
      );
      return "failed";
    }
  }

  private async createOrder(
    mailImportId: string,
    message: RawEmail,
    parseResult: ParseResult
  ): Promise<void> {
    const supplierName = parseResult.supplierName as string;
    const mappingByName = await this.lookupMappings(supplierName, parseResult.items);

    await this.options.db.procurementOrder.create({
      data: {
        organizationId: this.options.organizationId,
        source: "foodnotify_email",
        sourceMailImportId: mailImportId,
        externalOrderNumber: parseResult.externalOrderNumber as string,
        supplierName,
        orderedAt: parseResult.orderedAt ?? message.receivedAt,
        expectedDeliveryAt: parseResult.expectedDeliveryAt,
        status: "pending_receipt",
        rawSnapshot: {
          subject: message.subject,
          from: message.from,
          parsed: {
            externalOrderNumber: parseResult.externalOrderNumber,
            supplierName: parseResult.supplierName,
            confidence: parseResult.confidence
          }
        },
        items: {
          create: parseResult.items.map((item) => {
            const mappedInventoryItemId = mappingByName.get(normalizeProductName(item.productName));
            return {
              lineNumber: item.lineNumber,
              productNameRaw: item.productName,
              supplierSku: item.supplierSku,
              unit: item.unit,
              orderedQty: item.qty,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              ...(mappedInventoryItemId
                ? { inventoryItemId: mappedInventoryItemId, mappingStatus: "auto_mapped" as const }
                : { mappingStatus: "pending" as const })
            };
          })
        }
      },
      select: { id: true }
    });
  }

  private async lookupMappings(
    supplierName: string,
    items: ParseResult["items"]
  ): Promise<Map<string, string>> {
    const normalizedNames = [...new Set(items.map((item) => normalizeProductName(item.productName)))];
    if (normalizedNames.length === 0) {
      return new Map();
    }

    const mappings = await this.options.db.articleMapping.findMany({
      where: {
        organizationId: this.options.organizationId,
        supplierName,
        productNameRaw: { in: normalizedNames }
      },
      select: { productNameRaw: true, inventoryItemId: true }
    });

    return new Map(mappings.map((mapping) => [mapping.productNameRaw, mapping.inventoryItemId]));
  }
}

function emptySummary(): ProcurementIngestSummary {
  return {
    found: 0,
    polled: 0,
    imported: 0,
    failed: 0,
    skippedDkim: 0,
    duplicates: 0,
    ignored: 0,
    skippedDisabled: 0
  };
}

function duplicateKeysFor(
  message: RawEmail
): Array<{ messageId: string } | { internetMessageId: string } | { graphMessageId: string }> {
  return [
    { messageId: message.messageId },
    ...(message.internetMessageId ? [{ internetMessageId: message.internetMessageId }] : []),
    ...(message.graphMessageId ? [{ graphMessageId: message.graphMessageId }] : [])
  ];
}

function truncate(value: string, maxBytes: number): string | undefined {
  if (!value) {
    return undefined;
  }
  if (Buffer.byteLength(value, "utf8") <= maxBytes) {
    return value;
  }
  return Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8");
}

function roundConfidence(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100;
}
