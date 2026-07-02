# Bevero Productization Audit — Rauschenberger/Motorworld Context Cleanup

## Result
**partial** — Produktisierung ist realistisch, aber ohne konkrete Bereinigung nicht auslieferbar. Es existieren echte Kundendaten (E-Mail-Domains, reale Standortnamen) und die gesamte Produktidentität ist als "Rauschenberger OS" verdrahtet.

## Scope
**Gelesen:**
- Root-Dokumente: `README.md`, `IDENTITY.md`, `BEVERO.md`, `OS.md`, `AGENTS.md`, `MIGRATION.md`, `CLAUDE.md`
- `apps/landing/` (src, public/screenshots, tests)
- `apps/cockpit/` (app, components, lib)
- `apps/api/prisma/seeds/`, `apps/api/prisma/migrations/` (Namen), Tests/Fixtures (Stichprobe)
- `docs/` (Struktur + Brand-Grep), `assets/Screenshots/`

**Ausgelassen (mit Begründung):**
- `.env`, `.env.example` — laut Auftrag nicht geöffnet; Secrets nicht gelesen.
- `node_modules/`, `dist/`, `.next/`, `.vercel/`, `package-lock.json` — Build/Vendor, nicht produktrelevant.
- Binär-Inhalt der PNG-Screenshots — nur Dateinamen/Alt-Text-Ebene bewertet; visueller Inhalt = `needs_manual_review`.

## Executive Summary
- **Kundenspezifik: hoch.** Rauschenberger erscheint in 116 Dateien, Motorworld in 90, FoodNotify in 87, Gastronovi in 61, Böblingen in 32. Das ist kein Rand-Branding, sondern durchzieht Identität, Docs, Seeds, Migrations-Namen und teils UI.
- **White-Label realistisch:** Die Architektur ist bereits mandantenfähig gedacht (Brands/Locations/`LocationProfile`, `DEMO_MODE`-Guards in Seeds, generische Integrations-Adapter). Das Produkt ist technisch abstrahierbar — die Kundenspezifik sitzt v.a. in Identität, Doku und Demo-Daten, nicht hart im Domänenmodell.
- **Größte Risiken:**
  1. **Echte Kundendaten** in Seeds: `info@rauschenberger-catering.de`, `ops@rauschenberger.de` sowie reale Standorte (Motorworld München/Böblingen/Warthausen, CUBE Stuttgart) → Privacy/Vertraulichkeit.
  2. **Produktidentität = "Rauschenberger OS"** (README-Titel, IDENTITY.md, Docs) → verhindert Verkauf als neutrale SaaS.
  3. **Migrations-/Schema-Namen** mit `cube_*`, `motorworld_inn_*`, `mother_concern_*` → Brand leckt in die technische Historie (schwer reversibel).

## Findings by Severity

### P0 — Blocking
| ID | File | Line/Area | Finding | Why it matters | Recommended action |
|----|------|-----------|---------|----------------|--------------------|
| P0-1 | `apps/api/prisma/seeds/mother_concern.sql` | L9, L13 | Reale Org `Rauschenberger Catering & Restaurants` + reale Domain-Mail `inf***@rauschenberger-catering.de` | Echte Kundendaten in Seed, landet in DB/Demo | Durch `ExampleCo GmbH` / `info@example.com` ersetzen |
| P0-2 | `apps/api/prisma/seeds/mother_concern.sql` | L68–L70 | Inquiry-Demo mit `eri***@musterfirma.de`, `pet***@company.de`, Telefonnr. `+49 711 9999 0x`, realer Sales-Kontext | Wirkt wie echte Anfragen; teils reale Domains | Vollständig auf `@example.com` + `+49 000…` normalisieren |
| P0-3 | `docs/integrations/gastronovi.md`, `docs/tasks/logik/10-rauschenberger-meta-layer-contract.md`, `docs/architecture/inquiry-routing.md`, `tools/capture-screenshots.mjs` | `rauschenberger-catering` / `@rauschenberger.de` | Reale Domains/`ops***@rauschenberger.de` in Doku & Tooling | Vertrauliche Kundenadressen im Repo | Maskieren/entfernen; als generische Beispiele |
| P0-4 | `apps/landing/public/screenshots/` (23 PNG), `assets/Screenshots/01-tabs/19-mother-concern.png`, `…07-…-foodnotify.png` | Bildinhalt | Screenshots aus Live-Instanz könnten reale Standort-/Artikel-/Teamdaten zeigen | Öffentlich ausgelieferte Landing-Assets | `needs_manual_review`: Bilder prüfen, bei realen Daten neu mit Demo-Tenant aufnehmen |

