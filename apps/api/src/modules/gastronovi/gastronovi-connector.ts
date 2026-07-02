import { calculatePayloadHash } from "../raw-payloads/payload-hash.js";
import {
  ConnectorError,
  DailyCloseSchema,
  PaymasterPostedSchema,
  ReceiptCreatedSchema,
  type DailyClose,
  type GastronoviConnectorConfig,
  type GastronoviConnectorHealth,
  type Logger,
  type PaymasterPosted,
  type ReceiptCreated,
  type RawPayloadLike,
  type TransportFn
} from "./gastronovi.types.js";

const REDACTED = "[REDACTED]";
const REDACT_KEYS = new Set([
  "apiKey", "api_key", "GASTRONOVI_API_KEY",
  "cardPan", "customerEmail",
  "authorization", "Authorization",
  "x-api-key", "X-Api-Key", "X-API-Key"
]);
const MAX_RETRIES = 3;
const CIRCUIT_OPEN_AFTER = 3;
const CIRCUIT_RESET_MS = 60_000;
const MAX_RPS = 2;

export function redactForLog(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      REDACT_KEYS.has(k) ? [k, REDACTED] : [k, redactForLog(v)]
    )
  );
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function defaultTransport(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export class GastronoviConnector {
  private _circuitFailures = 0;
  private _circuitOpenAt: number | null = null;
  private _tokenBucket = MAX_RPS;
  private _lastRefill = Date.now();

  constructor(
    private readonly config: GastronoviConnectorConfig,
    private readonly logger: Logger,
    private readonly transport: TransportFn = defaultTransport
  ) {}

  public async fetchDailyClose(externalId: string): Promise<DailyClose> {
    const raw = await this._request(`/daily-close/${externalId}`);
    const parsed = DailyCloseSchema.safeParse(raw);
    if (!parsed.success) throw new ConnectorError("validation", `DailyClose schema invalid: ${parsed.error.message}`);
    return parsed.data;
  }

  public async fetchReceipt(externalId: string): Promise<ReceiptCreated> {
    const raw = await this._request(`/receipts/${externalId}`);
    const parsed = ReceiptCreatedSchema.safeParse(raw);
    if (!parsed.success) throw new ConnectorError("validation", `ReceiptCreated schema invalid: ${parsed.error.message}`);
    return parsed.data;
  }

  public async fetchPaymasterPosting(externalId: string): Promise<PaymasterPosted> {
    const raw = await this._request(`/paymaster/${externalId}`);
    const parsed = PaymasterPostedSchema.safeParse(raw);
    if (!parsed.success) throw new ConnectorError("validation", `PaymasterPosted schema invalid: ${parsed.error.message}`);
    return parsed.data;
  }

  public async getHealth(): Promise<GastronoviConnectorHealth> {
    return {
      configValid: Boolean(this.config.apiBaseUrl && this.config.apiKey && this.config.tenantId),
      tenantAllowed: this.config.tenantAllowlist.includes(this.config.tenantId),
      circuitOpen: this._isCircuitOpen(),
      // Certificate pinning is not yet implemented; reports "not_implemented" when required.
      tlsFingerprintStatus: this.config.tlsFingerprintRequired ? "not_implemented" : "disabled",
      enabled: this.config.enabled
    };
  }

  private _isCircuitOpen(): boolean {
    if (this._circuitOpenAt === null) return false;
    if (Date.now() - this._circuitOpenAt > CIRCUIT_RESET_MS) {
      this._circuitFailures = 0;
      this._circuitOpenAt = null;
      return false;
    }
    return true;
  }

  private _consumeToken(): boolean {
    const now = Date.now();
    const elapsed = (now - this._lastRefill) / 1000;
    this._tokenBucket = Math.min(MAX_RPS, this._tokenBucket + elapsed * MAX_RPS);
    this._lastRefill = now;
    if (this._tokenBucket >= 1) { this._tokenBucket -= 1; return true; }
    return false;
  }

  private _recordFailure(): void {
    this._circuitFailures += 1;
    if (this._circuitFailures >= CIRCUIT_OPEN_AFTER) {
      this._circuitOpenAt = Date.now();
      this.logger.warn({ failures: this._circuitFailures }, "gastronovi circuit breaker opened");
    }
  }

  private async _request(path: string): Promise<unknown> {
    if (this._isCircuitOpen()) throw new ConnectorError("unknown", "Circuit breaker open — too many consecutive failures");
    if (!this.config.tenantAllowlist.includes(this.config.tenantId)) throw new ConnectorError("auth", `Tenant "${this.config.tenantId}" is not in the allowlist`);
    if (!this._consumeToken()) throw new ConnectorError("rate_limit", "Rate limit exceeded (max 2 RPS)");

    const url = `${this.config.apiBaseUrl}${path}`;
    // Auth header format and tenant header name are placeholders pending
    // official export, certified partner interface, or contractual API confirmation.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-Tenant-Id": this.config.tenantId,
      Accept: "application/json"
    };
    this.logger.debug({ url, tenant: this.config.tenantId }, "gastronovi outbound request");

    let lastError: ConnectorError | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 500;
        this.logger.warn({ attempt, delay }, "gastronovi retry scheduled");
        await sleep(delay);
      }
      try {
        const res = await this.transport(url, { method: "GET", headers });
        this.logger.debug({ status: res.status, body: redactForLog(res.body) }, "gastronovi response received");

        if (res.status === 401 || res.status === 403) {
          this._recordFailure();
          throw new ConnectorError("auth", `Authentication failed (HTTP ${res.status})`, res.status);
        }
        if (res.status === 429) {
          this._recordFailure();
          throw new ConnectorError("rate_limit", "API rate limited (429)", res.status);
        }
        if (res.status >= 500) {
          lastError = new ConnectorError("unknown", `Server error (HTTP ${res.status})`, res.status);
          this.logger.warn({ status: res.status, attempt }, "gastronovi server error, will retry");
          continue;
        }
        if (res.status >= 400) throw new ConnectorError("unknown", `Client error (HTTP ${res.status})`, res.status);

        this._circuitFailures = 0;
        return res.body;
      } catch (err) {
        if (err instanceof ConnectorError) throw err;
        lastError = new ConnectorError("network", `Network error: ${String(err)}`);
        this.logger.warn({ attempt, err: String(err) }, "gastronovi network error, will retry");
      }
    }

    this._recordFailure();
    const error = lastError ?? new ConnectorError("unknown", `Request to ${path} failed after ${MAX_RETRIES} attempts`);
    this.logger.error({ kind: error.kind }, "gastronovi request exhausted all retries");
    throw error;
  }
}

/**
 * Idempotency check using the same sha256(stableStringify) algorithm as the RawPayload store.
 * Returns true if the given payload, when hashed, matches the stored record's payloadHash.
 * The DB lookup and duplicate-record decision belong to IngestionService — this is the
 * final in-memory comparison step only.
 */
export function hasMatchingPayloadHash(
  rawPayload: RawPayloadLike | null,
  payload: unknown
): boolean {
  if (!rawPayload) return false;
  return rawPayload.payloadHash === calculatePayloadHash(payload);
}
