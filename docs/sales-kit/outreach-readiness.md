# Outreach-Readiness — Annahmen-Register & Freigabe-Status

**Zweck:** Alle Stellen im Sales Kit, die vor der ersten echten Kontaktaufnahme eine Owner-Entscheidung oder einen Beleg brauchen — an einem Ort, mit Status.

**Stand:** 2026-07-03 (O2 aufgelöst) · **Versandfertig:** ja, sobald ein Lead-Steckbrief ausgefüllt ist — Mail-Blocker O2 ist per Capability Truth Table (Abschnitt 2d) geschlossen; O1/O3 blockieren erst Gespräch/Pilotstart.

---

## 1. Offene Annahmen (explizit markiert mit `> Annahme:`)

| # | Datei / Stelle | Annahme | Status |
|---|---|---|---|
| A1 | `first-contact-email.md` (Kopf, Z. 13) | Absender ist der Gründer/Operator selbst („ich“), kein Vertriebsteam | ✅ bestätigt — trifft auf Cheikh zu |
| A2 | `first-contact-email.md` (Variante C, Z. 67) | Absender hat eigene operative Erfahrung in Standortbetrieben | ✅ bestätigt — operativer Gastro-Hintergrund vorhanden |
| A3 | `pilot-onepager.md` (Preislogik, Z. 77) | Keine finale Preisliste; Spannen sind Vorschlag, keine Zusage | 🔶 offen — Owner wählt Variante in `pricing-pilot-decision.md` |
| A4 | `objection-handling.md` (Einwand 5, Z. 63) | EU-Datenhaltung + DSGVO-konforme Auftragsverarbeitung „vorgesehen“, nicht belegt | 🔶 offen — siehe Abschnitt 3 |

## 2. Alle Fundstellen mit Preislogik, DSGVO/Hosting, Pilotumfang und Leistungsversprechen

### 2a. Preislogik

| Datei | Stelle | Aussage | Risiko |
|---|---|---|---|
| `pilot-onepager.md` | Abschnitt „Preislogik“ | Pilotpauschale (dreistellig bis niedrig vierstellig), Anrechnung bei Übernahme, monatlich zweistellig bis niedrig dreistellig, keine Mindestlaufzeit, keine automatische Verlängerung | Spannen ungeklärt; „Anrechnung“ und „keine Mindestlaufzeit“ sind kommerzielle Zusagen |
| `pilot-onepager.md` | „Faire Abbruchkriterien“ | „ohne Restkosten für nicht erbrachte Leistung“ | Kommerzielle Zusage — muss zur gewählten Preisvariante passen |
| `objection-handling.md` | Einwand 6 („Was kostet das?“) | Pauschalbetrag + Anrechnung + „keine langen Laufzeiten, keine automatische Verlängerung“ | Muss wortgleich zur Entscheidung in `pricing-pilot-decision.md` passen |
| `objection-handling.md` | Einwand 7 | „Abbruch kostet ein paar Wochen, kein Projektbudget“ | Konsistent halten mit Pilotpauschale |

### 2b. DSGVO / Hosting / Daten

| Datei | Stelle | Aussage | Belegstatus |
|---|---|---|---|
| `objection-handling.md` | Einwand 5 | „nicht verkauft, nicht für andere Kunden ausgewertet, nicht für Werbung“ | ✅ sagbar — eigene Geschäftsentscheidung, sofort bindend |
| `objection-handling.md` | Einwand 5 | „Beim Pilotende bekommen Sie Ihre Daten heraus, wir löschen auf Wunsch“ | ⛔ NICHT BELEGT — Datenexport + Löschprozess als Produktfähigkeit unbestätigt |
| `objection-handling.md` | Einwand 5, Annahme | EU-Datenhaltung, AV-Vertrag | ⛔ teilweise: Vercel-Region `fra1` (Frankfurt) ist im Repo dokumentiert (`docs/deployment-vercel.md:20`); **Supabase-DB-Region ist nirgends dokumentiert**; AV-Verträge (Vercel/Supabase DPA) nicht nachgewiesen |
| `objection-handling.md` | Einwand 7 | „Ihre Daten bekommen Sie heraus“ | ⛔ NICHT BELEGT (wie oben) |

### 2c. Pilotumfang (Scope-Zusagen)

| Datei | Stelle | Zusage |
|---|---|---|
| `pilot-onepager.md` | „Was im Pilot enthalten ist“ | 6 Prozesse (Warenannahme, Lagerorte/Bewegungen, Auffüllliste, Schichtübergabe, Freigabe/Korrektur, Audit Trail) + Mini-Audit + Einweisung + fester Ansprechpartner + 2 Check-ins |
| `pilot-onepager.md` | „Ablauf“ Schritt 4 | Alter Weg bleibt als Fallback erlaubt |
| `sales-call-guide.md` | Phase 6 | „ein Prozess, ein Standort, 4–6 Wochen“ |

### 2d. Capability Truth Table (O2) — geprüft gegen Repo-Stand 2026-07-03

**Beleg-Klasse:** Produktcode + Prisma-Schema + Tests (CI-Stand 2026-07-03: 754/754 Tests grün, Commit `c1b1eb6`). **Nicht** geprüft: Live-Runtime der deployten UI — der mutation-geschützte UI-Smoke ist ein offenes P0-Gate, `/inventory/bar-refill` dort explizit ausgeklammert. Konsequenz: Mail-Versand ist auf dieser Beleg-Basis vertretbar; **vor Pilotstart** ist der Runtime-Smoke Pflicht.

