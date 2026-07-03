# Outreach-Readiness — Annahmen-Register & Freigabe-Status

**Zweck:** Alle Stellen im Sales Kit, die vor der ersten echten Kontaktaufnahme eine Owner-Entscheidung oder einen Beleg brauchen — an einem Ort, mit Status.

**Stand:** 2026-07-03 (O2 nach W1–W4-Bereinigung erneut geprüft) · **Template-Status:** `first-contact-final.md` ist claim-seitig bereit. Ein konkreter Versand bleibt blockiert, bis ein realer Lead-Steckbrief, öffentliche Quellen, Claim-Red-Team, Readiness und menschliche Freigabe vorliegen.

---

## 1. Offene Annahmen (explizit markiert mit `> Annahme:`)

| # | Datei / Stelle | Annahme | Status |
|---|---|---|---|
| A1 | `first-contact-email.md` (Kopf, Z. 13) | Absender ist der Gründer/Operator selbst („ich“), kein Vertriebsteam | ✅ bestätigt — trifft auf Cheikh zu |
| A2 | `first-contact-email.md` (Variante C, Z. 67) | Absender hat eigene operative Erfahrung in Standortbetrieben | ✅ bestätigt — operativer Gastro-Hintergrund vorhanden |
| A3 | Pricing | Finale Preis-/Vertragslogik | 🔶 offen — O1; bis dahin keine Zahl oder Kondition extern nennen |
| A4 | Datenschutz/Hosting | EU-Datenhaltung, AV-Verträge, Export und Löschprozess | 🔶 offen — O3; bis dahin nur Stufe-1-Satz aus Abschnitt 3 |

## 2. Alle Fundstellen mit Preislogik, DSGVO/Hosting, Pilotumfang und Leistungsversprechen

### 2a. Preislogik

| Datei | Stelle | Aussage | Risiko |
|---|---|---|---|
| `pilot-onepager.md` | Abschnitt „Preis-Gate“ | Keine Zahl oder Kondition, solange O1 offen ist | ✅ sicher; nach O1 ausschließlich aus `pricing-pilot-decision.md` befüllen |
| `pilot-onepager.md` | „Faire Abbruchkriterien“ | Fachliche Signale; Kostenfolgen erst nach O1 schriftlich | ✅ keine offene kommerzielle Zusage |
| `objection-handling.md` | Einwand 6 | Keine geratene Zahl; schriftliche Angabe erst nach O1 | ✅ sicher |
| `objection-handling.md` | Einwand 7 | Preis-, Abbruch- und Datenregeln erst nach O1/O3 schriftlich | ✅ sicher |

### 2b. DSGVO / Hosting / Daten

| Datei | Stelle | Aussage | Belegstatus |
|---|---|---|---|
| `objection-handling.md` | Einwand 5 | „nicht verkauft, nicht für andere Kunden ausgewertet, nicht für Werbung“ | ✅ sagbar — eigene Geschäftsentscheidung, sofort bindend |
| `objection-handling.md` | Einwand 5 | Stufe-1-Satz: keine Fremdnutzung; Unterlagen vor Pilotstart | ✅ sicher; keine Export-/Lösch-/EU-Zusage |
| `objection-handling.md` | Einwand 5, Gate O3 | EU-Datenhaltung, AV-Vertrag, Export und Löschung ausdrücklich offen | ✅ Unsicherheit sichtbar, keine externe Zusage |
| `objection-handling.md` | Einwand 7 | Datenregeln erst nach O3 schriftlich | ✅ sicher |

### 2c. Pilotumfang (Scope-Zusagen)

| Datei | Stelle | Zusage |
|---|---|---|
| `pilot-onepager.md` | „Wählbare Pilot-Bausteine“ | Kandidaten-Menü; tatsächlicher Pilot wählt 1–2 Prozesse. Bar-Auffüllliste, keine Küchen-Auffüllliste; Bewegungsverlauf statt pauschalem Audit-Trail-Claim |
| `pilot-onepager.md` | „Ablauf“ Schritt 4 | Alter Weg bleibt als Fallback erlaubt |
| `sales-call-guide.md` | Phase 6 | „ein Prozess, ein Standort, 4–6 Wochen“ |

### 2d. Capability Truth Table (O2) — erneut geprüft nach W1–W4, 2026-07-03

**Beleg-Klasse:** Produktcode + Prisma-Schema + Tests (CI-Stand 2026-07-03: 754/754 Tests grün, Commit `c1b1eb6`). **Nicht** geprüft: Live-Runtime der deployten UI — der mutation-geschützte UI-Smoke ist ein offenes P0-Gate, `/inventory/bar-refill` dort explizit ausgeklammert. Konsequenz: Mail-Versand ist auf dieser Beleg-Basis vertretbar; **vor Pilotstart** ist der Runtime-Smoke Pflicht.

