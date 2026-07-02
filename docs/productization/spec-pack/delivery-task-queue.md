# delivery-task-queue.md

Enthält drei Abschnitte: `decision-lock-before-build`, die Task-Queue je Slice, `recommended-first-sprint`.

---

# decision-lock-before-build.md

Entscheidungen, die **vor Baubeginn des jeweiligen Slice** getroffen und schriftlich festgehalten sein müssen. Quelle: offene Punkte aus `technical-build-spec-outline.md` und `acceptance-tests.md` — keine neuen Entscheidungen erfunden. Ein Slice mit offener Lock-Entscheidung startet nicht (`[BLOCKER]`).

## Vor Slice 1

| # | Entscheidung | Referenz | Markierung |
|---|---|---|---|
| D1 | PIN-Modell: Länge, Sperrverhalten nach Fehlversuchen (Anzahl, Sperrdauer, Entsperrweg) | PIN-02, Spec-Abschnitt 2 | `[DECISION]` `[BLOCKER]` für S1-T2 |
| D2 | Inaktivitäts-Timeout am Schichtgerät (Dauer, Verhalten bei laufendem Entwurf) | PIN-03 | `[DECISION]` `[BLOCKER]` für S1-T2 |
| D3 | Zweckbindungs-Zusage „keine Leistungskontrolle" als Produktregel bestätigen (keine Pro-Person-Auswertungen im Produkt) | Risiko-Register Nr. 5, PIN-05 | `[DECISION]` `[DSGVO/BV]` — Bau-relevant, weil sie Auswertungsfunktionen ausschließt |

## Vor Slice 4

| # | Entscheidung | Referenz | Markierung |
|---|---|---|---|
| D4 | Liegengebliebene Freigabe: bleibt sichtbar offen (Minimal-Default) oder Eskalation an Betriebsleitung nach X Stunden | AB-03 | `[DECISION]` |
| D5 | Stellvertretungsregel: wer gibt bei Abwesenheit des Küchenchefs frei | AB-06 | `[DECISION]` — baubar mit Default „nur Betriebsleitung ersatzweise", aber Go-Live-Blocker |
| D6 | Korrekturantrag-Rückzug durch Antragsteller: erlaubt mit Audit-Event (Empfehlung) oder nur Ablehnung durch Freigeber | KO-03 | `[DECISION]` — betrifft S4/S5 |

## Vor Slice 7

| # | Entscheidung | Referenz | Markierung |
|---|---|---|---|
| D7 | Unbestätigte Übergabe bei Dienstantritt: Warnbanner (Empfehlung) oder Sperre | SU-03 | `[DECISION]` |
| D8 | Doppelschicht: Übergabe an sich selbst mit Hinweis (Empfehlung) oder Entfall mit Tagesabschluss-Vermerk | SU-06 | `[DECISION]` |
| D9 | Datentechnische Schichtgrenze: wodurch beginnt/endet eine Schicht im System (pragmatische Regel) | Slice-7-Risiko | `[DECISION]` `[BLOCKER]` für S7-T1 — ohne Grenze kein Auto-Entwurf |

## Vor Slice 9

| # | Entscheidung | Referenz | Markierung |
|---|---|---|---|
| D10 | Foto-Aufbewahrungsdauer und Löschkonzept, abgeglichen mit handels-/steuerrechtlichen Fristen (juristische Prüfung, nicht Entwicklerteam) | Spec-Abschnitt 5 | `[DECISION]` `[DSGVO/BV]` `[BLOCKER]` |
| D11 | Umgang mit Fremd-PII auf Lieferschein-Fotos (Fahrernamen, Unterschriften): Zugriffs- und Löschregel | WA-07 | `[DECISION]` `[DSGVO/BV]` `[BLOCKER]` |

## Vor Slice 10

| # | Entscheidung | Referenz | Markierung |
|---|---|---|---|
| D12 | Kollisionsdefinition: wann gelten zwei Offline-Buchungen als kollidierend (präzise Kriterien) | OF-04, Spec-Abschnitt 4 | `[DECISION]` `[BLOCKER]` |
| D13 | Warteschlangenmodell: maximale Offline-Dauer, Verhalten bei vollem Speicher, Reihenfolge-Garantien | Spec-Abschnitt 4 | `[DECISION]` `[BLOCKER]` |
| D14 | Gerätezeit-Regel: Umgang mit falsch gestellten Geräten im Audit (Erkennung, Kennzeichnung) | OF-05 | `[DECISION]` |
| D15 | Offline als Go-Live-Kriterium: ist ein Notfall-Go-Live online-only zulässig, falls Slice 10 sich verzögert | Slice-10-Blocker | `[DECISION]` — Product Owner |

---

# Task-Queue je Slice

## Arbeitsregeln für den Coding-Agenten

- Ein Task = ein Arbeitsblock = ein Review. Kein Task beginnt, bevor sein Vorgänger reviewt ist.
- Jede schreibende Aktion erzeugt ab Slice 3 ihr Audit-Event (vorläufiger Katalog); Slice 8 härtet.
- Foto und Offline werden **nicht** vorgezogen, auch nicht „weil es gerade passt". Slices 1–8 sind online-only und fotofrei.
- Bei jeder Versuchung, ein Feature zu ergänzen: `Out of MVP` notieren, nicht bauen.

---

## Slice 1 — Workspace, Standort, Rollenbasis

**Ziel:** Ein Standort, fünf feste Rollen, belastbare Personenzuordnung am geteilten Gerät.
**Voraussetzungen:** D1, D2, D3 entschieden.
**Risiken:** PIN-Verhalten auf geteiltem Gerät; alles Spätere erbt die Personenzuordnung.
**Review-Hinweise:** Prüfen, dass Rechte an Personen hängen, nie an Geräten; keine versteckte sechste Rolle; keine Pro-Person-Auswertung angelegt (`[DSGVO/BV]`).

### Task S1-T1 — Workspace & Nutzerverwaltung mit 5 festen Rollen

