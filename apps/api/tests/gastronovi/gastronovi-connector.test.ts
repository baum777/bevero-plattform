import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GastronoviConnector,
  hasMatchingPayloadHash,
  redactForLog,
  ConnectorError,
  parseGastronoviConfig,
  GastronoviConfigError
} from "../../src/modules/gastronovi/index.js";
import type { TransportFn, GastronoviConnectorConfig, RawPayloadLike } from "../../src/modules/gastronovi/index.js";
import { calculatePayloadHash } from "../../src/modules/raw-payloads/payload-hash.js";

import dailyCloseFixture from "./fixtures/daily-close.payload.json" with { type: "json" };
import receiptFixture from "./fixtures/receipt-created.payload.json" with { type: "json" };
import paymasterFixture from "./fixtures/paymaster-posted.payload.json" with { type: "json" };

const baseConfig: GastronoviConnectorConfig = {
  apiBaseUrl: "https://api.gastronovi.test",
  apiKey: "test-key-value",
  tenantId: "motorworld-inn-boeblingen",
  enabled: true,
  pollIntervalSeconds: 900,
  tlsFingerprintRequired: false,
  tenantAllowlist: ["motorworld-inn-boeblingen"]
};

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

function makeTransport(response: { status: number; body: unknown }): TransportFn {
  return vi.fn().mockResolvedValue(response);
}

function makeConnector(
  transportFn: TransportFn,
  config: GastronoviConnectorConfig = baseConfig
): GastronoviConnector {
  return new GastronoviConnector(config, noopLogger, transportFn);
}

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe("GastronoviConnector — happy paths", () => {
  it("fetchDailyClose returns validated DailyClose", async () => {
    const connector = makeConnector(makeTransport({ status: 200, body: dailyCloseFixture }));
    const result = await connector.fetchDailyClose("dc-2026-06-20-001");
    expect(result.eventType).toBe("daily.close");
    expect(result.totalRevenue).toBe(15234.5);
  });

  it("fetchReceipt returns validated ReceiptCreated", async () => {
    const connector = makeConnector(makeTransport({ status: 200, body: receiptFixture }));
    const result = await connector.fetchReceipt("rcpt-2026-06-20-0042");
    expect(result.eventType).toBe("receipt.created");
    expect(result.items).toHaveLength(2);
  });

  it("fetchPaymasterPosting returns validated PaymasterPosted", async () => {
    const connector = makeConnector(makeTransport({ status: 200, body: paymasterFixture }));
    const result = await connector.fetchPaymasterPosting("pm-2026-06-20-007");
    expect(result.eventType).toBe("paymaster.posted");
    expect(result.amount).toBe(742);
  });

  it("getHealth returns correct state for valid config", async () => {
    const connector = makeConnector(vi.fn());
    const health = await connector.getHealth();
    expect(health.configValid).toBe(true);
    expect(health.tenantAllowed).toBe(true);
    expect(health.circuitOpen).toBe(false);
    expect(health.enabled).toBe(true);
    expect(health.tlsFingerprintStatus).toBe("disabled");
  });

  it("getHealth reports tlsFingerprintStatus not_implemented when required", async () => {
    const config = { ...baseConfig, tlsFingerprintRequired: true };
    const connector = makeConnector(vi.fn(), config);
    const health = await connector.getHealth();
    expect(health.tlsFingerprintStatus).toBe("not_implemented");
  });
});

describe("GastronoviConnector — HTTP error handling", () => {
  it("throws ConnectorError(auth) on 401", async () => {
    const connector = makeConnector(makeTransport({ status: 401, body: null }));
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({ kind: "auth", statusCode: 401 });
  });

  it("throws ConnectorError(auth) on 403", async () => {
    const connector = makeConnector(makeTransport({ status: 403, body: null }));
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({ kind: "auth", statusCode: 403 });
  });

  it("throws ConnectorError(rate_limit) on 429", async () => {
    const connector = makeConnector(makeTransport({ status: 429, body: null }));
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({ kind: "rate_limit", statusCode: 429 });
  });

  it("throws ConnectorError(validation) on schema mismatch", async () => {
    const connector = makeConnector(makeTransport({ status: 200, body: { eventType: "wrong" } }));
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({ kind: "validation" });
  });
});

