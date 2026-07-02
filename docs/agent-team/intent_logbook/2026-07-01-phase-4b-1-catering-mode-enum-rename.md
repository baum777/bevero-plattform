# Intent Memory — Phase 4b-1 CateringMode Enum Rename

- id: 2026-07-01-phase-4b-1-catering-mode-enum-rename
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-phase-4b-1-catering-mode-enum-rename.md`
- status: reviewed

## Core intention

Execute the first, smallest-blast-radius Phase 4b patch: neutralize the last customer-name-bearing enum value (`CateringMode.INHOUSE_RAUSCHENBERGER`) via a manual, reversible SQL migration, without touching any of the higher-risk enums (InquirySource, LocationProfile, FurniturePolicySource) or the CUBE_* models. This validates that the "manual `ALTER TYPE RENAME VALUE`" migration strategy from the Phase 4b readiness plan actually works end-to-end.

## Logic followed

`ALTER TYPE ... RENAME VALUE` is a safe, transactional, in-place PostgreSQL operation that does not require a DROP/CREATE cycle and does not risk existing rows, because it's a rename, not a redefinition. Since `CateringMode` has no `@default(...)` on the column that uses it, there was no additional `ALTER TABLE ... SET DEFAULT` fixup needed (unlike the planned LocationProfile rename in Phase 4b-3, which does have a default).

## Design assumptions

- The three literal `'INHOUSE_RAUSCHENBERGER'` values in `apps/api/prisma/seeds/mother_concern.sql` are directly, unambiguously coupled to the `CateringMode` enum (they populate the `cateringMode` column of `ExternalCatalogEntry`) — in scope for this patch per the "only if directly broken by the rename" rule, not a broader seed cleanup.
- `organization.types.ts` only re-exports the Prisma-generated `CateringMode` enum object; it holds no string literal of its own, so it required no edit — confirmed by reading the file before assuming a change was needed.
- Running `npx prisma migrate deploy` was expected, per the operator's own instructions, to either succeed against a local test DB or fail cleanly against no DB. It was not expected to succeed against a live remote Supabase database — this assumption turned out to be wrong and is the single most important finding of this session.

## Tradeoffs

- Accepted:
  - Updating 3 seed literal values, slightly exceeding the "primary scope" file list, because leaving them would have made the seed insert an invalid enum value on any DB where this migration lands.
  - Running `prisma migrate deploy` as instructed, given the operator explicitly asked for an attempt at local/dev deployment rather than skipping it outright.
- Rejected:
  - Using `prisma migrate resolve --applied` to fake-sync state — explicitly forbidden by the operator's instructions and not warranted, since the migration genuinely needed to run (and did run, for real, against a real database).

## Durable memory

What should future agents or humans remember?

- **`npx prisma migrate deploy` in this repo connects to a live remote Supabase Postgres instance** (`aws-0-eu-west-1.pooler.supabase.com`), not a local sandbox. Any future Phase 4b/4c patch that needs to apply a migration must get explicit operator confirmation of the target database *before* running `migrate deploy`, not after.
- Running `migrate deploy` applies **all pending migrations up to the latest**, not just the newly added one. In this run, one pre-existing, already-committed, unrelated migration (`20260620_add_shift_sessions`) was rolled forward as a side effect, because it had not yet been deployed to that database. This is normal Prisma behavior but was an unanticipated consequence here.
- The rename itself (`CateringMode.INHOUSE_RAUSCHENBERGER` → `INHOUSE`) is now live on that database. It is safely reversible via `ALTER TYPE "public"."CateringMode" RENAME VALUE 'INHOUSE' TO 'INHOUSE_RAUSCHENBERGER';` if ever needed.
- After any enum-value rename in `schema.prisma`, `npx prisma generate` must be re-run before `typecheck` — otherwise TypeScript fails against the stale generated client with a misleading "not assignable" error that looks like a real regression but is a generation-staleness artifact.

## Do not reuse blindly

What should not be copied into future work without re-checking context?

- Do not assume "if there's no local Docker/Postgres visible, `migrate deploy` will just fail harmlessly" — verify what `DATABASE_URL`/`DIRECT_URL` actually resolves to (via safe means, not by opening `.env`) before running any migration-apply command in future Phase 4b/4c patches.
- The "seeds are only in scope if directly broken" rule from this patch generalizes, but each future enum rename (especially `LocationProfile` and `InquirySource`, which have many more references) needs its own fresh seed/fixture grep — do not assume the same 3 files will be the only ones affected.

## Relation to Rauschenberger OS / Bevero

- location logic: untouched — `LocationProfile` enum not touched in this patch.
- role/approval logic: untouched.
- inventory/procurement/shift-planning logic: untouched, except for the incidental deployment of the pre-existing `shift_sessions` migration (unrelated to this patch's intent, not a logic change made here).
- external-system boundary: `ALTER TYPE` was executed against the real Supabase Postgres database for this project — this is the first Phase 4 patch that touched a live external system rather than only local files.

## Next logic gate

Phase 4b-2 (InquirySource enum rename): before executing, explicitly ask the operator to confirm the DB target and whether `migrate deploy` should run against it again, given what happened in this patch.