### P1 — Product Blocker
| ID | File | Line/Area | Finding | Why it matters | Recommended action |
|----|------|-----------|---------|----------------|--------------------|
| P1-1 | `README.md` | L1, L10–L12 | Titel „Rauschenberger OS", „KI-Governance-Schicht der Rauschenberger Gruppe", Autor genannt | Erstkontakt-Dokument = internes Konzern-OS | Neutrales Produkt-README (Bevero als SaaS) |
| P1-2 | `IDENTITY.md` | L1, L11, L93–L99, L211 | Kernidentität: „Rauschenberger OS … der Rauschenberger Gruppe"; Konzernbaum Motorworld/CUBE/Mother Concern; Konsumenten = Rauschenberger Gruppe | Produkt ist als Single-Tenant-Konzern-OS definiert | Als Tenant-Beispiel/Case-Study abstrahieren; Produktidentität = Bevero |
| P1-3 | `BEVERO.md` | L3, Struktur | „part of the **rauschenberger-os** monorepo" | Bindet Produkt an Kunde-Monorepo | Als „Bevero platform monorepo" umschreiben |
| P1-4 | `apps/api/prisma/seeds/motorworld_inn_standorte.sql`, `multi_location.sql` | ganze Datei | Reale Standortstruktur (Motorworld München/Böblingen/Warthausen, CUBE Stuttgart, reale Features) als Demo-Seed | Fest verdrahtete Kundenrealität als „Demo" | Generische Demo-Tenants (Demo Site Alpha/Beta) |
| P1-5 | `apps/api/prisma/migrations/*` | `..._add_cube_*`, `..._add_motorworld_inn_*`, `..._add_mother_concern_*` (>15 Migrationen) | Brand-Begriffe in Migrations-/Tabellennamen | Leckt in Schema-Historie; nicht triviale Umbenennung | Neue Migrationen ab jetzt neutral benennen; Alt-Historie als P3 belassen |
| P1-6 | `apps/cockpit/lib/location-tiles.ts` | L1, L25–L39 | `LocationProfile` = `MOTORWORLD_STANDARD` / `CUBE_PREMIUM` als Code-Enum | Branchen-/Kundenprofil hart im Frontend-Typ | Enums neutralisieren: `STANDARD_SITE` / `PREMIUM_SITE` |
| P1-7 | `apps/landing/src/App.jsx` | L47, L125, L449, L648 | Landing spricht direkt „Rauschenberger" an („Ist … für Rauschenberger relevant", „kein offizielles Rauschenberger-Projekt") | Öffentliche Seite ist an einen Kunden adressiert | Auf generisches Tenant/Prospect-Wording umstellen |

### P2 — Branding Cleanup
| ID | File | Line/Area | Finding | Why it matters | Recommended action |
|----|------|-----------|---------|----------------|--------------------|
| P2-1 | `apps/landing/src/App.jsx` | L15,31,74,116,129,154,166,249–253,376,646 | FoodNotify/Gastronovi als konkrete Quell-Systeme im sichtbaren Text + Hub-Diagramm | Nagelt Produkt auf zwei spezifische Anbieter fest | Als „POS Source Connector" / „External Planning System" abstrahieren; Marken als Beispiel-Logos optional |
| P2-2 | `apps/cockpit/app/(app)/mother-concern/`, `…/workspaces/[locationId]/event-ops/` | Routen/Labels | „Mother Concern", Event-Ops-Vokabular als feste UI-Begriffe | Konzern-/Hospitality-Sprache in generischem Core | Generische Labels („Organization", „Site") + Hospitality-Profil |
| P2-3 | `apps/api/prisma/seeds/bar_inventory_items.sql`, `bar_initial_stock.sql`, `cube_menus.sql`, `kitchen_*` | Artikel/Kategorien | Konkrete Bar-/Küchen-Artikel als Demo | Nur sinnvoll wenn Hospitality-Profil aktiv | In Hospitality-Demo-Profil auslagern |
| P2-4 | `assets/Screenshots/…/07-service-desktop-einkauf-foodnotify.png` u.a. | Dateinamen/Alt | Marken-/Bereichsnamen in Asset-Namen (`foodnotify`, `bar`, `kueche`) | Sichtbar in Repo/Doku | Bei Neu-Capture generisch benennen |

