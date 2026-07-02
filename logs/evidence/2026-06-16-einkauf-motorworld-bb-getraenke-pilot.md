---
date: 2026-06-16
action: Einkaufsbestellung Getränke — Metro Böblingen
risk_level: L3
standort: Motorworld Inn Böblingen
author: "@planner"
reviewer: "[Reviewer Name]"
operator_approval: "ausstehend — Beispiel-Artefakt (Pilot)"
status: draft
rollback: "Storno bis 2026-06-17 12:00 per Tel. 0800-xxx / orders@metro.de"
lieferant_kontakt: "Metro Böblingen — Bestellbüro 0800-xxx — orders@metro.de"
lieferdatum_erwartet: 2026-06-18
geschaetzte_gesamtkosten: "€ 312,40"
---

# Bestellentwurf — Metro Böblingen — 2026-06-16

**Standort:** Motorworld Inn Böblingen  
**Erstellt von:** @planner  
**Datenstand Bevero:** 2026-06-16 09:15  
**Datenstand FoodNotify:** 2026-06-15  

> **Hinweis:** Dieses Artefakt ist ein Pilot-Beispiel zur Illustration des Workflows.
> Mengen, Preise und Lieferantendaten sind Platzhalter — vor echtem Einsatz mit realen
> Bevero- und FoodNotify-Daten befüllen.

---

## Trigger

- [x] Bestand unter Sollmenge (Prosecco, Mineralwasser, Orangensaft)
- [x] Event in 3 Tagen — Firmen-Event 80 Pax — Mehrbedarf ca. +40 %
- [ ] Regelmäßige Wochenbestellung
- [ ] Manuelle Anforderung

---

## Delta-Analyse

| Artikel | Ist-Bestand | Soll-Menge | Delta | Verbrauch 7 Tage | Event-Mehrbedarf | Bestellmenge |
|---|---|---|---|---|---|---|
| Prosecco (0,75 l) | 6 Fl | 24 Fl | −18 | 12 Fl/Woche | +8 Fl | **26 Fl** |
| Mineralwasser still (1 l) | 24 Fl | 48 Fl | −24 | 30 Fl/Woche | +20 Fl | **44 Fl** |
| Mineralwasser sprudel (1 l) | 18 Fl | 36 Fl | −18 | 24 Fl/Woche | +15 Fl | **33 Fl** |
| Orangensaft (1 l, gekühlt) | 4 Fl | 12 Fl | −8 | 6 Fl/Woche | +4 Fl | **12 Fl** |

---

## Bestellpositionen

| Pos | Artikel | Einheit | Menge | Referenzpreis (FoodNotify) | Schätzpreis gesamt | Begründung |
|---|---|---|---|---|---|---|
| 1 | Prosecco Canti DOC 0,75 l | Flasche | 26 | € 4,20 | € 109,20 | Unter Soll + Event 2026-06-19 |
| 2 | Gerolsteiner still 1 l | Kiste (12 Fl) | 4 | € 8,90/Kiste | € 35,60 | Unter Soll + Event |
| 3 | Gerolsteiner sprudel 1 l | Kiste (12 Fl) | 3 | € 8,90/Kiste | € 26,70 | Unter Soll + Event |
| 4 | Valensina OJ 1 l | Karton (6 Fl) | 2 | € 9,80/Karton | € 19,60 | Unter Soll |
| 5 | … | | | | | |
| | | | | **Gesamt** | **€ 191,10** | *Restpositionen noch zu ergänzen* |

---

## Lieferant

**Name:** Metro Böblingen  
**Kontakt:** Bestellbüro 0800-xxx / orders@metro.de  
**Bestellweg:** E-Mail mit PDF-Bestellformular  
**Letzte Bestellung:** 2026-06-09 — pünktlich, keine Qualitätsprobleme  
**Stornofrist:** bis 2026-06-17 12:00 per Tel. oder E-Mail  

---

## Reviewer-Checkliste

- [ ] Alle kritischen Artikel enthalten
- [ ] Mengen plausibel gegen Verbrauchsdaten
- [ ] Richtiger Lieferant je Artikel
- [ ] Schätzpreise aktuell (FoodNotify-Referenz)
- [ ] Event-Bedarf eingerechnet
- [ ] Stornofrist dokumentiert
- [ ] Kein Artikel doppelt bestellt
- [ ] Rollback-Verfahren klar

**Reviewer:** _______________________ **Datum:** _______________________

---

## Operator-Freigabe (L3 — Pflicht vor Versand)

> "Genehmigt — [Name] — [Datum] — [Uhrzeit] — [Kanal]"

**Freigabe:** _____________________________________________

---

## Ausführungsprotokoll

**Versandt am:** —  
**Versandt per:** —  
**Bestellbestätigung erhalten:** [ ] Ja / [ ] Nein  
**Bestätigtes Lieferdatum:** —  
**In Bevero vorgemerkt:** [ ]  
