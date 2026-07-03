# Bevero Sales Claim Red Team

## Zweck

Jede kundenwirksame Aussage adversarial gegen Produkt-, Runtime-, Pricing-, Datenschutz- und Proof-Evidenz prüfen. Der Skill erhält O2 als hartes, wiederholbares Gate: Neue oder geänderte Produktclaims sind blockiert, bis sie belegt und passend formuliert sind.

## Wann verwenden

- Vor jedem neuen oder geänderten Mail-, Onepager-, Angebots- oder Gesprächsclaim.
- Wenn Repo-Stand, Runtime-Beleg, Pricing oder Datenschutzstatus geändert wurden.
- Wenn eine Formulierung schneller, einfacher, vollständig, automatisch oder integriert verspricht.

## Inputs

- Zu prüfender Text oder Claim-Liste
- Aktuelles Bevero Product Marketing Context Paket
- `../outreach-readiness.md`, besonders Capability Truth Table
- `../pricing-pilot-decision.md`
- Relevante Repo-Evidenz mit Prüfdatum; Live-/Runtime-Evidenz nur, wenn tatsächlich vorhanden

## Workflow

1. Den Text in atomare Claims zerlegen. Auch implizite Aussagen und Beispiele erfassen.
2. Jeden Claim klassifizieren: `product capability`, `outcome`, `proof/reference`, `commercial`, `data/privacy`, `process` oder `subjective UX`.
3. Pro Claim die stärkste zulässige Evidenz nennen und ihren Stand prüfen:
   - Produktfähigkeit: O2 Truth Table plus Repo-Pfad und Datum.
   - Runtime: benannter Smoke-/Live-Beleg; Code allein ist kein Live-Beleg.
   - Pricing: entschiedene O1-Fassung.
   - Datenschutz: nur belegte O3-Stufe.
   - Proof/Outcome: reale Referenz oder Messung; sonst keine Tatsachenbehauptung.
4. Status vergeben: `pass`, `soften`, `remove` oder `blocked`.
5. Für load-bearing Claims ergänzen:
   - **Fails if:** welches beobachtbare Gegenbeispiel macht den Claim falsch?
   - **Cheapest test:** kleinster lokale oder Owner-gesteuerte Nachweis.
   - **Kill criterion:** wann der Claim vollständig gestrichen wird.
6. Bei `soften` eine engere Formulierung liefern, die nicht mehr verspricht als die Evidenz trägt. Bei `blocked` oder `remove` keinen kreativen Ersatz mit gleichem unbelegtem Inhalt bauen.
7. O2-Entscheidung dokumentieren:
   - unveränderter Claim mit aktuellem `confirmed`-Beleg: O2 für diesen Claim erfüllt;
   - neuer, geänderter oder veralteter Claim: O2 offen, bis Belegprüfung abgeschlossen ist.

## Output-Format

```markdown
# Sales Claim Red Team — <Artefakt> — <Datum>

| ID | Claim | Klasse | Evidenz + Datum | O2/O1/O3 | Fails if | Status | Sichere Fassung |
|---|---|---|---|---|---|---|---|

## Load-bearing assumptions
| Annahme | Cheapest test | Kill criterion | Owner |
|---|---|---|---|

## Gate Result
- Result: <pass | partial | blocked>
- Erlaubte Claim-IDs:
- Zu streichen/abzuschwächen:
- Offene Nachweise:
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Recherchierte Kontakt-/Unternehmensangaben brauchen Quelle und Datum; keine sensiblen Daten erfinden.
- Kein Beleg = keine Behauptung. Abschwächen oder streichen.
- Keine Produktfähigkeit ohne bestätigtes O2; jede Claim-Änderung triggert eine neue O2-Prüfung.
- Code-/Test-Evidenz nicht als deployte Runtime oder Pilotbereitschaft ausgeben.
- Keine erfundenen Referenzen, Resultate, ROI-Zahlen, Kundenstimmen oder Integrationen.
- Roadmap, „vorgesehen“ und Wunschzustand nicht in Präsens verkaufen.
- O1 und O3 nicht durch vorsichtige Wortwahl umgehen.
- Dieser Skill ändert keine Produktquelle und sendet nichts.

## Done-Kriterium

Jeder kundenwirksame Claim ist atomar erfasst, klassifiziert, mit datierter Evidenz und Gate-Status versehen. Kein `blocked`, `remove` oder unbestätigter O2-Claim bleibt im freigegebenen Text; load-bearing assumptions besitzen Cheapest Test und Kill Criterion.

## Related Sales-Kit Files

- `../outreach-readiness.md`
- `../first-contact-final.md`
- `../pilot-onepager.md`
- `../pricing-pilot-decision.md`
- `../objection-handling.md`
- `../sales-positioning.md`
- `bevero-product-marketing-context.skill.md`
