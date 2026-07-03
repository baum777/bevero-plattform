# Bevero Product Marketing Context

## Zweck

Den gemeinsamen, belegbaren Produkt- und Marktkontext für alle nachgelagerten Sales-Kit-Skills herstellen. Der Kontext trennt aktuellen Produktstand, gewünschte Wirkung, spätere Versionen und offene Annahmen, damit kein Skill aus Positionierung eine Produktzusage ableitet.

## Wann verwenden

- Zu Beginn jeder neuen Lead- oder Outreach-Arbeit.
- Nach einer relevanten Produkt-, Positionierungs-, Pricing- oder Zielgruppenänderung.
- Wenn zwei Sales-Kit-Dateien unterschiedliche Aussagen zu Zielgruppe, Nutzen oder Fähigkeiten enthalten.

## Inputs

- `../sales-positioning.md`
- `../outreach-readiness.md`, besonders Capability Truth Table und O2-Status
- `../pricing-pilot-decision.md`
- `../pilot-onepager.md`
- Repo-lokale Produktquellen: `../../../README.md` und `../../productization/bevero-product-identity-v0.md`
- Optional: belegbare Kundenaussagen aus Gesprächen; als Quelle kennzeichnen, nicht verallgemeinern

## Workflow

1. Die Inputs lesen und Widersprüche als offene Punkte markieren; nichts still zusammenführen.
2. Den Kontext in diesen Feldern verdichten:
   - **Who:** Gastronomie-/Hotelleriebetrieb, relevante Rolle, Betriebsform und Anti-Persona.
   - **Why:** konkreter operativer Job-to-be-done und sichtbarer Schmerz.
   - **What Before:** heutiger Ablauf und Alternativen wie Papier, Messenger oder bestehende Warenwirtschaft.
   - **How:** nur Fähigkeiten mit aktuellem O2-Beleg; Belegpfad und Prüfdatum nennen.
   - **What After:** beobachtbare Verbesserung ohne unbelegten ROI oder Superlativ.
   - **Alternatives:** Status quo, vorhandene Systeme und Nicht-Fit-Fälle.
3. Jede Fähigkeit als `confirmed`, `needs wording change` oder `unconfirmed` übernehmen. `unconfirmed` nie in freigegebene Aussagen überführen.
4. Erste Version und spätere Versionen trennen. Roadmap, Offline, native App oder Integrationen sind keine aktuelle Fähigkeit.
5. Proof Points erfassen. Fehlende Referenzen, Kennzahlen oder Live-Belege ausdrücklich als `none` oder `open` markieren.
6. Ein datiertes Kontextpaket für die nachgelagerten Skills ausgeben. Bei geändertem Claim oder veraltetem Beleg O2 wieder öffnen.

## Output-Format

```markdown
# Bevero Product Marketing Context — <Datum>

## Zielkunde und Rollen
- Who:
- Buyer / User / Influencer:
- Anti-Persona:

## JTBD Value Proposition
- Why:
- What Before:
- How — bestätigte Fähigkeiten mit O2-Beleg:
- What After:
- Alternatives:

## Positionierung und Sprache
- Ein-Satz-Positionierung:
- Begriffe verwenden:
- Begriffe vermeiden:

## Proof / Claims
| Claim-ID | Aussage | Beleg | Belegdatum | O2-Status |
|---|---|---|---|---|

## Version Boundary
- Aktuell:
- Später / nicht zusagen:

## Offene Annahmen
- ...
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Recherchierte Kontakt-/Unternehmensangaben brauchen Quelle und Datum; keine sensiblen Daten erfinden.
- Manual-first; dieser Skill recherchiert, veröffentlicht und versendet nichts automatisch.
- Repo-lokale Produktquellen schlagen Marketingformulierungen.
- Keine Produktfähigkeit ohne O2-Beleg. Unbelegte Claims abschwächen oder streichen.
- Keine Referenzen, Kennzahlen, Integrationen, Datenschutz- oder Runtime-Zustände erfinden.
- Wunschzustand, Roadmap und spätere Versionen nie als aktuelle Fähigkeit darstellen.
- Preisangaben nur aus `../pricing-pilot-decision.md` und nur nach O1-Entscheidung.

## Done-Kriterium

Ein datiertes Kontextpaket liegt vor; Zielkunde, JTBD, Alternativen, Anti-Persona, bestätigte Fähigkeiten, verbotene Aussagen und offene Annahmen sind klar getrennt. Jeder aktuelle Produktclaim trägt O2-Status, Beleg und Belegdatum.

## Related Sales-Kit Files

- `../sales-positioning.md`
- `../outreach-readiness.md`
- `../pricing-pilot-decision.md`
- `../pilot-onepager.md`
- `../sales-kit-index.md`
