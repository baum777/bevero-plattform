# Bevero — Task 1 + 2 Gap Closure Plan

**Datum:** 2026-07-03
**Gegenstück:** `task-1-2-gap-review.md` (Gap-Details, IDs, Evidence).
**Modus:** Nur eindeutig sichere Doku-Patches angewendet. Alle Code-, DB-, Deploy-, Preis- und DSGVO-Änderungen sind Owner-Freigaben vorbehalten.

---

## P0-Blocker — exakte Schließschritte

### B1 — Produktfähigkeits-Tabelle verifizieren (G1 → O2) *versandblockierend*
**Ziel:** Jeder der 6 Claims in `outreach-readiness.md` Abschnitt 2d hat eine Runtime-Evidence-Entscheidung (☑ belegt / ☐ abschwächen / entfernen).
**Schritte:**
1. Read-only: pro Claim Code-/Test-/Smoke-Evidence sammeln (`apps/api/src/routes/*`, `apps/api/prisma/schema.prisma`, `apps/api/scripts/smoke/*`, `apps/cockpit/e2e/*`).
2. Pro Zeile Häkchen-Vorschlag + Evidence-Link notieren (noch nicht setzen).
3. Owner-Review → dann Häkchen setzen ODER Claim-Text in Sales-Dokumenten abschwächen/entfernen.
**Nicht-Ziel:** Keine Code-Änderung, keine neuen Tests in diesem Slice (nur Evidence sammeln).
**Done:** 6 Zeilen mit Decision (☑/abschwächen/entfernen) + Evidence-Pfad dokumentiert.
**Risiko:** niedrig (read-only). **Modellrolle:** medium (Code-Inspektion).

### B2 — DSGVO Stufe 2 entscheiden (G2 → O3) *versand- + pilotblockierend*
**Ziel:** Eindeutige Owner-Entscheidung (A) bei Stufe 1 bleiben ODER (B) 4 Voraussetzungen nachweisen.
**Schritte (falls B):**
1. Supabase-Region im Dashboard prüfen + in neuem `docs/deployment-supabase.md` dokumentieren (muss = EU sein).
2. Vercel-DPA + Supabase-DPA beschaffen, unterzeichnen, als Evidence ablegen.
3. CSV-Export als Smoke-Test laufen lassen (Tenant-Export → Download).
4. Löschprozess definieren (`docs/productization/bevero-data-deletion-policy-v0.md`: wer löscht was, Weg, Frist, Audit-Trail-Integrität via Pseudonymisierung).
5. `outreach-readiness.md` Abschnitt 3 Checkliste abhaken; `pilot-offer.md` Abbruch-Kriterien nur dann als Zusage stehen lassen.
**Nicht-Ziel:** Keine rechtliche Beratung; DPA-Inhalte vom Legal bestätigen lassen.
**Done:** Owner-Entscheidung dokumentiert; bei (B) alle 4 Voraussetzungen mit Evidence-Link.
**Risiko:** mittel (rechtlich). **Modellrolle:** owner + medium (Dokumentation).

### B3 — Production-Environment deklarieren (G3 → O4) *pilot-/productionblockierend*
**Ziel:** Eindeutige, getrackte Bevero-Production-Supabase-Project-Ref; Split-Brain aufgelöst.
**Schritte:** Closure-Runbook Gate 1–5 durchlaufen: Declare Target → Prepare Coherent Value Set → Apply (separat authorisiert) → Verify (ohne Secrets) → Runtime + Recovery.
**Entscheidungsoptionen:** (a) `czinch…` consumer (keine Bevero-Migrationen), (b) `ienws…` Dev (keine Prod-Closure), (c) isolierte Bevero-Production (neu, mit Backup/PITR).
**Done:** Production-Ref dokumentiert; lokale `.env` und Vercel-Production kohärent; UI-Smoke erfolgreich.
**Risiko:** hoch. **Modellrolle:** owner + medium (Runbook). **Wichtig:** Secrets niemals anzeigen/kopieren.

### B4 — Backup/PITR (G4 → O5) *pilotblockierend*
**Schritte:** Backup/PITR für die (gemäß B3) deklarierte Production-DB aktivieren + Restore-Test verifizieren. Alternative: befristetes, signiertes Risk-Acceptance (Owner, Ablaufdatum, Review-Termin).
**Done:** Backup-Status dokumentiert (aktiviert + verifiziert) ODER signiertes Risk-Acceptance.
**Risiko:** hoch. **Modellrolle:** owner.

