# Gastronovi Payload Contract v1

**Slice:** WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Phase 2A  
**Status:** Planning — synthetic fixtures only  
**Date:** 2026-06-20

---

## Source-of-Truth Boundary

This document describes how Bevero **interprets** a Gastronovi payload after it has already been fetched and stored by the Source Connector. It does not assert that Gastronovi exposes these exact fields, field names, endpoint paths, or authentication mechanisms.

All field names, `externalId` formats, and data shapes in this document are derived from **synthetic unit-test fixtures only**. They are placeholders pending official confirmation from a Gastronovi export spec, certified partner documentation, or a signed API contract.

---

## General Contract Principles

1. The payload contract layer sits between the Raw Payload Store and the Normalizer — it defines what a valid, already-fetched payload must look like for normalization to proceed.
2. If an arriving payload fails contract validation, it is classified as a **structural error** and blocked from normalization. It is never silently discarded.
3. No contract field names, formats, or relationships may be asserted as Gastronovi-official until partner/contract confirmation is received.
4. Sensitive operational data (`apiKey`, `cardPan`, `customerEmail`, `authorization`) is never permitted to appear in normalized output — even if present in an incoming payload.

---

## Event Type Contracts

### 1. `daily.close`

| Property | Value |
|---|---|
| **Fixture file** | `apps/api/tests/gastronovi/fixtures/daily-close.payload.json` |
| **External schema** | `DailyCloseSchema` / `DailyClose` (from `gastronovi.types.ts`) |
| **Proposed internal entity type** | `GastronoviDailyClose` |
| **External id source** | `externalId` (fixture example: `"dc-2026-06-20-001"`) |
| **Business date source** | `businessDate` (YYYY-MM-DD, validated by regex in schema) |
| **Proposed event code** | `pos.daily_close.received` |
| **Proposed idempotency key shape** | `gastronovi:daily_close:{externalId}:{businessDate}` |
| **Proposed risk level** | L1 — read-only snapshot; no money movement or approval required |

**Fields carried into normalized output:**

| Field | Type | Notes |
|---|---|---|
| `totalRevenue` | number | Primary KPI value for Cockpit |
| `totalTransactions` | integer | Secondary KPI |
| `currency` | ISO 4217 (3 chars) | Expected `"EUR"` for Motorworld Inn |
| `closedAt` | ISO 8601 datetime | Timezone assumed UTC — **requires confirmation** |

**Sensitive fields / redaction expectations:**

| Field | Sensitivity | Handling |
|---|---|---|
| `tenantId` | Operational identifier | Never exposed in public API responses or logs |
| `externalId` | Internal traceability only | Not exposed in Cockpit UI |

No PII fields present in the synthetic fixture. If the real Gastronovi payload includes `customerEmail` or `cardPan` at this level, they must be redacted before the normalized event is written.

**Synthetic placeholders (require partner confirmation before production):**

- `externalId` format (`dc-YYYY-MM-DD-NNN`) — format is invented for test fixtures
- `tenantId` value (`motorworld-inn-boeblingen`) — test fixture value only
- All top-level field names — not confirmed against official Gastronovi export spec
- Whether `closedAt` is guaranteed UTC or can carry a timezone offset

---

### 2. `receipt.created`

| Property | Value |
|---|---|
| **Fixture file** | `apps/api/tests/gastronovi/fixtures/receipt-created.payload.json` |
| **External schema** | `ReceiptCreatedSchema` / `ReceiptCreated` (from `gastronovi.types.ts`) |
| **Proposed internal entity type** | `GastronoviReceipt` |
| **External id source** | `externalId` (fixture example: `"rcpt-2026-06-20-0042"`) |
| **Business date source** | `businessDate` (YYYY-MM-DD) |
| **Proposed event code** | `pos.receipt.created` |
| **Proposed idempotency key shape** | `gastronovi:receipt:{externalId}:{businessDate}` |
| **Proposed risk level** | L1 — individual transaction record; no approval workflow triggered |

**Fields carried into normalized output:**

| Field | Type | Notes |
|---|---|---|
| `amount` | number | Total receipt amount (gross assumed — **requires confirmation**) |
| `currency` | ISO 4217 | |
| `itemCount` | integer | Derived: `items.length` — raw `items` array not forwarded |
| `createdAt` | ISO 8601 datetime | |

**Item-level handling:** The `items` array is validated for structural integrity (required fields: `productId`, `name`, `quantity`, `unitPrice`) but the array itself is not carried into the normalized WorkflowEvent. Item detail is available in the Raw Payload Store for audit and reprocessing.

**Sensitive fields / redaction expectations:**

