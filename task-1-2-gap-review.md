# Bevero — Task 1 + 2 Gap Review

**Datum:** 2026-07-03
**Scope:** Abgleich Produkt-Spec-Pack (Aufgabe 1), Production-Review (Aufgabe 2), Sales-Kit und echter MVP-/Repo-Zustand.
**Modus:** Read-only Review. Nur 2 eindeutig sichere Doku-Patches angewendet (siehe Patch-Abschnitt in `task-1-2-gap-closure-plan.md`).
**Reviewer:** Multi-Agent-Workflow `bevero_gap_review` (1 Discovery + 6 Dimensions-Reviewer + 1 Synthesis).

> **Hinweis zur Vollständigkeit:** Dimension 6 (Roadmap-/Task-Lücken) hat im Workflow eine Summary geliefert, aber keine strukturierten Gap-Einträge zurückgegeben. Die dort genannten Punkte sind als **nicht detailliert geprüft** gekennzeichnet und als Folge-Task (R6) hinterlegt.

---

## Executive Summary

Bevero ist als **operativer Workflow-Hub** (digitale Betriebsebene / Ausführungs- und Nachweisebene) über alle Spec-, Sales- und Review-Dokumente **konsistent positioniert** — nicht als generische Inventar-App. MVP, Pilot und Vision sind sauber getrennt (Scope-Lock wirkt); kein kritischer Feature-Creep. Die Sales-Dokumentation ist sorgfältig gegen Overpromising abgesichert (Stufe-1/Stufe-2-Trennung, Pflichtfelder, Checklisten).

Trotzdem ist der Zustand **partial / blocked**, weil drei Blocker-Gruppen den Versand und den Pilot-Start verhindern:

1. **Sales-Claims sind nicht runtime-verifiziert.** Die zentrale Produktfähigkeits-Tabelle (`outreach-readiness.md` Abschnitt 2d) ist komplett unbestätigt (alle ☐). Mehrere behauptete Fähigkeiten (Foto bei Warenannahme, Offline-Rampe-Workflow, CSV-Export) sind im Code **nicht belegt**.
2. **DSGVO Stufe 2 ist unbelegt.** Supabase-Region, AVV/DPA, Datenexport und Löschprozess sind nirgends nachgewiesen — trotzdem stehen entsprechende Zusagen in `pilot-offer.md`.
3. **Production-Environment ist unklar (Split-Brain).** Lokale `.env` zeigen auf Bevero Dev (`ienws…`), Vercel Production zeigt auf eine fremde Rauschenberger DB (`czinch…`). Keine getrackte Bevero-Production-Supabase-Ref, kein Backup/PITR-Nachweis, Advisor-Hardening ist nur gequeued.

Preisentscheidung (O1) ist offen. Code-seitige Security-Architektur (Auth/Org/RBAC, RLS-Hybrid) ist hingegen solide validiert — die verbleibenden Production-Risiken sind **Owner-Entscheidungen zur Umgebung**, keine Code-Lücken.

---

## Gesamtstatus

**`partial`** — Spec-Konsistenz gut; Versand, Pilot und Production durch Owner-Gates blockiert.

| Kennzahl | Wert |
|---|---|
| Result | `partial` |
| Versandstatus | **blocked** |
| Pilotstatus | **blocked** |
| Production-Risiko | **hoch** (Environment-Split-Brain + kein Backup/PITR + DSGVO-Evidence fehlt) |

---

## Geprüfte Artefakte