---

## P1-Fixes

- **G6 Warenannahme-Foto:** Owner-Entscheidung — (A) Foto-Feld + Upload-Endpoint bauen, (B) Foto-Pflicht aus `prd.md`/`use-cases.md` entfernen, (C) in `outreach-readiness.md` als "geplant, nicht implementiert" markieren. Bis dahin: Foto nicht als MVP-Fähigkeit kommunizieren.
- **G7 Mobile/Rampe offline:** `outreach-readiness.md:55-56` qualifizieren ("Mobile-first UI belegt, Offline-Rampe nicht getestet") + Offline-Smoke anlegen (queue → sync → conflict).
- **G8–G11 Häkchen 56–59 (Auffüllliste-Status / Schichtübergabe / Korrektur-Freigabe / Audit-Trail):** Code-Evidence vorhanden, aber **erst nach Runtime-Verifikation (B1/O2)** setzen. Bis dahin ☐ lassen und Claims in Sales-Mails nicht verwenden.
- **G12 Lead-Steckbrief-Vorlage (O7):** `docs/sales-kit/templates/lead-steckbrief.md` neu erstellen (Pflichtfelder: Basisdaten, Aufhänger, Fit-Einschätzung, Quelle, Notizen); `outreach-readiness.md` Abschnitt 4 darauf verweisen. **Rein additiv, sicher.**
- **G13 Hartkodierter Playwright-Pfad:** `tools/capture-screenshots.mjs:9` — Playwright als Dev-Dependency installieren, Pfad dynamisch via `node_modules` auflösen. *Nur Tooling, kein Runtime-Code.*

## P2-Verbesserungen

- **G14 Offline-Toleranz:** Integrationstest für `OfflineActionQueue` (queue → sync → conflict); bis dahin Claim auf "Architektur vorhanden, nicht produktionsgetestet".
- **G15 UX "wie WhatsApp":** nur nach operativem Pilot-/Usability-Test als Claim; bis dahin ☐.
- **G16 Landing-typecheck:** `apps/landing/package.json` `typecheck` auf echtes `tsc --noEmit` umstellen.
- **G17 Cockpit-Read Live-Check (optional):** authentifizierter Login → Bestands-Browser Kategorien + Übersicht Review-Task-Zähler prüfen; Ergebnis als Evidence-File.
- **G18 Auffülllisten-Unschärfe:** `sales-transfer.md` Claim 5 prominent mit "⚠️ Nur nach Pilot v1.5" markieren oder in "Future Claims"-Abschnitt verschieben; `pilot-offer.md` "vorlage-basiert" beibehalten.
- **G19 DSGVO-Readiness-Dokument:** `docs/sales-kit/dsgvo-readiness.md` neu — Status (Stufe 1 aktiv / Stufe 2 pending), 4 Voraussetzungen je mit Owner + Status, Freigabe-Prozess.
- **G20 `cold-start-ai-plan.md`:** Existenz prüfen; falls vorhanden in Spec-Pack-Inventory aufnehmen, sonst erstellen/markieren.

---

## Konkrete Folgeprompts (fertige Arbeitsaufträge)

> **FP1 — O2 Runtime-Verifikation (read-only).** *"Prüfe read-only die 6 Produktfähigkeits-Claims in `docs/sales-kit/outreach-readiness.md` Abschnitt 2d gegen Code/Tests/Smoke (`apps/api/src/routes`, `prisma/schema.prisma`, `apps/api/scripts/smoke`, `apps/cockpit/e2e`). Erstelle pro Claim einen Evidence-Eintrag (Datei:Funktion/Route) und einen Häkchen-Vorschlag (☑ belegt / abschwächen / entfernen). Ändere keine Datei."*

> **FP2 — Lead-Steckbrief-Vorlage (O7).** *"Erstelle `docs/sales-kit/templates/lead-steckbrief.md` mit Pflichtfeldern (Betriebsname, Adresse, Ansprechpartner, Betriebsart/Größe, betriebsspezifischer Aufhänger, Fit-Einschätzung, Quelle, Notizen). Verlinke die Vorlage aus `docs/sales-kit/outreach-readiness.md` Abschnitt 4. Rein additiv."*