describe("GastronoviConnector — retry + backoff", () => {
  it("retries 3× on 500 then throws ConnectorError(unknown)", async () => {
    vi.useFakeTimers();
    const transport = vi.fn().mockResolvedValue({ status: 500, body: null });
    const connector = makeConnector(transport);

    const promise = connector.fetchDailyClose("x");
    const assertion = expect(promise).rejects.toMatchObject({ kind: "unknown" });
    await vi.runAllTimersAsync();
    await assertion;

    expect(transport).toHaveBeenCalledTimes(3);
  });
});

describe("GastronoviConnector — circuit breaker", () => {
  it("opens after 3 failed requests and rejects immediately without transport call", async () => {
    vi.useFakeTimers();
    const transport = vi.fn().mockResolvedValue({ status: 500, body: null });
    const connector = makeConnector(transport);

    for (let i = 0; i < 3; i++) {
      const p = connector.fetchDailyClose("x");
      const assertion = expect(p).rejects.toBeInstanceOf(ConnectorError);
      await vi.runAllTimersAsync();
      await assertion;
    }

    expect(transport).toHaveBeenCalledTimes(9);
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({
      message: expect.stringContaining("Circuit breaker open")
    });
    expect(transport).toHaveBeenCalledTimes(9);
  });
});

describe("GastronoviConnector — tenant allowlist", () => {
  it("throws ConnectorError(auth) when tenantId not in allowlist", async () => {
    const config = { ...baseConfig, tenantId: "unknown-tenant" };
    const connector = makeConnector(vi.fn(), config);
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({
      kind: "auth",
      message: expect.stringContaining("not in the allowlist")
    });
  });
});

