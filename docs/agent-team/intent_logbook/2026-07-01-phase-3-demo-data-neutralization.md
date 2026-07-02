# Intent Memory — Phase 3 Demo Tenant & Seed Data Neutralization

- id: 2026-07-01-phase-3-demo-data-neutralization
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-phase-3-demo-data-neutralization.md`
- status: reviewed

## Core intention

Make every piece of **active, visible demo data** generic, so Bevero can be shown as a
neutral demo/SaaS without exposing the pilot customer's real org, sites, venues, cities,
or branded articles — while leaving code/schema identity (enums, ids, slugs, package
names) untouched for a later, separately-gated phase.

## Logic followed

The dividing line for Phase 3 is **display value vs identifier**, and it maps cleanly to
case: capitalized, human-readable strings (a Location's `name`, an EventSpace's `name`, a
UI label, a catalog venue name, a city) are demo *data* and were neutralized; lowercase
slugs/ids (`loc-motorworld-boeblingen`, `cube-stuttgart`) and UPPERCASE enum values
(`MOTORWORLD_STANDARD`, `CUBE_PREMIUM`, `RAUSCHENBERGER_WEBSITE`, `INHOUSE_RAUSCHENBERGER`)
are code *identity* and were kept. The task's own case-sensitive validation grep confirmed
this boundary — it targets exactly the capitalized display forms.

## Design assumptions

- Renaming an enum value or an internal id would require a Prisma migration and/or a broad
  test/code refactor — explicitly forbidden in Phase 3 — so those stay and are logged as
  Phase 4 follow-ups.
- Inline test fixtures that both build and assert on the same literal can be neutralized
  safely by replacing that literal consistently; the test's logic is unchanged.
- `cube_*.sql` seeds carry no capitalized customer display data (their "cube" is the table
  and enum identity), so they are Phase 4, not Phase 3.
- Generic commercial article names (e.g. common wine varietals) are not customer identity
  and are not in the forbidden list; only the customer-branded article was neutralized.

## Tradeoffs

- Accepted:
  - Display data is clean while internal ids/slugs/enums still contain brand tokens. A demo
    user or screenshot sees only generic names; only a DB/schema-level inspection reveals
    the legacy identifiers. This is the intended Phase 3 stopping point.
  - `scripts/seed/mwbb-live-stock.ts` keeps its customer-shaped structure and generic
    article names; only customer-identity strings were removed. Full removal/relocation is
    a Phase 4 follow-up.
- Rejected:
  - Renaming enums/ids/slugs/migrations/packages now — would force migrations and a large
    test refactor, violating "arbeite klein, reviewbar, sicher".
  - Rewriting ADRs / logbooks / MIGRATION.md — factual history, kept.
  - Touching `cube_*.sql` table/enum-level strings — code identity, deferred.

## Durable memory

- Approved generic demo vocabulary is now codified in
  `docs/productization/bevero-demo-data-policy-v0.md` (tenant `ExampleCo Hospitality Group`
  / `org-examplecogroup`; sites `Demo Site Alpha/Beta/Gamma/Delta/Premium`; venues
  `Demo Venue One..Five`; integration labels External Planning System / POS Source
  Connector / ERP Export / Accounting Export). Future seeds/fixtures/screenshots must
  conform to it.
- The `MOTORWORLD_STANDARD` / `CUBE_PREMIUM` enums now map to `Demo Site Alpha` (standard)
  and `Demo Site Premium` (premium) at the display layer.

## Do not reuse blindly

- Do not assume the demo DB is fully brand-free: internal ids/slugs/enum values still say
  `motorworld` / `cube` / `rauschenberger`. Anyone doing Phase 4 must handle those with a
  migration, not a string replace.
- Do not "fix" `cube_*.sql` or module/route names as if they were demo data — they are
  code identity and need coordinated schema/code changes.

## Relation to Rauschenberger OS / Bevero

- location logic: demo sites/areas/venues now generic (`Demo Site *`, `Demo Venue *`);
  Location/Area/EventSpace structure unchanged.
- role/approval logic: untouched.
- inventory/procurement/shift-planning logic: untouched (only seed display values +
  one branded article name changed).
- external-system boundary: UI inquiry-source labels genericized; connector provider
  enum codes (GASTRONAUT/GASTRONOVI/EVIIVO) kept as generic vendor integrations.

## Next logic gate

Phase 4: code/schema identity — rename enum values, internal ids/slugs, migration dir
names, and the `@rauschenberger-os/*` package scope, each behind its own migration/gate.