* **Ziel:** Standort-Workspace existiert; Betriebsleitung legt Nutzer mit genau einer Rolle und Bereichszuordnung an.
* **Scope:** Genau ein Workspace; Rollen Geschäftsführung/Betriebsleitung, Küchenchef, Schichtleitung, Bar/Service, Lager/Warenannahme; Nutzer anlegen/deaktivieren.
* **Nicht enthalten:** Mandantenfähigkeit, Controlling-Rolle (Pilot v1), konfigurierbare Rollen, Selbstregistrierung.
* **Betroffene Rollen:** Betriebsleitung (handelt), alle (existieren).
* **Betroffene Kernobjekte:** Nutzer/Rolle.
* **Akzeptanztests:** Vorbereitung für WA-02, UM-02, AL-02, SU-02 (Rollenbasis).
* **Done-Kriterien:** Fünf Rollen fest im System; Nutzer ohne Rolle unmöglich; Deaktivieren statt Löschen.
* **Blocker/Entscheidungen:** D3 `[DSGVO/BV]`.
* **Reviewer-Fokus:** Rollenliste hart kodiert (bewusst!), keine Konfigurierbarkeit eingeschlichen.

### Task S1-T2 — Anmeldung, PIN-Wechsel, Sperre, Timeout

* **Ziel:** Personen wechseln sich per PIN auf einem Schichtgerät ab; Sitzungen sind sauber getrennt.
* **Scope:** PIN-Anmeldung, PIN-Wechsel beendet Vorsitzung, Sperrverhalten laut D1, Inaktivitäts-Abmeldung laut D2, minimales Sitzungsprotokoll (Beginn/Ende/Person/Gerätekennung) als Audit-Vorstufe.
* **Nicht enthalten:** Passwort-Self-Service jenseits PIN-Reset durch Betriebsleitung, biometrische Anmeldung, Audit-Härtung (Slice 8).
* **Betroffene Rollen:** alle.
* **Betroffene Kernobjekte:** Nutzer/Rolle, Audit-Event (Vorstufe).
* **Akzeptanztests:** PIN-01, PIN-02, PIN-03, PIN-04.
* **Done-Kriterien:** PIN-01 und PIN-04 bestehen; Sperr- und Timeout-Verhalten entsprechen exakt D1/D2.
* **Blocker/Entscheidungen:** `[BLOCKER]` ohne D1/D2; PIN-01/03 `[DSGVO/BV]`.
* **Reviewer-Fokus:** Keine Aktion kann der Vorperson zugeordnet werden; Sitzungsende ist beweisbar.

### Task S1-T3 — Berechtigungsdurchsetzung (Grundgerüst)

* **Ziel:** Die Berechtigungsmatrix (Spec-Abschnitt 2) wird zentral durchgesetzt — einmal gebaut, von allen späteren Slices genutzt.
* **Scope:** Zentrale Prüfung Rolle × Aktion × Bereich; verweigerte Aktionen erscheinen nicht in der Sicht der Rolle; verständliche Verweigerungsmeldung.
* **Nicht enthalten:** Die fachlichen Aktionen selbst (kommen je Slice), Stellvertretungslogik (D5, Slice 4).
* **Betroffene Rollen:** alle.
* **Betroffene Kernobjekte:** Nutzer/Rolle.
* **Akzeptanztests:** trägt WA-02, UM-02, AL-02, SU-02, OF-02.
* **Done-Kriterien:** Neue Aktionen sind nur mit Matrix-Eintrag registrierbar; ein Negativtest je Rolle besteht.
* **Blocker/Entscheidungen:** Berechtigungsmatrix (Spec-Abschnitt 2) muss vollständig vorliegen — `[BLOCKER]`, Fertig-Kriterium: keine Aktion ohne Matrix-Zeile.
* **Reviewer-Fokus:** Durchsetzung serverseitig/zentral, nicht nur UI-Ausblendung.

**Done-Kriterien Slice 1:** Zwei Personen wechseln sich per PIN ab, jede Aktion korrekt zugeordnet; Rollen-Negativtests bestehen.
**Tests Slice 1:** PIN-01 bis PIN-04; PIN-06 `[PILOTGERÄT]` sobald Geräte vorliegen.

---

## Slice 2 — Lagerorte & Artikelstamm

**Ziel:** Physische Welt abgebildet: Lagerorte + Top-Artikelliste.
**Voraussetzungen:** Slice 1 reviewt; Phase-0-Datenaufnahme liegt vor (sonst Testdaten, Done erst mit Realdaten).
**Risiken:** Gering; einzige Falle Deaktivieren vs. Löschen.
**Review-Hinweise:** Keine Hierarchien, keine Preise — Versuchung dokumentieren, nicht bauen.

### Task S2-T1 — Lagerortverwaltung

* **Ziel:** Betriebsleitung pflegt die Lagerortliste; alle anderen lesen.
* **Scope:** Anlegen, Umbenennen, Deaktivieren; deaktivierte Orte in neuen Vorgängen nicht wählbar, in Historie sichtbar.
* **Nicht enthalten:** Unterorte/Hierarchien, Löschen, Lagerort-Attribute jenseits Name/Status.
* **Betroffene Rollen:** Betriebsleitung (schreibt), alle (lesen).
* **Betroffene Kernobjekte:** Lagerort.
* **Akzeptanztests:** Slice-2-Berechtigungstest (Schichtleitung kann keinen Lagerort anlegen).
* **Done-Kriterien:** Reale Lagerorte des Piloten angelegt; Deaktivierungs-Semantik nachgewiesen.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Referenzintegrität — deaktivierter Ort bricht keine bestehende Referenz.

### Task S2-T2 — Artikelstamm

* **Ziel:** Artikel mit Name, Einheit, Bereich (Küche/Bar) existieren und sind deaktivierbar.
* **Scope:** Pflege durch Betriebsleitung (plus Küchenchef für Küchenbereich laut Matrix); Deaktivieren-Semantik wie S2-T1; Umlaute/Sonderzeichen.
* **Nicht enthalten:** Preise, Lieferanten-Zuordnung über Stammliste hinaus, Rezepturen, Barcodes.
* **Betroffene Rollen:** Betriebsleitung, Küchenchef.
* **Betroffene Kernobjekte:** Artikel.
* **Akzeptanztests:** Deaktivierungs-Verhalten, Sonderzeichen-Test.
* **Done-Kriterien:** Deaktivierter Artikel in neuen Vorgängen unwählbar, in alten sichtbar.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Bereichszuordnung korrekt — sie steuert später das Freigaberouting (Slice 4).

### Task S2-T3 — Setup-Datenimport