| # | Claim | Status | Beleg | Erlaubte Formulierung | Verbotene Formulierung |
|---|---|---|---|---|---|
| K1 | Warenannahme mit Mengen, Abweichungen und verantwortlicher Person festhalten | `confirmed` | `apps/api/prisma/schema.prisma` (`GoodsReceipt`, `GoodsReceiptItem`), `apps/api/src/modules/inventory/goods-receipt.service.ts`, `goods-receipt.service.test.ts` | „Warenannahme mit Mengen, Abweichungen und verantwortlicher Person festhalten“ | „vollautomatische Warenannahme“, Live-/Offline-Zusage |
| K2 | Bar-Auffüllliste mit Status und Bestätigung | `confirmed` | Schema (`BarRefillRun`, `BarRefillRunItem`), `bar-refill.service.ts`, Cockpit-Route `/inventory/bar-refill`, `bar-refill.service.test.ts`, `bar-refill.migration.test.ts` | „Bar-Auffüllliste mit Status und Bestätigung“ | „Auffüllliste für Bar und Küche“, Küchen-Auffüllliste |
| K3 | Schichtübergabe strukturiert festhalten | `confirmed` | Schema (`ShiftHandoverDraft`), `apps/api/src/modules/shift-handover/`, Cockpit-Route `/shift-handover`, `shift-handover.routes.test.ts` | „Schichtübergaben mit Zusammenfassung und offenen Punkten festhalten“ | „automatische Übergabe“, garantierter Informationsverlust = 0 |
| K4 | Korrekturen mit Grund und Freigabestatus dokumentieren | `confirmed` | `correction.service.ts`, `review-task.service.ts`, Cockpit-Route `/freigaben`, `correction.service.test.ts`, `correction-request-rls.test.ts` | „Korrekturen mit Grund und Freigabestatus dokumentieren“ | „jede Korrektur ist revisionssicher“ |
| K5 | Warenbewegungen mit verantwortlicher Person und Zeitpunkt nachvollziehen | `confirmed` | Schema (`InventoryMovement.actorUserId`, Zeitstempel), Cockpit-Routen `/movements`, `/dashboard`; `OperationalNoteAuditEvent` nur für Notizen | „Warenbewegungen mit Wer/Was/Wann nachvollziehen“ | pauschal „lückenloser Audit Trail“, „Compliance-Audit“, „revisionssicher“ |
| K6 | Anwendung im Browser nutzen; responsive UI-Strukturen vorhanden | `partial` | `apps/cockpit/app/mobile-ops.css`, `components/bottom-nav.tsx`, `components/quick-notes-fab.tsx`; kein vollständiger Lageralltag-/Bar-Refill-Runtime-Smoke | „Die Anwendung läuft im Browser“ | „mobile-optimiert im Lageralltag getestet“, „direkt an der Rampe bewährt“, native App |
| K7 | Eintrag ist so einfach/schnell wie WhatsApp | `unconfirmed` | Kein belastbarer UX-/Zeitnachweis | weglassen; im Pilot offen prüfen, ob die Eingabe praktikabel ist | „nicht komplizierter/schneller als WhatsApp“, gleichwertige Tatsachenbehauptung |
| K8 | Küche hat Checklisten-/Walk-Route-Seiten, aber keine Auffüllliste | `partial` | Cockpit-Pfade `apps/cockpit/app/(app)/kitchen/{checkliste,walk-route}/`; keine als Küchen-Auffüllliste belegte Fähigkeit | Nur als Abgrenzung: „Für die Küche ist keine Auffüllliste bestätigt“ | Küchen-Auffüllliste; Checklisten als gleichwertigen Refill-Workflow verkaufen |
| K9 | Bevero ersetzt Kasse, Bestellwesen, Warenwirtschaft oder Buchhaltung nicht | `confirmed` | Repo-Positionierung in `README.md` und `docs/productization/bevero-product-identity-v0.md` | „Ergänzung, kein Ersatz für bestehende Systeme“ | „All-in-one“, ERP-/POS-/Buchhaltungsersatz |
| K10 | Offline-Betrieb | `future` | Spec-Pack ordnet Offline einer späteren Version zu; kein aktueller Beleg | „Offline-Betrieb ist nicht Bestandteil des Piloten“ | aktuelle Offline-Fähigkeit |

