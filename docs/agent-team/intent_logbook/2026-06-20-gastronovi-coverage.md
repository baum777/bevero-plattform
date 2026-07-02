---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Slice 1C
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
slice_type: test / coverage evidence
---

# Intent — Gastronovi Connector Coverage Evidence Gate

## Why Coverage Is Safe Before Partner Confirmation

Coverage testing exercises code paths using **synthetic fixtures and injected transports only**. No Gastronovi system is contacted. No `GASTRONOVI_ENABLED=true` is set. No real authentication credentials are used.

The new tests:
- Call `parseGastronoviConfig()` with hand-crafted ENV maps (no real `.env` values)
- Inject a `vi.fn()` mock as the `TransportFn` — the `defaultTransport` real HTTP function is never called
- Use the existing fixture JSON files (`daily-close.payload.json`, etc.) as response bodies

Coverage testing is a **code-correctness activity**, not an integration activity. It verifies that error-handling branches, config-parsing paths, and state transitions work as specified — regardless of whether the real Gastronovi system exists or what it returns.

## Why Runtime Normalizer Remains Blocked

The normalizer implementation is blocked for two independent reasons that both remain unresolved:

1. **Partner/contract field confirmation is absent.** The payload field names, `externalId` format, PII field presence, and datetime timezone behavior are all synthetic assumptions. Writing a normalizer against unconfirmed field contracts produces a mapping that will silently diverge from the real system on first contact.

2. **The WorkflowEvent Store write path is not yet designed.** The normalizer's output — a `WorkflowEventCandidate` — has no defined persistence layer or schema yet. Implementing the transformation without the storage target makes the normalizer untestable end-to-end.

Raising connector coverage to ≥80%/≥75% is the one remaining gated item that can be completed safely while both blockers persist.

## Why This Improves Review Confidence Without Expanding Integration Authority

Review confidence comes from evidence that edge-case branches — not just happy paths — are exercised and produce the expected outcomes. The 15 new tests specifically target:

- Config error classification (`GastronoviConfigError` vs silent failure)
- The `_consumeToken()` rate limiter when the bucket is genuinely exhausted (not a 429 from upstream)
- The circuit breaker's auto-reset behavior after `CIRCUIT_RESET_MS` — a state transition no happy-path test can reach
- Network-level transport failures (transport throws, not returns a status code) — the `ConnectorError("network", ...)` path
- `redactForLog` on array payloads — ensures recursive redaction works on list-structured bodies

None of these tests expand what the connector is authorized to do. They verify that the constraints already designed into the connector — rate limiting, circuit breaking, secret redaction, config validation — actually work as specified at the boundary cases.

Integration authority is determined by `GASTRONOVI_ENABLED` (currently `false` by default) and Operator L3 sign-off — neither of which is touched by this slice.

## What Future Slice #2B May Rely On

When the normalizer is implemented (Slice #2B), it will be able to rely on:

1. **Verified config parsing**: `parseGastronoviConfig()` is now test-confirmed to throw `GastronoviConfigError` (not exit the process) on bad input. The normalizer can assume a valid, frozen `GastronoviConfig` object is provided by the time it is called.

2. **Verified idempotency helper**: `hasMatchingPayloadHash()` is confirmed to correctly compare sha256 hashes. The normalizer layer does not need to re-implement hash comparison.

3. **Verified redaction behavior**: `redactForLog()` is confirmed to handle objects, nested objects, and arrays. Any logging the normalizer does can use the same function.

4. **Verified error classification**: The connector's `ConnectorError` kinds (`network`, `auth`, `rate_limit`, `validation`, `unknown`) are confirmed to be raised in the right circumstances. The normalizer can distinguish connector-level errors from schema-level validation errors in its own error-handling logic.

5. **Honest health reporting**: `getHealth().tlsFingerprintStatus` correctly reports `"not_implemented"` or `"disabled"`. No misleading "ok" value is ever returned. The normalizer and any consuming layer can trust the health status without additional verification.

6. **Circuit breaker state is correctly scoped to the connector instance**: The auto-reset test confirms that the circuit breaker recovers after `CIRCUIT_RESET_MS` without requiring a process restart. Future integration tests for the normalizer can use a fresh connector instance per test without circuit state leaking between tests.

## What a Future Reader Should Understand

1. The 15 new tests are additive — no existing test was weakened, removed, or restructured to reach coverage.
2. Coverage targets (≥80% lines, ≥75% branches) are met at both the connector-file level and the gastronovi-module aggregate level.
3. The uncovered `defaultTransport` function (lines 42–44 of `gastronovi-connector.ts`) is intentionally excluded from test coverage. It is the real HTTP transport used only in production; exercising it in tests would require either a live network or a local mock HTTP server. Both are deferred to integration testing post-partner-confirmation.
4. This slice does not change any runtime behavior. If coverage tooling is removed, the connector behaves identically to the `eef196c` commit.
