# Bevero Database Boundary v0

## Decision

The existing remote Supabase database is treated as the Rauschenberger/Pilot operational database.

Future Bevero productization migrations must not run against this database.

A new isolated Bevero database/project is required for productization, SaaS demo, and Phase 4b+ schema rename work.

`bevero-plattform` is an **independent** project from `rauschenberger-os`. The
Production Supabase project is **owned** by `rauschenberger-os`; `bevero-plattform`
must never write to it and must not route through `BEVERO_*` env vars to declare
it as its own target.

## Database Roles

### Rauschenberger / Pilot DB (Foreign, Read-Only)
- Supabase project ref: `czinchfegtglmrloxlmh`
- Supabase project name: `warenwirtschaft`
- Environment: `main / PRODUCTION`
- **Owner:** `rauschenberger-os`
- **Owner-controlled guardrail:** `apps/api/scripts/verify-database-target.ts` in `rauschenberger-os`
- Used for existing pilot/customer operations
- No further productization migrations
- No Phase 4b-2 / 4b-3 / 4b-4 migrations
- No enum/schema/model rename experiments
- **From `bevero-plattform`:** blocked by default; only read-only incident
  verification allowed with explicit `BEVERO_ALLOW_CROSS_PROJECT_READ` token.

### Bevero Productization DB (Owned)
- Supabase project ref: `ienwshemokpsjwkedmyp`
- Supabase project name: `bevero-os`
- Environment: `development`
- Owned by `bevero-plattform`; not production
- Used for neutral Bevero schema
- Used for future migrations
- Used for demo tenants and SaaS onboarding
- Used for Phase 4b+ validation

## Incident Note

During Phase 4b-1 validation, `prisma migrate deploy` connected to a remote Supabase host instead of a local test DB and applied pending migrations. No further DB actions were performed after detection.

Owner-verified production evidence on 2026-07-02:

- `20260701220000_rename_catering_mode_inhouse` is `finished` with no rollback.
- `20260620_add_shift_sessions` is `finished` with no rollback.
- RLS is active on the reviewed `public` tables.
- `CateringMode` contains `INHOUSE`, `EXTERNAL_EVENT_CATERING`, and `HYBRID`.
- `shift_sessions` and the related shift tables exist.
- Supabase reports the production project as healthy, with no visible backups.

This evidence is `partial`, not a full production-safety pass. Policy coverage,
central row counts, shift constraints, logs, Advisors, and a read-only application
smoke test still require operator verification.

## Required Guard Before Any Future Migration

Before any command such as:

- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma db push`
- migration scripts
- seed scripts

run the target guard first:

```bash
npm run db:verify-target
```

`apps/api/prisma.config.ts` also invokes the guard for direct risk-bearing Prisma
commands, including `migrate deploy`, `migrate dev`, `migrate reset`,
`migrate resolve`, `db push`, `db seed`, and `db execute`.

the operator must classify the target DB as one of:

- local
- bevero-dev
- bevero-staging
- bevero-production
- rauschenberger-pilot

If the target is `rauschenberger-pilot`, productization migrations are forbidden.

The guard must derive the Supabase project ref without printing the connection
string. `DIRECT_URL` and `DATABASE_URL` must resolve to the same known target.
Unknown refs, ref mismatches, role mismatches, and split targets fail closed.

Production verification requires all three values and a separate owner-approved gate:

```text
BEVERO_DB_TARGET=production
BEVERO_EXPECTED_SUPABASE_REF=czinchfegtglmrloxlmh
BEVERO_ALLOW_PRODUCTION_MIGRATION=I_UNDERSTAND_THIS_TOUCHES_PRODUCTION
```

These variables allow the guard check to pass; they are not standing approval to
run a production migration. The concrete production operation still needs explicit
owner approval and evidence.

> Note: as of 2026-07-02, `czinchfegtglmrloxlmh` is **foreign** to `bevero-plattform`
> (owned by `rauschenberger-os`). Setting all three production values no longer
> passes the guard; the cross-project block supersedes this section. Use the
> `rauschenberger-os` guardrail for any work that touches `czinchfegtglmrloxlmh`.

### Cross-Project Read-Only (Incident Verification)

For incident verification against the foreign `czinchfegtglmrloxlmh` project, only
a **read-only** override is possible:

```text
BEVERO_DB_TARGET=production
BEVERO_EXPECTED_SUPABASE_REF=czinchfegtglmrloxlmh
BEVERO_ALLOW_PRODUCTION_MIGRATION=I_UNDERSTAND_THIS_TOUCHES_PRODUCTION
BEVERO_ALLOW_CROSS_PROJECT_READ=I_UNDERSTAND_THIS_IS_A_BEVERO_DEV_DB
```

Even with all four values, risk-bearing Prisma commands (`migrate deploy/dev/reset/resolve`,
`db push/seed/execute`) against `czinchfegtglmrloxlmh` are blocked. Only read-only
queries are permitted; no migration, seed, or data mutation can leave `bevero-plattform`
for the foreign production project.

## Required Environment Separation

Future env targets should be separated, for example:

- `.env.rauschenberger-pilot`
- `.env.bevero-dev`
- `.env.bevero-staging`
- `.env.bevero-production`

Do not commit secrets.

## Development DB

The isolated Bevero development project is:

```txt
ienwshemokpsjwkedmyp = bevero-os / development / bevero-plattform
```

Before a migration-bearing development slice, both Prisma URLs must point to this
project, `BEVERO_DB_TARGET` must be `development`, and
`BEVERO_EXPECTED_SUPABASE_REF` must match the ref exactly.

Optional later environments:

```txt
bevero-platform-staging
bevero-platform-production
```

## Phase 4b Rule

Do not continue with:

- InquirySource rename
- LocationProfile rename
- CUBE model logical rename
- route/module rename requiring DB validation

until the development DB target is coherent, the guard passes, and the migration
has its own explicit owner-approved gate.

## Read-Only Production Verification

Read-only SQL, aggregate counts, policy/constraint inspection, Supabase
Logs/Advisors review, and non-mutating UI navigation are permitted when scoped as
incident verification. Do not copy customer rows, credentials, tokens, or raw log
dumps into evidence.

Stop immediately on an unknown target, missing central data, missing policies on
central RLS tables, open/failed migrations, critical logs, or DB-/enum-/table-related
smoke failures. Rollback, PITR, forward fixes, migrations, seeds, deploys, and data
changes require separate owner approval.

Every DB-affecting operation requires an evidence record naming the project ref,
declared role, command class, approval gate, and validation outcome without secrets.

## Follow-up

Complete the remaining production read-only checks in
`/home/baum/workspace/baum-os/evidence/2026-07-02-bevero-db-verification.md`.
