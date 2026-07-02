# product-roadmap.md

## Phase 0 — Vorbereitung & Validierung (Woche 1–2)

**Ziel:** Bestätigen, dass die fünf Kernprozesse die reale Betriebspraxis des Pilotkandidaten treffen, bevor gebaut wird.

- [ ] Prozess-Walkthrough vor Ort: eine Warenannahme, eine Schichtübergabe, ein Auffüllvorgang real beobachten und protokollieren
- [ ] Lagerorte des Referenzbetriebs aufnehmen (Liste, keine Software)
- [ ] Rollenbild mit Betriebsleitung abgleichen (wer nimmt an, wer gibt frei, wer füllt auf)
- [ ] Top-100-Artikelliste als Startdatensatz definieren
- [ ] Baseline-Erhebung für Pilot-KPIs starten (siehe `pilot-kpi-plan.md`)
- [ ] Pilotangebot (`pilot-offer.md`) mit Kandidat besprochen und Absichtserklärung eingeholt

**Done-Kriterien:**
- Die fünf Kernprozesse sind vom Küchenchef und einer Schichtleitung des Kandidaten als „so läuft es bei uns" bestätigt oder mit dokumentierten Abweichungen versehen.
- Es existiert eine unterschriebene Pilot-Absichtserklärung oder eine dokumentierte Absage mit Gründen.

## Phase 1 — MVP-Bau (Woche 3–8)

**Ziel:** Die fünf MVP-Kernbereiche sind auf dem Smartphone unter Betriebsbedingungen benutzbar.

- [ ] Rollen & Rechte (feste Rollen) inkl. PIN-Wechsel auf Schichtgeräten
- [ ] Warenannahme mit Positionen, Abweichungen, Lieferschein-Foto
- [ ] Lagerorte + Umlagerung mit Bewegungshistorie
- [ ] Auffüllliste Bar/Küche (vorlage-basiert, siehe `mvp-scope-lock.md`)
- [ ] Schichtübergabe mit Auto-Entwurf und aktiver Übernahme-Bestätigung
- [ ] Freigabe-/Korrekturprozess mit append-only Audit-Trail
- [ ] Offline-Erfassung mit Sync-Statusanzeige
- [ ] Backup/Restore-Verfahren inkl. Restore-Test (vorgezogen aus Phase 3, siehe `technical-build-spec-outline.md`)

**Done-Kriterien:**
- Jeder der fünf Kernprozesse ist end-to-end auf einem Smartphone durchführbar, inklusive Offline-Test im funklosen Raum.
- Ein kompletter Testtag (simulierte Warenannahme, zwei Übergaben, eine Auffüllliste, eine Korrektur) läuft ohne Papier-Nebenaufzeichnung durch.
- Audit-Trail zeigt für jeden Testvorgang Person, Zeit und Verlauf lückenlos.

## Phase 2 — Pilotbetrieb (Woche 9–16)

**Ziel:** Ein realer Betrieb führt die Kernprozesse im Alltag in Bevero — nicht neben Bevero.

- [ ] Setup vor Ort: Lagerorte, Artikelliste, Nutzer & Rollen angelegt
- [ ] Schulung: 2 × 45 Minuten pro Rollengruppe, direkt am Prozess
- [ ] Begleitete erste Woche (Ansprechpartner erreichbar zu Warenannahme- und Übergabezeiten)
- [ ] Wöchentlicher Check-in mit Betriebsleitung (Nutzung, Blocker, Wünsche)
- [ ] Pilot v1: CSV-Export, Controlling-Rolle, Offline-Härtung (siehe `mvp-scope-lock.md`)
- [ ] Pilot v1.5 (zweite Pilothälfte, datenabhängig): heuristische Vorbefüllung, Anomalie-Hinweise (Aktivierung laut `cold-start-ai-plan.md`)
- [ ] Erfolgsmessung gegen Pilotkriterien (siehe `pilot-offer.md`, `pilot-kpi-plan.md`)
- [ ] Feedback in priorisierte Anpassungsliste überführen; kleine Anpassungen umsetzen

**Done-Kriterien:**
- Schichtübergabe wird an 5 aufeinanderfolgenden Tagen ohne Papier-Fallback durchgeführt.
- Mindestens 80 % der Warenannahmen eines Kalendermonats sind in Bevero erfasst.
- Mindestens ein Korrekturprozess mit Zwei-Personen-Freigabe ist real durchlaufen.
- Betriebsleitung bestätigt schriftlich Weiterbetrieb oder benennt Abbruchgründe.

## Phase 3 — Härtung + zweiter Kunde (Woche 17–26)

**Ziel:** Aus dem Einzelpilot wird ein wiederholbares Produkt mit zweitem, andersartigem Betrieb.

- [ ] Pilot-Feedback konsolidiert: was ist Produkt, was war Sonderfall
- [ ] Setup-Prozess standardisiert (Datenaufnahme-Vorlagen, Schulungsunterlagen)
- [ ] Zweiter Kunde (anderer Betriebstyp, z. B. Gastro ohne Hotel) live
- [ ] Betriebsstabilität: Monitoring, Supportprozess definiert
- [ ] Preismodell für Regelbetrieb validiert (siehe `pilot-offer.md`)

**Done-Kriterien:**
- Zweiter Kunde erreicht die Phase-2-Done-Kriterien mit ≤ 50 % des Setup-Aufwands des ersten Piloten.
- Kein Datenverlust-Vorfall über den gesamten Zeitraum; Restore-Test dokumentiert bestanden.

## Phase 4+ — Vision: Richtung Workflow-OS (nach Woche 26, nur Richtung, keine Zusage)

**Ziel:** Bevero wächst vom Warenfluss-Werkzeug zur operativen Wissens- und Verantwortungsebene des Standorts.

- [ ] Wiederkehrende Abläufe jenseits des Warenflusses (Öffnungs-/Schließ-Checklisten, Wartungsmeldungen)
- [ ] Verbrauchssignale aus Kassendaten für präzisere Auffülllisten (Integration, s. Annahmen in `prd.md`)
- [ ] Mehrstandort-Sicht und Mandantenfähigkeit
- [ ] Entscheidungs- und Wissenshistorie des Standorts abfragbar machen (Company-Brain-Richtung: „Warum machen wir das so?" hat eine nachschlagbare Antwort)

**Done-Kriterien:** werden je Ausbaustufe neu definiert; Phase 4+ startet erst nach zahlendem Regelbetrieb von mindestens zwei Kunden.