| Field | Sensitivity | Handling |
|---|---|---|
| `items[].name` | Operational (product names) | Logged as `itemCount` only; individual names not forwarded |
| `items[].unitPrice` | Operational | Not forwarded; aggregate `amount` used |

**High-risk fields that may appear in real payloads (not in synthetic fixture):**

| Field | Risk | Required action |
|---|---|---|
| `customerEmail` | PII | Redact before any output if present |
| `cardPan` | Payment card data | Redact before any output if present |
| `customerId` | Potential PII reference | Evaluate case-by-case on partner confirmation |

**Synthetic placeholders (require partner confirmation before production):**

- `externalId` format (`rcpt-YYYY-MM-DD-NNNN`) — invented for test fixtures
- `items[].productId` format (`prod-NNN`) — invented
- Whether `amount` is gross or net of tax
- Whether real receipts include guest/customer references
- Whether `items` array can be empty (current schema allows `z.array(...)` without `.min(1)`)

---

### 3. `paymaster.posted`

| Property | Value |
|---|---|
| **Fixture file** | `apps/api/tests/gastronovi/fixtures/paymaster-posted.payload.json` |
| **External schema** | `PaymasterPostedSchema` / `PaymasterPosted` (from `gastronovi.types.ts`) |
| **Proposed internal entity type** | `GastronoviPaymasterPosting` |
| **External id source** | `externalId` (fixture example: `"pm-2026-06-20-007"`) |
| **Business date source** | `businessDate` (YYYY-MM-DD) |
| **Proposed event code** | `pos.paymaster.posted` |
| **Proposed idempotency key shape** | `gastronovi:paymaster:{externalId}:{businessDate}` |
| **Proposed risk level** | L2 — large-amount posting; Operator review may be required by Rules Engine |

**Fields carried into normalized output:**

| Field | Type | Notes |
|---|---|---|
| `amount` | number | Key value for L2 threshold evaluation |
| `currency` | ISO 4217 | |
| `reference` | string | External booking/conference reference — treat as opaque identifier |
| `postedAt` | ISO 8601 datetime | |

**Sensitive fields / redaction expectations:**

| Field | Sensitivity | Handling |
|---|---|---|
| `reference` | Potentially links to a reservation or guest — **evaluate on partner confirmation** | Forward as opaque string; do not parse or log as PII |
| `amount` | Large financial value | Include in normalized event; never in public-facing logs |
| `externalId` | Internal traceability | Not exposed in Cockpit UI |

**Synthetic placeholders (require partner confirmation before production):**

- `externalId` format (`pm-YYYY-MM-DD-NNN`) — invented for test fixtures
- `reference` format (`CONF-YYYY-NNN`) — invented; real format unknown
- Whether `reference` can contain guest names, room numbers, or reservation identifiers (PII risk)
- Whether `amount` represents the full posting or a partial amount
- What triggers a `paymaster.posted` event in Gastronovi — confirmation/contract required

---

## Idempotency Key Derivation

Per `docs/ARCHITECTURE.md`, the stable idempotency key is:

```
source + externalEntityType + externalId + businessDate + eventType
```

Mapped to this contract:

| Component | Value |
|---|---|
| `source` | `"gastronovi"` |
| `externalEntityType` | See per-event table above |
| `externalId` | From `payload.externalId` |
| `businessDate` | From `payload.businessDate` |
| `eventType` | From `payload.eventType` |

The `IngestionService` performs deduplication via `calculatePayloadHash` (sha256 + stable-stringify). The idempotency key above is for WorkflowEvent deduplication — a separate concern from raw payload hash deduplication.

---

## Cross-Cutting Redaction Rules

These apply to all three event types regardless of field presence:

| Field pattern | Action |
|---|---|
| `apiKey`, `api_key`, `GASTRONOVI_API_KEY` | Redact — never in normalized output |
| `cardPan` | Redact — never in normalized output |
| `customerEmail` | Redact — never in normalized output |
| `authorization`, `Authorization` | Redact |
| `x-api-key`, `X-Api-Key`, `X-API-Key` | Redact |

Redaction is enforced by `redactForLog()` in `gastronovi-connector.ts` at the fetch layer. The Normalizer must apply an equivalent check before writing the normalized event.

---

## Confirmation Blockers

No production ingestion may proceed until the following are confirmed with an official Gastronovi export spec, certified partner documentation, or signed API contract:

1. All top-level field names for each event type
2. `externalId` format and uniqueness guarantee
3. Whether `closedAt` / `createdAt` / `postedAt` are UTC or can carry offsets
4. Whether `receipt.created` payloads can include `customerEmail`, `cardPan`, or `customerId`
5. Whether `paymaster.posted` `reference` field can contain PII
6. Whether `amount` on receipts is gross or net of tax
7. Whether the `items` array on receipts can be empty
