# Task: CUBE Menu Matrix & Allergen Reference (Sub-Phase 3.2)

**Working title:** `cube-menu-matrix`

**Status:** `IMPLEMENTED` — ADR-0029-A2 drafted (proposed 2026-06-09); code landed. Pending Owner-Acceptance of ADR-0029-A2 + Supabase promotion.
**Owner-ADR (substrate):** ADR-0035 (proposed) — Substrate-Definition der 4 Menu-Modelle. Implementation läuft unter ADR-0029-A2 (to be drafted by architect agent; siehe `## Next gate`).
**Depends on:** Task 01 (`01-cube-sub-units-data-model.md` — `OperationalUnit` muss da sein; **verifiziert landed** L1047), ADR-0029-A (accepted 2026-06-09)
**Source spec:** CUBE-Website Speisekarte (Lunch, Dinner, vegetarisch, vegan möglich, Wine Flight), User-Pitch §4 Menü- und Angebotsstruktur, `00a-cube-venue-model-spec.md` §4 Offer-Catalog (binding)
**Target repo state:** `prisma/schema.prisma` erweitert um `Menu` / `MenuItem` / `MenuItemIngredient` / `MenuItemAllergen` als CUBE-Premium-spezifische Substrate; **alle 4 Modelle fehlen aktuell** in `prisma/schema.prisma` (verifiziert per Grep; siehe Field-Tabelle unten). Keine Rezepturverwaltung (VISION §3 out-of-scope).

## Decision

CUBE Premium braucht eine **Menü-Matrix**, die Gericht ↔ Zutaten ↔ Allergene ↔ Konsum-Hinweis verbindet. Bewusst **keine** Rezeptur-/Cost-of-Goods-Logik (FoodNotify bleibt führend).

- **`Menu`** — Speisekarte pro OperationalUnit, gebunden an `ServiceSlotKind` (Lunch, Dinner, Group-Menu), `courseCount` (3/4/5), `validFrom`/`validUntil`. **+ 00a §4:** `priceMode: String` (Default `gross_including_vat`); `scope: String` (Default `restaurant_lunch`); **DB-Check-Constraint** `priceMode IN ('gross_including_vat', 'net_excluding_vat')`.
- **`MenuItem`** — einzelnes Gericht, `position`, `category` (FISH_MEAT, VEGETARIAN, VEGAN_POSSIBLE, DESSERT, BEVERAGE_PAIRING, NON_ALCOHOLIC_PAIRING), `pricePerPersonCents`, `isVeganPossible`, `isVegetarian`, `description`. **+ 00a §4 + Task 02 OQ 4:** `imageUrl String?` (Cockpit-Display, `imageUrl` ist String-Optional in v1).
- **`MenuItemIngredient`** — FK auf `InventoryItem` (bestehend, globaler Master), `quantityPerPerson Float`, `unit String`, `isPremium Boolean`, `notes`. **Konsum-Hinweis**, nicht Rezeptur.
- **`MenuItemAllergen`** — `allergenCode String` (LMIV/EU-konform), `isTrace Boolean`. **Kein** globaler Allergen-Master, weil länder-/regionsspezifisch.

**PII-Sanitization:** keine PII in Menu-Daten.

**Read-View:** Cockpit zeigt pro OperationalUnit die aktive `Menu` (per `ServiceSlotKind` + `validFrom`/`validUntil`-Filter); Allergen-Liste ist read-only Display.

**Brutto/Netto-Invariante (00a §4, verbindlich):** "Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`. Harte Invariante, DB-Check-Constraint im Implementation-Slice." `Menu.scope IN ('restaurant_lunch', 'restaurant_dinner', 'ot_bar')` ⇒ `priceMode = 'gross_including_vat'`; `Menu.scope IN ('group_lunch', 'group_dinner', 'corporate_event', 'exclusive_rental', 'private_package')` ⇒ `priceMode = 'net_excluding_vat'`. Verletzung → 23514 `check_violation`. **Acht Scopes** (00a §4 verbatim): `restaurant_lunch, restaurant_dinner, group_lunch, group_dinner, corporate_event, exclusive_rental, private_package, ot_bar`. **Sechs Price-Modi** (00a §4 verbatim): `gross_including_vat, net_excluding_vat, per_person, for_two_persons, minimum_consumption, rental_fee`. **Sechs Order-Modi** (00a §4 verbatim): `a_la_carte, fixed_menu, group_menu_required, buffet, flying_buffet, package`.

**Read-Only-Posture (binding, mirror `scripts/verify-adr-0029a-operational-units.ts` L183–195, L224–236):** keine Write-Policies, kein `app_runtime`-Grant, `authenticated` SELECT only. Mutation ist explizit out-of-scope (00a §Out-of-Scope: "Read-Endpoints ... Schema-Implementierung in ADR-0029-A.2").

