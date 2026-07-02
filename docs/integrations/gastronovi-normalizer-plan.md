# Gastronovi Normalizer — Implementation Plan

**Slice:** WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Phase 2A  
**Status:** Planning only — no implementation code in this document  
**Date:** 2026-06-20

---

## Source-of-Truth Boundary

This plan assumes payload field names and shapes derived from **synthetic test fixtures only**. No runtime normalization may target a live Gastronovi system until official partner/contract confirmation is received. See `docs/integrations/gastronovi-payload-contract-v1.md` for the full confirmation blockers list.

---

## Planned Module Paths

| Artifact | Path |
|---|---|
| Normalizer module | `apps/api/src/modules/gastronovi/gastronovi.normalizer.ts` |
| Normalizer tests | `apps/api/tests/gastronovi/gastronovi-normalizer.test.ts` |

These paths do not exist yet. They are reserved for Slice #2B (implementation).

---

## Normalizer Responsibilities

The normalizer sits between the Raw Payload Store and the Workflow Event Store. It receives a validated connector payload and produces a `WorkflowEventCandidate`.

### What the normalizer does

- Validates the connector payload against the Phase-1 schemas (`DailyCloseSchema`, `ReceiptCreatedSchema`, `PaymasterPostedSchema`)
- Maps external field values to internal `WorkflowEventCandidate` fields
- Derives `externalEntityType`, `eventCode`, and `riskLevel` from the payload's `eventType`
- Preserves `payloadHash` compatibility — the hash is computed from the raw payload by the `IngestionService` before normalization; the normalizer receives it as an input, not a computed value
- Classifies errors into structural, business, or governance categories (see failure-mode table below)
- Redacts sensitive fields before writing normalized data (defense-in-depth after connector-layer redaction)

### What the normalizer does not do

- No external HTTP calls — all network operations belong to the Source Connector
- No persistence — the Raw Payload Store write and the Workflow Event Store write are the caller's responsibility
- No business approval decisions — the Rules Engine evaluates events after they are stored
- No Rules Engine task creation — tasks are a downstream concern
- No Cockpit UI logic
- No polling or scheduling

---

## Proposed Normalized Event Shape

```typescript
// apps/api/src/modules/gastronovi/gastronovi.normalizer.ts (future)

type WorkflowEventCandidate = {
  source: "gastronovi";
  externalEntityType: "daily_close" | "receipt" | "paymaster_posting";
  externalId: string;           // from payload.externalId
  businessDate: string;         // YYYY-MM-DD, from payload.businessDate
  eventCode: string;            // e.g. "pos.daily_close.received"
  tenantId: string;             // from payload.tenantId
  payloadHash: string;          // sha256 received from IngestionService, not recomputed
  normalizedAt: string;         // ISO 8601 UTC timestamp (set by normalizer)
  riskLevel: "L1" | "L2";
  data: WorkflowEventData;      // event-specific normalized fields (see mapping table)
  syntheticFixture: boolean;    // true until official partner contract is confirmed
};
```

The `syntheticFixture` flag is set to `true` for all Phase-1 events. It is removed (or set to `false`) only after partner/contract confirmation of field names. It prevents synthetic-origin events from triggering production Rules Engine evaluations in a future guard clause.

---

## Phase-1 Event Mapping Table

| External `eventType` | `externalEntityType` | `eventCode` | `riskLevel` | `data` fields forwarded |
|---|---|---|---|---|
| `daily.close` | `daily_close` | `pos.daily_close.received` | `L1` | `totalRevenue`, `totalTransactions`, `currency`, `closedAt` |
| `receipt.created` | `receipt` | `pos.receipt.created` | `L1` | `amount`, `currency`, `itemCount` (derived), `createdAt` |
| `paymaster.posted` | `paymaster_posting` | `pos.paymaster.posted` | `L2` | `amount`, `currency`, `reference`, `postedAt` |

### `data` shape per event

**`daily_close`**
```typescript
{ totalRevenue: number; totalTransactions: number; currency: string; closedAt: string; }
```

**`receipt`**
```typescript
{ amount: number; currency: string; itemCount: number; createdAt: string; }
// items[] array is NOT forwarded — available in Raw Payload Store only
```

**`paymaster_posting`**
```typescript
{ amount: number; currency: string; reference: string; postedAt: string; }
// reference treated as opaque string — PII risk under evaluation (see contract v1)
```

---

## Failure Mode Table

| Failure condition | Classification | Normalizer reaction |
|---|---|---|
| `externalId` missing or empty string | Structural | Throw `NormalizerError("structural", "missing_external_id")` — block payload |
| `businessDate` missing or not YYYY-MM-DD | Structural | Throw `NormalizerError("structural", "missing_business_date")` — block payload |
| `amount` is NaN, Infinity, or negative | Business | Throw `NormalizerError("business", "invalid_amount")` — store event with error annotation, create review task |
| Unknown `eventType` (not in Phase-1 set) | Structural | Throw `NormalizerError("structural", "unknown_event_type")` — emit `pos.sync.unknown_type` diagnostic event |
| Sensitive field leakage in `data` output (`cardPan`, `customerEmail`, `apiKey`) | Governance | Throw `NormalizerError("governance", "sensitive_data_in_output")` — fail closed, no event written |
| Field present in payload but not in confirmed contract | Governance (warning) | Log warning with redacted field name; continue with `syntheticFixture: true` flag set |
| Schema validation failure (Zod) | Structural | Re-throw as `NormalizerError("structural", "schema_validation_failed")` with Zod issue summary |

**Error classification mapping to `docs/ARCHITECTURE.md` error policy:**

| NormalizerError class | ARCHITECTURE.md type | Prescribed reaction |
|---|---|---|
| `structural` | Structural | Block payload, request review |
| `business` | Business | Store event, create review task |
| `governance` | Governance | Fail closed |

---

## Implementation Gate Criteria

The following conditions must all be met before Slice #2B (normalizer implementation) may begin:

1. **Partner/contract confirmation** — Official Gastronovi export spec or certified partner documentation confirming:
   - Top-level field names for all three event types
   - `externalId` uniqueness guarantee
   - Datetime timezone behavior
   - Whether `receipt.created` payloads include PII fields (`customerEmail`, `cardPan`, `customerId`)
   - Whether `paymaster.posted` `reference` contains PII

2. **Coverage gate** — `@vitest/coverage-v8` installed as devDependency; connector module at ≥80% branch coverage (currently blocked by missing package)

3. **Operator L3 sign-off** — `GASTRONOVI_ENABLED=true` in a non-production environment approved by Operator before any normalizer handles real ingested data

4. **`NormalizerError` type design reviewed** — The failure-mode table above is reviewed and accepted before implementation begins; any schema changes to `WorkflowEventCandidate` require a separate design review

---

## Relationship to Other Modules

```
GastronoviConnector          (implemented: eef196c)
        │
        ▼ validated payload
IngestionService.ingestRawPayload()
        │ returns payloadHash + RawPayloadRecord
        ▼
GastronoviNormalizer         (planned: this document)
        │ returns WorkflowEventCandidate
        ▼
WorkflowEvent Store          (Slice #2C or later)
        │
        ▼
Rules Engine                 (future)
```

The normalizer receives a **validated payload object** (already parsed by connector schemas) and a **payloadHash** (already computed by `IngestionService`). It must not re-fetch or re-hash.
