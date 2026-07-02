# MSPR Entry — Bevero Database Target Guardrail

- id: 2026-07-02-database-target-guardrail
- timestamp: 2026-07-02T12:00:00+02:00
- runId: baumos-2026-07-02-bevero-db-guardrail
- agentRole: builder/reviewer
- taskType: production_safety_bugfix

## Scope

- layer: infra_database_guardrail
- autonomyTier: 3
- pathsInScope:
  - `apps/api/scripts/verify-database-target.ts`
  - `apps/api/tests/database-target-guard.test.ts`
  - `apps/api/prisma.config.ts`
  - root/API `package.json`
  - `.env.example`
  - `AGENTS.md`, `README.md`, `governance/rules.md`
  - `docs/productization/bevero-database-boundary-v0.md`
  - required work-slice and audit records
- pathsOutOfScope:
  - `.env` and every secret value
  - Prisma schema and migration files
  - Production data and write operations
  - feature/UI fixes, deployments, commits, and pushes

## Code Change Context

- Trigger: confirmed Production migration-target incident during Phase 4b-1.
- Root cause: `prisma.config.ts` silently loaded `.env` and selected `DIRECT_URL`
  before `DATABASE_URL`; no mandatory target/ref/role check existed before risky
  Prisma commands. Client and Prisma/server configuration were documented as
  pointing to different Supabase projects.
- Design: layered guard with pure testable logic, CLI verification, guarded package
  script, and config-side enforcement for direct risk-bearing Prisma commands.
- Known targets:
  - `czinchfegtglmrloxlmh` = `warenwirtschaft` / Production / Pilot
  - `ienwshemokpsjwkedmyp` = `bevero-os` / Development / `bevero-plattform`

## Files Changed

- Created guard and 20 focused tests, including two option-placement bypass regressions.
- Hardened Prisma config and package scripts.
- Added non-secret target variables to `.env.example`.
- Updated database boundary, AGENTS, governance rules, and README.
- Updated root incident evidence and appended the repo audit log.

## Commands And Validation

- Targeted Guard test before implementation: failed because module was missing (expected RED).
- Targeted Guard test after implementation: 18/18 pass; self-review then exposed
  two `--schema` option-placement bypasses, each reproduced RED and fixed; final
  targeted result 20/20 pass.
- Guard + environment tests: 34/34 pass.
- `npm --workspace=apps/api run typecheck`: pass.
- `npm run prisma:validate`: pass; schema valid, no DB write.
- `npm run test:ci`: partial — 739/740 pass; unrelated existing
  `mobile-nav-quick-notes-contract.test.ts` expects `searchParams.get` while the
  committed UI uses `searchParams?.get`.
- CLI Dummy-Dry-Runs: environment-blocked because sandbox denies the `tsx` IPC
  socket; escalation was rejected due approval-usage limit. No bypass attempted.

## Review

- status: partial
- guardrail behavior: unit-verified
- live DB status: partial; owner confirmed project role, migrations, RLS, enum,
  shift-table existence, health, and no backups
- remaining DB evidence: policies, counts, constraints, logs/Advisors, read-only UI smoke
- no migration, seed, DB write, deployment, commit, push, or `.env` read occurred
- nextGate: complete the remaining Production read-only evidence queries and UI smoke

## Linked Intent Entry

- `docs/agent-team/intent_logbook/2026-07-02-database-target-guardrail.md`
