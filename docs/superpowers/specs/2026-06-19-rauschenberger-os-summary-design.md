# Design: Rauschenberger-OS-Summary

**Status:** Struktur durch den Operator am 2026-06-19 freigegeben.

## Ziel

`docs/RAUSCHENBERGER-OS-SUMMARY.md` wird in zwei klar getrennte Leserperspektiven überführt und beschreibt den lokalen Ist-Zustand ohne unbewiesene Laufzeit- oder Integrationsbehauptungen.

## Aufbau

1. **Nicht-technische Leser:** einfache Definition der Webapp, aktueller Nutzen, Governance und Grenzen bestehender Führungssysteme.
2. **Gekennzeichnetes Zielbild:** eine deutlich abgegrenzte Box beschreibt die noch nicht vollständig umgesetzte Verbindung aus Personaleinsatz, Küchenbereichen, Checklisten, Übergaben, Beständen und Eventbedarf.
3. **Interne IT:** der aktuelle Frontend-, Backend- und Datenbank-Stack sowie die belegte Schichtplan-/Küchenchecklistenlogik.

## Küchenchecklisten- und Schichtplanlogik

Der dokumentierte Ist-Zustand ist: Ein Schichtplan kann importiert, geprüft, bestätigt und freigegeben werden. Daraus sind Aufgaben je Datum, Küchenbereich und zugewiesener Person verfügbar. Mitarbeitende markieren Aufgaben als erledigt oder melden ein Problem. Schichtleitungen erhalten eine Zusammenfassung je Bereich; die Matrix stellt die Planung bereichsweise dar. Rollen beschränken die jeweiligen Ansichten und Aktionen.

Die Summary behauptet weder eine automatisch erzeugte Personalplanung noch Schreibzugriffe in FoodNotify, Dynamics 365 oder DATEV.

## Evidenzgrenzen

- Aktuelle Kennzahlen werden aus `context/current-state.md` übernommen.
- Deployment-Aussagen bleiben als Angaben aus der Deployment-SOT gekennzeichnet, sofern sie nicht lokal geprüft wurden.
- Externe Systeme bleiben führend; die Summary beschreibt keine aktive externe Ausführung.

## Validierung

- `git diff --check`
- Vollständige Sichtprüfung auf die zwei Zielgruppen, die Zielbild-Box und die korrekte Trennung von Ist- und Zielzustand.
