# First Lead Dry Run — Demo-Betrieb Nordstern

**Datum:** 2026-07-03

**Status:** synthetischer Testfall, kein realer Betrieb, keine reale Person, keine echte Domain oder Kontaktadresse.

**Zweck:** Die vollständige Skill-Kette prüfen, ohne Recherche oder Versand auszulösen. Alle „Beobachtungen“ stammen aus diesem ausdrücklich fiktiven Test-Fixture und dürfen nicht in echten Outreach übernommen werden.

## 1. Product Context — `bevero-product-marketing-context`

### Zielkunde und Rollen

- **Who:** einzelner Hotel-/Gastronomiestandort mit Restaurant, Bar und Schichtbetrieb.
- **Buyer:** Betriebsleitung; **User:** Schichtleitung und operatives Team.
- **Anti-Persona:** Betrieb ohne Übergabepunkte oder mit Bedarf an ERP, Bestellwesen, Küchen-Auffüllliste oder Offline-Betrieb.

### JTBD Value Proposition

- **Why:** Warenannahme, Bar-Auffüllung und Schichtübergaben nachvollziehbar festhalten.
- **What Before:** Papier, Messenger und mündliche Übergabe als mögliche Alternativen; im realen Lead erst belegen oder erfragen.
- **How:** ausschließlich K1, K2, K3, K5 und K9 in der engen O2-Fassung.
- **What After:** Einträge und Warenbewegungen können mit verantwortlicher Person und Zeitpunkt nachvollzogen werden; kein ROI- oder Vollständigkeitsversprechen.
- **Alternatives:** bestehende Warenwirtschaft, Papier, Messenger, kein zusätzlicher Prozess.

### Version Boundary

- **Aktuell sagbar:** Warenannahme, Bar-Auffüllliste, Schichtübergabe, Wer/Was/Wann bei Warenbewegungen, Browser-Anwendung nur als technische Zugangsform.
- **Nicht zusagen:** Küchen-Auffüllliste, WhatsApp-Einfachheit, lückenloser Audit Trail, native App, Offline, im Lageralltag bewährte Mobile-Optimierung.

## 2. Lead Research / Steckbrief — `bevero-lead-research`

### Identität

- **Betrieb:** Demo-Betrieb Nordstern, fiktiver einzelner Hotel-/Gastronomiestandort.
- **Domain:** keine — Demo.
- **Geschäftskontakt:** keine reale Adresse; Rolle „Betriebsleitung“ nur Testplatzhalter.
- **Quelle:** synthetisches P1.1b-Test-Fixture, erstellt 2026-07-03; **keine öffentliche Quelle**.

### Beobachtungen

| Demo-Beobachtung | Quelle | Datum | Confidence |
|---|---|---|---|
| Das Fixture beschreibt Restaurant, Bar und Terrasse | synthetisches P1.1b-Test-Fixture | 2026-07-03 | `demo_only` |
| Das Fixture beschreibt Früh- und Spätschicht | synthetisches P1.1b-Test-Fixture | 2026-07-03 | `demo_only` |
| Eine reale Kontaktperson ist absichtlich nicht vorhanden | Dry-Run-Grenze | 2026-07-03 | `confirmed` |

### Operative Hypothesen

| Hypothese | Ableitung | Fails if / reale Prüfung |
|---|---|---|
| Mehrere Übergabepunkte könnten bestehen | mehrere Bereiche + Schichten im Fixture | Betrieb hat einen zentralen, bereits sauber dokumentierten Ablauf |
| Bar-Auffüllung könnte ein Pilotkandidat sein | Bar im Fixture | Auffüllung ist bereits verlässlich gelöst oder nicht relevant |
| Betriebsleitung könnte Überblick benötigen | Schichtbetrieb im Fixture | bestehendes System beantwortet Wer/Was/Wann bereits direkt |

### Sicherer Demo-Aufhänger

