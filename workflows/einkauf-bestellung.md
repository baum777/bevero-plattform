# Workflow: Einkaufsbestellung — Pilot

**Risikostufe:** L3  
**Grund:** Externe Bestellung an Lieferanten — bindende Wirkung, Zahlungsfolge  
**Autorität:** [`IDENTITY.md`](../IDENTITY.md) · [`governance/rules.md`](../governance/rules.md)  
**Template:** [`templates/einkaufsbestellung-draft.md`](templates/einkaufsbestellung-draft.md)  
**Pilot-Standort:** Motorworld Inn Böblingen  

---

## Wann startet dieser Workflow?

Einer der folgenden Trigger:

| Trigger | Erkennbar durch |
|---|---|
| Bestand unter Sollmenge | Bevero: Artikel im roten Bereich |
| Bestand reicht nicht für geplante Events | Bevero + Event-Vorschau: Delta negativ |
| Regelmäßige Wochenbestellung | Rhythmus (z. B. montags für die Woche) |
| Manuelle Anforderung durch Schichtleitung | Direkte Meldung |

---

## Datenquellen

| Quelle | Was wird geladen | Wer lädt |
|---|---|---|
| Bevero | Aktuelle Bestände, Sollmengen, Verbrauch letzte 7 Tage | `@researcher` |
| Bevero | Geplante Events nächste 14 Tage + Bedarfsschätzung | `@researcher` |
| FoodNotify | Bevorzugte Lieferanten, Referenzpreise, letzte Bestellungen | `@researcher` |
| Operator | Sonderwünsche, Aktionen, Ausnahmen | manuell vor Draft |

---

## Flow

```
Trigger
  │
  ▼
[1] CONTEXT LOAD — @researcher
    ├── Bevero: Bestände + Sollmengen + Verbrauch (7 Tage)
    ├── Bevero: Events nächste 14 Tage
    └── FoodNotify: Lieferanten + Preise + letzte Bestellung

  │
  ▼
[2] DELTA-ANALYSE — @researcher
    ├── Welche Artikel sind unter Sollmenge?
    ├── Welche Artikel reichen nicht bis zum nächsten Event?
    └── Priorisierung: kritisch / bald / ausreichend

  │
  ▼
[3] DRAFT ERSTELLEN — @planner
    ├── Bestellentwurf nach Template (templates/einkaufsbestellung-draft.md)
    ├── Artikel + Menge + Lieferant + Schätzpreis
    ├── Begründung je Artikel (warum diese Menge?)
    └── Rollback dokumentieren: Stornofrist beim Lieferanten

  │
  ▼
[4] SELF-REVIEW — @reviewer
    Checkliste:
    [ ] Alle kritischen Artikel enthalten?
    [ ] Mengen plausibel gegen Verbrauchsdaten?
    [ ] Richtiger Lieferant je Artikel?
    [ ] Schätzpreise aktuell (FoodNotify)?
    [ ] Event-Bedarf eingerechnet?
    [ ] Stornofrist dokumentiert?
    [ ] Kein Artikel doppelt bestellt?

  │
  ▼
[5] GOVERNANCE-CHECK — automatisch
    [ ] Risikostufe L3 korrekt klassifiziert?
    [ ] Evidence-Artefakt vorbereitet?
    [ ] Rollback-Verfahren dokumentiert?
    → Wenn alle Punkte ✓: weiter zu Operator-Freigabe
    → Wenn ein Punkt ✗: zurück zu Draft

  │
  ▼
[6] OPERATOR-FREIGABE — L3 Pflicht
    Der Operator erhält:
    ├── Den vollständigen Bestellentwurf
    ├── Delta-Begründung je Artikel
    ├── Geschätzte Gesamtkosten
    ├── Lieferant + erwartetes Lieferdatum
    └── Rollback: Stornofrist + Kontakt

    Freigabe-Format:
    "Genehmigt — [Name] — [Datum] — [Uhrzeit] — [Kanal: z. B. Slack / persönlich]"

    Ohne diese Freigabe: KEIN Versand. Keine Ausnahme.

  │
  ▼
[7] EXECUTION — @communicator (erst nach Freigabe)
    ├── Bestellung an Lieferant versenden (E-Mail / Lieferantenportal / Anruf mit Protokoll)
    ├── Bestellbestätigung empfangen und ablegen
    └── Lieferdatum in Bevero vormerken (wenn möglich)

  │
  ▼
[8] EVIDENCE — @auditor
    ├── Evidence-Artefakt in logs/evidence/YYYY-MM-DD-einkauf-[standort]-[slug].md
    ├── Operator-Freigabe als Anhang im Artefakt
    └── Bestellbestätigung als Anhang (oder Link)

  │
  ▼
[9] AUDIT-LOG-EINTRAG
    Format: DATUM | L3 | Einkaufsbestellung [Lieferant] | @planner | [Reviewer] | executed | [evidence-link]
```

---

## Rollback

| Zeitpunkt | Rollback-Möglichkeit |
|---|---|
| Vor Versand | Draft verwerfen — keine Aktion nötig |
| Nach Versand, vor Stornofrist | Storno beim Lieferanten (Kontakt im Draft) |
| Nach Stornofrist | Nicht reversibel — Rückgabe/Retour prüfen, Operator informieren |

Die Stornofrist des Lieferanten ist **Pflichtfeld im Draft**.  
Wenn Stornofrist unbekannt → vor Versand beim Lieferanten klären.

---

## Abbruchbedingungen

Der Workflow stoppt und eskaliert an den Operator wenn:

- Bevero-Daten nicht aktuell (älter als 4 Stunden bei kritischem Trigger)
- Kein passender Lieferant in FoodNotify für einen kritischen Artikel
- Schätzpreis weicht >20 % vom letzten FoodNotify-Referenzpreis ab
- Operator nicht erreichbar für L3-Freigabe und Liefertermin kritisch
- Governance-Check schlägt fehl

---

## Lernschleife

Nach jeder Bestellung:

1. **Genauigkeit prüfen:** Stimmten Schätzmengen mit tatsächlichem Verbrauch überein?
2. **Lieferant bewerten:** Lieferung pünktlich? Qualität? Preisabweichung?
3. **Sollmengen anpassen:** Wenn ein Artikel wiederholt unter Schwelle fällt → Sollmenge erhöhen (L2-Workflow)
4. **Eintrag in `logs/session-log.md`:** Was hat funktioniert, was nicht?

---

## Verwandte Workflows

- `workflows/sollmengen-anpassung.md` (L2) — folgt auf wiederholte Unterschreitungen
- `workflows/lieferanten-kommunikation.md` (L3) — Reklamation, Lieferproblem
- `workflows/event-bedarfsplanung.md` (L2) — vorgelagert bei großen Events
