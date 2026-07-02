# Bevero Database Boundary v0

## Decision

The existing remote Supabase database is treated as the Rauschenberger/Pilot operational database.

Future Bevero productization migrations must not run against this database.

A new isolated Bevero database/project is required for productization, SaaS demo, and Phase 4b+ schema rename work.

## Database Roles

### Rauschenberger / Pilot DB
- Used for existing pilot/customer operations
- No further productization migrations
- No Phase 4b-2 / 4b-3 / 4b-4 migrations
- No enum/schema/model rename experiments

### Bevero Productization DB
- New isolated DB/project
- Used for neutral Bevero schema
- Used for future migrations
- Used for demo tenants and SaaS onboarding
- Used for Phase 4b+ validation

## Incident Note

During Phase 4b-1 validation, `prisma migrate deploy` connected to a remote Supabase host instead of a local test DB and applied pending migrations. No further DB actions were performed after detection.

## Required Guard Before Any Future Migration

Before any command such as:

- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma db push`
- migration scripts
- seed scripts

the operator must classify the target DB as one of:

- local
- bevero-dev
- bevero-staging
- bevero-production
- rauschenberger-pilot

If the target is `rauschenberger-pilot`, productization migrations are forbidden.

## Required Environment Separation

Future env targets should be separated, for example:

- `.env.rauschenberger-pilot`
- `.env.bevero-dev`
- `.env.bevero-staging`
- `.env.bevero-production`

Do not commit secrets.

## New DB Requirement

Create a new isolated Supabase project/database for Bevero productization before continuing Phase 4b-2 or later migrations.

Suggested name:

```txt
bevero-platform-dev
```

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

until the new Bevero DB exists and migration commands are explicitly pointed at it.

## Follow-up

Add a migration target guard script before the next migration-bearing patch.
