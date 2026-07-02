# mvp-scope-lock.md

## Prinzip

Der ursprüngliche „MVP"-Scope aus `prd.md` war für wenige Wochen Bauzeit zu breit. Dieser Lock teilt ihn in vier Stufen. **Es kommt nichts Neues hinzu — es wird nur verschoben und geschnitten.** MVP-Core ist das, was am Go-Live-Tag des Piloten funktionieren muss. Alles andere hat ein späteres, benanntes Zuhause.

## MVP-Core (Go-Live-Tag, Woche 3–8)

| Bereich | Enthalten | Bewusst reduziert auf |
|---|---|---|
| Warenannahme | Positionen, Abweichungen, Lieferschein-Foto, Freigabe bei Abweichung | Jede Abweichung → Freigabe (keine konfigurierbaren Schwellen) |
| Lagerorte & Umlagerung | Feste Lagerortliste, Umlagerung mit Bewegungshistorie | Lagerorte nur durch Betriebsleitung änderbar, keine Hierarchien/Unterorte |
| Auffüllliste Bar/Küche | Liste je Ausgabestelle, Abhaken erzeugt Umlagerung, offene Positionen mit Grund | **Vorlage-basiert:** Standardliste aus der Setup-Datenaufnahme + manuelles Ergänzen. Keine Vorbefüllung aus Historie. |
| Schichtübergabe | Auto-Entwurf + Freitext-Punkte + aktive Bestätigung | Auto-Entwurf = chronologische Sammlung der Schichtvorgänge, keine Zusammenfassungs-Intelligenz |
| Freigabe/Korrektur + Audit-Trail | Zwei-Personen-Prinzip, append-only | Ein einstufiger Freigabeschritt, fest verdrahtet je Bereich |
| Rollen & Rechte | 6 feste Rollen (MVP-Core: 5 aktiv, Controlling ab Pilot v1), PIN-Wechsel am Schichtgerät | Keine konfigurierbaren Rollen |
| Offline | Offline-**Erfassung** je Gerät mit Warteschlange und Sync-Statusanzeige | Konflikte werden nicht automatisch aufgelöst: kollidierende Buchungen erzeugen einen Korrekturantrag (nutzt den vorhandenen Prozess) |

## Aus MVP-Core herausgeschnitten — mit Begründung

| Verschoben | Nach | Begründung des Schnitts |
|---|---|---|
| Heuristische Vorbefüllung der Auffüllliste | Pilot v1.5 | Braucht 3–4 Wochen eigene Historie, die am Go-Live-Tag nicht existiert (siehe `cold-start-ai-plan.md`). Am Tag 1 wäre sie leer oder falsch — beides beschädigt Vertrauen. Die Standardvorlage liefert 80 % des Nutzens ohne Datenbedarf. |
| Anomalie-Hinweise v1 (z. B. Lieferanten-Muster) | Pilot v1.5 | Gleiches Kaltstart-Problem: „3 von 5 Lieferungen auffällig" setzt 5 Lieferungen voraus. Ein Hinweis auf dünner Datenbasis ist Rauschen. |
| CSV-Export | Pilot v1 | Controlling braucht Daten frühestens nach Wochen; am Go-Live-Tag gibt es nichts zu exportieren. Schneidet Bauzeit ohne Pilotrisiko. |
| Rolle Controlling/Steuerberater (read-only) | Pilot v1 | Hängt am CSV-Export und an keiner Go-Live-Aktivität. Sechste Rolle erst, wenn es etwas zu lesen gibt. |
| Automatische Konfliktauflösung Offline-Sync (Multi-Device) | Pilot v1 | Teuerster Einzelposten im MVP. Der Betrieb hat wenige gleichzeitige Schreiber je Lagerort; Kollisionen sind selten und der Korrekturprozess existiert bereits als sauberer Auffangmechanismus. Automatik erst, wenn Pilotdaten zeigen, wie oft Kollisionen real auftreten. |
| Zweitsprache Englisch | Pilot v1.5 | UI-Texte sind bewusst einfach gehalten; die Schulung erfolgt am Prozess. Entscheidung nach Pilot-Feedback statt Vorab-Doppelpflege aller Texte (löst offene Entscheidung Nr. 5 des Spec Packs). |
| Anlass-Verknüpfung bei Umlagerung („wegen Auffüllliste Nr. 214") | Pilot v1 | Nice-to-have für Auswertung, nicht für den Vorgang selbst. Abhaken auf der Liste erzeugt die Verknüpfung implizit — nur die manuelle Umlagerung verliert sie vorerst. |

## Pilot v1 (während Pilotbetrieb, Woche 9–12)

- CSV-Export + Controlling-Rolle (read-only)
- Offline-Sync-Härtung nach realen Kollisionsdaten
- Anlass-Feld bei manueller Umlagerung
- Kleine UX-Anpassungen aus der Go-Live-Woche

## Pilot v1.5 (zweite Pilothälfte, Woche 13–16 — nur bei erfüllten Datenschwellen)

- Heuristische Vorbefüllung der Auffüllliste (Aktivierungskriterien: `cold-start-ai-plan.md`)
- Anomalie-Hinweise v1 (Aktivierungskriterien: `cold-start-ai-plan.md`)
- Entscheidung Zweitsprache Englisch

## Vision (unverändert, keine Zusagen)

- Lieferschein-OCR, Kassendaten als Verbrauchssignal, Bestellwesen, Inventurmodul mit Bewertung, Mehrstandort/Mandantenfähigkeit, konfigurierbare Freigabe-Workflows, Company-Brain-Funktionen.

## Konsequenz für bestehende Artefakte

- `prd.md` In/Out-Tabelle: „vorbefüllt aus Historie" und „Anomalie-Hinweise" wandern von *In* nach *Pilot v1.5*; CSV-Export nach *Pilot v1* (in `prd.md` als Hinweise vermerkt).
- `use-cases.md` Use Case 3: gilt ab Pilot v1.5; für die ersten Pilotwochen gilt die Vorlagen-Variante.
- `pilot-offer.md` Lieferumfang: AI-Funktionen als „ab zweiter Pilothälfte, datenabhängig" gekennzeichnet — **nicht** als Go-Live-Versprechen.
