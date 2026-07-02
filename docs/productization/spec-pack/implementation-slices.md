# implementation-slices.md

## Grundregeln der Schnittführung

- Jeder Slice ist einzeln testbar und endet mit einem demonstrierbaren Zustand („auf dem Handy vorführbar").
- **Audit-Events werden ab Slice 3 in jedem Slice mitgebaut** (jede schreibende Aktion erzeugt ihr Event laut vorläufigem Katalog); Slice 8 härtet und vervollständigt den Katalog. Audit ist kein Nachrüst-Slice.
- **Foto (Slice 9) und Offline (Slice 10) sind bewusst die letzten Slices.** Slices 1–8 werden online-only und ohne Foto gebaut und getestet. Nichts in Slices 1–8 darf stillschweigend Offline- oder Foto-Annahmen enthalten.
- Rollenumfang MVP-Core: 5 Rollen (Controlling/Steuerberater ist Pilot v1, siehe `mvp-scope-lock.md`).

---

## Slice 1 — Workspace, Standort, Rollenbasis

- **Ziel:** Ein Standort existiert als abgeschlossener Arbeitsraum; Personen melden sich an und haben genau eine Rolle.
- **Enthalten:** Standort-Workspace (genau einer), Nutzerverwaltung durch Betriebsleitung, 5 feste Rollen mit Bereichszuordnung, Anmeldung inkl. PIN-Wechsel am Schichtgerät, automatische Abmeldung nach Inaktivität.
- **Nicht enthalten:** Mandantenfähigkeit, konfigurierbare Rollen, Controlling-Rolle, Passwort-Self-Service jenseits des Nötigsten, jede fachliche Funktion.
- **Rollen:** alle 5; aktiv handelnd: Geschäftsführung/Betriebsleitung.
- **Kernobjekte:** Nutzer/Rolle.
- **Technische Risiken:** PIN-Modell auf geteiltem Gerät (Sperr-/Timeout-Verhalten unklar → Spec-Abschnitt 2); Personenzuordnung muss von Tag 1 belastbar sein, sonst ist der spätere Audit-Trail wertlos.
- **Done-Kriterien:** Zwei Personen wechseln sich per PIN auf einem Gerät ab; jede Aktion (hier: Anmeldung/Abmeldung) ist der richtigen Person zugeordnet; falsche PIN dreimal → definiertes Sperrverhalten.
- **Empfohlene Tests:** PIN-Wechsel-Szenarien (`acceptance-tests.md` Prozess 7), Rollen-Sichtbarkeitstest (Rolle ohne Recht sieht Funktion nicht), Inaktivitäts-Abmeldung.
- **Abbruch-/Blocker-Kriterien:** PIN-Verhalten (Länge, Sperrung, Timeout) nicht entschieden → Slice startet nicht. Betriebsvereinbarungs-Frage zur Personenzuordnung ungeklärt → Go-Live-Blocker, aber kein Bau-Blocker.

## Slice 2 — Lagerorte & Artikelstamm

- **Ziel:** Die physische Welt des Betriebs ist abgebildet: Lagerorte und die Top-Artikelliste.
- **Enthalten:** Lagerortliste (anlegen/deaktivieren nur durch Betriebsleitung), Artikelstamm (Name, Einheit, Bereich Küche/Bar), Import der Setup-Datenaufnahme (Top ~100 Artikel) als einfacher Einlese-Vorgang.
- **Nicht enthalten:** Lagerort-Hierarchien/Unterorte, Preise/Bewertung, Lieferanten-Artikel-Zuordnungen über das Nötigste hinaus, Löschen (nur Deaktivieren — Historie bleibt referenzierbar).
- **Rollen:** Geschäftsführung/Betriebsleitung (pflegt); alle anderen (lesen).
- **Kernobjekte:** Lagerort, Artikel.
- **Technische Risiken:** Gering. Einzige Falle: Deaktivieren vs. Löschen sauber trennen, sonst brechen spätere Bewegungsreferenzen.
- **Done-Kriterien:** Die realen Lagerorte und die Top-Artikelliste des Pilotkandidaten (Phase-0-Daten) sind angelegt; ein deaktivierter Artikel ist in neuen Vorgängen nicht wählbar, in alten sichtbar.
- **Empfohlene Tests:** Deaktivierungs-Verhalten, Berechtigungstest (Schichtleitung kann keinen Lagerort anlegen), Umlaute/Sonderzeichen in Artikelnamen.
- **Abbruch-/Blocker-Kriterien:** Phase-0-Datenaufnahme liegt nicht vor → Slice mit Testdaten bauen, aber Done erst mit Realdaten.

## Slice 3 — Warenannahme ohne Foto, ohne Abweichung

- **Ziel:** Der Happy Path der Warenannahme läuft end-to-end: Lieferung erfassen, Ware ist im Lagerort.
- **Enthalten:** Warenannahme anlegen (Lieferant aus Stammliste, Positionen: Artikel, Menge, Ziellagerort), Abschluss erzeugt Bewegungen, Zustandsmodell Entwurf → Erfasst, Audit-Events für jeden Schritt.
- **Nicht enthalten:** **Foto (Slice 9), Abweichungen/Freigabe (Slice 4), Offline (Slice 10)**, Nachtragen von Positionen nach Abschluss (läuft später über Korrektur).
- **Rollen:** Lager/Warenannahme (erfasst); Küchenchef, Betriebsleitung (sehen).
- **Kernobjekte:** Warenannahme, Bewegung, Artikel, Lagerort, Audit-Event.
- **Technische Risiken:** Halbfertige Erfassung (Gerät weggelegt, Lieferant drängt) — Entwurfszustand muss verlustfrei wiederaufnehmbar sein; erste echte Mobile-Bedienhürde (große Touchziele, wenige Pflichtfelder).
- **Done-Kriterien:** Eine Annahme mit 10 Positionen ist am Smartphone in unter 4 Minuten erfassbar (gemessen); abgebrochener Entwurf ist nach erneuter Anmeldung unverändert da; jede Position erzeugt genau eine Bewegung.
- **Empfohlene Tests:** WA-01/03/06 aus `acceptance-tests.md`, Zeitmessung der Erfassung, Entwurf-Wiederaufnahme.
- **Abbruch-/Blocker-Kriterien:** Zustandsmodell Warenannahme (Spec-Abschnitt 1) nicht abgenommen → Baustopp für diesen Slice.

## Slice 4 — Abweichung & Freigabe

- **Ziel:** Eine Annahme mit Fehlmenge/Bruch durchläuft die Freigabe durch die zuständige Rolle — das Zwei-Personen-Prinzip lebt.
- **Enthalten:** Abweichungsposition (Fehlmenge, Bruch, falscher Artikel) mit Grund, Zustandsübergang Freigabe erforderlich → Freigegeben/Abgelehnt, Freigabesicht für Küchenchef/Schichtleitung, Ablehnung mit Pflichtkommentar, Audit-Events.
- **Nicht enthalten:** Konfigurierbare Schwellen (MVP-Regel: jede Abweichung → Freigabe), Erinnerung/Eskalation bei liegengebliebener Freigabe (Entscheidung offen), mehrstufige Freigaben.
- **Rollen:** Lager/Warenannahme (markiert), Küchenchef bzw. Schichtleitung (gibt frei), Betriebsleitung (sieht offene Freigaben).
- **Kernobjekte:** Warenannahme, Freigabe, Audit-Event.
- **Technische Risiken:** Ersteller-≠-Freigebender muss technisch erzwungen sein, nicht nur UI-Konvention; Bereichszuordnung (Küche vs. Bar) entscheidet den Freigabeweg — Fehlrouting hier untergräbt den Kernprozess.
- **Done-Kriterien:** Annahme mit Abweichung ist ohne Freigabe nicht abschließbar; dieselbe Person kann ihre eigene Abweichung nicht freigeben (technisch verweigert); Ablehnung ohne Kommentar unmöglich.
- **Empfohlene Tests:** AB-01 bis AB-06, Selbstfreigabe-Verbotstest, Bereichsrouting-Test.
- **Abbruch-/Blocker-Kriterien:** Stellvertretungsregel (Küchenchef abwesend) nicht entschieden → Slice baubar, aber Go-Live-Blocker; als `[ENTSCHEIDUNG NÖTIG]` in den Tests markiert.

## Slice 5 — Umlagerung & Bewegungshistorie

- **Ziel:** Ware bewegt sich nachvollziehbar zwischen Lagerorten; die Historie je Artikel/Lagerort ist lesbar.
- **Enthalten:** Umlagerung (Quelle, Artikel, Menge, Ziel), Bewegungshistorie-Ansicht je Lagerort und je Artikel (chronologisch, mit Person/Zeit), Minus-Erkennung: Umlagerung, die einen Lagerort rechnerisch ins Minus buchen würde, erzeugt automatisch einen Korrekturantrag (Anschluss an Slice-4-Mechanik).
- **Nicht enthalten:** Anlass-Feld bei manueller Umlagerung (Pilot v1), Bestandsbewertung, Inventurfunktionen, automatische Konfliktauflösung.
- **Rollen:** Lager/Warenannahme, Schichtleitung, Bar/Service (eigene Ausgabestelle); alle mit Leserecht sehen Historie.
- **Kernobjekte:** Bewegung, Lagerort, Artikel, Audit-Event, (Korrektur bei Minus-Fall).
- **Technische Risiken:** Rechnerischer Bestand ist abgeleitet, nie editierbar — Versuchung widerstehen, einen „Bestand korrigieren"-Knopf zu bauen (das ist der Korrekturprozess). Saubere Reihenfolge der Buchungen.
- **Done-Kriterien:** Umlagerung am Smartphone in unter 30 Sekunden; Historie beantwortet „wer hat wann was von wo nach wo bewegt" ohne Nachfrage; Minus-Fall erzeugt nachweisbar einen Korrekturantrag statt einer stillen Buchung.
- **Empfohlene Tests:** UM-01 bis UM-06, Minus-Fall-Test, Historien-Lesbarkeitstest mit 50 Bewegungen.
- **Abbruch-/Blocker-Kriterien:** Keine. Dieser Slice hat keine offenen Produktentscheidungen.

## Slice 6 — Auffüllliste (vorlage-basiert)

- **Ziel:** Die Bar arbeitet eine Auffüllliste ab; jeder Haken ist eine Umlagerung.
- **Enthalten:** Standardvorlage je Ausgabestelle (aus Setup-Datenaufnahme, pflegbar durch Küchenchef/Schichtleitung), Liste erzeugen → prüfen/ergänzen → zuweisen → abarbeiten, Abhaken erzeugt Umlagerung (Slice-5-Mechanik), offene Position mit Pflicht-Grund, Abschluss durch Schichtleitung, Zustandsmodell Erstellt → In Bearbeitung → Abgeschlossen.
- **Nicht enthalten:** **Jede Vorbefüllung aus Historie (Pilot v1.5)**, „letzte Liste kopieren" (Pilot, Kaltstart-Stufe 1), Verbrauchsprognosen, listenübergreifende Auswertungen.
- **Rollen:** Schichtleitung (erstellt, weist zu, schließt ab), Bar/Service (arbeitet ab), Küchenchef (pflegt Küchen-Vorlage).
- **Kernobjekte:** Auffüllliste, Bewegung, Artikel, Lagerort, Audit-Event.
- **Technische Risiken:** Der Abhak-Moment ist der häufigste Bedienvorgang des Produkts — Latenz oder Mehr-Tipp-Bedienung hier entscheidet über Adoption; Positionsmenge abweichend vom Soll (es passen nur 4 statt 6 Flaschen ins Fach) muss ohne Umweg erfassbar sein.
- **Done-Kriterien:** Komplette Bar-Liste (20 Positionen) am Smartphone abarbeitbar, jeder Haken ≤ 2 Tipps; jede abgehakte Position hat exakt eine korrespondierende Umlagerung mit Lagerort-Angabe; Liste mit offener Position ist nur mit Grund abschließbar.
- **Empfohlene Tests:** AL-01 bis AL-06, Mengenabweichungs-Test, Doppel-Abhak-Schutz.
- **Abbruch-/Blocker-Kriterien:** Verhalten offener Positionen bei Schichtende (Auto-Übernahme in Übergabeentwurf) hängt an Slice 7 — bis dahin bleiben sie schlicht offen; kein Blocker.

## Slice 7 — Schichtübergabe

- **Ziel:** Der Magic Moment: Die kommende Schicht liest in zwei Minuten den eingefrorenen Stand und bestätigt aktiv.
- **Enthalten:** Auto-Entwurf als chronologische Sammlung der Schichtvorgänge (Annahmen inkl. Freigabestatus, Listenstand inkl. offener Positionen, offene Freigaben, Korrekturen), Freitext-Punkte mit Pflicht-Verantwortlichem, Übergeben → aktive Bestätigung durch übernehmende Schichtleitung, Einfrieren des Protokolls, Leseansicht für Berechtigte.
- **Nicht enthalten:** Zusammenfassungs-Intelligenz jeder Art, Aufgaben-/Wartungsmanagement, Erinnerungen/Benachrichtigungen über die In-App-Anzeige hinaus.
- **Rollen:** Schichtleitung (übergibt/übernimmt), Küchenchef/Betriebsleitung (lesen), Bar/Service (steuert Notizen bei).
- **Kernobjekte:** Übergabeprotokoll, Auffüllliste, Warenannahme, Freigabe, Audit-Event.
- **Technische Risiken:** „Einfrieren" muss echt sein (Snapshot, nicht Live-Verweis — sonst ändert sich das Protokoll nachträglich mit und der Audit-Wert ist dahin); Schichtgrenzen sind unscharf (wann beginnt „die Schicht" datentechnisch?) — pragmatische Regel nötig.
- **Done-Kriterien:** Übergabe eines simulierten Tages (1 Annahme mit Abweichung, 1 Liste mit offener Position, 1 Korrektur) ist vollständig im Auto-Entwurf; nach Bestätigung ändert eine nachträgliche Buchung das Protokoll nachweislich nicht; unbestätigte Übergabe ist für Betriebsleitung als offen sichtbar.
- **Empfohlene Tests:** SU-01 bis SU-06, Einfrier-Test, Doppelschicht-Fall.
- **Abbruch-/Blocker-Kriterien:** Zwei offene Entscheidungen (Verhalten bei unbestätigter Übergabe: Sperre vs. Warnbanner; Übergabe an sich selbst bei Doppelschicht) — baubar mit Default „Warnbanner" und „erlaubt mit Hinweis", aber vor Go-Live zu entscheiden. `[ENTSCHEIDUNG NÖTIG]`

