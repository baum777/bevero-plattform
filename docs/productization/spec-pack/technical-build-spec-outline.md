# technical-build-spec-outline.md

## Zweck

Liste der Spezifikationen, die **vor** Implementierungsbeginn geschrieben werden müssen. Dieses Dokument definiert sie nicht aus — es benennt sie, ihren Inhalt und ihr Fertig-Kriterium. Kein Code, keine Schemata.

## 1. Workflow-Zustandsmodelle (je Kernobjekt)

Für jedes Objekt ein Zustandsdiagramm mit erlaubten Übergängen, auslösender Rolle und erzeugtem Audit-Event:

- **Warenannahme:** Entwurf → Erfasst → (bei Abweichung) Freigabe erforderlich → Freigegeben / Abgelehnt. Festzulegen: Verhalten bei nie erteilter Freigabe (Erinnerung? Eskalation an Betriebsleitung nach X Stunden?), Nachtragen vergessener Positionen (neuer Vorgang vs. Korrektur).
- **Auffüllliste:** Erstellt (aus Vorlage) → In Bearbeitung → Abgeschlossen. Festzulegen: Verhalten bei Schichtende mit offenen Positionen (Auto-Übernahme in Übergabeentwurf).
- **Schichtübergabe:** Entwurf → Übergeben → Bestätigt. Festzulegen: unbestätigte Übergabe bei Dienstantritt (Sperre? Warnbanner?), Übergabe an sich selbst (Doppelschicht).
- **Korrektur:** Beantragt → Freigegeben / Abgelehnt. Festzulegen: Rückzug durch Antragsteller vor Entscheidung.
- **Fertig-Kriterium:** Jeder Übergang hat Rolle, Vorbedingung und Audit-Event; es gibt keinen Zustand ohne definierten Ausweg.

## 2. Berechtigungsmatrix

- Vollständige Matrix: 6 Rollen × alle schreibenden und lesenden Aktionen (nicht nur die Prosa aus `prd.md`).
- Festzulegen: Sichtbarkeitsgrenzen (sieht Bar/Service die Küchen-Warenannahme?), Stellvertretungsregel (Küchenchef abwesend — wer gibt frei?), Verhalten bei Rollenwechsel einer Person (alte Einträge bleiben der Person zugeordnet).
- PIN-Wechsel am Schichtgerät: PIN-Länge, Sperrverhalten nach Fehlversuchen, automatische Abmeldung nach Inaktivität (Betriebsrealität: Gerät liegt an der Theke).
- **Fertig-Kriterium:** Keine Aktion im Zustandsmodell ohne Zeile in der Matrix.

## 3. Audit-Event-Katalog

- Abschließende Liste aller Event-Typen (Erfassung, Statuswechsel, Freigabe, Ablehnung, Korrekturbezug, Anmeldung/PIN-Wechsel, Sync-Konflikt).
- Je Event: Pflichtfelder (Person, Gerätekennung, Zeit erfasst vs. Zeit synchronisiert — zwei getrennte Zeitstempel wegen Offline), Bezugsobjekt.
- Unveränderlichkeitsgarantie: technisches Verfahren festlegen (append-only-Mechanik, Manipulationserkennung) und DSGVO-Pseudonymisierung ausgetretener Personen **ohne** Bruch der Kette.
- **Fertig-Kriterium:** Jede schreibende Aktion aus Abschnitt 1–2 erzeugt genau einen definierten Event-Typ.

## 4. Offline-Sync-Entscheidungen

- Warteschlangenmodell je Gerät: Reihenfolge-Garantien, maximale Offline-Dauer, Verhalten bei vollem Speicher.
- ID-Vergabe offline erzeugter Vorgänge (kollisionsfrei ohne Server).
- Uhrzeit-Problem: Gerätezeit vs. Serverzeit, Umgang mit falsch gestellten Geräten (betrifft Audit-Glaubwürdigkeit).
- Konfliktdefinition: Wann gelten zwei Buchungen als kollidierend (MVP-Core-Regel: Kollision → automatischer Korrekturantrag, siehe `mvp-scope-lock.md`) — präzise Kriterien dafür.
- Sync-Statusanzeige: was sieht die Person auf dem Gerät („3 Vorgänge warten auf Übertragung").
- **Fertig-Kriterium:** Ein durchgespieltes Papier-Szenario „zwei Geräte, gleicher Lagerort, 30 Minuten offline" hat für jeden Schritt eine definierte Antwort.

## 5. Foto- und Dateibehandlung (Lieferschein-Fotos)

- Aufnahme: Komprimierung/Zielgröße (Mobilfunk im Hinterhof), Verhalten offline (Foto in Warteschlange).
- Speicherung: Speicherort (EU), Verschlüsselung, Zugriff nur über Berechtigungsmatrix.
- Aufbewahrung & Löschung: Aufbewahrungsdauer (Abgleich mit handels-/steuerrechtlichen Fristen — **juristisch zu prüfen, nicht vom Entwicklerteam zu entscheiden**), Löschkonzept bei Vertragsende.
- DSGVO-Randfall: Lieferschein-Fotos können Namen von Fahrern/Unterschriften enthalten — Umgang festlegen.
- **Fertig-Kriterium:** Lebenszyklus eines Fotos von Aufnahme bis Löschung ist lückenlos beschrieben.

## 6. Abnahmetests (je Kernprozess, als prüfbare Szenarien, kein Code)

- Je Kernprozess 3–5 Szenarien in Gegeben/Wenn/Dann-Form, darunter verpflichtend: der Offline-Fall, der Abbruch-Fall (Vorgang halb erfasst, Gerät weggelegt), der Berechtigungs-Fall (falsche Rolle versucht Aktion). → Ausformuliert in `acceptance-tests.md`.
- Der „komplette Testtag" aus `product-roadmap.md` Phase 1 wird als Drehbuch ausformuliert (Uhrzeiten, Rollen, erwartete Audit-Einträge).
- Geräte-Testmatrix: reale Zielgeräte des Pilotbetriebs (Phase-0-Erhebung), nicht nur Emulator.
- **Fertig-Kriterium:** Jedes Done-Kriterium aus Phase 1 der Roadmap ist durch mindestens ein Szenario abgedeckt.

## 7. Betriebsgrundlagen (nicht funktional, aber vor Go-Live nötig)

- Backup/Restore-Verfahren inkl. dokumentiertem Restore-Test (Roadmap Phase 3 zieht das voraus — Termin nach vorn auf Phase-1-Ende).
- Monitoring-Minimum: Sync-Fehler, Fehlerrate, Erreichbarkeit — was alarmiert wen.
- Supportweg im Piloten: wie meldet der Betrieb ein Problem (bestehender Ansprechpartner-Kanal aus `pilot-offer.md`, kein neues Tool).
