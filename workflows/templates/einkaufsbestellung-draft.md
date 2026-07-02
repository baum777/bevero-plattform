---
date: YYYY-MM-DD
action: Einkaufsbestellung — [Lieferant]
risk_level: L3
standort: [z. B. Motorworld Inn Böblingen]
author: "@planner"
reviewer: "[Name]"
operator_approval: "ausstehend"
status: draft
rollback: "Storno bis [Datum / Uhrzeit] per [Kontakt: Tel / E-Mail]"
lieferant_kontakt: "[Name, Tel, E-Mail]"
lieferdatum_erwartet: YYYY-MM-DD
geschaetzte_gesamtkosten: "€ [X]"
---

# Bestellentwurf — [Lieferant] — [Datum]

**Standort:** [Motorworld Inn Böblingen / CUBE / …]  
**Erstellt von:** @planner  
**Datenstand Bevero:** [Datum + Uhrzeit]  
**Datenstand FoodNotify:** [Datum]  

---

## Trigger

- [ ] Bestand unter Sollmenge
- [ ] Event in [X] Tagen — Mehrbedarf [Y] Einheiten
- [ ] Regelmäßige Wochenbestellung
- [ ] Manuelle Anforderung durch: [Name]

---

## Delta-Analyse

| Artikel | Ist-Bestand | Soll-Menge | Delta | Verbrauch 7 Tage | Event-Mehrbedarf | Bestellmenge |
|---|---|---|---|---|---|---|
| [Artikel 1] | [X] | [Y] | [−Z] | [∅/Woche] | [+N] | **[M]** |
| [Artikel 2] | | | | | | |
| [Artikel 3] | | | | | | |

*Felder aus Bevero ziehen. Event-Mehrbedarf aus Bevero Event-Vorschau.*

---

## Bestellpositionen

| Pos | Artikel | Einheit | Menge | Referenzpreis (FoodNotify) | Schätzpreis gesamt | Begründung |
|---|---|---|---|---|---|---|
| 1 | [Artikel 1] | [Flasche / kg / Karton] | [M] | € [X] / [Einheit] | € [X·M] | Unter Sollmenge + Event [Name] |
| 2 | | | | | | |
| 3 | | | | | | |
| | | | | **Gesamt** | **€ [Summe]** | |

---

## Lieferant

**Name:** [Lieferantenname]  
**Kontakt:** [Name, Tel, E-Mail]  
**Bestellweg:** [E-Mail / Portal / Telefon]  
**Letzte Bestellung:** [Datum] — [war pünktlich / Qualitätsproblem bei …]  
**Stornofrist:** bis [Datum] [Uhrzeit] per [Kontakt]  

---

## Reviewer-Checkliste

Auszufüllen durch Reviewer vor Freigabe-Anfrage:

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

## Ausführungsprotokoll (nach Freigabe ausfüllen)

**Versandt am:** [Datum] [Uhrzeit]  
**Versandt per:** [E-Mail / Portal / Telefon]  
**Bestellbestätigung erhalten:** [ ] Ja — am [Datum] / [ ] Nein — nachfassen bis [Datum]  
**Bestätigtes Lieferdatum:** [Datum]  
**In Bevero vorgemerkt:** [ ] Ja / [ ] Nicht möglich  