| # | Behauptung (Mail/Kit) | Produktfähigkeit | Beleg (Repo) | Status | Empfohlene Formulierung |
|---|---|---|---|---|---|
| K1 | Warenannahme dokumentieren (Mengen, Abweichungen, wer) | Goods-Receipt-Modul: Annahme erfasst `receivedById` (eingeloggter Nutzer), verknüpft Bestellung + Lagerbewegung | `apps/api/prisma/schema.prisma` (`GoodsReceipt`, `GoodsReceiptItem`), `apps/api/src/modules/inventory/goods-receipt.service.ts`, Test `goods-receipt.service.test.ts` | `confirmed` | wie bisher |
| K2 | Auffüllliste mit Status (gebraucht / erledigt / wer) | Bar-Refill: Run/Items mit Status `open / partially_confirmed / confirmed`, `confirmedBy` + `confirmedAt`, verknüpfte Lagerbewegung. **Nur Bar** — Küche hat Checkliste + Walk-Route, keine Auffüllliste | Schema (`BarRefillRun`, `BarRefillRunItem`), `bar-refill.service.ts`, Cockpit-Route `/inventory/bar-refill`, Tests `bar-refill.service.test.ts` + `bar-refill.migration.test.ts`; Küche: `apps/cockpit/app/(app)/kitchen/{checkliste,walk-route}/` | `needs wording change` | „Auffüllliste für die Bar“ — nicht „Bar und Küche“ |
| K3 | Schichtübergabe strukturiert festhalten | Shift-Handover-Modul: Zusammenfassung, offene Punkte, Alerts, Notizen; Bestätigen + Archivieren | Schema (`ShiftHandoverDraft`), `apps/api/src/modules/shift-handover/`, Cockpit-Route `/shift-handover`, Test `shift-handover.routes.test.ts` | `confirmed` | wie bisher |
| K4 | Korrekturen mit Grund + Freigabe, Änderungen bleiben sichtbar | Correction-Service: `reason` ist Pflichtfeld, Status `open / approved / rejected`, `reviewedById` + `reviewedAt`; Freigabe-Ansicht im Cockpit | `correction.service.ts`, `review-task.service.ts`, Cockpit-Route `/freigaben`, Tests `correction.service.test.ts` + `correction-request-rls.test.ts` | `confirmed` | wie bisher |
| K5 | Verlauf/Audit Trail für Betriebsleitung „jederzeit einsehbar“ | Jede Warenbewegung trägt Pflichtfeld `actorUserId` + Zeitstempel; einsehbar über Bewegungs-Ansicht + Dashboard; Notizen zusätzlich mit eigenem Audit-Event | Schema (`InventoryMovement.actorUserId`, `OperationalNoteAuditEvent`), Cockpit-Routen `/movements`, `/dashboard` | `confirmed` (mit Präzisierung) | „jede Bewegung mit Wer/Was/Wann nachvollziehbar“ — kein generisches „Compliance-Audit“ versprechen |
| K6 | Mobile Erfassung „direkt an der Rampe“ / „tippt in ein Handy“ | Responsive Web-App mit eigenem Mobile-Layout (Bottom-Navigation, Mobile-Stylesheet) — läuft im Handy-Browser | `apps/cockpit/app/mobile-ops.css` (Layout ≤ 1023 px), `components/bottom-nav.tsx`, `components/quick-notes-fab.tsx` | `confirmed` (mit Grenze) | Browser-App sagbar; **nicht** behaupten: native App, Offline-Betrieb (Offline lt. Spec Pack bewusst nach Pilot v1.5) |
| K7 | Eintrag „nicht komplizierter als eine WhatsApp-Nachricht“ | Subjektive UX-Aussage — als Produkteigenschaft nicht belegbar | — | `needs wording change` | Als Anspruch formulieren: „Der Anspruch: ein Eintrag dauert nicht länger als eine Kurznachricht“ — oder weglassen |

**Regel unverändert:** Kein Beleg = keine Behauptung. K2 und K7 sind in `first-contact-final.md` bereinigt (2026-07-03); übrige Kit-Dateien mit „Bar/Küche“-Formulierung sind im `sales-kit-index.md` als Widerspruch gelistet.

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
| O2 | Produktstand gegen Kit-Behauptungen prüfen | Abschnitt 2d (Truth Table) | ✅ aufgelöst 2026-07-03 auf Code-/Test-Ebene — 5× confirmed, 2× wording change (in finale Mail eingearbeitet). Rest-Gate: Runtime-Smoke vor **Pilotstart** (P0), nicht vor Versand |
| O3 | DSGVO Stufe 2 belegen oder bewusst bei Stufe 1 bleiben | Abschnitt 3 | 🔶 offen |

**O2 war der einzige harte Blocker für die Mail selbst** — mit der Truth Table (Abschnitt 2d) und der bereinigten `first-contact-final.md` ist der Versand freigegeben, sobald ein Lead-Steckbrief ausgefüllt ist. O1 und O3 bleiben Blocker für das **Erstgespräch bzw. den Pilotstart**, nicht für den Versand.