describe("redactForLog — secret redaction", () => {
  it("redacts apiKey, cardPan, customerEmail, authorization, x-api-key", () => {
    const input = {
      apiKey: "sk-secret",
      cardPan: "4111111111111111",
      customerEmail: "user@example.com",
      authorization: "Bearer tok",
      "x-api-key": "hdr-secret",
      message: "safe value",
      nested: { apiKey: "nested-secret", count: 5 }
    };
    const result = redactForLog(input) as Record<string, unknown>;
    expect(result["apiKey"]).toBe("[REDACTED]");
    expect(result["cardPan"]).toBe("[REDACTED]");
    expect(result["customerEmail"]).toBe("[REDACTED]");
    expect(result["authorization"]).toBe("[REDACTED]");
    expect(result["x-api-key"]).toBe("[REDACTED]");
    expect(result["message"]).toBe("safe value");
    const nested = result["nested"] as Record<string, unknown>;
    expect(nested["apiKey"]).toBe("[REDACTED]");
    expect(nested["count"]).toBe(5);
  });

  it("redacts sensitive keys present in response body debug log (via 400 path)", async () => {
    // 4xx responses are logged (redacted) before ConnectorError is thrown;
    // no schema validation occurs on error responses.
    const transport = makeTransport({
      status: 400,
      body: { apiKey: "should-not-appear", cardPan: "9999", message: "bad request" }
    });
    const connector = makeConnector(transport);
    await expect(connector.fetchDailyClose("x")).rejects.toBeInstanceOf(ConnectorError);

    const logged = JSON.stringify((noopLogger.debug as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).not.toContain("should-not-appear");
    expect(logged).not.toContain("9999");
    expect(logged).toContain("[REDACTED]");
  });
});

describe("hasMatchingPayloadHash — idempotency", () => {
  it("returns false when stored record is null", () => {
    expect(hasMatchingPayloadHash(null, dailyCloseFixture)).toBe(false);
  });

  it("returns true when stored hash matches sha256(stableStringify(payload))", () => {
    const stored: RawPayloadLike = { payloadHash: calculatePayloadHash(dailyCloseFixture) };
    expect(hasMatchingPayloadHash(stored, dailyCloseFixture)).toBe(true);
  });

  it("returns false when payload differs from stored hash", () => {
    const stored: RawPayloadLike = { payloadHash: calculatePayloadHash(dailyCloseFixture) };
    expect(hasMatchingPayloadHash(stored, receiptFixture)).toBe(false);
  });

  it("is stable across two calls with the same payload", () => {
    const hash1 = calculatePayloadHash(paymasterFixture);
    const hash2 = calculatePayloadHash(paymasterFixture);
    expect(hash1).toBe(hash2);
    const stored: RawPayloadLike = { payloadHash: hash1 };
    expect(hasMatchingPayloadHash(stored, paymasterFixture)).toBe(true);
  });
});

describe("redactForLog — array branch", () => {
  it("redacts sensitive keys inside array elements", () => {
    const input = [
      { apiKey: "sk-secret", message: "safe" },
      { cardPan: "4111", count: 3 }
    ];
    const result = redactForLog(input) as Array<Record<string, unknown>>;
    expect(result[0]["apiKey"]).toBe("[REDACTED]");
    expect(result[0]["message"]).toBe("safe");
    expect(result[1]["cardPan"]).toBe("[REDACTED]");
    expect(result[1]["count"]).toBe(3);
  });

  it("passes through non-object, non-array primitives unchanged", () => {
    expect(redactForLog("plain string")).toBe("plain string");
    expect(redactForLog(42)).toBe(42);
    expect(redactForLog(null)).toBeNull();
  });
});

describe("parseGastronoviConfig — config parsing", () => {
  const minimalEnv = {
    GASTRONOVI_API_BASE_URL: "https://api.gastronovi.test",
    GASTRONOVI_API_KEY: "test-key-value",
    GASTRONOVI_TENANT_ID: "motorworld-inn-boeblingen"
  };

  it("returns frozen config with defaults when only required vars are set", () => {
    const config = parseGastronoviConfig(minimalEnv);
    expect(config.apiBaseUrl).toBe("https://api.gastronovi.test");
    expect(config.apiKey).toBe("test-key-value");
    expect(config.tenantId).toBe("motorworld-inn-boeblingen");
    expect(config.enabled).toBe(false);
    expect(config.pollIntervalSeconds).toBe(900);
    expect(config.tlsFingerprintRequired).toBe(false);
    expect(config.tenantAllowlist).toEqual(["motorworld-inn-boeblingen"]);
  });

  it("parses GASTRONOVI_ENABLED=true correctly", () => {
    const config = parseGastronoviConfig({ ...minimalEnv, GASTRONOVI_ENABLED: "true" });
    expect(config.enabled).toBe(true);
  });

  it("parses custom GASTRONOVI_POLL_INTERVAL_SECONDS", () => {
    const config = parseGastronoviConfig({ ...minimalEnv, GASTRONOVI_POLL_INTERVAL_SECONDS: "300" });
    expect(config.pollIntervalSeconds).toBe(300);
  });

  it("parses GASTRONOVI_TENANT_ALLOWLIST as comma-separated string", () => {
    const config = parseGastronoviConfig({
      ...minimalEnv,
      GASTRONOVI_TENANT_ALLOWLIST: "motorworld-inn-boeblingen, tenant-b, tenant-c"
    });
    expect(config.tenantAllowlist).toEqual(["motorworld-inn-boeblingen", "tenant-b", "tenant-c"]);
  });

  it("defaults tenantAllowlist to [tenantId] when GASTRONOVI_TENANT_ALLOWLIST is not set", () => {
    const config = parseGastronoviConfig(minimalEnv);
    expect(config.tenantAllowlist).toEqual([config.tenantId]);
  });

  it("throws GastronoviConfigError when GASTRONOVI_API_BASE_URL is missing", () => {
    const env = { GASTRONOVI_API_KEY: "key", GASTRONOVI_TENANT_ID: "t1" };
    expect(() => parseGastronoviConfig(env)).toThrow(GastronoviConfigError);
  });

  it("throws GastronoviConfigError when GASTRONOVI_API_KEY is missing", () => {
    const env = { GASTRONOVI_API_BASE_URL: "https://api.gastronovi.test", GASTRONOVI_TENANT_ID: "t1" };
    expect(() => parseGastronoviConfig(env)).toThrow(GastronoviConfigError);
  });

  it("throws GastronoviConfigError when GASTRONOVI_API_BASE_URL is not a valid URL", () => {
    expect(() =>
      parseGastronoviConfig({ ...minimalEnv, GASTRONOVI_API_BASE_URL: "not-a-url" })
    ).toThrow(GastronoviConfigError);
  });

  it("throws GastronoviConfigError when GASTRONOVI_TENANT_ALLOWLIST is set but resolves to empty", () => {
    expect(() =>
      parseGastronoviConfig({ ...minimalEnv, GASTRONOVI_TENANT_ALLOWLIST: " , , " })
    ).toThrow(GastronoviConfigError);
  });

  it("GastronoviConfigError carries details and correct name", () => {
    try {
      parseGastronoviConfig({});
    } catch (err) {
      expect(err).toBeInstanceOf(GastronoviConfigError);
      const e = err as GastronoviConfigError;
      expect(e.name).toBe("GastronoviConfigError");
      expect(e.message).toContain("[gastronovi] Invalid configuration:");
      expect(typeof e.details).toBe("string");
    }
  });
});

describe("GastronoviConnector — network error path", () => {
  it("classifies transport throw as ConnectorError(network) after retry exhaustion", async () => {
    vi.useFakeTimers();
    const transport = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const connector = makeConnector(transport);

    const promise = connector.fetchDailyClose("x");
    const assertion = expect(promise).rejects.toMatchObject({ kind: "network" });
    await vi.runAllTimersAsync();
    await assertion;

    expect(transport).toHaveBeenCalledTimes(3);
  });
});

describe("GastronoviConnector — token bucket rate limit", () => {
  it("throws ConnectorError(rate_limit) from _consumeToken when bucket is exhausted", async () => {
    vi.useFakeTimers();
    // MAX_RPS = 2; two successful fetches drain the bucket; third fails before transport call
    const transport = makeTransport({ status: 200, body: dailyCloseFixture });
    const connector = makeConnector(transport);

    await connector.fetchDailyClose("x1");
    await connector.fetchDailyClose("x2");

    await expect(connector.fetchDailyClose("x3")).rejects.toMatchObject({
      kind: "rate_limit",
      message: expect.stringContaining("Rate limit exceeded (max 2 RPS)")
    });
    // Transport not called a third time — rate limit is checked before the request
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe("GastronoviConnector — circuit breaker auto-reset", () => {
  it("resets circuit breaker after CIRCUIT_RESET_MS and allows a new request", async () => {
    vi.useFakeTimers();
    const transport = vi.fn()
      .mockResolvedValue({ status: 500, body: null });
    const connector = makeConnector(transport);

    // Open the circuit: 3 failed requests (each exhausts MAX_RETRIES=3 internally)
    for (let i = 0; i < 3; i++) {
      const p = connector.fetchDailyClose("x");
      const a = expect(p).rejects.toBeInstanceOf(ConnectorError);
      await vi.runAllTimersAsync();
      await a;
    }
    expect(transport).toHaveBeenCalledTimes(9);

    // Circuit is now open — request fails immediately without transport call
    await expect(connector.fetchDailyClose("x")).rejects.toMatchObject({
      message: expect.stringContaining("Circuit breaker open")
    });
    expect(transport).toHaveBeenCalledTimes(9);

    // Advance past CIRCUIT_RESET_MS (60 000 ms)
    transport.mockResolvedValue({ status: 200, body: dailyCloseFixture });
    await vi.advanceTimersByTimeAsync(60_001);

    // Circuit should have reset — next request proceeds and succeeds
    const result = await connector.fetchDailyClose("dc-reset");
    expect(result.eventType).toBe("daily.close");
    expect(transport).toHaveBeenCalledTimes(10);
  });
});