| Artefakt | Status | Kurzbefund |
|---|---|---|
| `spec-pack/product-vision.md` | ✅ ok | Klare Workflow-Hub-Positionierung; Magic Moment konsistent scope-gelockt. |
| `spec-pack/prd.md` | ⚠️ teils | In/Out-Scope sauber; **Foto-Pflicht** (Z. 23) im Schema nicht abgebildet; Offline-Forderung (Z. 82) nicht getestet. |
| `spec-pack/product-roadmap.md` | ⚠️ teils | Phasen klar; Done-Kriterien teils unvollständig (R6). |
| `spec-pack/pilot-offer.md` | ⚠️ teils | CSV-Export/Löschung als Abbruch-Zusage ohne Evidence; Preis offengelassen (korrekt). |
| `spec-pack/target-customer.md` | ✅ ok | Konsistent mit Positionierung. |
| `spec-pack/use-cases.md` | ✅ ok (patched) | Rollen-Notation an `prd.md` angeglichen (Patch P1). |
| `spec-pack/sales-transfer.md` | ✅ ok (patched) | Claim 2 Zeitgarantie entfernt (Patch P2); Claim 5 korrekt scope-gelockt. |
| `spec-pack/mvp-scope-lock.md` | ✅ ok | Wirkt; verweist auf `cold-start-ai-plan.md` (nicht im Inventory). |
| `sales-kit/outreach-readiness.md` | 🔴 blocked | Abschnitt 2d komplett unbestätigt; Stufe-2-Voraussetzungen offen. |
| `sales-kit/first-contact-final.md` | 🟡 bedingt versendbar | Sprachlich gut, keine KI-Buzzwords; Versand blockiert bis O2/O3. |
| `sales-kit/pricing-pilot-decision.md` | 🔴 offen | Nur Vorschlagsspannen, keine finale Variante (O1). |
| Production-Review (`bevero-production-review.md`, `bevero-production-closure.md`) | ⚠️ teils | Security-Architektur validiert; Environment/Backup/Advisor offen. |
| Code (`apps/api`, `apps/cockpit`, `prisma/schema.prisma`) | 🟢 solide | Auth/actor, RBAC, RLS-Hybrid, Routen belegt; Foto-Feld + Offline-Test fehlen. |

---

## Gap-Liste (nach Priorität)

Legende: Kategorie → `P0 Blocker | P1 Fix | P2 Improvement | Owner Gate | Evidence Gap | Scope Creep | Language Gap | Security Gap`.

### P0 / Blocker (versand-/pilot-/production-blockierend)

| ID | Kategorie | Titel | Evidence |
|---|---|---|---|
| G1 | Evidence Gap (P0) | Produktfähigkeits-Tabelle `outreach-readiness.md` 2d komplett unbestätigt | `outreach-readiness.md` Abschnitt 2d: alle 6 Claims ☐; eigene Warnung "vor erster Mail gegen echten Produktstand prüfen" |
| G2 | Evidence Gap (P0) | DSGVO Stufe 2 (Export + Löschung) nicht belegt | `outreach-readiness.md` 2b/3; `pilot-offer.md` "Erfolgs-/Abbruchkriterien" (CSV-Export/Löschung als Zusage) |
| G3 | Owner Gate | Produktions-Environment nicht deklariert (Split-Brain) | `bevero-production-environment-closure.md` Closure-Matrix: `.env` → `ienws…` (Dev) vs. Vercel Prod → `czinch…` (Rauschenberger) |
| G4 | Owner Gate | Backup/PITR für Production-DB nicht nachgewiesen | `bevero-production-review.md` Abschnitt 5: "no visible backups; no current proof" |
| G5 | Owner Gate | Preis-/Pilotvariante nicht gewählt | `pricing-pilot-decision.md`: Owner-Tabelle leer ("Gewählte Variante ☐", "Finale Pilotpauschale [leer]") |

### P1 / Fix (vor nächstem Sales-/Build-Schritt)