* **Ziel:** Die Phase-0-Datenaufnahme (Lagerorte, ~100 Artikel, Nutzer) wird als einfacher Einlese-Vorgang übernommen.
* **Scope:** Strukturierter Import aus der Setup-Vorlage; Fehlerbericht bei unvollständigen Zeilen; wiederholbar ohne Dubletten.
* **Nicht enthalten:** Self-Service-Import für Kunden, laufende Synchronisation, Importformate jenseits der eigenen Setup-Vorlage.
* **Betroffene Rollen:** Anbieter/Betriebsleitung beim Setup.
* **Betroffene Kernobjekte:** Lagerort, Artikel, Nutzer/Rolle.
* **Akzeptanztests:** Import der Pilot-Realdaten als Testfall.
* **Done-Kriterien:** Kompletter Pilotdatensatz in < 30 Minuten eingespielt, Fehlerbericht verständlich.
* **Blocker/Entscheidungen:** Phase-0-Daten nötig für den Realtest.
* **Reviewer-Fokus:** Idempotenz — zweiter Lauf erzeugt keine Dubletten.

**Done-Kriterien Slice 2:** Reale Pilotdaten angelegt; Deaktivierungs-Semantik und Berechtigungen nachgewiesen.
**Tests Slice 2:** Slice-2-Tests oben; kein `[PILOTGERÄT]`-Bedarf.

---

## Slice 3 — Warenannahme ohne Foto, ohne Abweichung

**Ziel:** Happy Path Warenannahme end-to-end; erstes Audit-Grundgerüst.
**Voraussetzungen:** Slices 1–2 reviewt; Zustandsmodell Warenannahme (Spec-Abschnitt 1) abgenommen `[BLOCKER]`; Geräte-Testmatrix aus Phase 0 liegt vor (für WA-06).
**Risiken:** Entwurf-Verlust bei Unterbrechung; Mobile-Bedienbarkeit erstmals real.
**Review-Hinweise:** Kein Foto-Feld, kein Abweichungs-Feld „schon mal vorbereitet" — Slice-Grenzen sind hart.

### Task S3-T1 — Audit-Grundgerüst (append-only)

