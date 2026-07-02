---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Slice 1C
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
slice_type: test / coverage evidence
---

# MSPR — Gastronovi Connector Coverage Evidence Gate

## Scope

| Category | Path |
|---|---|
| Modified | `apps/api/package.json` — added `@vitest/coverage-v8` devDependency |
| Modified (lockfile) | `package-lock.json` — updated by npm install |
| Modified | `apps/api/tests/gastronovi/gastronovi-connector.test.ts` — 15 new tests appended |
| Created | `docs/agent-team/mspr_logbook/2026-06-20-gastronovi-coverage.md` |
| Created | `docs/agent-team/intent_logbook/2026-06-20-gastronovi-coverage.md` |

## Files Read (Reference)

| File | Purpose |
|---|---|
| `apps/api/package.json` | Confirmed devDependencies before adding coverage-v8 |
| `package.json` | Confirmed npm workspaces configuration (`apps/*`) |
| `apps/api/vitest.config.ts` | Confirmed no coverage config yet; provider must be passed via CLI |
| `apps/api/src/modules/gastronovi/gastronovi-connector.ts` | Identified uncovered branches (defaultTransport, token bucket, network error, circuit reset) |
| `apps/api/src/modules/gastronovi/gastronovi.config.ts` | Identified 0%-covered `parseGastronoviConfig` as main coverage gap |
| `apps/api/tests/gastronovi/gastronovi-connector.test.ts` | Existing 18-test baseline before additions |

## Dependency Change

| Package | Version | Location | Reason |
|---|---|---|---|
| `@vitest/coverage-v8` | `^4.1.8` | `apps/api/package.json` devDependencies | Required to run `--coverage --coverage.provider=v8` |

Version pinned to `^4.1.8` to match the installed `vitest` version.

## Commands Run

| Step | Command | Result |
|---|---|---|
| 1 | `npm install --workspace=apps/api` | ✅ installed, 0 vulnerabilities |
| 2 | `npx vitest run apps/api/tests/gastronovi/ --coverage --coverage.provider=v8 --coverage.reporter=text` (baseline) | 18/18 pass; connector 88.57%/86.53%; config 18.51%/0% |
| 3 | Added 15 tests to test file | — |
| 4 | `npx vitest run apps/api/tests/gastronovi/` | ✅ 33/33 pass |
| 5 | `npx vitest run apps/api/tests/gastronovi/ --coverage --coverage.provider=v8 --coverage.reporter=text` (final) | ✅ see coverage summary below |
| 6 | `npm --workspace=apps/api run typecheck` | ✅ exit 0 |

## Coverage Summary

### Baseline (18 tests)

| File | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `gastronovi-connector.ts` | 88.57% | 86.53% | 87.5% | 89.65% |
| `gastronovi.config.ts` | 18.51% | 0% | 18.18% | 20% |
| **gastronovi module total** | **75.53%** | **63.38%** | **60.71%** | **75.63%** |

### Final (33 tests)

| File | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `gastronovi-connector.ts` | 94.28% | 94.23% | 87.5% | 96.55% |
| `gastronovi.config.ts` | 96.29% | 94.73% | 90.9% | 96% |
| **gastronovi module total** | **94.96%** | **94.36%** | **89.28%** | **96.63%** |

### Target vs Actual

| Metric | Target | Actual (connector.ts) | Actual (module total) | Status |
|---|---|---|---|---|
| Lines | ≥80% | 96.55% | 96.63% | ✅ |
| Branches | ≥75% | 94.23% | 94.36% | ✅ |

### Uncovered lines (acceptable)

| File | Lines | Reason |
|---|---|---|
| `gastronovi-connector.ts` | 42–44 | `defaultTransport` — real HTTP function, intentionally not called in tests (transport is always injected) |
| `gastronovi.config.ts` | 7 | `booleanEnv` preprocess with empty-string input — minor edge case; not worth a test for one line |

## New Tests Added (15)

| Describe | Tests | Coverage target |
|---|---|---|
| `redactForLog — array branch` | 2 | `redactForLog` array path, primitive pass-through |
| `parseGastronoviConfig — config parsing` | 10 | All `gastronovi.config.ts` paths: happy path, optional defaults, allowlist parsing, error cases, error shape |
| `GastronoviConnector — network error path` | 1 | Transport throws (non-ConnectorError) → `ConnectorError(network)` after retry |
| `GastronoviConnector — token bucket rate limit` | 1 | `_consumeToken()` returning false after bucket exhaustion |
| `GastronoviConnector — circuit breaker auto-reset` | 1 | `_isCircuitOpen()` reset branch after `CIRCUIT_RESET_MS` |

## Verification

| Check | Command | Result |
|---|---|---|
| typecheck | `npm --workspace=apps/api run typecheck` | ✅ exit 0 |
| vitest | `npx vitest run apps/api/tests/gastronovi/` | ✅ 33/33 pass |
| coverage | see table above | ✅ targets exceeded |
| diff check | `git diff --check` | ✅ no whitespace errors |
| scope check | `git status --porcelain` | ✅ only allowed files |

## Known Risks

| # | Risk | Status |
|---|---|---|
| R-1 | `defaultTransport` (real HTTP) never exercised in tests | Acceptable — by design; integration tests require partner confirmation |
| R-2 | `gastronovi.config.ts` line 7 (`booleanEnv` empty-string branch) uncovered | Acceptable — minor cosmetic gap; does not affect correctness |
| R-3 | Partner/API confirmation still absent — `GASTRONOVI_ENABLED=true` remains blocked | Carry-forward from Slice #1 |
| R-4 | TLS fingerprint `not_implemented` | Carry-forward from Slice #1 |
| R-5 | Normalizer not yet implemented | Blocked on partner confirmation (Slice #2A intent) |

## Deferred Work

- Slice #2B: Normalizer implementation (blocked on partner/contract confirmation)
- `defaultTransport` integration test: possible in Slice #2C+ with a local mock server
- Operator L3 sign-off before any `GASTRONOVI_ENABLED=true` in deployed env
