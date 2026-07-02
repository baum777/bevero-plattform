---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Phase 2A
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
slice_type: docs-only / planning
---

# MSPR — Gastronovi Payload Contract & Normalizer Plan

## Scope

| Category | Path |
|---|---|
| Created | `docs/integrations/gastronovi-payload-contract-v1.md` |
| Created | `docs/integrations/gastronovi-normalizer-plan.md` |
| Created | `docs/agent-team/mspr_logbook/2026-06-20-gastronovi-payload-contract.md` |
| Created | `docs/agent-team/intent_logbook/2026-06-20-gastronovi-payload-contract.md` |

## Files Read (Reference Study)

| File | Purpose |
|---|---|
| `docs/ARCHITECTURE.md` | Layer definitions, idempotency key structure, error policy |
| `docs/integrations/gastronovi.md` | Source-of-Truth Boundary; Phase-1 framing |
| `apps/api/src/modules/gastronovi/gastronovi.types.ts` | Zod schemas and TypeScript types for all three event families |
| `apps/api/src/modules/gastronovi/gastronovi-connector.ts` | `redactForLog`, `REDACT_KEYS`, connector structure |
| `apps/api/tests/gastronovi/fixtures/daily-close.payload.json` | Synthetic fixture: field names, formats, example values |
| `apps/api/tests/gastronovi/fixtures/receipt-created.payload.json` | Synthetic fixture: items array structure |
| `apps/api/tests/gastronovi/fixtures/paymaster-posted.payload.json` | Synthetic fixture: reference field |
| `apps/api/src/modules/ingestion/ingestion.service.ts` | `IngestionService.ingestRawPayload` — hash-based deduplication, `RawPayloadRecord` return shape |
| `apps/api/src/modules/raw-payloads/payload-hash.ts` | (via prior session context) sha256 + stable-stringify |

## Files Not Changed

All implementation files, routes, Prisma schema, server.ts, package.json, and `.env.example` are out of scope and untouched.

## Verification

| Check | Command | Result |
|---|---|---|
| 1 | `git status --short` | ✅ 4 new untracked files only |
| 2 | `git diff --check` | ✅ no whitespace errors |
| 3 | Unverified claim grep | `grep -R "HOTAPI\|Bearer\|X-Tenant\|/daily-close\|/receipts\|/paymaster" docs/integrations/gastronovi-payload-contract-v1.md docs/integrations/gastronovi-normalizer-plan.md` | ✅ no matches |
| 4 | Contract file exists | `test -f docs/integrations/gastronovi-payload-contract-v1.md` | ✅ |
| 5 | Normalizer plan exists | `test -f docs/integrations/gastronovi-normalizer-plan.md` | ✅ |
| 6 | MSPR logbook exists | `test -f docs/agent-team/mspr_logbook/2026-06-20-gastronovi-payload-contract.md` | ✅ |
| 7 | Intent logbook exists | `test -f docs/agent-team/intent_logbook/2026-06-20-gastronovi-payload-contract.md` | ✅ |
| 8 | Scope check | `git status --porcelain` | ✅ only 4 allowed files |

## Contract Coverage

| Event family | Contract defined | idempotency key | risk level | PII risk documented |
|---|---|---|---|---|
| `daily.close` | ✅ | `gastronovi:daily_close:{externalId}:{businessDate}` | L1 | ✅ (none in fixture; contingent fields noted) |
| `receipt.created` | ✅ | `gastronovi:receipt:{externalId}:{businessDate}` | L1 | ✅ (`customerEmail`, `cardPan` risk noted) |
| `paymaster.posted` | ✅ | `gastronovi:paymaster:{externalId}:{businessDate}` | L2 | ✅ (`reference` PII risk noted) |

## Known Risks

| # | Risk | Status |
|---|---|---|
| R-1 | All field names are synthetic placeholders — not confirmed by Gastronovi partner/contract | Documented as Confirmation Blocker in contract v1 |
| R-2 | `receipt.created` may contain `customerEmail` / `cardPan` in real payloads — not present in synthetic fixture | Documented in contract v1; redaction rules applied proactively |
| R-3 | `paymaster.posted` `reference` field may contain PII (reservation, guest link) | Documented; forwarded as opaque string pending confirmation |
| R-4 | `@vitest/coverage-v8` not installed — coverage gate cannot be met | Deferred to Slice #2B pre-condition |
| R-5 | TLS fingerprint `not_implemented` | Health reports honestly; unchanged from Slice #1 |
| R-6 | `syntheticFixture: true` guard in proposed `WorkflowEventCandidate` requires implementation consensus | Flagged as design-review item before Slice #2B begins |

## Deferred Work

- Slice #2B: Normalizer implementation (`gastronovi.normalizer.ts` + tests)
- Slice #2C: WorkflowEvent Store write
- Slice #2D: Rules Engine evaluation rules for Phase-1 events
- Partner/contract confirmation → unblocks field name solidification
- `@vitest/coverage-v8` installation → unblocks coverage gate
