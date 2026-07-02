# Intent Memory — P0 Data Sanitization & Landing Brand Neutralization

- id: 2026-07-01-p0-data-sanitization-landing-neutralization
- timestamp: 2026-07-01T00:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-01-p0-data-sanitization-landing-neutralization.md`
- status: reviewed

## Core intention

Remove real customer data (PII: names, emails, phone numbers, address) and direct customer-name addressing from the parts of the repo that are visible externally or land in a demo database, without touching architecture, schema, or the product's deeper Rauschenberger-coupling — this was explicitly the first, smallest reviewable slice of a larger productization cleanup, not the cleanup itself.

## Logic followed

Followed the `p0-data-sanitization-and-landing-brand-neutralization` patch scope defined in the prior read-only audit. The guiding rule: fix what's real-world-sensitive and visible now (PII, direct customer address on the public landing), defer anything that touches schema/enums/migrations or the product's core identity to later, explicitly-gated phases (Phase 2–5 of the audit's cleanup plan).

## Design assumptions

- The audit's classification (P0 = real sensitive data, P1 = product identity, P2 = branding cleanup) still holds; this patch only clears P0 items plus the specific P1-adjacent landing text explicitly named in the approved scope (direct Rauschenberger addressing + FoodNotify/Gastronovi wording).
- Schema-coupled enum values (`RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`, `INHOUSE_RAUSCHENBERGER`) are architecture, not data — renaming them is a Phase 4 (industry profile extraction) concern requiring a migration, explicitly forbidden in this patch.
- A test assertion that breaks as a direct, mechanical consequence of an approved text change is collateral of that change, not new scope — fixing it stays inside the patch. A test assertion that was already broken before the patch is pre-existing debt — left alone.

## Tradeoffs

- Accepted:
  - Real external venue names (Goldberg[Werk], Legendenhalle, Carl Benz Arena, ZENITH, Kesselhaus, real Stuttgart/Munich cities) in `mother_concern.sql`'s `ExternalCatalogEntry` rows were left untouched — they weren't named as P0 in the audit (not emails/persons/phones) and touching them would have expanded the patch beyond its explicitly approved file list.
  - FoodNotify/Gastronovi still appear once each as a parenthetical example on the landing page (`z. B. FoodNotify, Gastronovi`) rather than being fully erased — this matches the patch scope's instruction to keep brands "as optional example only," not eliminate them.
- Rejected:
  - Renaming the `InquirySource`/`CateringMode` enum values to match — rejected because it requires a schema migration, explicitly forbidden by the approved patch scope.
  - Renaming `apps/api/package.json` etc. `@rauschenberger-os/*` scope — rejected, that's Phase 2 product-identity work, not P0 data sanitization.

## Durable memory

- Prisma enum values that embed brand names (`RAUSCHENBERGER_WEBSITE`, `CUBE_WEBSITE`, `INHOUSE_RAUSCHENBERGER` in `apps/api/prisma/schema.prisma`) are a hard boundary for any future "just replace the string" cleanup pass — always grep the schema first.
- The `org-rauschenberger` seed id was safe to rename because no other seed file referenced it — this was verified, not assumed, before the rename. Future seed-id renames should repeat that check.
- The landing content test (`apps/landing/tests/roi-kam-content.test.mjs`) had pre-existing unrelated failures (`id="roi"`, "Den wirtschaftlichen Hebel prüfen") before this patch — don't attribute those to future changes without diffing against the pre-change state first.

## Do not reuse blindly

- Do not assume the `mother_concern.sql` `ExternalCatalogEntry` venue names are fine to ship as-is in a customer-facing SaaS demo — they're real venues, just not flagged P0 by the original audit's narrow definition (persons/emails/phones). Re-evaluate before any external release.
- Do not read the "FoodNotify, Gastronovi" parenthetical examples on the landing page as a green light to keep brand-specific integration language elsewhere — this was a deliberate exception for exactly two sentences, not a general policy.

## Relation to Rauschenberger OS / Bevero

- location logic: not touched — `motorworld_inn_standorte.sql`/`multi_location.sql` (real location seed data) explicitly deferred to Phase 3.
- role/approval logic: not touched.
- inventory/procurement/shift-planning logic: not touched.
- external-system boundary: FoodNotify/Gastronovi visible copy neutralized to generic "Planungssystem"/"POS-System" language on the landing page only; the actual connector/adapter code and `docs/integrations/gastronovi.md`'s technical contract were left conceptually as-is (only the one leaked env-example email was masked).

## Next logic gate

Phase 2 (Product Neutralization: `README.md`, `IDENTITY.md`, `BEVERO.md` rewrite from "Rauschenberger OS" to a neutral "Bevero" product identity) is the next step in the cleanup plan — needs explicit operator approval before starting, since it touches root identity documents.