**O2-Ergebnis:** `confirmed` für die erlaubten Formulierungen K1–K5 und K9. K6/K8 dürfen nur in der engen Abgrenzung verwendet werden. K7 ist aus externen Texten entfernt; K10 bleibt future und darf nicht als aktuelle Fähigkeit erscheinen. Jede neue oder geänderte Produktbehauptung öffnet O2 erneut.

## 3. DSGVO-/Hosting-Satz — sichere Version

**Jetzt sofort sagbar (ohne weiteren Beleg, schriftlich und mündlich):**

> „Ihre Daten gehören Ihnen. Sie werden nicht verkauft, nicht für andere Kunden ausgewertet und nicht für Werbung genutzt. Die vollständigen Unterlagen zu Hosting und Auftragsverarbeitung lege ich Ihnen vor einem Pilotstart schriftlich vor — vorher startet nichts.“

Dieser Satz verspricht nur, was heute schon bindend entschieden ist (keine Fremdnutzung) plus einen Prozess (Unterlagen vor Start) — keine unbelegte Infrastruktur-Behauptung.

**Erst nach Owner-Beleg freigeschaltet (Stufe 2):**

> „Die Anwendung läuft auf EU-Infrastruktur (Frankfurt), inklusive DSGVO-konformer Auftragsverarbeitung mit AV-Vertrag. Ihre Daten können Sie beim Pilotende exportieren; auf Wunsch löschen wir vollständig.“

Voraussetzungen für Stufe 2 — alles abhaken, sonst bleibt Stufe 1:

- [ ] Supabase-Projekt-Region geprüft und = EU (Dashboard → Project Settings) — **derzeit nirgends dokumentiert**
- [ ] Vercel-DPA und Supabase-DPA vorhanden/akzeptiert und abgelegt
- [ ] Datenexport praktisch möglich (getestet, nicht nur theoretisch)
- [ ] Löschprozess definiert (wer löscht was, auf welchem Weg, in welcher Frist)

## 4. Checkliste: Vor Absenden prüfen

Für **jede** ausgehende Erstkontakt-Mail, ohne Ausnahme:

- [ ] Lead-Steckbrief für diesen Betrieb ausgefüllt (mind. Basisdaten, 1 Aufhänger, Fit-Einschätzung)
- [ ] Alle `[Platzhalter]` ersetzt — kein einziges `[…]` mehr im Text (Strg+F nach „[“)
- [ ] Betriebsname und Ansprechpartner korrekt geschrieben (Website gegengeprüft)
- [ ] Der Aufhänger ist betriebsspezifisch, nicht generisch
- [ ] Keine Preiszahl in der Mail (Preis gehört ins Gespräch, nicht in den Erstkontakt)
- [ ] Keine Datenschutz-Aussage über Stufe 1 hinaus (solange Abschnitt 3 offen ist)
- [ ] Keine Referenzen/Kundennamen erwähnt (es gibt noch keine belegbaren)
- [ ] Kein „KI“, kein „revolutionär“, kein „all-in-one“ im Text
- [ ] Nur Fähigkeiten erwähnt, die in Abschnitt 2d abgehakt sind
- [ ] Weiterleitungsbitte enthalten
- [ ] Absender-Signatur vollständig (Name, Erreichbarkeit)
- [ ] Follow-up-Termin im Kalender gesetzt (+5–7 Werktage)

## 5. Offene Owner-Entscheidungen (Blocker für „versandfertig“)

| # | Entscheidung | Wo entscheiden | Status |
|---|---|---|---|
| O1 | Preis-/Pilotvariante wählen (konservativ / fair / business) | `pricing-pilot-decision.md` | 🔶 offen |
| O2 | Produktstand gegen Kit-Behauptungen prüfen | Abschnitt 2d (Truth Table) | ✅ für erlaubte externe Formulierungen nach W1–W4 erneut geprüft; K6/K8 nur eng, K7 ausgeschlossen, K10 future. Runtime-Smoke bleibt vor **Pilotstart** Pflicht |
| O3 | DSGVO Stufe 2 belegen oder bewusst bei Stufe 1 bleiben | Abschnitt 3 | 🔶 offen |

**Versand-Gate:** Ein konkreter Entwurf ist erst `ready_for_human_review`, wenn ein realer Lead-Steckbrief mit öffentlichen Quellen, Fit Score, Claim Red Team und Readiness vorliegt. Der Mensch gibt frei und sendet. **Pilotstart-Gate:** O1, O3, Runtime-Smoke und schriftlicher Scope müssen zusätzlich geschlossen sein.