> **FP3 — DSGVO-Readiness-Dokument (G19).** *"Erstelle `docs/sales-kit/dsgvo-readiness.md`: aktueller Status (Stufe 1 aktiv, Stufe 2 pending), die 4 Stufe-2-Voraussetzungen je mit Status + Owner (Supabase-Region: DevOps, DPA: Legal, Export: QA, Löschung: Product), Freigabe-Prozess + Zeitpunkt. Keine rechtlichen Behauptungen, nur Status-Tracking."*

> **FP4 — Roadmap-Nachfach (R6).** *"Erhebe strukturiert Roadmap-/Task-Lücken in `docs/productization/spec-pack/product-roadmap.md` und angrenzenden Plan-Doks: Gaps ohne Roadmap-Eintrag, Aufgaben ohne Done-Kriterium, Product-Claims ohne Task, Risiken ohne Owner-Gate, zu unscharfe Folgeaufgaben. Gib jede Lücke als kleinen Task-Block (Name/Ziel/Scope/Nicht-Ziele/Done/Risiko/Modellrolle)."*

> **FP5 — Production-Environment-Runbook (O4/O5).** *"Bereite (read-only) den Decision-Input für O4/O5 vor: liste Werte-Quellen und Inkonsistenzen zwischen lokalen `.env`-Files und Vercel-Production-Scopes OHNE Secrets anzuzeigen. Skizziere die 3 Optionen (a/b/c) mit Migrations-/Backup-Folgen. Keine Secrets, kein Deploy, kein Apply."*

---

## Patch-Abschnitt — sicher direkt gemacht

| # | Datei | Änderung | Grund | Risiko | Owner-Review? |
|---|---|---|---|---|---|
| **P1** | `docs/productization/spec-pack/use-cases.md` | Rollen-Notation `Lager/Warenannahme` → `Lager / Warenannahme` (Leerzeichen um Slash) | P2 Terminologie-Konsistenz mit `prd.md` | niedrig (rein kosmetisch, kein Semantik-Effekt) | nein |
| **P2** | `docs/productization/spec-pack/sales-transfer.md` | Claim 2: "… von 7:30 Uhr ist **um 7:35 Uhr** beim Küchenchef …" → "… von 7:30 Uhr ist beim Küchenchef …" | implizite 5-Minuten-Zeitgarantie entfernt (technisch nicht zusicherbar) | niedrig (rein rhetorisch, keine Produktfähigkeit/Zusage geändert) | nein |

Beide Patches sind **rein textlich/terminologisch**, berühren keinen Code, Security-Claim, Produktfähigkeit, DB-Schema, Preis oder Vertrag. Verifiziert via `git status` + `grep` (siehe Review-Fußnote).

## Bewusst NICHT gemacht (mit Begründung)

- **`outreach-readiness.md:56-59` Häkchen setzen** (Auffüllliste-Status, Schichtübergabe, Korrektur-Freigabe, Audit-Trail): Code-Evidence vorhanden, aber **keine Runtime-Verifizierung** (Smoke/Live). Häkchen würden Verified-Status vortäuschen → Owner-Aufgabe O2 (B1).
- **`prd.md` Rollen-Notation an `use-cases.md` anpassen:** stattdessen `use-cases.md` an `prd.md` (die Quelle) angeglichen — konsistentere Richtung.
- **`outreach-readiness.md:60` UX-Häkchen ("wie WhatsApp"):** erst nach Usability-/Pilot-Test setzbar; keine operative Test-Data vorhanden.
- **Keine Code-/DB-/Migrations-/Deploy-Änderungen** (G6, G13, G14, G16, B3, B4) — alle Owner-Freigabe vorbehalten.
- **Keine Preis- oder DSGVO-Textänderung** (O1, O3) — kommerzielle/rechtliche Owner-Entscheidung.
- **Keine Häkchen/Claims in Sales-Dokumenten** verändert — Versand-Vorblocker bleiben explizit offen.

---

## Abschluss

| Kennzahl | Wert |
|---|---|
| Result | `partial` |
| Versandstatus | `blocked` |
| Pilotstatus | `blocked` |
| Production-Risiko | `hoch` |
| **Nächster genau einer sicherer Schritt** | **FP1 (O2) — read-only Runtime-Verifikation** der 6 Claims in `outreach-readiness.md` Abschnitt 2d. |

*Danach keine weiteren Arbeiten starten.*
