import { z } from "zod";

// Payload schemas use .strict() to reject unknown top-level keys.
// Field names and shapes are based on synthetic test fixtures only —
// actual field contract requires official export, certified partner interface,
// or contractually approved API access confirmation.

export const DailyCloseSchema = z
  .object({
    eventType: z.literal("daily.close"),
    externalId: z.string().min(1),
    tenantId: z.string().min(1),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "businessDate must be YYYY-MM-DD"),
    totalRevenue: z.number(),
    totalTransactions: z.number().int().nonnegative(),
    currency: z.string().length(3),
    closedAt: z.string().datetime({ offset: true })
  })
  .strict();

export const ReceiptCreatedSchema = z
  .object({
    eventType: z.literal("receipt.created"),
    externalId: z.string().min(1),
    tenantId: z.string().min(1),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number(),
    currency: z.string().length(3),
    items: z.array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number()
      }).strict()
    ),
    createdAt: z.string().datetime({ offset: true })
  })
  .strict();

export const PaymasterPostedSchema = z
  .object({
    eventType: z.literal("paymaster.posted"),
    externalId: z.string().min(1),
    tenantId: z.string().min(1),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number(),
    currency: z.string().length(3),
    reference: z.string().min(1),
    postedAt: z.string().datetime({ offset: true })
  })
  .strict();

export type DailyClose = z.infer<typeof DailyCloseSchema>;
export type ReceiptCreated = z.infer<typeof ReceiptCreatedSchema>;
export type PaymasterPosted = z.infer<typeof PaymasterPostedSchema>;

export type ConnectorErrorKind = "network" | "auth" | "rate_limit" | "validation" | "unknown";

export class ConnectorError extends Error {
  public readonly kind: ConnectorErrorKind;
  public readonly statusCode?: number;

  constructor(kind: ConnectorErrorKind, message: string, statusCode?: number) {
    super(message);
    this.name = "ConnectorError";
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

export type GastronoviConnectorConfig = {
  readonly apiBaseUrl: string;
  readonly apiKey: string;
  readonly tenantId: string;
  readonly enabled: boolean;
  readonly pollIntervalSeconds: number;
  readonly tlsFingerprintRequired: boolean;
  readonly tenantAllowlist: readonly string[];
};

export type GastronoviConnectorHealth = {
  configValid: boolean;
  tenantAllowed: boolean;
  circuitOpen: boolean;
  /** "not_implemented" when required but certificate pinning is not yet active */
  tlsFingerprintStatus: "not_implemented" | "disabled";
  enabled: boolean;
};

export type RawPayloadLike = {
  payloadHash: string;
};

export type Logger = {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
};

export type TransportFn = (
  url: string,
  init: RequestInit
) => Promise<{ status: number; body: unknown }>;
