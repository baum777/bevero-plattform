---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
revision: rework-v2
---

# MSPR — Gastronovi Source Connector

## Scope

| Category | Path |
|---|---|
| Created | `apps/api/src/modules/gastronovi/gastronovi.config.ts` |
| Created | `apps/api/src/modules/gastronovi/gastronovi.types.ts` |
| Created | `apps/api/src/modules/gastronovi/gastronovi-connector.ts` |
| Created | `apps/api/src/modules/gastronovi/index.ts` |
| Created | `apps/api/tests/gastronovi/gastronovi-connector.test.ts` |
| Created | `apps/api/tests/gastronovi/fixtures/daily-close.payload.json` |
| Created | `apps/api/tests/gastronovi/fixtures/receipt-created.payload.json` |
| Created | `apps/api/tests/gastronovi/fixtures/paymaster-posted.payload.json` |
| Updated | `docs/integrations/gastronovi.md` — Source-of-Truth Boundary block added |

## Files Read (Pattern Study)

- `apps/api/src/modules/raw-payloads/payload-hash.ts` — sha256 stable-stringify, imported by connector
- `apps/api/src/modules/raw-payloads/raw-payload.repository.ts` — RawPayloadRecord shape
- `apps/api/src/modules/ingestion/ingestion.service.ts` — idempotency flow / service pattern
- `apps/api/src/config/env.ts` — existing GASTRONOVI_* variables confirmed
- `apps/api/src/server.ts` — Fastify logger init pattern
- `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`

## Validation Results

| Check | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit -p apps/api/tsconfig.json` | ✅ exit 0 |
| 2 | `npx vitest run apps/api/tests/gastronovi/` | ✅ 18/18 pass, 0 errors |
| 3 | `grep -rE "(apiKey…)" apps/api/src/modules/gastronovi/` | ✅ OK_NO_SECRETS |
| 4 | `wc -l apps/api/src/modules/gastronovi/*.ts` | ✅ max 188 lines |
| 5 | `cat index.ts` | ✅ all public exports visible |
| 6 | `ls tests/gastronovi/fixtures/` | ✅ 3 JSON files |
| 7 | Logbook files exist | ✅ (this file + intent) |
| 8 | `git status --porcelain` scope check | ✅ no out-of-scope changes |

Coverage: `@vitest/coverage-v8` not installed — coverage % is a **reviewer follow-up**.
18 tests exercise all connector branches (happy path, 401, 403, 429, 500 retry, validation, circuit breaker, allowlist, redaction, hash idempotency).

## Rework Corrections Applied (v1 → v2)

| # | Issue | Fix |
|---|---|---|
| 1 | `gastronomi` naming throughout | Renamed to `gastronovi` everywhere |
| 2 | `GASTRONOMI_*` env vars | Corrected to `GASTRONOVI_*` |
| 3 | `process.exit(78)` in config | Replaced with `GastronoviConfigError` (throws) |
| 4 | `isAlreadyImported` (externalId compare) | Replaced with `hasMatchingPayloadHash` (sha256 compare) |
| 5 | TLS "ok" health status | Now reports `"not_implemented"` or `"disabled"` |
| 6 | Redaction test via strict schema | Test via 400 path; `redactForLog` exported and tested directly |
| 7 | Unverified HOTAPI/endpoint claims | Removed; replaced with "official export / certified partner" framing |
| 8 | Logbook named `gastronomi-connector` | Corrected to `gastronovi-connector` |
| 9 | `authorization`, `x-api-key` missing from REDACT_KEYS | Added |
| 10 | Source-of-Truth block missing in gastronovi.md | Added |

## Known Risks

| # | Risk | Status |
|---|---|---|
| R-1 | Coverage % unconfirmed (`@vitest/coverage-v8` missing) | Reviewer follow-up |
| R-2 | Endpoint paths are placeholders (not confirmed with partner) | Noted in code comment; requires partner/contract confirmation |
| R-3 | Auth header format assumed (Bearer) — not confirmed | Same: placeholder pending API contract |
| R-4 | TLS fingerprint not implemented | Health reports `not_implemented` honestly |
