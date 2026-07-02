# MSPR Entry — P0 Data Sanitization & Landing Brand Neutralization

- id: 2026-07-01-p0-data-sanitization-landing-neutralization
- timestamp: 2026-07-01T00:00:00+02:00
- runId: baumos-2026-07-01-p0-data-sanitization-landing-neutralization
- agentRole: builder
- taskType: implementation

## Scope

- layer: package_local
- pathsInScope:
  - `apps/api/prisma/seeds/mother_concern.sql`
  - `docs/integrations/gastronovi.md`
  - `docs/tasks/logik/10-rauschenberger-meta-layer-contract.md`
  - `docs/architecture/inquiry-routing.md`
  - `tools/capture-screenshots.mjs`
  - `apps/landing/src/App.jsx`
  - `apps/landing/tests/roi-kam-content.test.mjs` (collateral fix, see below)
- pathsOutOfScope:
  - Prisma schema/migrations (`RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`, `INHOUSE_RAUSCHENBERGER` enum values — schema changes forbidden in this patch)
  - `motorworld_inn_standorte.sql`, `multi_location.sql`, other seeds — separate future patch (Phase 3)
  - `@rauschenberger-os/*` npm package scope names in `package.json`/`OS.md` — product-identity rename belongs to Phase 2, not this P0 patch
  - Screenshots (no re-capture in this patch)
  - `.env`, `.env.example` — not opened
- autonomyTier: 2

## Code Change Context

- Trigger/request: User approved patch scope `p0-data-sanitization-and-landing-brand-neutralization` from the prior productization audit (`docs/productization/bevero-productization-audit-2026-07-01.md`) and asked to start it.
- Why the change was needed: Real customer PII (org name/address/phone/email, contact emails/domains) and direct customer-name addressing were embedded in seed data, docs, tooling and the public landing page — blocking productization and posing a privacy/branding risk.
- Files read:
  - `apps/api/prisma/seeds/mother_concern.sql`
  - `docs/integrations/gastronovi.md`
  - `docs/tasks/logik/10-rauschenberger-meta-layer-contract.md`
  - `docs/architecture/inquiry-routing.md`
  - `tools/capture-screenshots.mjs`
  - `apps/landing/src/App.jsx`
  - `apps/landing/tests/roi-kam-content.test.mjs`
  - `apps/api/prisma/schema.prisma` (checked which brand-strings are enum values, to avoid forbidden schema edits)
- Files changed:
  - `apps/api/prisma/seeds/mother_concern.sql` — real org name/address/phone/email → `ExampleCo`/`example.com`; `org-rauschenberger` id → `org-examplecogroup` (verified no other seed file references this id); sample-inquiry contact emails/phones → generic. Left `RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`, `INHOUSE_RAUSCHENBERGER` untouched (Prisma enum values — out of scope).
  - `docs/integrations/gastronovi.md` — masked `ops@rauschenberger.de` example env value → `ops@example.com`.
  - `docs/tasks/logik/10-rauschenberger-meta-layer-contract.md` — masked real domain `rauschenberger-catering.de` reference.
  - `docs/architecture/inquiry-routing.md` — masked real domain reference in source-channel table.
  - `tools/capture-screenshots.mjs` — real login email → `demo@example.com`.
  - `apps/landing/src/App.jsx` — removed direct "Rauschenberger" addressing (4 spots), renamed FoodNotify/Gastronovi in visible copy to generic "Planungssystem"/"POS-System" (brand kept as parenthetical example in 2 spots per patch scope).
  - `apps/landing/tests/roi-kam-content.test.mjs` — updated 3 assertions that asserted on the exact strings changed above (collateral, not scope creep — necessary to avoid introducing new test regressions from an approved text change).
- Commands run:
  - `node --test apps/landing/tests/roi-kam-content.test.mjs` → 2 pre-existing failures unrelated to this patch (confirmed via `git stash`/`git stash pop` that they failed before this patch too: `id="roi"` and "Den wirtschaftlichen Hebel prüfen" assertions never matched the file). The brand-related assertions I touched now pass.
  - `node --check tools/capture-screenshots.mjs` → pass
  - `node --check apps/landing/tests/roi-kam-content.test.mjs` → pass
  - `npx vite build --mode production` (in `apps/landing`) → pass, 27 modules transformed, build succeeded
  - `grep` sweep repo-wide for `@rauschenberger*.de` / `rauschenberger-catering.de` → none remain outside the audit report itself (expected, it's a citation)
- Validation results:
  - No real customer email domains remain in the in-scope files.
  - Landing page no longer names "Rauschenberger" directly; FoodNotify/Gastronovi appear only as parenthetical examples, primary copy uses generic connector language.
  - Seed file remains internally consistent (31 references to the renamed org id, matching the file's own header count of records).
  - Landing app still builds.

## Memory

- newFindings:
  - `RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE` (`InquirySource` enum) and `INHOUSE_RAUSCHENBERGER` (`CateringMode` enum) are Prisma schema enum values, not just seed strings — renaming them requires a migration and is explicitly out of scope for data-only patches.
  - `apps/api/prisma/seeds/mother_concern.sql`'s `ExternalCatalogEntry` rows reference real Stuttgart/Munich venues (Goldberg[Werk], Legendenhalle, Carl Benz Arena, ZENITH, Kesselhaus) — not flagged as P0 by the original audit (not emails/persons/phones) and left untouched; worth a follow-up look in a future patch.
  - `package.json` `name` fields (`@rauschenberger-os/api` etc.) and `OS.md` still carry the brand as npm scope — this is a Phase 2 product-identity item, not P0.
- reusableRules:
  - Before renaming any brand-coupled string in seed data, grep `apps/api/prisma/schema.prisma` for it — if it's an enum value, leave it for a schema-change patch instead.
  - Before renaming a seed's primary-key-like id string, grep all seed files for cross-references first.
- gotchas:
  - The landing content test file already had 2 unrelated stale assertions before this patch (verified via `git stash`) — do not assume "test still failing" after an edit means the edit broke something; diff against pre-edit state first.

## Review

- status: pass
- risks:
  - Real venue names in `mother_concern.sql` `ExternalCatalogEntry` rows remain (out of this patch's approved scope; flagged above for follow-up).
  - Product identity (`@rauschenberger-os/*` package names, `README.md`, `IDENTITY.md`, `BEVERO.md`) still describes an internal Rauschenberger OS — this is Phase 2 of the cleanup plan, intentionally not touched here.
  - 2 pre-existing, unrelated test failures remain in `roi-kam-content.test.mjs` (not introduced by this patch).
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 4
- nextGate: Phase 2 (Product Neutralization — README/IDENTITY/BEVERO.md rewrite) requires explicit operator approval before starting, per the cleanup plan's phase sequencing.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-01-p0-data-sanitization-landing-neutralization.md`
