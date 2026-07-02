# pilot-kpi-plan.md

## Vorbemerkung

Alle „Zielhypothesen" aus `product-vision.md` und `use-cases.md` werden hier in messbare Pilotkriterien überführt: **Baseline (wie erhoben), Messmethode, Ziel, Owner.** Baselines werden in Phase 0 bzw. der Woche vor Go-Live erhoben — ohne Baseline keine Erfolgsbehauptung.

| # | KPI | Baseline & Erhebung | Messmethode im Pilot | Ziel (Monat 3) | Owner |
|---|---|---|---|---|---|
| 1 | Erfassungsquote Warenannahmen | Anzahl Lieferungen laut Eingangsrechnungen eines Referenzmonats (Phase 0, aus Buchhaltungsbelegen gezählt, keine Beträge nötig) | Warenannahmen in Bevero ÷ Lieferungen laut Rechnungen, monatlich | ≥ 80 % | Betriebsleitung (liefert Rechnungszahl), Anbieter (rechnet) |
| 2 | Papierlose Schichtübergabe | Ist-Zustand: 0 dokumentierte Übergaben (per Definition) | Bestätigte Übergabeprotokolle in Bevero; wöchentliche Stichprobe der Schichtleitung: „gab es daneben Papier/Zettel-Übergabe?" (ja/nein) | ≥ 20 aufeinanderfolgende Tage ohne Papier-Fallback | Schichtleitungen (Meldung), Betriebsleitung (Abnahme) |
| 3 | Abweichungen am Annahmetag dokumentiert | 2-Wochen-Strichliste vor Go-Live: Warenannahme notiert Abweichungen auf Vordruck (Datum, Lieferant, Art) | Abweichungspositionen in Bevero mit Zeitstempel = Annahmetag ÷ alle bekannt gewordenen Abweichungen (inkl. später entdeckter) | ≥ 90 % | Küchenchef |
| 4 | Rückfragen an die Vorschicht | 1-Woche-Strichliste je Schichtleitung vor Go-Live: jeder Anruf/jede Nachricht an die Gegenschicht wegen fehlender Info | Gleiche Strichliste in Woche 6 und Woche 12 wiederholen (je 1 Woche) | −50 % gegenüber Baseline | Schichtleitungen (zählen), Anbieter (auswerten) |
| 5 | „Artikel leer im Service"-Vorfälle Bar | 2-Wochen-Strichliste an der Bar vor Go-Live (Vordruck an der Theke: Artikel, Uhrzeit) | Gleiche Strichliste in Monat 3 (2 Wochen) + offene Listenpositionen mit Grund „nicht vorrätig" | −50 % gegenüber Baseline (konservativer als die ursprüngliche −60 %-Hypothese) | Bar/Service (zählen), Schichtleitung (einsammeln) |
| 6 | Rüstzeit vor Abendschicht Bar | 3 gestoppte Auffüllvorgänge vor Go-Live (Beginn Liste → Bar einsatzbereit), durch Schichtleitung protokolliert | 3 gestoppte Vorgänge in Monat 3, gleiche Definition | −15 Min. im Mittel (konservativer als −20) | Schichtleitung |
| 7 | Aufklärungsquote Bestandsdifferenzen | Letztes Inventurprotokoll: Anteil der Differenzpositionen mit bekannter Ursache (Phase 0, mit Betriebsleitung durchgesehen) | Bei der nächsten Inventur: Differenzpositionen, die einem Bevero-Vorgang (Korrektur, Abweichung, Bewegung) zuordenbar sind | > 70 % zuordenbar (Baseline typisch < 30 %) | Betriebsleitung + Controlling |
| 8 | Gelebter Korrekturprozess | 0 (existiert vorher nicht) | Anzahl vollständig durchlaufener Korrekturen (Antrag → Zwei-Personen-Freigabe) | ≥ 3 reale Durchläufe, davon ≥ 1 abgelehnt (belegt, dass Prüfung real stattfindet) | Betriebsleitung |
| 9 | Aktive Nutzung je Rollengruppe | 0 | Nutzer mit ≥ 1 schreibender Aktion pro Woche ÷ geschulte Nutzer, je Rollengruppe | ≥ 70 % in jeder Rollengruppe (nicht nur im Schnitt — eine tote Rollengruppe = Adoptionsproblem) | Anbieter (misst), Betriebsleitung (handelt) |
| 10 | AI-Akzeptanzquote (erst ab Pilot v1.5) | entfällt (Funktion startet im Pilot) | Unverändert übernommene Vorschlagspositionen ÷ vorgeschlagene Positionen, wöchentlich je Stufe | ≥ 60 % nach 2 Wochen Stufe 2; unter 50 % über 2 Wochen → Abschaltregel greift | Anbieter |

## Regeln

- KPI 1–2 sind die **Bestehenskriterien** des Piloten (deckungsgleich mit `pilot-offer.md`); KPI 3–9 sind Steuerungsgrößen; KPI 10 bewertet die AI-Stufen, nicht den Piloten.
- Strichlisten-Baselines (KPI 3–6) sind bewusst niederschwellig: Vordruck + Kugelschreiber, ≤ 2 Minuten Aufwand pro Tag — alles Aufwendigere würde die Baseline-Erhebung selbst scheitern lassen.
- Monatliche Auswertung im Check-in (bestehender Rhythmus aus `pilot-offer.md`), schriftlich, für beide Seiten einsehbar.