„Im Test-Fixture sind Restaurant, Bar und Terrasse als getrennte Bereiche beschrieben. Für einen realen Lead müsste diese Beobachtung aus einer datierten öffentlichen Quelle stammen, bevor sie verwendet wird.“

### Lead-Steckbrief — Kurzfassung

| Feld | Demo-Eintrag |
|---|---|
| Betriebstyp | Hotel/Gastronomie-Mischform — fiktiv |
| Standort | ein fiktiver Standort |
| Ausgabestellen | Restaurant, Bar, Terrasse — Test-Fixture |
| Schichtlogik | Früh-/Spätschicht — Test-Fixture |
| Priorisierte Hypothesen | Übergaben, Bar-Auffüllung, Warenbewegungen |
| No-Fit-Risiken | ERP-, Küchen-Refill- oder Offline-Erwartung |
| Reale Quellenlage | fehlt absichtlich; echter Versand blockiert |

## 3. Operational Fit Score — `bevero-operational-fit-score`

**Testregel:** Die Punkte prüfen die Rechen- und Übergabelogik mit synthetischen Fixture-Annahmen. Sie sind kein echter Lead-Score.

| Dimension | Score 0–2 | Demo-Evidenz | Confidence |
|---|---:|---|---|
| Operative Übergabepunkte | 2 | mehrere Bereiche + Schichten im Fixture | `demo_only` |
| Pilot-Scope-Nähe | 2 | Bar-Auffüllung und Übergabe im Fixture | `demo_only` |
| Standortkomplexität | 2 | drei Bereiche, ein Standort | `demo_only` |
| Problem-/Timing-Signal | 0 | kein realer Schmerz belegt | `none` |
| Entscheiderzugang | 1 | Rolle Betriebsleitung, keine Person | `demo_only` |
| Einführungsfähigkeit | 1 | kleiner 1–2-Prozess-Scope testbar | `demo_only` |

- **Gesamt:** 8/12
- **Klasse:** B / erst Lücke klären (`simulation_only`)
- **Nächste reale Aktion:** öffentliche Quelle und zuständigen Geschäftskanal belegen; keinen Kontakt ausführen.

### Load-bearing assumptions

| Annahme | Getragene Punkte | Cheapest test | Kill criterion |
|---|---:|---|---|
| Mehrere Bereiche erzeugen relevante Übergaben | 4 | im Erstgespräch aktuellen Ablauf offen erfragen | Übergaben sind bereits zuverlässig im Bestandssystem gelöst |
| Bar-Auffüllung ist relevant | 2 | nach heutigem Bar-Ablauf fragen | keine Bar oder kein Auffüllproblem |

## 4. Claim Red Team — `bevero-sales-claim-red-team`

| ID | Claim | Klasse | Evidenz + Datum | Gate | Status | Sichere Fassung |
|---|---|---|---|---|---|---|
| D1 | Restaurant, Bar und Terrasse sind getrennte Bereiche | Personalisierung | nur synthetisches Fixture, 2026-07-03 | reale Quelle fehlt | `blocked_for_real_use` | nur im Dry Run verwenden |
| D2 | Bevero hält Warenannahme fest | product capability | O2 K1, 2026-07-03 | O2 | `pass` | „Warenannahme festhalten“ |
| D3 | Bevero hält Bar-Auffülllisten fest | product capability | O2 K2, 2026-07-03 | O2 | `pass` | „Bar-Auffülllisten festhalten“ |
| D4 | Bevero hält Schichtübergaben fest | product capability | O2 K3, 2026-07-03 | O2 | `pass` | „Schichtübergaben festhalten“ |
| D5 | Bevero ersetzt Kasse/Warenwirtschaft nicht | product scope | O2 K9, 2026-07-03 | O2 | `pass` | „Ergänzung, kein Ersatz“ |

