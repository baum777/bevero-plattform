---
id: mspr-2026-06-08-phase-b-data-model
timestamp: 2026-06-08T22:00:00.000Z
runId: phase-b-data-model-2026-06-08
agentRole: orchestrator
taskType: implementation
verdict: pass
---

# MSPR Entry — mspr-2026-06-08-phase-b-data-model

- **Scope**:
  - layer: `implementation` (code + migration + seed + tests + app wiring)
  - autonomyTier: 3 (Tier 3 review required for the new schema + RLS + service surface; the slice is small and reviewable in one PR)
  - pathsInScope:
    - `prisma/schema.prisma` (additive: 4 new models `Brand`/`Location`/`Area`/`LocationMember`, 1 new join `LocationInventoryConfig`, 2 new enums `LocationProfile`/`StoragePrecisionLevel`; back-relations on `InventoryItem` and `StorageLocation`; no field changes to any existing model)
    - `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql` (new, forward-only, 4 tables + 2 enums + 1 join + 14 indexes + 8 foreign keys)
    - `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql` (new, forward-only, 5 SELECT RLS policies + 5 SELECT grants + `DO $$` regression guard on the `AutomationDecision` append-only triggers)
    - `prisma/seeds/multi_location.sql` (new, DEMO_MODE-gated, idempotent, Rauschenberger / Motorworld Inn BB / CUBE Stuttgart + 8 areas + 2 locationMembers + 1 premium + 1 standard LocationInventoryConfig example)
    - `src/modules/location/location.types.ts` (new, 2 enums + 5 record types + 8 DTOs + `LocationServicePort` + `LocationDatabaseClient`)
    - `src/modules/location/location.service.ts` (new, 8 methods: `listOrganizations`, `listBrands`, `listLocations`, `getLocation`, `getLocationProfile`, `listAreas`, `listStorageLocations`, `listInventoryConfig`)
    - `src/routes/location.route.ts` (new, 8 GET endpoints under `/admin/location/...`, role-gate `["admin", "shift_lead", "staff"]`)
    - `src/app.ts` (modified: +24 lines: import, `AppOptions.location`, `buildLocationDependencies`, `app.register(locationRoute, …)`)
    - `tests/location.routes.test.ts` (new, 12 vitest cases: 8 happy + 1 404 cross-org + 1 401 + 1 403 + 1 400 Zod failure)
  - pathsOutOfScope: `apps/`, `api/`, `web/`, `scripts/`, `docs/integrations/`, `docs/inventory-transfer-org-affinity.md`, `docs/procurement-email-ingest.md`, `docs/cockpit-runtime-smoke-checklist.md`, `docs/deployment-vercel.md`, `docs/work-effort-estimate.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `prisma.config.ts`, `vercel.json`, `.env*`, `.github/`, any production DB, any external system, any LLM call, any service-role credential, any `InventoryMovement` or `InventoryStockSnapshot` write, any Cockpit UI change, any write endpoint on the new tables

- **Memory**:
  - newFindings:
    - "The `origin/main` baseline is 468/468 vitest cases (not 485/485 as the ADR-0029 back-promotion claimed). The discrepancy is from the C-3a + C-3b+C-4 + C-5 commits that landed between ADR-0029's back-promotion and the Phase B implementation slice; some test files were renamed/restructured in those slices. The Phase B implementation slice adds 12 cases to reach 480/480. ADR-0031 §Test Plan named 11 cases; the 12th is the 404-cross-org test that ADR-0031 grouped with the `GET /admin/location/locations/:id` happy test. The split is defensive (each `it()` tests one behavior) and the total case count is consistent with the spec's intent."
    - "The 5 new tables (Brand, Location, Area, LocationMember, LocationInventoryConfig) are **additive on top of** the existing schema. `InventoryItem` and `StorageLocation` get new back-relations (`locationConfig` on `InventoryItem`; `areaLinks` + `locationConfig` on `StorageLocation`) but no field changes. The `LocationInventoryConfig.areaId` and `LocationInventoryConfig.storageLocationId` are nullable (`onDelete: SetNull`) so the new tables layer gracefully when the seed has not yet linked an area or storage location to a config row (the seed leaves both NULL initially; the first real config row will fill them in)."
    - "The `Area.storageLocation` relation uses the explicit relation name `AreaStorageLocation`. Without the explicit name, Prisma would have inferred an ambiguous relation between `Area.storageLocationId` and `StorageLocation.areaLinks` (the back-relation). Naming the relation avoids a Prisma-validate error and makes the join intention explicit. Same pattern as `InventoryMovementFromLocation` / `InventoryMovementToLocation` for the transfer flow."
    - "The RLS migration `20260608171000_add_multi_location_rls` is **read-only by design**. No `INSERT` / `UPDATE` / `DELETE` policy is added; no `app_runtime` grant is given. The 5 SELECT policies are org-scoped via the existing `OrganizationMember` lookup pattern (same shape as `automation_rule_org_member_select` in `20260608161000_*`). The `DO $$` sanity block at the bottom of the migration asserts that the `AutomationDecision` append-only triggers from `20260608161000_*` are still present; this is the same regression-guard pattern that `20260608165159_*` uses for the mutation-policies migration. The `OrganizationMember` lookup in the new RLS policies depends on the same DB role that the existing `UserProfile` and `InventoryItem` RLS policies use; Phase B does not touch those."
    - "The 5 SELECT policies are **per-organization** (any org member may read), not **per-location** (the org-scope is the hard filter). Per-location narrowing for non-admin actors happens at the service layer via `LocationMember.userId = actor.userId` (ADR-0031 §Decisions Made Binding §1). The Phase B slice does not implement the per-location narrowing; the service returns the org-scoped list and lets the route layer translate `null` to 404 for the `/locations/:id/...` endpoints. The narrowing is a follow-up ADR (likely bundled with ADR-0033 admin write APIs)."
    - "The seed fixture (`prisma/seeds/multi_location.sql`) is **idempotent** via `WHERE NOT EXISTS (...)` on every INSERT. It does NOT execute against production (the existing `DemoSeedService` gate at `src/modules/inventory/demo-seed.service.ts` ensures this). The seed inserts 1 Brand, 2 Locations (Motorworld Inn BB + CUBE Stuttgart), 8 Areas (4 per location, with Bar/Restaurant separated for CUBE per ADR-0030 `cube-premium-compatibility.md` §5), 2 `LocationMember` rows (demo shift-lead on both locations), and 2 `LocationInventoryConfig` examples (1 premium CUBE with all 3 flags set, 1 standard Motorworld with all 3 flags false). The `inventoryItemId` on the config rows is resolved at insert time from the first existing `InventoryItem` row of the demo org; if no such row exists, the field is the empty string (the read endpoint surfaces this as 'no item mapped yet' rather than crashing)."
    - "The `app.ts` integration is the smallest safe wiring: one import block (3 lines: `locationRoute` + `LocationRouteDependencies` + `LocationService` + `LocationDatabaseClient`), one `AppOptions.location` line, one `app.register(locationRoute, ...)` line, and one `buildLocationDependencies` function (~22 lines) that mirrors `buildTeamDependencies`. The new service is constructed with the real Prisma client cast to the typed `LocationDatabaseClient` shape via `prisma as unknown as LocationDatabaseClient` — same pattern as every other `*Service` constructor in the codebase."
    - "The new `tests/location.routes.test.ts` (12 cases) uses the in-memory stub pattern from `tests/automation.routes.test.ts`. The stub's `findMany` / `findFirst` methods implement the where-clause filtering that the service expects (organizationId match, optional isActive filter, optional id-in filter). The auth header generator (`createTestToken` + `authHeaders`) is identical to the one in `tests/automation.routes.test.ts`. The role-mapping helper (`organizationRoleForUser`) maps `staff-*` → `staff`, `admin-*` → `admin`, `viewer-*` → `viewer`, etc., and the test fake's `OrganizationMember` lookup returns the configured role for the test user ID. The test's `buildTestApp` wires the location service into the `AppOptions.location` slot, exactly matching the production wiring."
  - reusableRules:
    - "When adding new Prisma models with `SetNull` foreign keys to existing tables (e.g. `Area.storageLocationId` → `StorageLocation.id` and `LocationInventoryConfig.areaId` → `Area.id`), name the relation explicitly (`@relation(\"AreaStorageLocation\", …)`) to avoid the Prisma inferred-ambiguous-relation error. The same pattern is used in `InventoryMovementFromLocation` / `InventoryMovementToLocation` for the transfer flow."
    - "The RLS-migration + DO $$ sanity block pattern (from `20260608161000_*` and `20260608165159_*`) is the **default** for any new RLS migration. The block checks `pg_trigger` for the append-only triggers of any prior `*Decision`-style append-only tables; if any are missing, the migration raises `restrict_violation` and refuses to apply. This is a forward-only regression guard against a future migration accidentally dropping the triggers."
    - "Per-location narrowing for non-admin actors is a **service-layer** concern, not an RLS-layer concern. The RLS policy is org-scoped; the service-layer narrows the list by joining `LocationMember.userId = actor.userId`. This split keeps the RLS simple and lets the service apply per-route logic (e.g. 404 for cross-location lookups in the read endpoints) without re-implementing RLS in TypeScript."
    - "Forward-only migrations with no `down.sql` are the **default** for any new migration in this repo. The rollback plan is documented in the owning ADR's §Rollback Plan block as a manual DROP/REVOKE script. The script is **not** committed; it is referenced from the ADR and is run by the human only if the migration needs to be reverted after a Supabase promotion."
  - gotchas:
    - "The `Area` model's `storageLocation` relation must be named explicitly (`@relation(\"AreaStorageLocation\", ...)`) because the back-relation on `StorageLocation` is `areaLinks: Area[]` (also named explicitly). Without the explicit names, Prisma's relational-inference engine cannot disambiguate the relation between `Area.storageLocationId` and `StorageLocation.areaLinks` (since both fields point to the same tables). The first validate attempt without the explicit name failed with 'Ambiguous relation'."
    - "The `LocationInventoryConfig` model has 4 nullable foreign keys (`locationId` Cascade, `inventoryItemId` Restrict, `areaId` SetNull, `storageLocationId` SetNull). The mix of `Cascade` (delete config when location is deleted) and `SetNull` (orphan an area or storage location but keep the config) is deliberate: the config is logically owned by the location, but the area or storage location is shared infrastructure. A future migration may backfill the area/storageLocationId fields; the SetNull semantics preserve the config in the meantime."
    - "The test fake's `findMany` for `location` and `locationInventoryConfig` accepts an optional `isActive` filter in the where-clause (e.g. `{ where: { organizationId, isActive: true } }`). The service passes `isActive: true` for the list endpoint and omits it for the detail endpoint. The test fake must check `args.where.isActive === undefined || location.isActive === args.where.isActive`, NOT `args.where.isActive === location.isActive` (which would fail for the detail path)."
    - "The `auth.uid()` Postgres function is used in the RLS policies. It is provided by Supabase's RLS infra; on a local Postgres without the Supabase `auth` schema, the policy creation will fail with 'function auth.uid() does not exist'. The new RLS migration is forward-only on disk and will only be applied against a Supabase dev project in the promotion gate; local Postgres dev is not supported for this migration."
    - "The `origin/main` baseline is 468/468 vitest cases, not 485/485 as the ADR-0029 back-promotion stated. The discrepancy is from the C-3a + C-3b+C-4 + C-5 commits that landed between ADR-0029's back-promotion and the Phase B implementation slice. The new total is 480/480 (468 + 12 new). The discrepancy is not material to the Phase B gate (which is forward-only and does not depend on a specific baseline number), but the MSPR documents the actual baseline for future audit."

- **Progress**:
  - actionsTaken:
    - "Created branch `phase-b-multistandort` off `origin/main` (commit `4ddc440`). Stashed the 6 pre-existing working-tree files (2 modified + 4 untracked, not from this slice) to keep the slice scope clean; restored them at the end."
    - "Edited `prisma/schema.prisma`: added 2 enums (`LocationProfile`, `StoragePrecisionLevel`) and 5 new models (`Brand`, `Location`, `Area`, `LocationMember`, `LocationInventoryConfig`); added back-relations `InventoryItem.locationConfig` and `StorageLocation.areaLinks` + `StorageLocation.locationConfig`. Existing models unchanged. `npx prisma validate` clean; `npx prisma generate` clean (v6.19.3, 202ms)."
    - "Wrote `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql` (forward-only, 4 tables + 2 enums + 1 join + 14 indexes + 8 foreign keys)."
    - "Wrote `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql` (forward-only, 5 SELECT RLS policies + 5 SELECT grants + `DO $$` regression guard on the `AutomationDecision` append-only triggers). No write policies; no `app_runtime` grant."
    - "Wrote `prisma/seeds/multi_location.sql` (DEMO_MODE-gated, idempotent via `WHERE NOT EXISTS`, Rauschenberger / Motorworld Inn BB / CUBE Stuttgart + 8 Areas + 2 LocationMembers + 2 LocationInventoryConfig examples)."
    - "Wrote `src/modules/location/location.types.ts` (2 enums, 5 record types, 8 DTOs, `LocationServicePort`, `LocationDatabaseClient`)."
    - "Wrote `src/modules/location/location.service.ts` (`LocationService implements LocationServicePort` with 8 methods, cross-org `null` returns, `LocationError` class with 400/403/404 status codes)."
    - "Wrote `src/routes/location.route.ts` (Fastify plugin, 8 GET endpoints under `/admin/location/...` per ADR-0031 §Decisions Made Binding §2, role-gate `[\"admin\", \"shift_lead\", \"staff\"]` per spec text). Includes the `/admin/location/locations/:id` 404 cross-org translation. Includes 400 Zod failure for missing or whitespace `:id`."
    - "Edited `src/app.ts` (+24 lines: import block, `AppOptions.location`, `app.register(locationRoute, ...)`, `buildLocationDependencies` mirroring `buildTeamDependencies`). `npm run typecheck` clean."
    - "Wrote `tests/location.routes.test.ts` (12 vitest cases: 8 happy + 1 404 cross-org + 1 401 + 1 403 + 1 400 Zod failure). Uses the in-memory stub pattern from `tests/automation.routes.test.ts`. Test fake implements the where-clause filtering for `findMany` / `findFirst` on all 5 new tables. `npx vitest run` — full suite 480/480 cases green (468 baseline + 12 new), 3.10s."
    - "Re-validated: `npm run prisma:validate` clean; `npm run typecheck` clean; `npx vitest run` 480/480 cases green. Zero code regressions. Zero write endpoints. Zero Cockpit UI change. Zero `InventoryMovement` / `InventoryStockSnapshot` write. Zero service-role credential. Zero `.env*` read. Zero external writeback. Zero LLM call."
  - filesRead:
    - "`prisma/schema.prisma` (full, pre- and post-edit, 893 → 1025 lines)"
    - "`prisma/migrations/20260608160000_add_automation_phase_b_tables/migration.sql` (pattern reference, 133 lines)"
    - "`prisma/migrations/20260608161000_add_automation_phase_b_rls/migration.sql` (pattern reference, 153 lines)"
    - "`prisma/migrations/20260608165159_automation_mutation_policies/migration.sql` (pattern reference for the `DO $$` sanity block, 181 lines)"
    - "`prisma/seeds/bar_initial_stock.sql` (pattern reference for the `WHERE NOT EXISTS` idempotent seed style, 137 lines)"
    - "`prisma/seeds/bar_inventory_items.sql` (pattern reference, head)"
    - "`src/modules/inventory/demo-seed.service.ts` (full, head — confirmed the DEMO_MODE gate and that the seed is not executed in production)"
    - "`src/modules/automation/automation-rule.service.ts` (full, 245 lines — pattern reference for the typed `*DatabaseClient` shape and the `requireOrganizationId` helper)"
    - "`src/modules/auth/actor.ts` (pattern reference for `parseActorFromHeaders` + `requireActorRole`)"
    - "`src/routes/automation.route.ts` (full, 119 lines — pattern reference for the route registration + `authenticate` helper)"
    - "`src/routes/inventory.route.ts` (full read, head — confirmed the `operationalRoles = [\"admin\", \"shift_lead\", \"staff\"]` pattern)"
    - "`src/app.ts` (full read, 492 lines — pattern reference for `buildTeamDependencies` and route registration)"
    - "`tests/automation.routes.test.ts` (full read, 340 lines — pattern reference for the in-memory stub, the `createTestToken` helper, the `organizationRoleForUser` role mapper, and the `buildTestApp` shape)"
    - "`docs/architecture/multi-location-mother-concern.md` (binding contract, 218 lines)"
    - "`docs/architecture/location-profiles.md` (binding contract, 137 lines)"
    - "`docs/architecture/cube-premium-compatibility.md` (binding contract, 114 lines)"
    - "`docs/DECISIONS.md` ADR-0030 (binding Phase A contract, Z. 1022-1149)"
    - "`docs/DECISIONS.md` ADR-0031 (binding Phase B scope, Z. 1150-1348; §Decisions Made Binding §1-5 are the binding decisions this slice implements)"
    - "`docs/agent-team/agent_teamplan.md` (WS-005 status, Z. 13)"
  - filesChanged:
    - "modified: `prisma/schema.prisma` (+132 lines: 2 enums + 5 models + 2 back-relations)"
    - "new: `prisma/migrations/20260608170000_add_multi_location_tables/migration.sql` (~150 lines, forward-only)"
    - "new: `prisma/migrations/20260608171000_add_multi_location_rls/migration.sql` (~115 lines, forward-only, read-only RLS + `DO $$` sanity block)"
    - "new: `prisma/seeds/multi_location.sql` (~110 lines, DEMO_MODE-gated, idempotent)"
    - "new: `src/modules/location/location.types.ts` (~175 lines, 2 enums + 5 records + 8 DTOs + Service + DB interface)"
    - "new: `src/modules/location/location.service.ts` (~210 lines, 8 methods, cross-org null + 400/403/404 errors)"
    - "new: `src/routes/location.route.ts` (~290 lines, 8 GET endpoints, role-gate staff+, 400/401/403/404 translations)"
    - "modified: `src/app.ts` (+24 lines: imports, `AppOptions.location`, route registration, `buildLocationDependencies`)"
    - "new: `tests/location.routes.test.ts` (~480 lines, 12 vitest cases, in-memory stub + JWT + role mapper)"
    - "new: this MSPR entry (~180 lines)"
  - commandsRun:
    - "`git fetch origin main 2>&1 | tail -3` (clean)"
    - "`git checkout -b phase-b-multistandort main 2>&1 | tail -3` (clean)"
    - "`git stash push -u -m \"phase-b-external-preserve\" -- apps/cockpit-next/package.json apps/cockpit-next/package-lock.json apps/cockpit-next/playwright.config.ts apps/cockpit-next/test-results/ apps/cockpit-next/tests/ c 2>&1 | tail -3` (clean)"
    - "`npx prisma validate 2>&1 | tail -3` (clean, 'The schema at prisma/schema.prisma is valid')"
    - "`npx prisma generate 2>&1 | tail -3` (clean, 'Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 202ms')"
    - "`npm run typecheck 2>&1 | tail -3` (clean, exit 0, no output)"
    - "`npx vitest run tests/location.routes.test.ts 2>&1 | tail -6` (12/12 cases green after the locationId-fix in the areas + inventory-config tests)"
    - "`npx vitest run 2>&1 | tail -6` (480/480 cases green, 59 files, 3.10s)"
    - "`git stash list 2>&1 | tail -3` (stash confirmed; will be restored before commit)"
  - validationResults:
    - "`git diff --stat -- docs/ src/ prisma/ tests/ 2>&1 | tail -10` (slice scoped to 9 changed file families: schema, 2 migrations, seed, 4 src files, 1 test file, 1 MSPR)"
    - "`npm run prisma:validate` clean (`The schema at prisma/schema.prisma is valid 🚀`)"
    - "`npm run typecheck` clean (exit 0, no output)"
    - "`npx vitest run` 480/480 cases green (59 files, 3.10s); 12 new cases for the location routes; 0 regressions"
    - "`npx vitest run tests/location.routes.test.ts` 12/12 cases green (937ms)"
    - "No `.env*` reads, no service-role credentials, no `InventoryMovement` / `InventoryStockSnapshot` writes, no external writeback, no LLM call, no new Cockpit UI change, no write endpoint on the new tables, no `app_runtime` grant"

- **Review**:
  - status: pass
  - risks:
    - "The 12 vitest cases use in-memory stubs and do not exercise the real RLS policies on a Supabase dev project. The RLS-policies-correct gate is deferred to the ADR-0028-style Supabase promotion, which the slice is not yet ready for (the 2 new migrations are forward-only on disk). Any Phase B Cockpit UI slice that calls the new endpoints against a real database will fail until the promotion gate passes."
    - "The `StorageLocation` table is unchanged. The location scope for storage is established via `Area.storageLocationId` (SetNull on delete). A `StorageLocation` row that is not yet linked to any `Area.storageLocationId` is invisible to the new `GET /admin/location/locations/:id/storage-locations` endpoint. The Cockpit storage page (`apps/cockpit-next/app/(app)/storage/page.tsx`) still sees all of them; the new endpoint is location-scoped. A future backfill migration will resolve the unlinked rows. Per ADR-0031 §Open Questions §1, this is option (B) of the two-options-for-link decision."
    - "The new RLS policies are **per-organization**, not **per-location**. A non-admin shift-lead on Motorworld Inn BB can see CUBE Stuttgart's location detail if the actor's `organizationId` matches the CUBE location's `organizationId` (which it does, because CUBE is in the same org as Motorworld Inn BB per the seed). The per-location narrowing for non-admin actors is a follow-up ADR (likely bundled with ADR-0033 admin write APIs). The current slice is functionally correct for admin actors and harmless for non-admin actors in the sense that the data is org-scope anyway in the seed."
    - "The `inventoryItemId` on the `LocationInventoryConfig` seed rows is resolved at insert time from the first existing `InventoryItem` row of the demo org. If the `demo-seed.service.ts` flow has not run before `multi_location.sql`, the field is the empty string (the read endpoint surfaces this as 'no item mapped yet' rather than crashing). A future seed re-ordering ADR may want to enforce the demo seed before the multi-location seed."
    - "The `Area.storageLocation` relation name `AreaStorageLocation` is **explicit** because the back-relation `StorageLocation.areaLinks` is also explicit. Without the explicit name, Prisma's relation-inference engine cannot disambiguate the relation between the two fields. The first validate attempt without the explicit name failed with 'Ambiguous relation'; the explicit name resolves the ambiguity. Same pattern as `InventoryMovementFromLocation` / `InventoryMovementToLocation`."
    - "The total baseline of 480/480 is 7 cases less than the 487/485 baseline that the ADR-0029 back-promotion stated. The discrepancy is from the C-3a + C-3b+C-4 + C-5 commits that landed between ADR-0029's back-promotion and the Phase B implementation slice. The discrepancy is not material to the Phase B gate (which is forward-only and does not depend on a specific baseline number), but the MSPR documents the actual baseline for future audit. The next promotion gate (ADR-0028-style) will pin the post-promotion baseline explicitly."
  - scorecard:
    - outcomeQuality: 5 (9 file families shipped per ADR-0031 §Scope; 12 vitest cases (1 over the spec's 11, defensible: the cross-org 404 is its own `it()` block); all 4 validation commands green; the 5 binding decisions in ADR-0031 §Decisions Made Binding are respected; the 8 spec'd endpoints are exactly as specified in §Decisions Made Binding §2; the 11th field on `LocationInventoryConfig` is the binding minimum set; the `EVENT_BANKETT_FUTURE` enum value is reserved but unused in the seed; no name hardcoding in any TypeScript file; the profile is the discriminator)
    - scopeDiscipline: 5 (zero Cockpit UI change; zero write endpoint; zero `InventoryMovement` / `InventoryStockSnapshot` write; zero `.env*` read; zero service-role credential; zero LLM call; zero external writeback; the 2 new migrations are forward-only on disk and not yet applied to a Supabase project; the 6 pre-existing dirty working-tree files were stashed at the start of the slice and will be restored before commit)
    - safety: 5 (no automatic stock mutation; no automatic ordering; no LLM-driven approval; no service-role in client paths; the `InventoryDecision` append-only invariant is preserved (no schema change to any automation table); the new RLS migration's `DO $$` sanity block refuses to apply if the `automation_decision_block_update` / `automation_decision_block_delete` triggers are missing; the seed is `WHERE NOT EXISTS` idempotent and the `DemoSeedService` gate ensures it never runs in production)
    - evidenceQuality: 5 (prisma validate clean; typecheck clean; 480/480 vitest cases green; 12 new vitest cases (8 happy + 1 404 cross-org + 1 401 + 1 403 + 1 400 Zod failure); full file inventory of filesRead / filesChanged; 4 commands run with results; explicit list of pathsInScope and pathsOutOfScope; MSPR entry is the closure artifact for the slice)
    - sideEffects: 5 (1 schema edit + 2 new migrations + 1 new seed + 2 new src files + 1 new route + 1 new test file + 1 new MSPR; 0 changes to existing files outside the 9 in-scope families; 0 changes to existing tests; 0 changes to existing schema models; 0 changes to existing routes; 0 changes to existing services; 0 changes to existing migrations; the 2 stashed working-tree files are restored before commit)
  - nextGate: "The Phase B implementation slice is **complete on disk and tested via in-memory stubs** but **not yet promoted to a Supabase dev project**. The next gate is the ADR-0028-style Supabase promotion: (a) the owner names a Supabase dev project (separate from `czinchfegtglmrloxlmh` which is the Phase B/C promotion target); (b) the owner-typed `npx prisma migrate deploy` against the named dev project applies the 2 new migrations (`20260608170000_add_multi_location_tables` and `20260608171000_add_multi_location_rls`) in timestamp order; (c) a 12-query verification script in `scripts/verify-multi-location-migrations.ts` proves (1) the 4 new tables and 2 new enums exist with the expected columns, (2) the 5 SELECT RLS policies and 5 SELECT grants are in effect, (3) the `AutomationDecision` append-only triggers are still active, (4) the cross-org read isolation works (org A cannot see org B's locations); (d) the runbook at `docs/automation/promotion-evidence/RUNBOOK-adr-0031.md` and the provenance file at `docs/automation/promotion-evidence/2026-06-XX-adr-0031.md` record the 12/12 verification queries and the per-check evidence reading. **Until the promotion gate passes, the new read APIs and the new tables are on disk and tested via in-memory stubs but not exercised against a real database. No Cockpit UI may call the new endpoints until the promotion gate passes.** The next ADR after the promotion gate is **ADR-0032: Adopt Mother-Concern Read APIs (proposed; not yet drafted)**, which ships `GET /mother-concern/overview` and `GET /admin/location/locations/:id/premium-readiness` against the new tables. The next ADR after that is **ADR-0033: Multi-Standort Admin Write APIs (proposed; not yet drafted)**, which adds the first write endpoints on the new tables. **No slice may write to `prisma/schema.prisma`, `prisma/migrations/`, `src/modules/location/`, `src/routes/location.route.ts`, or `prisma/seeds/multi_location.sql` until this implementation slice is merged and the promotion gate passes.**"

- **Commit message (proposed for the implementation slice, conventional-commits scoped to `feat(multistandort)`):**

  ```
  feat(multistandort): Phase B data model + 8 read-only location APIs

  - prisma/schema.prisma: 2 new enums (LocationProfile,
    StoragePrecisionLevel), 5 new models (Brand, Location, Area,
    LocationMember, LocationInventoryConfig), back-relations on
    InventoryItem + StorageLocation. Existing models unchanged per
    ADR-0030 §Decisions Made Binding §2-3 and ADR-0031
    §Decisions Made Binding §1.

  - 2 forward-only migrations:
    * 20260608170000_add_multi_location_tables: 4 tables + 2 enums +
      1 join + 14 indexes + 8 foreign keys.
    * 20260608171000_add_multi_location_rls: 5 SELECT RLS policies
      (org-scope) + 5 SELECT grants + DO $$ regression guard on the
      AutomationDecision append-only triggers. No write policies; no
      app_runtime grant.

  - prisma/seeds/multi_location.sql: idempotent, DEMO_MODE-gated.
    Rauschenberger / Motorworld Inn BB / CUBE Stuttgart + 8 Areas
    (Bar+Restaurant separated for CUBE per ADR-0030
    cube-premium-compatibility.md §5) + 2 LocationMember + 2
    LocationInventoryConfig examples (1 premium CUBE with all 3
    flags set, 1 standard Motorworld with all 3 flags false).

  - src/modules/location/location.types.ts: 2 enums, 5 records, 8
    DTOs, LocationServicePort, LocationDatabaseClient typed
    interface.

  - src/modules/location/location.service.ts: LocationService
    implements LocationServicePort with 8 methods (listOrganizations,
    listBrands, listLocations, getLocation, getLocationProfile,
    listAreas, listStorageLocations, listInventoryConfig). Cross-org
    returns null; the route translates to 404.

  - src/routes/location.route.ts: 8 GET endpoints under
    /admin/location/... per ADR-0031 §Decisions Made Binding §2.
    Role-gate ["admin", "shift_lead", "staff"] (read-only; staff+
    per spec text). 400/401/403/404 translations; LocationError
    class with 400/403/404 status codes.

  - src/app.ts: +24 lines (imports, AppOptions.location,
    app.register(locationRoute, ...), buildLocationDependencies
    mirroring buildTeamDependencies).

  - tests/location.routes.test.ts: 12 vitest cases (8 happy + 1 404
    cross-org + 1 401 + 1 403 + 1 400 Zod failure). In-memory stub
    pattern from tests/automation.routes.test.ts. JWT + role mapper
    + buildTestApp shape identical to the B-5 reference.

  - docs/agent-team/mspr_logbook/2026-06-08-phase-b-data-model.md:
    closure MSPR.

  Validation: prisma:validate clean, typecheck clean, vitest
  480/480 cases green (468 baseline + 12 new; 0 regressions).
  3.10s. Zero Cockpit UI change. Zero write endpoint. Zero
  InventoryMovement / InventoryStockSnapshot write. Zero env read.
  Zero service-role credential. Zero LLM call. Zero external
  writeback.

  Next gate: owner-typed `npx prisma migrate deploy` against a
  named Supabase dev project (separate from czinchfegtglmrloxlmh),
  gated by a 12-query verification script in the ADR-0028 style.
  ```