## Slice 8 — Audit-Event-Katalog (Härtung)

- **Ziel:** Der ab Slice 3 mitgebaute Audit-Trail wird vollständig, manipulationssicher und DSGVO-tauglich.
- **Enthalten:** Abgleich Katalog ↔ Realität (jede schreibende Aktion aus Slices 1–7 erzeugt genau ein definiertes Event), Pflichtfelder vervollständigt (Person, Gerätekennung, Zeit erfasst vs. Zeit übertragen — Feld schon jetzt anlegen, auch wenn online-only beide gleich sind), Append-only-Durchsetzung technisch verifiziert, Pseudonymisierungskonzept für ausgetretene Personen umgesetzt, Audit-Leseansicht für Betriebsleitung.
- **Nicht enthalten:** Auswertungen „Vorgänge pro Person" (bewusst nicht — Risiko 5 Leistungskontrolle), Export (Pilot v1), Manipulations-Forensik über Erkennungs-Minimum hinaus.
- **Rollen:** Betriebsleitung (liest); alle (erzeugen Events implizit).
- **Kernobjekte:** Audit-Event, Nutzer/Rolle.
- **Technische Risiken:** Nachträgliche Katalog-Lücken (eine vergessene Aktion ohne Event) sind später kaum auffindbar — deshalb Vollständigkeits-Abgleich als expliziter Testschritt; Pseudonymisierung darf Kettenintegrität nicht brechen.
- **Done-Kriterien:** Automatisierter/struktureller Nachweis: keine schreibende Aktion ohne Event; Manipulationsversuch an einem Bestandsevent wird erkannt/verweigert; Pseudonymisierung einer Testperson lässt alle ihre Vorgänge konsistent, aber ohne Klarnamen zurück.
- **Empfohlene Tests:** Audit-Erwartungen aus allen Prozess-Testblöcken (je „Dann existiert Audit-Event…"), Vollständigkeits-Sweep, Pseudonymisierungs-Test.
- **Abbruch-/Blocker-Kriterien:** Rechtliche Aufbewahrungsfristen (Spec-Abschnitt 5, juristische Prüfung) offen → kein Bau-Blocker, aber Go-Live-Blocker für den Löschkonzept-Teil. `[DSGVO/BV]`

## Slice 9 — Lieferschein-Fotos

- **Ziel:** Die Warenannahme bekommt ihren Beleg: Foto am Vorgang, korrekt gespeichert, berechtigungsgeprüft abrufbar.
- **Enthalten:** Fotoaufnahme in der Warenannahme (Kamera, Komprimierung auf Zielgröße), Anzeige am Vorgang, Zugriff nur laut Berechtigungsmatrix, Speicherung EU/verschlüsselt, Lebenszyklus laut Foto-Spec (Aufbewahrung/Löschung).
- **Nicht enthalten:** OCR (Vision), Fotos an anderen Objekten (keine Scope-Erweiterung), Bildbearbeitung, Galerie-Import als Pflichtpfad (nur Kamera als Primärpfad; Import allenfalls als Fallback), Offline-Fotowarteschlange (Slice 10).
- **Rollen:** Lager/Warenannahme (fotografiert), Küchenchef/Schichtleitung/Betriebsleitung (sehen).
- **Kernobjekte:** Warenannahme, Audit-Event.
- **Technische Risiken:** Upload auf schwachem Mobilfunk an der Rampe (Komprimierung, Wiederholversuch); Fotos enthalten ggf. Fahrernamen/Unterschriften → Zugriff und Löschung sind Datenschutzthema, nicht nur Speicherthema.
- **Done-Kriterien:** Foto in unter 15 Sekunden aufgenommen und am Vorgang; auf gedrosseltem Netz (simuliert) geht kein Foto verloren, Status ist sichtbar; Bar/Service ohne Leseberechtigung auf Küchen-Annahmen sieht das Foto nicht.
- **Empfohlene Tests:** WA-07, Drosselungs-Test, Berechtigungstest Foto. `[PILOTGERÄT]` für Kameraqualität/Lichtverhältnisse an der Rampe.
- **Abbruch-/Blocker-Kriterien:** Foto-Spec (Abschnitt 5, inkl. juristischer Fristenprüfung) nicht abgeschlossen → Slice startet nicht. `[DSGVO/BV]`

## Slice 10 — Offline-Erfassung & Sync-Warteschlange

- **Ziel:** Erfassen funktioniert im Funkloch (Keller, Kühlhaus); alles synchronisiert nachvollziehbar, Kollisionen landen im Korrekturprozess.
- **Enthalten:** Offline-Erfassung je Gerät mit Warteschlange (Reihenfolge-Garantie), kollisionsfreie ID-Vergabe offline, zwei Zeitstempel (erfasst/übertragen — Felder aus Slice 8 werden jetzt real unterschiedlich), Sync-Statusanzeige („3 Vorgänge warten"), Kollisionserkennung nach Spec-Kriterien → automatischer Korrekturantrag, Foto-Warteschlange (Anschluss Slice 9).
- **Nicht enthalten:** Automatische Konfliktauflösung (Pilot v1), Offline-**Bearbeiten** bestehender Vorgänge (nur Neuerfassung — bewusste Verengung laut Risiko-Register Nr. 4), Offline-Lesen historischer Daten über den lokalen Arbeitsstand hinaus.
- **Rollen:** alle erfassenden Rollen; Betriebsleitung sieht Sync-Konflikte über die entstehenden Korrekturanträge.
- **Kernobjekte:** Bewegung, Warenannahme, Auffüllliste, Korrektur, Audit-Event.
- **Technische Risiken:** Höchstes technisches Risiko des MVP (Risiko-Register Nr. 4): Verlust oder Verdopplung aus der Warteschlange zerstört die Kernaussage des Produkts; falsch gestellte Gerätezeit kompromittiert Audit-Glaubwürdigkeit; Speichergrenzen bei langer Offline-Dauer.
- **Done-Kriterien:** Das Papier-Szenario aus Spec-Abschnitt 4 („zwei Geräte, gleicher Lagerort, 30 Minuten offline") läuft real durch: kein Verlust, keine Dopplung, Kollision erzeugt genau einen Korrekturantrag; Flugmodus-Test über kompletten Auffüllvorgang im Keller bestanden.
- **Empfohlene Tests:** OF-01 bis OF-06, Flugmodus-Volltest, Gerätezeit-Manipulationstest. `[PILOTGERÄT]` zwingend — Funkloch-Verhalten ist auf Emulatoren nicht ehrlich prüfbar.
- **Abbruch-/Blocker-Kriterien:** Spec-Abschnitt 4 (Kollisionsdefinition, Warteschlangenmodell) nicht abgenommen → **harter Baustopp** für diesen Slice; Slices 1–9 sind davon unabhängig auslieferbar (online-only Go-Live wäre als Notfall-Option denkbar, aber Go-Live-Kriterium laut Leitplanken ist offlinetolerant — Entscheidung beim Product Owner). `[ENTSCHEIDUNG NÖTIG]`

## Reihenfolge-Begründung (kurz)

1→2 legt Identität und physische Welt, 3→4 den wichtigsten Geschäftsprozess inkl. Freigabeprinzip, 5→6 den Bewegungskern und dessen häufigsten Auslöser, 7 setzt auf allem auf (Übergabe sammelt die Vorgänge aller früheren Slices), 8 härtet quer, 9–10 sind die isolierten Hochrisiko-Themen am Schluss — mit maximal viel stabilem Unterbau zum Testen.