### P3 — Allowed / Historical Context
| ID | File | Line/Area | Finding | Keep condition |
|----|------|-----------|---------|----------------|
| P3-1 | `docs/agent-team/**/*logbook*`, `MIGRATION.md`, `docs/DECISIONS.md` (ADRs) | Historie | Rauschenberger/Motorworld in Intent-/MSPR-Logs, ADR-Historie | Behalten, wenn klar als Projekt-/Entscheidungshistorie markiert, nicht ausgeliefert |
| P3-2 | `docs/integrations/gastronovi.md` | Adapter-Konzept | Gastronovi/FoodNotify als Integrations-Design | Behalten als **generischer Connector-Blueprint** (Marke als „ein möglicher Anbieter") |
| P3-3 | Alt-Migrationen mit Brand-Namen | Schema-Historie | Bereits gemergte Migrationen | Behalten (Rewrite bräche DB-Historie); nur Namen künftig neutral |
| P3-4 | `logs/` | interne Logs | Betriebslogs mit Kontext | Behalten, sofern nicht in Build/Deploy ausgeliefert |

## Surface Map

### UI / Cockpit
- `apps/cockpit/lib/location-tiles.ts` — `MOTORWORLD_STANDARD` / `CUBE_PREMIUM` Enums (P1-6).
- `apps/cockpit/app/components/app-shell.tsx`, `providers/workspace-provider.tsx` — Brand-Referenzen (Navigation/Workspace).
- `apps/cockpit/components/bestand/OechsleBanner.tsx`, `EventSpaceCard.tsx`, `ReservationConnectorList.tsx` — Hospitality-/Standort-spezifische Komponenten (Öchsle, Event Space).
- Routen: `(app)/mother-concern`, `(app)/workspaces/[locationId]/event-ops`, `kitchen`, `schichtplan`, `freigaben` — Hospitality-Vokabular.
- `apps/cockpit/lib/backend/procurement-orders.ts` — FoodNotify/Gastronovi-Bezug.

### Landing Page
- `apps/landing/src/App.jsx` — an Rauschenberger adressierte Claims (P1-7) + FoodNotify/Gastronovi im Text & Hub-SVG-`aria-label` (P2-1).
- `apps/landing/index.md`, `apps/landing/tests/roi-kam-content.test.mjs` — Brand-Wording in Content/Tests.
- `apps/landing/public/screenshots/*` — 23 Produkt-Screenshots (P0-4, `needs_manual_review`).

### Backend / API
- Seeds: `mother_concern.sql` (P0-1/2), `motorworld_inn_standorte.sql` + `multi_location.sql` (P1-4), `cube_*`, `bar_*`, `kitchen_*` (P2-3) — alle mit `DEMO_MODE`/Guard, aber reale Werte.
- Migrations: `add_cube_*`, `add_motorworld_inn_*`, `add_mother_concern_*` (P1-5).
- Tests/Fixtures: `apps/api/tests/gastronovi/`, `tests/fixtures/` — Marken-Fixtures (`needs_manual_review` auf reale Werte).

### Documentation
- `README.md`, `IDENTITY.md`, `BEVERO.md`, `docs/RAUSCHENBERGER-OS-SUMMARY.md`, `docs/VISION.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` — beschreiben internes Konzern-OS (P1/P3).
- `docs/tasks/logik/09-cockpit-motorworld-event-space-board.md`, `00c-cube-event-economic-rules.md` — brand-spezifische Task-Specs.
- 79 Doc-Dateien mit Rauschenberger/Motorworld (überwiegend Logbook-Historie → P3-1).

### Assets / Screenshots
- `apps/landing/public/screenshots/` (öffentlich, P0-4).
- `assets/Screenshots/01-tabs/`, `02-cta-flows/` — interner Audit; Namen wie `19-mother-concern`, `…-foodnotify`, `…-bar` (P2-4). Interner Audit-Report `assets/Screenshots/screenshot-audit-report.md`.

## Replacement Strategy
| Current term/context | Replacement | Reason |
|---|---|---|
| Rauschenberger / Rauschenberger Gruppe | Tenant / Customer / ExampleCo GmbH | Produktneutralität |
| Rauschenberger OS | Bevero (Produktname) | Produktidentität statt Kunde |
| Mother Concern | Organization / Parent Org | generische Mandantenstruktur |
| Motorworld / Motorworld Inn | Demo Site Alpha | generischer Standort |
| Motorworld Inn BB / Böblingen | Demo Site Alpha (City) | Standort-/Ortsneutralität |
| CUBE / CUBE Stuttgart / CUBE_PREMIUM | Premium Site Profile / Demo Site Beta | branchentaugliche Abstraktion |
| MOTORWORLD_STANDARD | STANDARD_SITE | neutrales Enum |
| FoodNotify | External Planning System (Connector) | Integration neutralisieren |
| Gastronovi | POS Source Connector | technische Abstraktion |
| info@rauschenberger-catering.de / @rauschenberger.de | info@example.com | reale Daten entfernen |
| Erika Mustermann / Petra Schmidt / Hans Bauer + Domains | Demo User + @example.com | Demo-Personen neutralisieren |
| Bar / Küche | Area: Bar / Area: Kitchen (nur Hospitality-Profil) | Branchenprofil, nicht Core |
| Lager / Lagerort | Stock Location / Storage | generisch |
| Öchsle / Warthausen-Features | generische Demo-Features | Standort-Spezifik raus |

## Cleanup Plan

### Phase 1 — P0 Sanitization
Ziel: Keine echten Kundendaten / sichtbaren sensiblen Werte im Repo oder in Demos.
1. `mother_concern.sql`: reale Org + Mail + Inquiry-Kontakte auf `ExampleCo` / `@example.com` / neutrale Telefonnr. setzen (P0-1/2).
2. Doku/Tooling entkontaminieren: `@rauschenberger-catering.de`, `@rauschenberger.de` in `docs/integrations/gastronovi.md`, `docs/tasks/logik/10-…`, `docs/architecture/inquiry-routing.md`, `tools/capture-screenshots.mjs` maskieren (P0-3).
3. Landing-Screenshots visuell prüfen; bei realen Standort-/Artikel-/Teamdaten mit Demo-Tenant neu aufnehmen (P0-4).
4. Grep-Gate ergänzen: CI-Check gegen reale Domains/Personennamen.

### Phase 2 — Product Neutralization
Ziel: Rauschenberger/Motorworld aus der Produktidentität entfernen.
1. `README.md` neu als Bevero-SaaS-README (Titel, Betreiber-Zeile, Autor).
2. `IDENTITY.md` → Produktidentität „Bevero"; Konzernbaum als Tenant-Beispiel/Case-Study markieren.
3. `BEVERO.md`: „rauschenberger-os monorepo" → „Bevero platform monorepo".
4. `docs/RAUSCHENBERGER-OS-SUMMARY.md`, `VISION.md`, `ARCHITECTURE.md` produktneutral fassen; Kundenbezug → Case-Study-Anhang.

### Phase 3 — Demo Tenant Refactor
Ziel: Generische Demo-Daten statt echter Standort-/Artikel-/Teamdaten.
1. `motorworld_inn_standorte.sql` + `multi_location.sql` → „Demo Site Alpha/Beta" mit fiktiven Features.
2. `bar_*`, `cube_menus.sql`, `kitchen_*` in ein optionales Hospitality-Demo-Bundle auslagern.
3. `DEMO_MODE`-Guards beibehalten; Demo-Seed als eigener, klar getrennter Namespace.

### Phase 4 — Industry Profile Extraction
Ziel: Hospitality als erstes Profil, nicht hart im Core.
1. `LocationProfile`-Enum neutralisieren (`STANDARD_SITE`/`PREMIUM_SITE`) + Mapping-Layer.
2. Hospitality-spezifische Komponenten/Labels (Öchsle, Event Space, Bar/Küche) hinter ein „Hospitality"-Profil legen.
3. Neue Migrationen ausschließlich neutral benennen; Brand-Begriffe nur in Alt-Historie (P3).

### Phase 5 — Documentation Rewrite
Ziel: Von internem Projekt zu SaaS-/Produktdoku.
1. Root-Docs auf Produktsicht; Kunden-Historie in `docs/history/` bzw. als Case Study kennzeichnen.
2. `docs/integrations/gastronovi.md` als generischen Connector-Blueprint rahmen (Marke = ein Beispiel).
3. Logbook/ADR-Historie unangetastet lassen, aber Disclaimer „historisch, nicht ausgeliefert".

## Proposed File Changes
| File | Change type | Priority | Description |
|---|---|---|---|
| `apps/api/prisma/seeds/mother_concern.sql` | edit | P0 | Reale Org/Mail/Inquiry → Demo |
| `docs/integrations/gastronovi.md` | edit | P0 | Reale Domains maskieren |
| `docs/tasks/logik/10-rauschenberger-meta-layer-contract.md` | edit | P0 | Reale Domains/Kontext maskieren |
| `docs/architecture/inquiry-routing.md` | edit | P0 | Reale Mail entfernen |
| `tools/capture-screenshots.mjs` | edit | P0 | Reale Login/Domain entfernen |
| `apps/landing/public/screenshots/*` | replace | P0 | Neu-Capture aus Demo-Tenant (nach Review) |
| `README.md` | rewrite | P1 | Bevero-SaaS-README |
| `IDENTITY.md` | rewrite | P1 | Produktidentität + Case-Study-Trennung |
| `BEVERO.md` | edit | P1 | Monorepo-Framing neutralisieren |
| `apps/cockpit/lib/location-tiles.ts` | edit | P1 | Enums neutralisieren |
| `apps/api/prisma/seeds/motorworld_inn_standorte.sql`, `multi_location.sql` | rewrite | P1 | Generische Demo-Tenants |
| `apps/landing/src/App.jsx` | edit | P1/P2 | Kunden-Ansprache + FoodNotify/Gastronovi abstrahieren |
| `apps/api/prisma/migrations/**` | policy | P1 | Nur künftige Namen neutral |
| `apps/api/prisma/seeds/bar_*`, `cube_*`, `kitchen_*` | move | P2 | In Hospitality-Demo-Bundle |
| `docs/*SUMMARY*/VISION/ARCHITECTURE` | rewrite | P2 | Produktneutral |

## Risk Review
- **Daten-/Privacy-Risiko: hoch** — reale Kundendomain-Mails + reale Standortdaten in Seeds/Docs (P0-1..3). Muss vor jeder externen Demo/Repo-Freigabe weg.
- **Sales-/Branding-Risiko: hoch** — Produkt liest sich als internes „Rauschenberger OS"; nicht als neutrale SaaS verkaufbar (P1-1..3).
- **Architektur-Risiko: mittel** — Enums/Migrations-Namen verdrahten Brand; Enum-Rename betrifft Code+DB, Migrations-Historie ist nicht sauber reversibel (P1-5/6).
- **Demo-Risiko: mittel** — `DEMO_MODE`-Guards existieren (gut), aber Demo-Inhalt ist reale Realität statt fiktiv (P1-4).
- **Test-/Fixture-Risiko: mittel** — Marken-Fixtures (`tests/gastronovi/`, `fixtures/`) können reale Werte enthalten; `needs_manual_review`.
- **Dokumentations-Risiko: mittel** — 79 Doc-Dateien mit Brand; Großteil Historie (P3), aber Root-Docs sind Produktblocker.

## Suggested Next Patch Scope
```yaml
next_patch_scope:
  name: "p0-data-sanitization-and-landing-brand-neutralization"
  goal: "Reale Kundendaten aus Seeds/Docs/Tooling entfernen und die öffentliche Landing-Ansprache von 'Rauschenberger' auf generisches Tenant-Wording umstellen — ohne Architektur-Rewrite."
  files:
    - "apps/api/prisma/seeds/mother_concern.sql"
    - "docs/integrations/gastronovi.md"
    - "docs/tasks/logik/10-rauschenberger-meta-layer-contract.md"
    - "docs/architecture/inquiry-routing.md"
    - "tools/capture-screenshots.mjs"
    - "apps/landing/src/App.jsx"
  allowed_changes:
    - "Reale E-Mail-Domains/Personen/Telefonnummern in Seeds & Docs durch @example.com / Demo-Werte ersetzen"
    - "In App.jsx direkte 'Rauschenberger'-Ansprache durch neutrales Tenant/Prospect-Wording ersetzen"
    - "FoodNotify/Gastronovi im sichtbaren Text als 'POS Source Connector' / 'External Planning System' benennen (Marken als optionales Beispiel)"
  forbidden_changes:
    - "Keine Enum-/Schema-/Migrations-Umbenennung"
    - "Keine Umbenennung von cube_*/motorworld_inn_*/mother_concern_* Migrationen"
    - "Kein Löschen von ADR-/Logbook-Historie"
    - "Kein Re-Capture der Screenshots in diesem Patch (separater Schritt nach Review)"
  done_when:
    - "grep über Repo (ohne node_modules/history) findet keine realen @rauschenberger*.de-Adressen mehr"
    - "Landing enthält keine namentliche Rauschenberger-Ansprache mehr"
    - "Landing-Text nennt Integrationen generisch, Marken nur als Beispiel"
    - "Seeds bleiben lauffähig unter DEMO_MODE mit Demo-Werten"
```

## Final Verdict
**partial.** Produktisierung ist gut machbar — die Architektur trägt Mandantenfähigkeit bereits. Aber vor jeder externen Freigabe müssen die P0-Kundendaten (reale Rauschenberger-Domains, reale Standortseeds, evtl. Screenshots) saniert und die Produktidentität von „Rauschenberger OS" auf ein neutrales „Bevero"-SaaS umgestellt werden. Brand in Migrations-Historie und ADRs darf als gekennzeichnete Historie/Case-Study bleiben.
