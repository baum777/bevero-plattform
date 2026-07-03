# Bevero Outreach Readiness

## Zweck

Vor dem Schreiben und vor der menschlichen Versandfreigabe prüfen, ob Kontext, Lead-Evidenz, Fit, Claims und Pflicht-Gates gesund sind. Das Ergebnis kann höchstens `ready_for_draft` oder `ready_for_human_review` sein; niemals automatisch `sent`.

## Wann verwenden

- Nach Lead Research, Fit Score und Sales Claim Red Team.
- Erneut unmittelbar vor der menschlichen Freigabe eines konkreten Entwurfs.
- Wenn eine Quelle, ein Claim, ein Preis- oder Datenschutzsatz geändert wurde.

## Inputs

- Aktuelles Bevero Product Marketing Context Paket
- Ausgefüllter Lead-Steckbrief und Lead-Research-Output
- Operational Fit Score
- Sales Claim Red Team Ergebnis
- `../outreach-readiness.md`
- Geplanter Kanal und Zweck; für diese Skill-Kette ist nur ein manueller E-Mail-Entwurf zulässig

## Workflow

1. Capability-Layer-Health-Check durchführen:
   - Produktkontext datiert und ohne ungelösten Widerspruch für den geplanten Text;
   - Lead eindeutig, Quellen und Daten vorhanden;
   - Fit-Klasse A oder begründete B-Freigabe durch Menschen;
   - alle geplanten Claims `pass` oder sicher `soften`;
   - O2 für jeden Produktclaim erfüllt;
   - O1 erfüllt, falls Preis erwähnt wird;
   - O3-Stufe eingehalten, falls Daten/Hosting erwähnt werden.
2. Fallbacks anwenden:
   - fehlender Ansprechpartner → öffentlichen Funktionskontakt nutzen oder `blocked`, nie Adresse raten;
   - schwacher Aufhänger → neutrale, belegte Betriebsbeobachtung oder kein Entwurf;
   - unbelegter Claim → streichen;
   - offener Preis/Datenschutz → Thema aus Erstmail entfernen, nicht spekulativ beantworten.
3. Compliance prüfen: nur öffentliche Quellen, Quellenlinie vorhanden, keine sensiblen Daten, kein Massenscraping, keine LinkedIn-Automation.
4. Kanalgrenze prüfen: Recherche und Drafting erlaubt; automatisiertes Handeln/Senden verboten.
5. Ergebnis vergeben:
   - `ready_for_draft`: Inputs reichen für einen Entwurf;
   - `ready_for_human_review`: konkreter Entwurf besteht alle Checks;
   - `partial`: nicht sicherheitskritische Lücke verhindert Qualität;
   - `blocked`: O2, Quelle, Identität, Compliance oder Owner-Gate fehlt.
6. Genau benennen, wer den nächsten Schritt ausführt. Versandfreigabe und Versand gehören immer zum Menschen.

## Output-Format

```markdown
# Outreach Readiness — <Betrieb> — <Datum>

| Gate | Status | Evidenz / Lücke | Fallback |
|---|---|---|---|
| Product Context | | | |
| Lead Identity + Sources | | | |
| Operational Fit | | | |
| Claim Red Team / O2 | | | |
| Pricing / O1 | | | |
| Data / O3 | | | |
| Compliance | | | |
| Human Send Boundary | | | |

- Result: <ready_for_draft | ready_for_human_review | partial | blocked>
- Erlaubter nächster Schritt:
- Human owner:
- Offene Gates:
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Recherchierte Kontakt-/Unternehmensangaben brauchen Quelle und Datum; keine sensiblen Daten erfinden.
- Manual-first. Kein automatisierter Versand, kein Scheduling, kein CRM-Write.
- Keine LinkedIn-Automation und kein Massenscraping.
- Der Skill darf `ready_for_human_review`, aber nie „versendet“ oder „freigegeben durch Owner“ behaupten.
- O2 ist hard fail für jeden unbelegten Produktclaim; nicht mit einem Gesamt-Score verrechnen.
- Der Mensch prüft Empfänger, Text und Zeitpunkt, gibt Versand frei und sendet selbst.
- Bei unklarer Quelle, Identität oder Zuständigkeit fail-closed.

## Done-Kriterium

Alle acht Gates sind mit Evidenz oder Lücke dokumentiert; O2 wurde pro Claim hart geprüft; ein zulässiger nächster Schritt und menschlicher Owner sind benannt. Kein Tool hat eine externe Aktion ausgeführt.

## Related Sales-Kit Files

- `../outreach-readiness.md`
- `../lead-steckbrief-template.md`
- `../first-contact-final.md`
- `../pricing-pilot-decision.md`
- `../sales-kit-index.md`
- `bevero-operational-fit-score.skill.md`
- `bevero-sales-claim-red-team.skill.md`
