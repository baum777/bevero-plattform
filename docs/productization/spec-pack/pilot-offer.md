# pilot-offer.md

## Zielkunde des Piloten

Ein Hotel mit angeschlossener Gastronomie: Restaurant, Bar, Veranstaltungsräume; 40–60 operative Mitarbeitende; 5–8 Lagerorte; Warenannahme werktäglich morgens; zwei Schichten mit Übergabe am Nachmittag. Geführt von einer präsenten Betriebsleitung, die Inventurdifferenzen und Übergabechaos als reale Kosten kennt — und bereits mindestens einen gescheiterten Digitalisierungsanlauf hinter sich hat.

## Lieferumfang

**Software-Scope (= MVP-Core, nicht mehr):**
- Warenannahme, Lagerorte & Umlagerungen, Auffüllliste Bar/Küche (vorlage-basiert), Schichtübergabe, Freigabe-/Korrekturprozess mit Audit-Trail, Rollen & Rechte.
- Ab Pilot v1: CSV-Export, Controlling-Rolle. Ab zweiter Pilothälfte (Pilot v1.5, datenabhängig): heuristische Vorbefüllung der Auffüllliste, Anomalie-Hinweise — **kein Go-Live-Versprechen** (siehe `cold-start-ai-plan.md`).

**Setup:**
- Datenaufnahme gemeinsam vor Ort: Lagerorte, Top-Artikelliste (Start: ~100 Artikel), Nutzer & Rollen.
- Einrichtung und Test auf den Geräten des Betriebs (Smartphones/Tablet an der Bar).

**Schulung:**
- 2 × 45 Minuten pro Rollengruppe (Warenannahme/Lager, Bar/Service, Schichtleitung/Küchenchef), direkt am echten Prozess — keine Folienschulung.

**Betreuung:**
- Ein fester Ansprechpartner.
- Woche 1: erreichbar zu Warenannahme- und Übergabezeiten.
- Danach: wöchentlicher Check-in (30 Minuten) mit Betriebsleitung.

**Feedback-Schleife:**
- Rückmeldungen werden gesammelt, priorisiert und transparent beantwortet: wird umgesetzt / kommt später / kommt nicht (mit Begründung). Kleine Anpassungen fließen während des Piloten ein.

## Setup: von Unterschrift bis „erste Schichtübergabe läuft in Bevero"

1. Kickoff (vor Ort, ~2 Std.): Prozesse bestätigen, Geräte klären, Termine fixieren.
2. Datenaufnahme (vor Ort, halber Tag): Lagerorte begehen und anlegen, Artikelliste aufnehmen, Rollen zuordnen.
3. Einrichtung (remote, 1–2 Tage): Instanz konfigurieren, Nutzer anlegen, Testdurchlauf.
4. Schulungen (vor Ort, 1 Tag): je Rollengruppe am echten Prozess.
5. Go-Live-Woche: erste echte Warenannahme in Bevero (Tag 1), erste Auffüllliste (Tag 1–2), erste Schichtübergabe mit aktiver Bestätigung (spätestens Tag 3), begleitet.

> Annahme: Der Betrieb stellt WLAN in den Hauptbereichen und duldet Offline-Erfassung in Funklöchern (Keller/Kühlhaus); es wird keine neue Hardware vorausgesetzt außer ggf. einem Bar-Tablet.

## Betrieb während des Piloten

- **Dauer:** 3 Monate ab Go-Live.
- **Check-ins:** wöchentlich 30 Minuten mit Betriebsleitung; monatlich Auswertung gegen Erfolgskriterien.
- **Erfolgsmessung:** laut `pilot-kpi-plan.md` (Erfassungsquote Warenannahmen, papierlose Übergabetage in Folge, durchlaufene Korrekturprozesse, Rückfrage-Baseline-Vergleich, aufgeklärte vs. unaufgeklärte Differenzen).
- **Anpassungen:** kleine UX-/Prozessanpassungen laufend; alles Größere geht dokumentiert in die Roadmap.

## Preis- und Paketlogik (Vorschlag, kein Festpreis)

> Annahme: Preise sind ein Vorschlag zur Verhandlung; Spannen statt Scheinpräzision.

- **Setup-Pauschale einmalig: 2.000–4.000 €** — deckt Datenaufnahme vor Ort, Einrichtung, Schulung, begleitete Go-Live-Woche. Begründung: echter Vor-Ort-Aufwand von 2–3 Personentagen plus Vorbereitung; ein kostenloses Setup entwertet die Verbindlichkeit auf beiden Seiten.
- **Pilotpreis monatlich: 300–500 € (3 Monate)** — bewusst unter dem späteren Regelpreis, weil der Pilotkunde Feedback-Arbeit leistet und Frühphasen-Risiko trägt. Begründung: kostenlos erzeugt keine ernsthafte Nutzung; der Betrag liegt unter einer typischen monatlichen Inventurdifferenz.
- **Umstieg Regelbetrieb: 500–900 €/Monat** je Standort (Vorschlag), Pilotkunde erhält dauerhaft Konditionsvorteil (z. B. Pilotpreis + 20 % statt Listenpreis) als Gegenwert für die Aufbauleistung. Der Regelbetriebspreis steht bereits im Pilotvertrag (siehe `risk-register.md` Nr. 8).

## Erfolgs- und Abbruchkriterien (fair für beide Seiten)

**Erfolg (Pilot gilt als bestanden), wenn nach 3 Monaten:**
- ≥ 80 % der Warenannahmen in Bevero erfasst sind,
- Schichtübergabe an mindestens 20 aufeinanderfolgenden Tagen ohne Papier-Fallback lief,
- die Betriebsleitung den Weiterbetrieb will.

**Abbruch (fair, ohne Schuldzuweisung):**
- Kunde kann monatlich zum Monatsende kündigen; Setup-Pauschale wird nicht erstattet, Monatsbeiträge enden.
- Anbieter kann abbrechen, wenn der Betrieb die Prozesse dauerhaft nicht nutzt (z. B. < 30 % Erfassungsquote über 4 Wochen trotz Betreuung) — dann entfällt der letzte Monatsbeitrag.
- Alle Daten des Betriebs werden bei Abbruch als CSV übergeben und auf Wunsch gelöscht (Audit-konform pseudonymisiert).

## Nächste Schritte

**Für den Kunden:**
1. 60-minütiger Vor-Ort-Termin: eine echte Warenannahme und eine Übergabe gemeinsam ansehen.
2. Benennung von zwei Prozess-Paten (eine Schichtleitung, Küchenchef oder Stellvertretung).
3. Absichtserklärung Pilot unterschreiben.

**Für den Anbieter:**
4. Prozess-Walkthrough dokumentieren und Abweichungen ins Setup übernehmen.
5. Setup-Termin + Schulungstermine innerhalb von 2 Wochen nach Unterschrift anbieten.