- **Gate Result für Test-Draft:** `pass` im synthetischen Fixture.
- **Gate Result für realen Versand:** `blocked`, weil D1 keine öffentliche Quelle und der Empfänger keinen realen Geschäftskanal hat.
- **Nicht verwendet:** Preis, Datenschutz-Stufe 2, Audit Trail, Mobile-Optimierung, WhatsApp-Einfachheit, Küche-Refill, Offline.

## 5. Outreach Readiness vor Draft — `bevero-outreach-readiness`

| Gate | Status | Evidenz / Lücke | Fallback |
|---|---|---|---|
| Product Context | `pass` | datiert; O2-Grenzen übernommen | — |
| Lead Identity + Sources | `demo_only` | synthetisches Fixture, keine öffentliche Quelle | Draft deutlich als Demo markieren |
| Operational Fit | `partial` | Klasse B, nur Simulation | reale Lücken zuerst klären |
| Claim Red Team / O2 | `pass_for_fixture` | D2–D5 bestätigt; D1 nur Demo | D1 nie real verwenden ohne Quelle |
| Pricing / O1 | `not_used` | kein Preis im Draft | — |
| Data / O3 | `not_used` | keine Datenaussage im Draft | — |
| Compliance | `pass_for_fixture` | keine realen/sensiblen Daten | — |
| Human Send Boundary | `pass` | keine externe Aktion | Mensch bleibt alleiniger Sender |

- **Result:** `ready_for_draft` ausschließlich als synthetischer Test.
- **Realer Versandstatus:** `blocked`.

## 6. First Contact Draft — `bevero-first-contact-draft`

> **DEMO — NICHT SENDEN. Empfänger, Betrieb und Beobachtung sind fiktiv.**

### Betreff

Übergaben und Bar-Auffüllung beim Demo-Betrieb Nordstern

### Mail-Entwurf

Guten Tag an die fiktive Betriebsleitung,

im Test-Fixture sind Restaurant, Bar und Terrasse als getrennte Bereiche beschrieben. Mich interessiert, wie Warenbewegungen und Übergaben zwischen diesen Bereichen heute laufen.

Ich habe Bevero gebaut, um Warenannahme, Bar-Auffülllisten und Schichtübergaben festzuhalten. Es ergänzt bestehende Kassen- und Warenwirtschaftssysteme, statt sie zu ersetzen.

Wäre ein kurzer Abgleich von 20–30 Minuten grundsätzlich relevant? Wenn die Abläufe bereits sauber gelöst sind, ist das genauso ein klares Ergebnis.

Beste Grüße

[DEMO-ABSENDER — NICHT SENDEN]

### Review-Metadaten — nicht mitsenden

- Empfängerquelle: keine; synthetische Rolle.
- Personalisierungsquelle: synthetisches Test-Fixture vom 2026-07-03.
- Verwendete Claim-IDs: D1–D5; D1 nur Fixture.
- O2-Prüfstand: 2026-07-03 nach W1–W4.
- Externe Aktion: keine.

## 7. Final Outreach Readiness

| Gate | Status | Begründung |
|---|---|---|
| Draft-Qualität im Fixture | `pass` | kurze Mail, ein CTA, keine unbestätigte Produktfähigkeit |
| Reale Leadquelle | `blocked` | keine öffentliche Quelle |
| Reale Empfängeridentität | `blocked` | keine reale Person oder Geschäftsadresse |
| Human Review | `not_started` | Demo darf nicht freigegeben werden |
| Versand | `not_sent` | kein Tool-/Mail-Aufruf, keine externe Handlung |

- **Dry-Run-Ergebnis:** `pass` — alle sechs Skills wurden durchlaufen und die Kette stoppt fail-closed vor realem Versand.
- **Versandstatus:** `blocked / not_sent`.
- **Nächster echter Gate:** Einen realen Lead ausschließlich aus öffentlichen Quellen neu recherchieren; keine Demo-Angabe übernehmen.