## File scope

Status-Spalte: ⏳ = ausstehend, Implementierung unter ADR-0029-A2. Keine der hier gelisteten Dateien ist aktuell auf Disk (verifiziert per `ls` und Grep in `prisma/schema.prisma` — keine der 4 Menu-Modelle existiert).

| Path | Aktion | Inhalt | Status |
|---|---|---|---|
| `prisma/schema.prisma` | edit | 4 neue Modelle (Menu, MenuItem, MenuItemIngredient→MenuItem_Ingredient, MenuItemAllergen→MenuItem_Allergen) + 1 Enum `MenuCategory` + priceMode/scope-Felder (00a §4) | ✅ landed 2026-06-09 |
| `prisma/migrations/20260609090000_add_cube_menu_matrix/migration.sql` | new | forward-only DDL + DB-Check-Constraint für Brutto/Netto-Invariante (00a §4) | ✅ |
| `prisma/migrations/20260609090001_add_cube_menu_matrix_rls/migration.sql` | new | ENABLE RLS, 1 SELECT-Policy/Tabelle, authenticated SELECT, kein app_runtime-Grant, keine Write-Policies | ✅ |
| `prisma/seeds/cube_menus.sql` | new | DEMO_MODE-gated, id-guarded; 3 Menüs + Items + Ingredients + Allergen; scope + priceMode gemäß 00a §4 | ✅ |
| `src/modules/menu/menu.types.ts` | new | DTOs; `priceMode`/`scope` Pflichtfelder; `imageUrl?` auf MenuItem | ✅ |
| `src/modules/menu/menu.service.ts` | new | `listByUnitAndSlot`, `getById`, `getItemWithDetails` | ✅ |
| `src/routes/menu.route.ts` | new | 3 Read-Endpoints path-encoded unter `/admin/menu/...` | ✅ |
| `src/app.ts` | edit | Route-Registrierung + `buildMenuDependencies(options)` | ✅ |
| `tests/menu.routes.test.ts` | new | 9 vitest cases (alle grün, 575 total) | ✅ |
| `scripts/verify-adr-0029a2-menu-matrix.ts` | new | 14-Query Supabase-Promotion-Script | ✅ |

## Open Questions

1. Soll `MenuItemIngredient.unit` freier String bleiben oder auf StoragePrecisionLevel-Enum der Location mappen? — **Empfehlung: freier String** in 3.2, Härtung als Phase-3.4-Folge. **Status 2026-06-09:** unverändert; bleibt Phase-3.4-Folge.
2. Soll `MenuItemAllergen` auf einen `Allergen`-Master zeigen (separater Slice) oder als String-Code freibleiben? — **Empfehlung: freier String-Code**, weil LMIV-Listen länderspezifisch sind. **Status 2026-06-09:** unverändert; String-Code in v1.
3. Soll `Menu` historisiert werden (alte Menüs bleiben referenzierbar für Event-Nachkalkulation)? — **Empfehlung: ja, soft via `validUntil`**, weil CUBE-Dinner-Menüs sich wöchentlich ändern können. **Status 2026-06-09:** unverändert; `validFrom`/`validUntil` als ISO-DateTime-Strings in v1.
4. Soll `MenuItem` eine `imageUrl` haben (Cockpit-Display)? — **Empfehlung: ja, `imageUrl String?`**, weil CUBE-Premium-Tile es visuell brauchen. **Status 2026-06-09:** unverändert; `imageUrl String?` in Implementation-Slice.

**Offene Architektur-Frage (00a §4, für ADR-0029-A2 zu klären):** Soll `priceMode` und `scope` als **String** (mit DB-Check-Constraint) oder als **Enum** modelliert werden? **Empfehlung:** String mit DB-Check-Constraint (analog `CUBE_SourceFieldConfidence`-Enum, aber hier sind 8 Scopes + 2 Price-Modi absehbar stabil). Enum-Erweiterung ist Migration-Headache.

## Authority Map (Reconciliation 2026-06-09)

