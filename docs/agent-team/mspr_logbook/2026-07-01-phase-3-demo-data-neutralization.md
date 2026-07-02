# MSPR Entry — Phase 3 Demo Tenant & Seed Data Neutralization

- id: 2026-07-01-phase-3-demo-data-neutralization
- timestamp: 2026-07-01T00:00:00+02:00
- runId: baumos-2026-07-01-phase-3-demo-data-neutralization
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local (seed data + fixtures + UI labels, docs)
- pathsInScope:
  - `apps/api/prisma/seeds/multi_location.sql`
  - `apps/api/prisma/seeds/motorworld_inn_standorte.sql`
  - `apps/api/prisma/seeds/mother_concern.sql`
  - `apps/api/prisma/seeds/kitchen_workspace.sql`
  - `apps/api/prisma/seeds/bar_initial_stock.sql`
  - `apps/api/prisma/seeds/bar_inventory_items.sql`
  - `apps/api/prisma/seeds/operational_units.sql`
  - `apps/api/scripts/seed/mwbb-live-stock.ts`
  - `apps/cockpit/app/components/bestand/InquiryListItem.tsx`
  - `apps/cockpit/app/(app)/inquiries/page.tsx`
  - `apps/api/tests/location.routes.test.ts`
  - `apps/api/tests/location.overview.test.ts`
  - `apps/api/tests/organization.routes.test.ts`
  - `apps/api/tests/organization.overview.test.ts`
  - `docs/productization/bevero-demo-data-policy-v0.md` (new)
  - `docs/productization/bevero-product-identity-v0.md` (Demo Data Policy section)
  - MSPR + intent logbook entries (new)
- pathsOutOfScope:
  - Prisma enum values (`MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`, `MOTORWORLD_INN_WEBSITE`, `INHOUSE_RAUSCHENBERGER`) — kept; Phase 4
  - internal seed ids/slugs (`loc-motorworld-*`, `brand-motorworld`, `cube-stuttgart`, `mwbb-*`, `ORGANIZATION_ID="motorworld-inn-boeblingen"`) — kept; Phase 4
  - migration files / names — untouched
  - `cube_*.sql` seeds (their "cube" is table/enum/code identity, not display data) — untouched
  - code module/route/table/service names (`cube-economic`, `gastronovi`, `mother-concern`) — Phase 4
  - `apps/api/scripts/verify-adr-*` cosmetic ADR-verification labels — historical tooling, not in validation scope
  - `apps/cockpit/.next/*` — generated build artifacts (gitignored)
  - ADRs / logbooks / MIGRATION.md — historical, untouched
- autonomyTier: 2

## Code Change Context

- Trigger/request: Operator instruction to run Phase 3 (demo tenant & seed data neutralization).
- Why the change was needed: Active demo/seed/fixture/UI data still carried real customer org, sites, venues, cities, and a branded article, blocking a neutral demo/SaaS presentation.
- Key insight: the task's own validation grep is case-sensitive on capitalized display-name forms. That is exactly the Phase 3 / Phase 4 boundary — neutralize human-readable **display values**; keep lowercase slugs/ids and UPPERCASE enum values (Phase 4).
- Files changed (summary):
  - `multi_location.sql` — `Rauschenberger Innenstadt`→`ExampleCo Innenstadt`, `Motorworld Inn Böblingen`→`Demo Site Alpha`, `CUBE Stuttgart`→`Demo Site Premium`; comments neutralized. Enum values + ids/slugs kept.
  - `motorworld_inn_standorte.sql` — rewritten: 4 site display names → `Demo Site Beta/Alpha/Gamma/Delta`; event-space names, signature assets, exception-rule text, comments neutralized; ids/slugs/enum values/provider codes kept.
  - `mother_concern.sql` — ExternalCatalogEntry venues → `Demo Venue One..Five`; cities → `Demo City A/B`; `INHOUSE_RAUSCHENBERGER` enum + ids/slugs kept.
  - `kitchen_workspace.sql`, `bar_initial_stock.sql`, `bar_inventory_items.sql`, `operational_units.sql` — display names/comments (`MW Inn Böblingen`, `Motorworld BB`, `CUBE Stuttgart`) → generic.
  - `scripts/seed/mwbb-live-stock.ts` — storage-location name + branded article (`Rauschenberger Brut Kessler`→`Demo Sekt Brut`) + source note neutralized.
  - `InquiryListItem.tsx` + `inquiries/page.tsx` — UI `SOURCE_LABELS` / `<option>` display text (`Rauschenberger`/`CUBE`/`Motorworld Inn`) → `Group Website` / `Premium Site Website` / `Site Website`; enum keys kept.
  - 4 API test files — inline fixture literals + paired assertions neutralized consistently.
- Commands run:
  - `npm --workspace=apps/api run prisma:validate` → pass ("schema is valid")
  - `npx vitest run` on the 4 changed test files → **51 passed / 51**
  - `npx vitest run tests/cockpit/ tests/inquiry*.test.ts tests/event-inquiry.routes.test.ts` → **42 passed / 42**
  - `npm --workspace=apps/api run typecheck` → pass
  - `npm --workspace=apps/cockpit run typecheck` → pass
  - validation grep over `apps/api/{prisma/seeds,tests,src}`, `apps/cockpit/{app,components,lib}`, `apps/landing/{src,public}` → **CLEAN** (no capitalized brand/venue display terms)
- Validation results: all green; no capitalized customer/venue display data remains in active-code scope.

## Memory

- newFindings:
  - `cube_*.sql` seeds contain no capitalized display data — their "cube" is table/enum/code identity, correctly deferred to Phase 4.
  - `scripts/seed/mwbb-live-stock.ts` is a customer-specific live-stock import script (real wine inventory). Only customer-identity strings were neutralized; generic commercial article names left; the file's `ORGANIZATION_ID` and existence flagged as Phase 4 follow-up.
- reusableRules:
  - Distinguish display value vs identifier by case: capitalized human strings = Phase 3 data; lowercase slugs/ids + UPPERCASE enums = Phase 4 code identity.
  - When neutralizing inline test fixtures where input == assertion, replace the literal consistently (both sites) to preserve test validity.
- gotchas:
  - `sed` treats `&` in the replacement as "matched text" — corrupted 3 `kitchen_workspace.sql` lines containing `Küche & Lager`; fixed via explicit edits. Prefer `perl -0pi -e 's/\Q..\E/../'` for literals or Edit tool.

## Review

- status: pass
- risks:
  - Internal seed ids/slugs and enum values still contain brand tokens by design (Phase 4). Display data is clean, so demo UI/screenshots are neutral, but a DB-level inspection still shows `loc-motorworld-*` etc.
  - `mwbb-live-stock.ts` remains a customer-shaped import script (generic article names kept); flagged for Phase 4.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 5
  - sideEffects: 4
- nextGate: Phase 4 (enum/migration/package/id renames — migration-bearing, separately gated).

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-01-phase-3-demo-data-neutralization.md`