* **Ziel:** Zentraler, append-only Audit-Mechanismus, den alle Fachslices ab jetzt nutzen.
* **Scope:** Event-Erzeugung mit Person, Gerätekennung, Zeitstempel (Feld „übertragen" schon angelegt, online = identisch); kein Update/Delete möglich; vorläufiger Katalog für Slice-3-Aktionen.
* **Nicht enthalten:** Manipulationserkennung, Pseudonymisierung, Leseansicht, Katalog-Vollständigkeit (alles Slice 8).
* **Betroffene Rollen:** alle (implizit).
* **Betroffene Kernobjekte:** Audit-Event.
* **Akzeptanztests:** WA-05 (Basis).
* **Done-Kriterien:** Kein Event editierbar/löschbar; jede Slice-3-Aktion erzeugt genau ein Event.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Append-only technisch erzwungen, nicht nur Konvention; Dual-Zeitstempel-Feld vorhanden.

### Task S3-T2 — Warenannahme: Zustandsmodell & Entwurf-Persistenz

* **Ziel:** Warenannahme Entwurf → Erfasst; Entwurf übersteht Unterbrechung und Abmeldung.
* **Scope:** Anlegen (Lieferant aus Stamm), Positionen (Artikel, Menge, Ziellagerort), Abschluss erzeugt genau eine Bewegung je Position; Entwurf-Wiederaufnahme nach erneuter Anmeldung derselben Person.
* **Nicht enthalten:** Foto (Slice 9), Abweichung (Slice 4), Nachtragen nach Abschluss (Korrekturprozess), Offline (Slice 10).
* **Betroffene Rollen:** Lager/Warenannahme; Küchenchef/Betriebsleitung lesen.
* **Betroffene Kernobjekte:** Warenannahme, Bewegung, Artikel, Lagerort, Audit-Event.
* **Akzeptanztests:** WA-01, WA-03, WA-05.
* **Done-Kriterien:** WA-01 und WA-03 bestehen; Positionen ↔ Bewegungen exakt 1:1.
* **Blocker/Entscheidungen:** `[BLOCKER]` Zustandsmodell nicht abgenommen.
* **Reviewer-Fokus:** Kein Zustand ohne definierten Ausweg; Entwurf ist personengebunden.

### Task S3-T3 — Mobile Erfassungsoberfläche Warenannahme

* **Ziel:** Die Annahme ist unter Rampenbedingungen bedienbar.
* **Scope:** Erfassungsfluss für Smartphone: große Touchziele, minimale Pflichtfelder, 10 Positionen < 4 Minuten.
* **Nicht enthalten:** Desktop-Optimierung (Zweitsicht später), Foto-UI, Barcode.
* **Betroffene Rollen:** Lager/Warenannahme.
* **Betroffene Kernobjekte:** Warenannahme.
* **Akzeptanztests:** WA-06 `[PILOTGERÄT]`, WA-02 (Sichtbarkeitstest).
* **Done-Kriterien:** Zeitmessung dokumentiert bestanden; Rolle ohne Recht sieht die Funktion nicht.
* **Blocker/Entscheidungen:** WA-06 final nur auf Pilotgeräten.
* **Reviewer-Fokus:** Bedienbarkeit einhändig/mit Handschuh gedanklich durchgespielt; kein Feld, das die Spec nicht verlangt.

**Done-Kriterien Slice 3:** WA-01/03/05 bestehen; Erfassungszeit gemessen; Audit-Grundgerüst trägt.
**Tests Slice 3:** WA-01, WA-02, WA-03, WA-05, WA-06 `[PILOTGERÄT]`.

---

## Slice 4 — Abweichung & Freigabe

**Ziel:** Zwei-Personen-Prinzip lebt; Abweichungen durchlaufen Freigabe.
**Voraussetzungen:** Slice 3 reviewt; D4, D5, D6 entschieden.
**Risiken:** Selbstfreigabe-Lücke; Fehlrouting Küche/Bar.
**Review-Hinweise:** Ersteller ≠ Freigebender muss auch über PIN-Wechsel-Tricks hinweg halten (AB-02 explizit prüfen).

### Task S4-T1 — Abweichungsposition

* **Ziel:** Positionen sind als Fehlmenge/Bruch/falscher Artikel markierbar, mit Pflicht-Grund.
* **Scope:** Abweichungstypen, Grund-Pflichtfeld, Vorgang wechselt bei ≥ 1 Abweichung nach *Freigabe erforderlich*; Bewegungen entstehen erst nach Freigabe in tatsächlich angenommener Menge.
* **Nicht enthalten:** Schwellenlogik (jede Abweichung → Freigabe, fest), Foto der Abweichung, Reklamations-Workflow Richtung Lieferant.
* **Betroffene Rollen:** Lager/Warenannahme.
* **Betroffene Kernobjekte:** Warenannahme, Audit-Event.
* **Akzeptanztests:** AB-01 (Teil), AB-05.
* **Done-Kriterien:** Vorgang mit Abweichung ist ohne Freigabe nicht abschließbar.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Mengenlogik: Sollmenge vs. angenommene Menge sauber getrennt.

### Task S4-T2 — Freigabe-Workflow mit Bereichsrouting

* **Ziel:** Die zuständige Rolle (Küchenchef für Küche, Schichtleitung für Bar/Service) entscheidet; Selbstfreigabe technisch unmöglich.
* **Scope:** Freigabesicht mit offenen Vorgängen, Freigeben/Ablehnen, Ersteller-≠-Freigebender-Erzwingung, Routing über Artikel-Bereichszuordnung (S2-T2), Verhalten liegengebliebener Freigaben laut D4, Stellvertretung laut D5.
* **Nicht enthalten:** Mehrstufige Freigaben, konfigurierbare Workflows, Push-Benachrichtigungen (In-App-Anzeige genügt).
* **Betroffene Rollen:** Küchenchef, Schichtleitung, Betriebsleitung (sieht offene).
* **Betroffene Kernobjekte:** Freigabe, Warenannahme, Audit-Event.
* **Akzeptanztests:** AB-01, AB-02, AB-03 `[DECISION]`, AB-06 `[DECISION]`.
* **Done-Kriterien:** AB-01/02 bestehen; D4/D5-Verhalten exakt umgesetzt.
* **Blocker/Entscheidungen:** `[BLOCKER]` ohne D4/D5.
* **Reviewer-Fokus:** Selbstfreigabe-Verbot serverseitig; Routing-Test mit je einem Küchen- und Bar-Artikel.

### Task S4-T3 — Ablehnung & generischer Korrekturantrag

* **Ziel:** Ablehnung mit Pflichtkommentar; der Korrekturantrag als generisches Objekt (wird von Slice 5 für Minus-Fälle und von allen späteren Prozessen genutzt).
* **Scope:** Ablehnung (Pflichtkommentar, Rückmeldung an Ersteller); Korrekturantrag: Bezug auf Originalvorgang, Grund, Zwei-Personen-Freigabe, Original bleibt unverändert; Rückzug laut D6.
* **Nicht enthalten:** Automatische Korrekturen, Massenkorrekturen.
* **Betroffene Rollen:** alle erstellenden Rollen, Betriebsleitung/Küchenchef (Freigabe).
* **Betroffene Kernobjekte:** Korrektur (als Vorgangstyp), Freigabe, Audit-Event.
* **Akzeptanztests:** AB-04, KO-01, KO-02, KO-03 `[DECISION]`, KO-04, KO-05, WA-04.
* **Done-Kriterien:** KO-01/02/04/05 bestehen; Original nachweislich unverändert.
* **Blocker/Entscheidungen:** D6.
* **Reviewer-Fokus:** Verknüpfung Korrektur ↔ Original bidirektional nachvollziehbar; KO-02 auch für Betriebsleitung.

**Done-Kriterien Slice 4:** AB-01/02/04, KO-01/02/04/05, WA-04 bestehen.
**Tests Slice 4:** AB-01 bis AB-06, KO-01 bis KO-05, WA-04; KO-06 (mobile Freigabesicht) mit abnehmen.

---

## Slice 5 — Umlagerung & Bewegungshistorie

**Ziel:** Bewegungen zwischen Lagerorten, lesbare Historie, Minus-Erkennung.
**Voraussetzungen:** Slice 4 reviewt (Korrekturantrag existiert).
**Risiken:** Versuchung „Bestand korrigieren"-Knopf; Buchungsreihenfolge.
**Review-Hinweise:** Bestand ist abgeleitet und nirgends editierbar — aktiv danach suchen.

### Task S5-T1 — Umlagerung

* **Ziel:** Quelle → Artikel → Menge → Ziel in unter 30 Sekunden.
* **Scope:** Umlagerung mit Berechtigungsprüfung (eigene Ausgabestelle für Bar/Service), Abbruchsicherheit (keine Teilbuchung), Audit-Event.
* **Nicht enthalten:** Anlass-Feld (Pilot v1), Mehrpositions-Umlagerung, Offline.
* **Betroffene Rollen:** Lager/Warenannahme, Schichtleitung, Bar/Service.
* **Betroffene Kernobjekte:** Bewegung, Lagerort, Artikel, Audit-Event.
* **Akzeptanztests:** UM-01, UM-02, UM-03, UM-05 (Teil).
* **Done-Kriterien:** UM-01/02/03 bestehen; Zeitziel auf Referenzgerät erreicht.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** UM-03: niemals halb gebucht, auch bei PIN-Wechsel mitten im Vorgang.

### Task S5-T2 — Bewegungshistorie-Ansichten

* **Ziel:** „Wer hat wann was von wo nach wo bewegt" ist je Lagerort und je Artikel ohne Nachfrage lesbar.
* **Scope:** Chronologische Ansicht mit Person/Zeit/Menge/Quelle/Ziel, lesbar bei ≥ 50 Einträgen, Berechtigungssicht laut Matrix.
* **Nicht enthalten:** Auswertungen/Aggregationen, Export (Pilot v1), Filter jenseits Lagerort/Artikel.
* **Betroffene Rollen:** alle mit Leserecht.
* **Betroffene Kernobjekte:** Bewegung, Lagerort, Artikel.
* **Akzeptanztests:** Historien-Lesbarkeitstest (50 Bewegungen), UM-05.
* **Done-Kriterien:** Testfrage aus Slice-Definition in < 30 Sekunden beantwortbar.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Keine Pro-Person-Aggregation eingebaut `[DSGVO/BV]` (Risiko 5) — Historie ja, Personenstatistik nein.

### Task S5-T3 — Minus-Erkennung → Korrekturantrag

* **Ziel:** Kein stilles Minus: Übersteigt eine Umlagerung den rechnerischen Bestand, entsteht automatisch ein Korrekturantrag.
* **Scope:** Bestandsberechnung (abgeleitet), Minus-Prüfung beim Buchen, automatischer Korrekturantrag (S4-T3-Mechanik) für die Differenz, Umlagerung real vorhandener Ware bleibt möglich.
* **Nicht enthalten:** Automatische Konfliktauflösung, Bestands-Editierfunktion, Inventur.
* **Betroffene Rollen:** buchende Rollen; Betriebsleitung (Freigabe der Differenz).
* **Betroffene Kernobjekte:** Bewegung, Korrektur, Freigabe, Audit-Event.
* **Akzeptanztests:** UM-04, UM-05 (Ketten-Nachweis).
* **Done-Kriterien:** UM-04 besteht; Kette Versuch → Antrag im Audit verknüpft.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Genau **ein** Antrag je Minus-Fall, keine Antragsflut bei Mehrfachversuch.

**Done-Kriterien Slice 5:** UM-01 bis UM-05 bestehen; UM-06 `[PILOTGERÄT]` terminiert.
**Tests Slice 5:** UM-01 bis UM-06.

---

## Slice 6 — Auffüllliste (vorlage-basiert)

**Ziel:** Liste aus Standardvorlage, Abhaken = Umlagerung, Abschluss mit Grund-Pflicht.
**Voraussetzungen:** Slice 5 reviewt (Haken erzeugt Umlagerung).
**Risiken:** Abhak-Latenz entscheidet Adoption; Mengenabweichung ohne Umweg.
**Review-Hinweise:** Keine Historien-Vorbefüllung „schon mal vorbereitet" — Pilot-v1.5-Grenze ist hart.

### Task S6-T1 — Vorlagenverwaltung je Ausgabestelle

* **Ziel:** Standardvorlage (aus Setup-Datenaufnahme) ist durch Küchenchef/Schichtleitung pflegbar.
* **Scope:** Vorlage je Ausgabestelle: Positionen (Artikel, Sollmenge, Quell-Lagerort), Pflege-Berechtigungen laut Matrix.
* **Nicht enthalten:** Jede Vorbefüllung aus Historie (Pilot v1.5), „letzte Liste kopieren" (Pilot, Kaltstart-Stufe 1), mehrere Vorlagen je Ausgabestelle.
* **Betroffene Rollen:** Küchenchef (Küche), Schichtleitung (Bar).
* **Betroffene Kernobjekte:** Auffüllliste (Vorlage), Artikel, Lagerort.
* **Akzeptanztests:** AL-02 (Vorlagen-Berechtigung).
* **Done-Kriterien:** Pilot-Vorlagen (Bar + Küche) aus Phase-0-Daten angelegt; Bar/Service kann nicht pflegen.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Vorlage referenziert Quell-Lagerort je Position — das trägt später den „steht wo"-Nutzen.

### Task S6-T2 — Liste erzeugen, zuweisen, abarbeiten

* **Ziel:** Der häufigste Bedienvorgang des Produkts: Haken setzen, Umlagerung entsteht.
* **Scope:** Liste aus Vorlage erzeugen, Positionen streichen/ergänzen (Schichtleitung), zuweisen, Abhaken erzeugt Umlagerung (S5-T1) mit ≤ 2 Tipps, Mengenabweichung (4 statt 6) direkt erfassbar, Doppel-Abhak-Schutz.
* **Nicht enthalten:** Prioritäten/Sortierlogik jenseits Vorlagenreihenfolge, Benachrichtigungen.
* **Betroffene Rollen:** Schichtleitung, Bar/Service.
* **Betroffene Kernobjekte:** Auffüllliste, Bewegung, Audit-Event.
* **Akzeptanztests:** AL-01, AL-05, AL-06 `[PILOTGERÄT]`, Doppel-Abhak-Test, Mengenabweichungs-Test.
* **Done-Kriterien:** AL-01/05 bestehen; je Haken exakt eine Umlagerung; 2-Tipp-Regel eingehalten.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Vorlage-vs-final-Differenz aus Audit rekonstruierbar (AL-05); Latenz des Hakens.

### Task S6-T3 — Offene Positionen & Listenabschluss

* **Ziel:** Nicht erfüllbare Positionen sind ehrlich dokumentiert; Abschluss nur durch Schichtleitung.
* **Scope:** Position offen mit Pflicht-Grund (keine Bewegung), Abschluss nur wenn alle Positionen erledigt oder begründet offen, Zustandsmodell Erstellt → In Bearbeitung → Abgeschlossen.
* **Nicht enthalten:** Automatisches Schließen bei Schichtende (offene Listen erscheinen stattdessen in der Übergabe, Slice 7).
* **Betroffene Rollen:** Bar/Service (markiert offen), Schichtleitung (schließt ab).
* **Betroffene Kernobjekte:** Auffüllliste, Audit-Event.
* **Akzeptanztests:** AL-04, AL-02 (Abschluss-Berechtigung), AL-03 (Vorbereitung, final mit Slice 7).
* **Done-Kriterien:** AL-04 besteht; Abschluss mit unbegründet offener Position unmöglich.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** „Offen mit Grund" ist Datensignal (Kaltstart-Plan) — Grund strukturiert genug gespeichert, aber ohne Feature-Ausbau.

**Done-Kriterien Slice 6:** AL-01/02/04/05 bestehen; AL-06 `[PILOTGERÄT]` terminiert.
**Tests Slice 6:** AL-01 bis AL-06.

---

## Slice 7 — Schichtübergabe

**Ziel:** Der Magic Moment: Auto-Entwurf, aktive Bestätigung, echtes Einfrieren.
**Voraussetzungen:** Slices 3–6 reviewt (Übergabe sammelt deren Vorgänge); D7, D8, D9 entschieden.
**Risiken:** Snapshot vs. Live-Verweis; unscharfe Schichtgrenzen.
**Review-Hinweise:** SU-04 ist der wichtigste Test des Slice — nachträgliche Korrektur darf das Protokoll nicht ändern.

### Task S7-T1 — Auto-Entwurf (Schicht-Sammlung)

* **Ziel:** Der Entwurf sammelt chronologisch alle Vorgänge der Schicht (Annahmen inkl. Freigabestatus, Listenstand inkl. offener Positionen, offene Freigaben, Korrekturen).
* **Scope:** Schichtgrenzen laut D9; Sammlung als Momentaufnahme-Vorbereitung; keinerlei Zusammenfassungs-Intelligenz.
* **Nicht enthalten:** KI-Zusammenfassung, Filterung, Priorisierung.
* **Betroffene Rollen:** Schichtleitung.
* **Betroffene Kernobjekte:** Übergabeprotokoll, Warenannahme, Auffüllliste, Freigabe, Korrektur.
* **Akzeptanztests:** SU-01 (Vollständigkeit des Entwurfs), AL-03.
* **Done-Kriterien:** Simulierter Tag (1 Annahme mit Abweichung, 1 Liste mit offener Position, 1 Korrektur) vollständig im Entwurf.
* **Blocker/Entscheidungen:** `[BLOCKER]` ohne D9.
* **Reviewer-Fokus:** Kein Vorgangstyp vergessen — gegen die Objektliste aus `prd.md` abgleichen.

### Task S7-T2 — Übergeben, Bestätigen, Einfrieren

* **Ziel:** Freitext-Punkte mit Pflicht-Verantwortlichem; Übergabe → aktive Bestätigung; Protokoll ist danach unveränderlich (Snapshot).
* **Scope:** Freitext-Punkte, Zustandsmodell Entwurf → Übergeben → Bestätigt, Snapshot-Einfrieren (nachträgliche Buchungen ändern das Protokoll nicht), Verhalten unbestätigter Übergaben laut D7, Doppelschicht laut D8.
* **Nicht enthalten:** Erinnerungen/Push, Aufgabenverwaltung aus Freitext-Punkten.
* **Betroffene Rollen:** Schichtleitung (beide), Bar/Service (Notizen beisteuern).
* **Betroffene Kernobjekte:** Übergabeprotokoll, Audit-Event.
* **Akzeptanztests:** SU-01, SU-03 `[DECISION]`, SU-04, SU-05, SU-06 `[DECISION]`.
* **Done-Kriterien:** SU-01/04/05 bestehen; D7/D8-Verhalten exakt umgesetzt.
* **Blocker/Entscheidungen:** `[BLOCKER]` ohne D7/D8.
* **Reviewer-Fokus:** Einfrieren technisch als Snapshot verifizieren (SU-04), nicht per „wird schon niemand ändern".

### Task S7-T3 — Leseansicht & Offen-Sichtbarkeit

* **Ziel:** Berechtigte lesen jedes Protokoll; unbestätigte Übergaben sind für Betriebsleitung sichtbar offen.
* **Scope:** Leseansicht (auch für Abwesende des Tages), Offen-Kennzeichnung, Berechtigungen laut Matrix.
* **Nicht enthalten:** Suche/Archiv-Funktionen jenseits chronologischer Liste, Export.
* **Betroffene Rollen:** Küchenchef, Betriebsleitung (lesen), Schichtleitungen.
* **Betroffene Kernobjekte:** Übergabeprotokoll.
* **Akzeptanztests:** SU-02, Offen-Sichtbarkeits-Test (Slice-7-Done).
* **Done-Kriterien:** „Magic Moment"-Szene aus `product-vision.md` als Demo-Drehbuch durchspielbar.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Zwei-Minuten-Lesbarkeit auf dem Smartphone — Protokoll eines vollen Tages scrollbar, nicht erschlagend.

**Done-Kriterien Slice 7:** SU-01 bis SU-05 bestehen; Demo-Drehbuch „Magic Moment" erfolgreich.
**Tests Slice 7:** SU-01 bis SU-06.

---

## Slice 8 — Audit-Event-Katalog (Härtung)

**Ziel:** Audit vollständig, manipulationssicher, DSGVO-tauglich.
**Voraussetzungen:** Slices 1–7 reviewt; rechtliche Fristenprüfung (D10-Vorlauf) angestoßen.
**Risiken:** Unentdeckte Katalog-Lücken; Pseudonymisierung bricht Kette.
**Review-Hinweise:** Der Vollständigkeits-Sweep ist das Herzstück — strukturell nachweisen, nicht stichprobenartig.

### Task S8-T1 — Katalog-Vollständigkeit & Pflichtfelder

* **Ziel:** Jede schreibende Aktion aus Slices 1–7 erzeugt genau ein definiertes Event mit allen Pflichtfeldern.
* **Scope:** Abgleich Katalog ↔ implementierte Aktionen (struktureller Sweep), Pflichtfelder Person/Gerätekennung/Dual-Zeitstempel vervollständigt, Sitzungsereignisse (S1-T2) in den Katalog überführt.
* **Nicht enthalten:** Neue Event-Typen für nicht existierende Funktionen.
* **Betroffene Rollen:** alle (implizit).
* **Betroffene Kernobjekte:** Audit-Event.
* **Akzeptanztests:** alle „Audit-Erwartung"-Tests (WA-05, AB-05, UM-05, AL-05, SU-05, KO-05, PIN-05).
* **Done-Kriterien:** Sweep-Nachweis: keine schreibende Aktion ohne Event; alle sieben Audit-Tests bestehen.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Sweep-Methodik selbst reviewen — wie wird „keine Aktion ohne Event" bewiesen?

### Task S8-T2 — Append-only-Härtung & Manipulationserkennung

* **Ziel:** Manipulationsversuche an Bestandsevents werden verweigert und erkannt.
* **Scope:** Technische Unveränderlichkeits-Garantie laut Spec-Abschnitt 3, Erkennungs-Minimum, Verweigerungs-Nachweis.
* **Nicht enthalten:** Forensik über das Erkennungs-Minimum hinaus.
* **Betroffene Rollen:** —.
* **Betroffene Kernobjekte:** Audit-Event.
* **Akzeptanztests:** SU-05 (Änderungsversuch), Manipulations-Test aus Slice-8-Done.
* **Done-Kriterien:** Dokumentierter fehlgeschlagener Manipulationsversuch.
* **Blocker/Entscheidungen:** keine.
* **Reviewer-Fokus:** Auch privilegierte Rollen (Betriebsleitung, Admin-Zugang des Anbieters) können nicht ändern.

### Task S8-T3 — Pseudonymisierung & Audit-Leseansicht

* **Ziel:** Ausgetretene Personen sind pseudonymisierbar ohne Kettenbruch; Betriebsleitung hat eine Leseansicht.
* **Scope:** Pseudonymisierungs-Vorgang (Klarname raus, Konsistenz und Kettenintegrität bleiben), Leseansicht je Vorgang; **bewusst keine** Pro-Person-Auswertungen.
* **Nicht enthalten:** Export (Pilot v1), Löschung von Events, Statistik-Dashboards.
* **Betroffene Rollen:** Betriebsleitung.
* **Betroffene Kernobjekte:** Audit-Event, Nutzer/Rolle.
* **Akzeptanztests:** Pseudonymisierungs-Test (Slice-8-Done), PIN-05 `[DSGVO/BV]`.
* **Done-Kriterien:** Testperson pseudonymisiert: alle Vorgänge konsistent, kein Klarname; PIN-05 besteht inkl. Negativprüfung („keine Leistungsauswertung vorhanden").
* **Blocker/Entscheidungen:** D3 `[DSGVO/BV]`; Löschkonzept-Teil wartet ggf. auf D10-Fristenklärung — Go-Live-relevant, nicht Bau-Blocker.
* **Reviewer-Fokus:** PIN-05-Negativprüfung ernst nehmen: aktiv nach versteckten Personen-Aggregationen suchen.

**Done-Kriterien Slice 8:** Alle sieben Audit-Tests + Manipulations- und Pseudonymisierungs-Test bestehen.
**Tests Slice 8:** siehe Tasks; zusätzlich Vollständigkeits-Sweep.

---

## Slice 9 — Lieferschein-Fotos

**Ziel:** Beleg am Vorgang, korrekt gespeichert, berechtigungsgeprüft.
**Voraussetzungen:** Slice 8 reviewt; D10, D11 entschieden `[BLOCKER]`; Foto-Spec (Abschnitt 5) abgenommen.
**Risiken:** Schwacher Mobilfunk an der Rampe; Fremd-PII.
**Review-Hinweise:** Foto nur an Warenannahme — jede weitere Anhäng-Stelle ist Scope-Erweiterung.

### Task S9-T1 — Fotoaufnahme & Anhängen

* **Ziel:** Foto in unter 15 Sekunden am Vorgang, auch bei schlechtem Netz ohne Verlust.
* **Scope:** Kameraaufnahme in der Warenannahme, Komprimierung auf Zielgröße, Wiederholversuch bei Upload-Fehler mit sichtbarem Status, Galerie-Import nur als Fallback bei Kamera-Fehler.
* **Nicht enthalten:** OCR (Vision), Fotos an anderen Objekten, Bildbearbeitung, Offline-Warteschlange (Slice 10).
* **Betroffene Rollen:** Lager/Warenannahme.
* **Betroffene Kernobjekte:** Warenannahme, Audit-Event.
* **Akzeptanztests:** WA-07 `[PILOTGERÄT]` `[DSGVO/BV]`, Drosselungs-Test.
* **Done-Kriterien:** Drosselungs-Test bestanden (kein Verlust, Status sichtbar); 15-Sekunden-Ziel auf Referenzgerät.
* **Blocker/Entscheidungen:** `[BLOCKER]` ohne abgenommene Foto-Spec.
* **Reviewer-Fokus:** Kompressionsqualität: Lieferschein bleibt lesbar (das ist der ganze Zweck).

### Task S9-T2 — Speicherung, Zugriff, Lebenszyklus

* **Ziel:** Fotos liegen EU-seitig verschlüsselt, Zugriff nur laut Matrix, Aufbewahrung/Löschung laut D10/D11.
* **Scope:** Speicherort/Verschlüsselung, Berechtigungsprüfung beim Abruf, Aufbewahrungs- und Löschmechanik, Umgang mit Fremd-PII laut D11.
* **Nicht enthalten:** Kundenseitige Archiv-/Suchfunktionen.
* **Betroffene Rollen:** Küchenchef, Schichtleitung, Betriebsleitung (sehen); Bar/Service ohne Küchen-Leserecht sieht nichts.
* **Betroffene Kernobjekte:** Warenannahme, Audit-Event.
* **Akzeptanztests:** Berechtigungstest Foto, Lebenszyklus-Test (Aufnahme → Löschung lückenlos).
* **Done-Kriterien:** Unberechtigter Abruf verweigert und auditiert; Löschlauf nachweisbar.
* **Blocker/Entscheidungen:** `[BLOCKER]` D10/D11 `[DSGVO/BV]`.
* **Reviewer-Fokus:** Zugriff über Berechtigungsmatrix, nicht über erratbare Links.

**Done-Kriterien Slice 9:** WA-07 und beide Task-Tests bestehen; `[PILOTGERÄT]`-Abnahme an der Rampe terminiert.
**Tests Slice 9:** WA-07, Drosselungs-Test, Berechtigungs- und Lebenszyklus-Test.

---

## Slice 10 — Offline-Erfassung & Sync-Warteschlange

**Ziel:** Erfassen im Funkloch; nachvollziehbarer Sync; Kollisionen → Korrekturprozess.
**Voraussetzungen:** Slices 1–9 reviewt; D12, D13, D14, D15 entschieden `[BLOCKER]`; Spec-Abschnitt 4 abgenommen (harter Baustopp sonst).
**Risiken:** Höchstes technisches Risiko des MVP (Risiko-Register Nr. 4).
**Review-Hinweise:** Jeder Task dieses Slice braucht das strengste Review der Queue; im Zweifel Offline-Umfang weiter verengen statt Komplexität erhöhen.

### Task S10-T1 — Warteschlange, ID-Vergabe, Statusanzeige

* **Ziel:** Offline erfasste Vorgänge überleben alles (App-Neustart, Akku leer) und synchronisieren genau einmal.
* **Scope:** Geräte-Warteschlange mit Reihenfolge-Garantie laut D13, kollisionsfreie Offline-ID-Vergabe, Sync-Statusanzeige („n Vorgänge warten"), Verhalten bei vollem Speicher laut D13.
* **Nicht enthalten:** Offline-Bearbeiten bestehender Vorgänge (nur Neuerfassung — bewusste Verengung), Offline-Lesen jenseits lokalem Arbeitsstand, automatische Konfliktauflösung (Pilot v1).
* **Betroffene Rollen:** alle erfassenden Rollen.
* **Betroffene Kernobjekte:** Bewegung, Warenannahme, Auffüllliste, Audit-Event.
* **Akzeptanztests:** OF-01 `[PILOTGERÄT]`, OF-02, OF-03 `[PILOTGERÄT]`.
* **Done-Kriterien:** OF-03 besteht (kein Verlust, keine Dopplung nach Geräteausfall); OF-02 besteht (lokale Berechtigungsdurchsetzung).
* **Blocker/Entscheidungen:** `[BLOCKER]` D12/D13.
* **Reviewer-Fokus:** Genau-einmal-Übertragung — der eine Punkt, an dem dieses Produkt technisch scheitern kann.

### Task S10-T2 — Dual-Zeitstempel & Gerätezeit-Handling

* **Ziel:** Erfasste Zeit und Übertragungszeit getrennt; falsche Gerätezeit verfälscht den Audit nicht.
* **Scope:** Befüllung der (seit S3-T1 vorhandenen) Dual-Zeitstempel-Felder mit realen Offline-Werten, Erkennung/Kennzeichnung abweichender Gerätezeit laut D14, Audit-Reihenfolge unabhängig von Gerätezeit.
* **Nicht enthalten:** Zeitzonen-Sonderfälle jenseits eines Standorts.
* **Betroffene Rollen:** —.
* **Betroffene Kernobjekte:** Audit-Event.
* **Akzeptanztests:** OF-05.
* **Done-Kriterien:** OF-05 besteht inkl. absichtlich verstellter Uhr.
* **Blocker/Entscheidungen:** D14.
* **Reviewer-Fokus:** Reihenfolge-Integrität des Audit-Trails unter Zeitmanipulation.

### Task S10-T3 — Kollisionserkennung → Korrekturantrag

* **Ziel:** Kollidierende Offline-Buchungen bleiben beide erhalten (append-only) und erzeugen genau einen Korrekturantrag.
* **Scope:** Kollisionserkennung nach D12-Kriterien beim Sync, automatischer Korrekturantrag (S4-T3-Mechanik) für die Differenz, Sichtbarkeit für Betriebsleitung.
* **Nicht enthalten:** Automatische Auflösung, Zusammenführungs-Assistent.
* **Betroffene Rollen:** Betriebsleitung (entscheidet über entstehende Korrekturen).
* **Betroffene Kernobjekte:** Bewegung, Korrektur, Freigabe, Audit-Event.
* **Akzeptanztests:** OF-04 `[DECISION]` `[PILOTGERÄT]`.
* **Done-Kriterien:** Papier-Szenario „zwei Geräte, gleicher Lagerort, 30 Min offline" läuft real durch; genau ein Antrag.
* **Blocker/Entscheidungen:** `[BLOCKER]` D12.
* **Reviewer-Fokus:** Keine stille Verlierer-Buchung — beide Originale nachweisbar erhalten.

### Task S10-T4 — Foto-Warteschlange & Offline-Volltest

* **Ziel:** Fotos reihen sich in die Offline-Warteschlange ein; der komplette Auffüllvorgang im Funkloch funktioniert.
* **Scope:** Foto-Einreihung (Anschluss S9-T1), Flugmodus-Volltest als Abnahme-Drehbuch (OF-06).
* **Nicht enthalten:** Foto-Offline-Vorschau-Optimierungen.
* **Betroffene Rollen:** Lager/Warenannahme, Bar/Service.
* **Betroffene Kernobjekte:** Warenannahme, Auffüllliste, Bewegung.
* **Akzeptanztests:** OF-06 `[PILOTGERÄT]`, WA-07 offline-Variante.
* **Done-Kriterien:** OF-06 besteht im realen Keller des Piloten, nicht nur im Flugmodus am Schreibtisch.
* **Blocker/Entscheidungen:** Slice 9 reviewt.
* **Reviewer-Fokus:** Statusanzeige bleibt während des gesamten Vorgangs verständlich.

**Done-Kriterien Slice 10:** OF-01 bis OF-06 bestehen, davon OF-01/03/04/06 auf Pilotgeräten vor Ort.
**Tests Slice 10:** OF-01 bis OF-06 `[PILOTGERÄT]` überwiegend.

---

# recommended-first-sprint.md

## Sprint 1 — „Identität & physische Welt" (kleinster sinnvoller Start)

**Umfang:** Ausschließlich Slice 1 und Slice 2 — sechs Tasks: S1-T1, S1-T2, S1-T3, S2-T1, S2-T2, S2-T3. **Keine Fachprozesse** (keine Warenannahme, keine Auffüllliste, keine Übergabe).

**Warum genau dieser Schnitt:**
- Er erzwingt die drei billigsten, aber folgenreichsten Entscheidungen zuerst (D1, D2, D3) — PIN-Verhalten und Zweckbindung sind nach Slice 3 nur noch teuer korrigierbar.
- Er liefert das Fundament, das **jeder** spätere Slice erbt: Personenzuordnung (S1-T2) und zentrale Berechtigungsdurchsetzung (S1-T3). Fehler hier vervielfachen sich; Fehler in einem Fachprozess bleiben lokal.
- Er ist mit Realdaten abschließbar: Am Sprintende sind die echten Lagerorte, Artikel und Nutzer des Pilotkandidaten eingespielt (S2-T3) — das Setup-Versprechen aus `pilot-offer.md` ist damit zur Hälfte entrisikt, bevor eine Zeile Fachlogik existiert.

**Eintrittskriterien:** D1, D2, D3 entschieden; Berechtigungsmatrix (Spec-Abschnitt 2) abgenommen; Phase-0-Datenaufnahme liegt vor (sonst Testdaten, Sprint-Abnahme dann eingeschränkt).

**Sprint-Abnahme (Demo-Drehbuch, ~10 Minuten):**
1. Betriebsleitung legt eine neue Person mit Rolle Bar/Service an.
2. Zwei Personen wechseln sich per PIN auf einem Gerät ab; das Sitzungsprotokoll zeigt beide korrekt.
3. Dreimal falsche PIN → entschiedenes Sperrverhalten greift; Inaktivitäts-Timeout greift.
4. Schichtleitung versucht, einen Lagerort anzulegen → verweigert.
5. Der reale Pilotdatensatz (Lagerorte, ~100 Artikel, Nutzer) wird eingespielt; zweiter Importlauf erzeugt keine Dubletten; ein Artikel wird deaktiviert und ist in Auswahllisten verschwunden, in der Anzeige erhalten.

**Explizit nicht im Sprint:** Audit-Grundgerüst (S3-T1 — gehört zum ersten Fachslice), jede Bewegung, jedes Foto, alles Offline.

**Nächster Sprint danach:** Slice 3 komplett (S3-T1 bis S3-T3) — erst dann beginnt Fachlogik, auf geprüftem Fundament.