| ID | Kategorie | Titel | Evidence |
|---|---|---|---|
| G6 | Evidence Gap | Warenannahme-Foto fehlt im Schema | `prd.md:23` fordert Foto; `schema.prisma` `GoodsReceipt`/`GoodsReceiptItem` ohne Foto-Feld |
| G7 | Evidence Gap | Mobile Erfassung "direkt an der Rampe" offline nicht verifiziert | `outreach-readiness.md:55-56`; `bottom-nav.tsx` mobile-first belegt, aber kein Offline/Rampe-Smoke |
| G8 | Language Gap | `outreach-readiness.md:56` Auffüllliste-Status als Claim, Häkchen fehlt | Code `BarRefillRunItem.status` belegt, aber 2d ☐ → Sales darf nicht behaupten |
| G9 | Language Gap | `outreach-readiness.md:57` Schichtübergabe als Claim, Häkchen fehlt | Code `ShiftHandoverDraft` + `/shift-handover/draft/*` belegt, aber 2d ☐ |
| G10 | Language Gap | `outreach-readiness.md:58` Korrektur-Freigabe als Claim, Häkchen fehlt | Code `InventoryCorrectionRequest` + `/admin/correction-requests/:id/{approve,reject}` belegt, aber 2d ☐ |
| G11 | Language Gap | `outreach-readiness.md:59` Audit-Trail als Claim, Häkchen fehlt | Code `InventoryMovement.actorUserId` + `/admin/inventory/movements` belegt, aber 2d ☐ |
| G12 | P1 Fix | Lead-Steckbrief-Vorlage fehlt (Aufhänger = Pflichtfeld) | `first-contact-final.md` "Pflicht, ohne ihn nicht senden"; keine Vorlage existent |
| G13 | Security Gap | Hartkodierter Playwright-Pfad im Screenshot-Tool | `tools/capture-screenshots.mjs:9` → `/home/baum/Schreibtisch/…/mosaicStack/node_modules/playwright` |

### P2 / Improvement

| ID | Kategorie | Titel | Evidence |
|---|---|---|---|
| G14 | Evidence Gap | Offline-Toleranz nicht verifiziert | `schema.prisma` `OfflineActionQueue` belegt, kein Sync/Conflict-Test |
| G15 | Language Gap | UX-Claim "wie WhatsApp" nicht verifiziert | `outreach-readiness.md:60`; keine Usability-Studie |
| G16 | P2 Improvement | Landing-Typecheck ist No-op | `apps/landing/package.json`: `typecheck: echo …` |
| G17 | Evidence Gap | Cockpit-Read Live-Verifikation (inventory_categories, WorkflowTask) offen | `bevero-production-closure.md` Abschnitt 4 |
| G18 | P2 Improvement | Auffüllliste: Vision vs. PRD vs. Pilot-Offer Unschärfe | `product-vision.md` Magic Moment vs. `prd.md` 2.3 vs. `pilot-offer.md` "vorlage-basiert" |
| G19 | P2 Improvement | DSGVO-Readiness-Prozess nicht in eigenem Dokument getrackt | `outreach-readiness.md` Abschnitt 3 ohne Ownership/Prozess |
| G20 | Evidence Gap | `cold-start-ai-plan.md` nicht im Inventory/geprüft | Verweise in `outreach-readiness.md:12`, `mvp-scope-lock.md:2` |

> G8–G11 sind von den Dimensions-Agenten als `safeToAutoFix=true` markiert, weil Code-Evidence existiert. **Bewusst NICHT automatisch gesetzt**: Häkchen würden eine Runtime-Verifikation vortäuschen. Bleiben Owner-Aufgabe O2.

---

## 1) Produkt-Konsistenz — Befund: **pass**

Bevero wird in allen Spec- und Sales-Dateien einheitlich als **operativer Workflow-Hub** ("digitale Betriebsebene", "Ausführungs- und Nachweisebene") beschrieben. MVP/Pilot/Vision sauber getrennt; Scope-Lock greift; Vision rutscht nicht in MVP. Terminologie weitgehend konsistent ("Auffüllliste" durchgängig, keine "Nachfüllliste"-Variante). Verbliebene Punkte: Rollen-Notation (G — **gepatcht**), `sales-transfer.md` Claim 2 (G — **gepatcht**), `cold-start-ai-plan.md` nicht geprüft (G20).

## 2) MVP-Wahrheitsprüfung — Befund: **partial**

