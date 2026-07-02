# cold-start-ai-plan.md

## Das Problem ehrlich benannt

Alle „AI-nativen" Funktionen von Bevero lernen aus den **eigenen** Bewegungsdaten des Betriebs. Am Go-Live-Tag existieren null Datensätze. Wer in Woche 1 eine „intelligente Auffüllliste" verspricht, liefert entweder eine leere Liste oder erfundene Vorschläge — beides zerstört genau das Vertrauen, von dem die Adoption abhängt.

## Wie Bevero ohne Historie funktioniert (Stufe 0, ab Go-Live)

Der Nutzen der ersten Wochen kommt **vollständig ohne AI** aus Struktur:

- **Auffüllliste:** Standardvorlage je Ausgabestelle, erhoben in der Setup-Datenaufnahme mit Barchef/Küchenchef („was füllt ihr jeden Tag auf?"). Die Vorlage ist das kodifizierte Kopfwissen des Teams — sofort nützlich, null Datenbedarf.
- **Warenannahme, Übergabe, Korrektur:** brauchen keinerlei Historie; ihr Wert (Nachvollziehbarkeit, Bestätigung, Beleg) ist ab dem ersten Vorgang voll da.
- Die Setup-Datenaufnahme ist damit zugleich das **Bootstrapping der Vorschlagsbasis** — kein zusätzlicher Schritt, keine neue Funktion.

## Aktivierungsstufen mit harten Datenschwellen

| Stufe | Funktion | Aktivierung erst wenn | Erwartbar ab |
|---|---|---|---|
| 0 | Standardvorlage je Ausgabestelle | Go-Live | Woche 1 |
| 1 | „Letzte abgeschlossene Liste als Ausgangspunkt übernehmen" | ≥ 1 abgeschlossene Liste je Ausgabestelle | Woche 1–2 |
| 2 | Wochentags-Heuristik (Vorbefüllung aus gleichen Wochentagen) | ≥ 3 abgeschlossene Listen **desselben Wochentags** je Ausgabestelle | Woche 4–5 |
| 3 | Anomalie-Hinweise Lieferant | ≥ 5 Warenannahmen **je Lieferant**, davon ≥ 2 mit Abweichung | Woche 5–8, je Lieferfrequenz |
| 3 | Anomalie-Hinweise Bestand (auffällige Differenzhäufung je Lagerort) | ≥ 4 Wochen Bewegungsdaten am betroffenen Lagerort | Woche 5+ |

> Stufe 1 ist eine Bedienvereinfachung der bestehenden Listen-Funktion, kein neues Feature — sie kopiert, sie schlägt nichts vor.

## Regeln gegen Overpromising

1. **Sprachregel für Pilotgespräche und Schulung:** In den ersten 4 Wochen wird AI **nicht** als Nutzenversprechen kommuniziert. Verkauft wird Struktur: „nachlesbar, zuordenbar, ohne Papier." Formulierung für die Schulung: „Ab etwa Woche 4 beginnt Bevero, aus euren eigenen Daten Vorschläge zu machen."
2. **Vorschläge sind immer als Vorschläge markiert** („Vorschlag aus euren letzten Freitagen"), editierbar, und die Schichtleitung schließt weiterhin ab. Kein Vorschlag löst je automatisch eine Bewegung aus.
3. **Qualitäts-Gate vor Stufe 2/3-Aktivierung:** Anbieter prüft die Vorschläge eine Woche intern gegen die realen Listen (Schattenbetrieb), bevor sie dem Team angezeigt werden. Aktiviert wird nur, wenn ≥ 70 % der vorgeschlagenen Positionen in den realen Listen tatsächlich vorkamen.
4. **Abschaltregel:** Liegt die Akzeptanzquote (unverändert übernommene Positionen) zwei Wochen unter 50 %, wird die Stufe deaktiviert und auf der vorherigen weitergearbeitet — offen kommuniziert, nicht stillschweigend.
5. **Messung:** Akzeptanzquote je Stufe ist Pilot-KPI (siehe `pilot-kpi-plan.md` KPI 10), damit „AI-nativ" eine belegte Aussage wird statt einer Landingpage-Behauptung.
