# Intent Memory — Bevero Sales Kit Skill Layer (P1.1a)

- id: sales-kit-skill-layer-20260703
- timestamp: 2026-07-03
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-skill-layer.md`
- status: draft

## Core intention

Aus allgemeinen Marketing-, PM- und Research-Mustern eine kleine Bevero-Capability-Layer bilden, die einen einzelnen Lead sicher von öffentlicher Recherche bis zu einem menschlich geprüften Mail-Draft führt. Research, Bewertung, Claim-Prüfung, Drafting und Senden bleiben getrennte Zustände.

## Logic followed

- Product Marketing Context ist der gemeinsame Eingang aller nachgelagerten Skills, aber keine neue Produktwahrheit. Repo-Evidenz und `outreach-readiness.md` bleiben für Fähigkeiten autoritativ.
- Lead Research arbeitet single-target, öffentlich, datiert und confidence-basiert. Beobachtung und Ableitung werden getrennt.
- Der Fit Score priorisiert nur den nächsten manuellen Schritt. Er darf weder Schmerz noch Kaufabsicht behaupten.
- Das Claim Red Team ist der harte O2-Gatekeeper. `Kein Beleg = keine Behauptung`; neue oder geänderte Claims öffnen O2 erneut.
- Readiness kann höchstens Drafting oder Human Review erlauben. Freigabe und Versand sind ausschließlich menschliche Handlungen.
- Fallbacks reduzieren Behauptungen oder stoppen den Lauf; sie umgehen keine Gates.

## Reference pattern disposition

- Übernommen als eigenes Bevero-Muster: zentraler Kontext, Quellen/Confidence, niedriger CTA, JTBD-Felder, load-bearing assumptions, Cheapest Test/Kill Criterion, Capability Health Check, Research-vs-Action-Grenze.
- Nicht übernommen: Installationslogik, Tool-Registries, automatische Enrichment-/Outreach-Tools, Multi-Channel-Automation, fremde Textbausteine oder Skill-Dateien.

## Tradeoffs

- Das explizit verlangte flache `*.skill.md`-Format wurde gegenüber installierbarem Agent-Skill-Scaffolding mit YAML-Frontmatter priorisiert.
- Wiederholte harte Guardrails in allen sechs Dateien kosten etwas Text, machen die Sicherheitsgrenze aber unabhängig von Aufrufreihenfolge sichtbar.
- O2 wird nicht historisch zurückgedreht: Die aktuelle Mail hat den dokumentierten Code-/Test-Gate bestanden; der Gate-Mechanismus bleibt für jede Claim-Änderung hart aktiv.

## Durable memory

- Die sichere Kette lautet: Product Context → Lead Research → Operational Fit → Claim Red Team → Readiness → First Contact Draft → Readiness → Human Send.
- Ein Score darf nie ein evidenzbasiertes Hard Gate kompensieren.
- Source of Truth für einen Workflow-Vertrag ist nicht automatisch Source of Truth für Produktfakten.

## Do not reuse blindly

- Code-/Test-Evidenz bestätigt keine deployte Runtime.
- Öffentliche Betriebssignale bestätigen keinen internen Pain Point.
- Die O2-Claim-Tabelle ist an ihren Prüfstand gebunden und muss nach relevanten Produktänderungen neu geprüft werden.

## Next logic gate

Einen realen Lead mit öffentlichen Quellen durch die Kette führen, dabei alle Zwischenoutputs konservieren und vor jeder externen Handlung stoppen.