| Fähigkeit | Status | Evidence |
|---|---|---|
| Warenannahme | **teilweise** | Routes/Schema belegt; **Foto-Pflicht fehlt** (G6) |
| Lagerorte | belegt | `location.route.ts` |
| Warenbewegungen | belegt | `InventoryMovement` |
| Auffüllliste Bar/Küche | belegt | `BarRefillRunItem` + `/bar-refill/runs/*` |
| Auffüllliste-Statuslogik | belegt | `open / in_progress / completed` |
| Schichtübergabe | belegt | `ShiftHandoverDraft` + `/shift-handover/draft/*` |
| Freigabe-/Korrekturprozess | belegt | `InventoryCorrectionRequest` + approve/reject |
| Audit Trail | belegt | `InventoryMovement.actorUserId` + `/admin/inventory/movements` |
| Rollen & Rechte | belegt | `auth/actor.ts`, RBAC, RLS-Hybrid (Dim 4 validiert) |
| Betriebsleitung-/Read-only-Sicht | belegt | `/admin/*`-Routen |
| Mobile Erfassung | **teilweise** | mobile-first UI (`bottom-nav.tsx`); **Offline/Rampe nicht getestet** (G7) |
| Cockpit-Nutzbarkeit | **teilweise** | Auth-Smoke da; kein operativer UX-Test (G15) |
| Offline-Toleranz | **teilweise** | `OfflineActionQueue`-Modell da, kein Sync-Test (G14) |
| CSV-Export | **nicht belegt** | PRD-MVP-Feature, keine Runtime-Evidence (→ G2/O3) |
| Foto Warenannahme | **nicht belegt** | Schema-Feld fehlt (G6) |

**Konsequenz:** Nicht-belegte/teilweise Fähigkeiten dürfen in Outreach, Landing und Pilot-Offer **nicht** als sichere Fähigkeit stehen. Betrifft direkt `outreach-readiness.md` 2d (G1).

## 3) Sales-Readiness — Befund: **blocked (bedingt versendbar)**

Erstkontakt-Mail sprachlich glaubwürdig, ohne KI-Buzzwords; betriebsspezifischer Aufhänger als Pflichtfeld markiert. Blocker: Produktfähigkeits-Tabelle unbestätigt (G1), DSGVO Stufe 2 offen (G2), Preisentscheidung offen (G5). Lead-Steckbrief-Vorlage fehlt (G12). Auffülllisten-Claim 5 korrekt scope-gelockt.

## 4) Production-/Security-Readiness — Befund: **belegt, mit Owner-Gates**

Keine P0-Code-Security-Lücke. Auth/actor, Org-Membership, RBAC, RLS-Hybrid und dangerous-Route-Schutz validiert; `.env`/`.vercel` in `.gitignore`; keine Secrets/Service-Role-Keys im Cockpit-Code gefunden. **Verbleibend (alle Owner-Gates):** Environment-Split-Brain (G3), Backup/PITR (G4), Advisor-Hardening-Block (O6). Tooling-Hygiene: hartkodierter Playwright-Pfad (G13), Landing-Typecheck No-op (G16). Cockpit-Read optionaler Live-Check (G17).

## 5) DSGVO-/Hosting — Befund: **Stufe 1 sicher, Stufe 2 unbelegt**

Kein "vollständig geklärt"-Claim gefunden — Outreach ist bewusst zweistufig. Vercel-Region `fra1` belegt (`deployment-vercel.md:20`). **Nicht belegt:** Supabase-DB-Region, AVV/DPA (Vercel + Supabase), Datenexport-Fähigkeit, Löschprozess. Sichere Stufe-1-Formulierung vorhanden und korrekt. Stufe-2-Freigabe = Owner-Entscheidung (O3).

## 6) Roadmap-/Task-Lücken — Befund: **nicht detailliert geprüft (R6)**

Dimensions-Agent lieferte Summary ("10 signifikante Gaps: DSGVO-Konformität, Pricing, Produktvalidierung fehlen als Aufgaben; Done-Kriterien teils unvollständig; Folgeaufgaben teils zu unscharf"), aber **keine strukturierten Gap-Einträge**. Als Folge-Task R6 (siehe Closure-Plan) hinterlegt — muss dediziert nachgefahren werden.

---

## Owner-Entscheidungen (max. 7, priorisiert)