| Layer | ADR/Spec | Status | Zweck |
|---|---|---|---|
| Substrate-Definition (Owner-ADR) | ADR-0035 | proposed | Definiert die 4 Menu-Modelle; **renumbered 2026-06-09: war ADR-0034-B** |
| Implementation-ADR (Verify-Gate) | **ADR-0029-A2** | **to be drafted by architect agent** | Führt die 4 Substrate + 00a-§4-Felder in DB-Check-Constraint-Shape aus; Migrations + RLS + Service + Route + Tests + 14-Query-Verify |
| Binding Spec | `00a-cube-venue-model-spec.md` §4 | accepted (ADR-0036-A Owner-Acceptance 2026-06-09) | 8 Scopes, 6 Order-Modi, 6 Price-Modi, Brutto/Netto-DB-Check-Constraint-Spec, `Menu.priceMode`/`Menu.scope` Annotationen |
| Binding Precedent | `00b-cube-source-conflict-validator.md` (read-only slice), `00c-cube-event-economic-rules.md` (read-only slice) | accepted | RLS-Posture, `revoke app_runtime` Grant, kein DELETE; substrate-shape und 14-/15-Query-Verify-Script-Pattern |
| Predecessor-ADR | ADR-0029-A (OperationalUnit, accepted 2026-06-09) | accepted | Schema-Shape, Service-Pattern (`buildMenuDependencies` mirror `buildOperationalUnitDependencies`), 14-Query-Verify-Pattern |

**Read-Only-Posture (binding, nicht-verhandelbar):** Verifiziert per `scripts/verify-adr-0029a-operational-units.ts` L183–195 (keine Write-Policies), L224–236 (kein `app_runtime`-Grant). Diese Posture gilt für ADR-0029-A2 als verbindliche Vorlage. Mutation-Surface ist explizit out-of-scope (00a §Out-of-Scope) und wird in einem Folge-ADR behandelt (analog `ADR-0029-B.2` für Source-Conflict, DECISIONS.md L1915–1942).

**00a §4 verbatim verbindlich:** "Restaurant-/Bar-Preise = `gross_including_vat`; Event-/Bankett-/Rental-Preise = `net_excluding_vat`. Harte Invariante, DB-Check-Constraint im Implementation-Slice." — `Menu.scope IN ('restaurant_lunch', 'restaurant_dinner', 'ot_bar')` ⇒ `priceMode = 'gross_including_vat'`; `Menu.scope IN ('group_lunch', 'group_dinner', 'corporate_event', 'exclusive_rental', 'private_package')` ⇒ `priceMode = 'net_excluding_vat'`.

## Bindings

- ADR-0002 (read-only POS v1) — keine Preiskalkulation, nur Display
- ADR-0014 (Org aus Supabase Auth)
- ADR-0017 (RLS durch `app_runtime` — aber read-only slice, kein Grant)
- ADR-0021 §3 — kein LLM-driven approval, kein Writeback, kein Service-Role in User-Path
- ADR-0030 §Decisions §1 (Profile-Discriminator: keine `name === "CUBE"`-Hardcoding)
- ADR-0029-A (OperationalUnit substrate, accepted) — Schema-Shape-Pattern
- ADR-0029-B (Source-Conflict, accepted) — RLS-Posture-Pattern
- ADR-0036-A (binding spec 00a §4)
- VISION §3 (Rezeptur out-of-scope) — `MenuItemIngredient` ist **Konsum-Hinweis**, keine Rezeptur
- VISION §7 Phase 3

## Gate (Definition of Done)

- `prisma validate` / `typecheck` / `vitest` (507 + 9 = 516) grün
- `scripts/verify-adr-0029a2-menu-matrix.ts` **14/14** Supabase-Promotion-Queries grün gegen named Supabase dev project
- Brutto/Netto-Invariante: 23514-Test (DB-Check-Constraint-Verletzung mit Mismatch) muss **exception werfen**
- Owner-Acceptance von ADR-0029-A2 (architect agent drafted, owner approved)
- `README.md` §"Task-Verzeichnis" Zeile 61 (Task 02 → ADR-0035) bleibt unverändert; ADR-0029-A2 ist Implementation-ADR und wird in der Renumbering-Tabelle **nicht** als Substrate-Slot gelistet (Substrate-Slot ist ADR-0035, bleibt ADR-0035)

## Next gate

**Architect agent drafts ADR-0029-A2 block in `docs/DECISIONS.md` style** (numbered §Decisions, §Open Questions, §Bindings, §Gate; precedent: ADR-0029-A §Decision, `docs/DECISIONS.md` L1720–1787). ADR-0029-A2 bindet Tasks 02+03 als gemeinsame Folge-Slice von ADR-0029-A; pre-deklarierte Slot-Inhalte: Schema-Substrat für Menu/MenuItem/MenuItemIngredient/MenuItemAllergen + 00a-§4-Felder, RLS-Posture (read-only, kein `app_runtime`-Grant, keine Write-Policies), Brutto/Netto-DB-Check-Constraint, Vitest 9 Cases, 14-Query-Verify-Script. Bis dahin ist Task 02 **stale-by-design** und nicht implementierbar.
