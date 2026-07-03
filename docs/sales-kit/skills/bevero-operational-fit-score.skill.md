# Bevero Operational Fit Score

## Zweck

Einen recherchierten Betrieb anhand beobachtbarer Bevero-Fit-Signale priorisieren, ohne Recherchehypothesen als bestätigten Bedarf auszugeben. Der Score steuert nur die nächste manuelle Prüfung, nicht eine automatische Kontaktentscheidung.

## Wann verwenden

- Nach Bevero Lead Research und vor Claim-Red-Team oder Mail-Entwurf.
- Nach einem Erstgespräch erneut, wenn Hypothesen durch Aussagen des Betriebs ersetzt wurden.
- Nicht verwenden, wenn Betrieb oder Quellenlage nicht eindeutig sind.

## Inputs

- Ausgefüllter `../lead-steckbrief-template.md`
- Lead-Research-Output mit Quellen, Datum und Confidence
- Aktuelles Bevero Product Marketing Context Paket
- Optional: freiwillig im Gespräch genannte Fakten, getrennt von öffentlicher Recherche

## Workflow

1. Hard Stops prüfen: geschlossen/unklar identifiziert, keine zulässige Geschäftskontaktmöglichkeit, erwartet ERP/Bestellwesen als Kern, zentraler Entscheidungsweg unerreichbar oder akute Ausnahmesituation. Bei Hard Stop nicht weiterpunkten.
2. Sechs Dimensionen mit `0`, `1` oder `2` bewerten:
   - **Operative Übergabepunkte:** keine/unklar · ein plausibler · mehrere belegte.
   - **Pilot-Scope-Nähe:** kein passender Prozess · plausibel · klar beobachtbar/selbst benannt.
   - **Standortkomplexität:** sehr klein/unklar · mittlere Komplexität · mehrere Outlets, Schichten oder Lagerpunkte.
   - **Problem-/Timing-Signal:** keines · indirekt · konkretes aktuelles Signal.
   - **Entscheiderzugang:** unbekannt · öffentliche Rolle/Kanal · zuständige Person oder direkte Weiterleitung bestätigt.
   - **Einführungsfähigkeit:** Gegenindiz · unklar · sichtbare Offenheit und begrenzter Pilot realistisch.
3. Nur `high`- oder `medium`-Confidence als Punkte verwenden. `low` bleibt `0` und wird als Gesprächsfrage notiert.
4. Ergebnis bilden: `9–12 = A / priorisierte manuelle Ansprache`, `6–8 = B / erst Lücke klären`, `0–5 = C / zurückstellen`. Hard Stop überschreibt die Summe.
5. Load-bearing assumptions markieren: Welche Annahme trägt mindestens zwei Punkte? Für jede eine günstige Prüfung im Gespräch formulieren.
6. Den Score nicht als Gewissheit formulieren. Öffentliche Signale zeigen Passung, nicht tatsächlichen Schmerz.

## Output-Format

```markdown
# Operational Fit Score — <Betrieb> — <Datum>

| Dimension | Score 0–2 | Evidenz | Confidence |
|---|---:|---|---|
| Operative Übergabepunkte | | | |
| Pilot-Scope-Nähe | | | |
| Standortkomplexität | | | |
| Problem-/Timing-Signal | | | |
| Entscheiderzugang | | | |
| Einführungsfähigkeit | | | |

- Gesamt: <0–12>
- Klasse: <A | B | C | Hard Stop>
- Begründung:

## Load-bearing assumptions
| Annahme | Getragene Punkte | Cheapest test | Kill criterion |
|---|---:|---|---|

## Nächste manuelle Aktion
- ...
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Recherchierte Kontakt-/Unternehmensangaben brauchen Quelle und Datum; keine sensiblen Daten erfinden.
- Manual-first; kein automatisches Ranking, Routing, CRM-Write oder Outreach.
- Kein Score ohne Quellenlinie. Fehlende Evidenz ergibt keine Punkte.
- Keine sensiblen Daten oder Persönlichkeitsurteile verwenden.
- Kein öffentliches Signal als internen Prozessfehler oder Kaufabsicht darstellen.
- Ein hoher Fit-Score bestätigt keine Produktfähigkeit und ersetzt das harte O2-Claim-Gate nicht.
- Fit ist kein Versand-Gate-Ersatz: Claim-Red-Team und Outreach-Readiness bleiben Pflicht.
- Klasse C und Hard Stop nicht durch kreativere Copy „retten“.

## Done-Kriterium

Alle sechs Dimensionen sind mit Evidenz und Confidence bewertet; Hard Stops, load-bearing assumptions, cheapest tests und Kill Criteria sind sichtbar. Das Ergebnis nennt genau eine nächste manuelle Aktion oder `zurückstellen`.

## Related Sales-Kit Files

- `../lead-steckbrief-template.md`
- `../workflow-audit-template.md`
- `../pilot-conversation-guide.md`
- `../sales-kit-index.md`
- `bevero-lead-research.skill.md`
- `bevero-product-marketing-context.skill.md`