| # | Gate | Entscheidung | Warum | Blockiert | Empfehlung |
|---|---|---|---|---|---|
| **O1** | Preis-/Pilotvariante | konservativ / fair / business | Nur Vorschlagsspannen, finale Zahlen fehlen; Einwand-Handbuch muss wortgleich passen | Versand (Erstgespräch) + Pilot-Start | Variante wählen, finale Pauschale + Monatspreis eintragen, `outreach-readiness.md` O1 erledigen |
| **O2** | Produktfähigkeits-Tabelle 2d verifizieren | je Claim ☑/☐/abschwächen | Alle 6 Claims unbestätigt; Overpromising-Risiko | Versand (Mail-Erstellung) | Pro Claim Runtime-Evidence (Test/Smoke/Code-Inspektion/Live); Häkchen setzen oder Claim schwächen |
| **O3** | DSGVO Stufe 2 | (A) bei Stufe 1 bleiben / (B) 4 Voraussetzungen nachweisen | EU-Infrastruktur, DPA, Export, Löschung alles unbelegt | Versand + Pilot-Start | Empfehlung: **(A) bei Stufe 1 bleiben**, bis Supabase-Region EU + DPA + Export-Test + Löschprozess belegt |
| **O4** | Produktions-Environment deklarieren | (a) czinch… consumer / (b) ienws… Dev / (c) isolierte Bevero-Prod | Split-Brain Dev vs. fremde Prod-DB | Pilot-Go-Live + Production-Deploy | Isolierte Bevero-Production empfohlen; Closure-Runbook Gate 1–5 durchlaufen |
| **O5** | Backup/PITR | aktivieren oder Risk-Acceptance signieren | Kein Backup-Nachweis → kritischer Datenverlust bei Vorfall | Pilot-Go-Live + Feature-Work | Backup/PITR aktivieren+verifizieren; sonst befristetes, signiertes Risk-Acceptance |
| **O6** | Advisor-Hardening-Block | vor Go-Live abarbeiten | search_path, SECURITY DEFINER, Leaked-Password-Protection, Indexe nur gequeued | Pilot-Go-Live | Vor Pilot-Go-Live abarbeiten; kein Prod-Deploy ohne dieses Slice |
| **O7** | Lead-Steckbrief-Vorlage | erstellen | Aufhänger = Pflichtfeld, aber keine Vorlage | nichts (ad-hoc ausfüllbar) | `docs/sales-kit/templates/lead-steckbrief.md` mit Pflichtfeldern |

---

## Nächste sichere Arbeitsblöcke

1. **O2-Runtime-Verifikation (read-only):** Pro Claim in `outreach-readiness.md` 2d Code-/Test-/Smoke-Evidence sammeln — ohne zu ändern. Ergebnis: Häkchen-Vorschlag je Zeile.
2. **Lead-Steckbrief-Vorlage (O7):** Neue Datei, rein additiv, kein Risiko.
3. **DSGVO-Readiness-Dokument (G19):** Neue Datei, trackt die 4 Stufe-2-Voraussetzungen + Ownership.
4. **Roadmap-Nachfach (R6):** Strukturierte Gap-Erhebung für Dimension 6.

---

## Abschluss

| Kennzahl | Wert |
|---|---|
| **Result** | `partial` |
| **Versandstatus** | `blocked` (O2 Produktfähigkeiten, O3 DSGVO Stufe 2, O1 Preis) |
| **Pilotstatus** | `blocked` (O3, O4, O5, O6) |
| **Production-Risiko** | `hoch` (Split-Brain + kein Backup/PITR + DSGVO-Evidence) |
| **Nächster genau einer sicherer Schritt** | **O2 als read-only Runtime-Verifikation** der 6 Claims in `outreach-readiness.md` Abschnitt 2d — pro Zeile Code-/Test-/Smoke-Evidence sammeln und Häkchen-Vorschlag erstellen (ohne zu ändern). Das ist der kleinste sichere Schritt, der sowohl den Versand-Vorblocker (G1) vorbereitet als auch die MVP-Wahrheitsprüfung (G6/G7) mitliefert. |

*Danach keine weiteren Arbeiten starten.*
