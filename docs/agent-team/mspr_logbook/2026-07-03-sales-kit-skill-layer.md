# MSPR Entry — Bevero Sales Kit Skill Layer (P1.1a)

- id: sales-kit-skill-layer-20260703
- timestamp: 2026-07-03
- runId: baum-os-session-2026-07-03-p1-1a
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - `docs/sales-kit/skills/*.skill.md` (sechs beauftragte Dateien)
  - `docs/sales-kit/sales-kit-index.md`
  - dieses MSPR und verknüpftes Intent Memory
- pathsOutOfScope:
  - Apps, Runtime, DB, Deploy, Versand, CRM, LinkedIn-Automation, externe Writes
  - bestehende Sales-Kit-Widersprüche W1–W5
- autonomyTier: 1

## Code Change Context

- Trigger/request: Drei öffentliche Referenz-Repos auf relevante Muster prüfen und daraus sechs eigene, manual-first Bevero-Sales-Kit-Skills ableiten; keine Fremdskills installieren oder kopieren.
- Owner surface: `projects/bevero-plattform/docs/sales-kit/`.
- Reuse decision: repo-local acceptable. Die Skills sind Bevero-spezifische Sales-Dokumente ohne wiederverwendbare Runtime-/Governance-Implementierung; Shared-Core-Änderung ist nicht erforderlich.
- Files read:
  - Repo: `AGENTS.md`, `README.md`, `docs/agent-team/work_documentation_rule.md`
  - Sales Kit: alle Dateien unter `docs/sales-kit/`, vertieft `sales-kit-index.md`, `outreach-readiness.md`, `first-contact-final.md`, `pricing-pilot-decision.md`, `lead-steckbrief-template.md`, `pilot-conversation-guide.md`, `pilot-offer-light.md`, `pilot-onepager.md`, `objection-handling.md`, `sales-positioning.md`, `workflow-audit-template.md`
  - Referenzmuster (read-only, öffentliche Primärquellen): `coreyhaines31/marketingskills`, `phuryn/pm-skills`, `Panniantong/Agent-Reach`
- Files changed:
  - sechs neue Dateien unter `docs/sales-kit/skills/`
  - `docs/sales-kit/sales-kit-index.md`
  - dieses MSPR und `docs/agent-team/intent_logbook/2026-07-03-sales-kit-skill-layer.md`
- Commands run:
  - Repo-/Authority-/Dirty-State-Inspektion mit `pwd`, `git status`, `rg`, `find`, `sed`
  - Node-Strukturcheck für Dateizahl, exakte äußere Heading-Reihenfolge, Pflichtgrenzen, O2-Abdeckung und Index-Inventar
  - `rg`-Check auf trailing whitespace
  - `git diff --check`
  - `npm run check:work-docs`

## Validation

- Struktur-/Guardrail-Check: `pass` — sechs Skills, Pflichtstruktur, alle Pflichtgrenzen, O2 und Indexreferenzen vorhanden.
- Whitespace-Check: `pass`.
- `git diff --check`: `pass`.
- `npm run check:work-docs`: `pass (nothing to check)` — der Validator ignoriert den vollständig untracked `docs/sales-kit/`-Baum; Struktur-/Guardrail-Check und Whitespace-Check decken die neuen Dateien separat ab.
- Skill-Forward-Test: `partial` — keine Subagents gestartet, weil der Owner keine Delegation/Parallel-Agent-Arbeit beauftragt hat. Deterministische Dokument-Gates wurden stattdessen ausgeführt.

## Review

- status: partial
- risks:
  - Das gesamte `docs/sales-kit/` ist bereits untracked Vorarbeit; dieser Slice berührt nur die sieben beauftragten Sales-Kit-Pfade plus Pflichtlogs.
  - Bestehende Sales-Kit-Widersprüche W1–W4 bleiben laut `sales-kit-index.md` offen. Nach dem expliziten Block-Done-Kriterium erzwingt das den Gesamtstatus `partial`, obwohl die sechs neuen Skill-Dateien ihre Gates bestehen.
  - O2 war lokal bereits für die aktuelle Mail-Claim-Menge geschlossen. Der Skill Layer erhält O2 als dynamisches Hard Gate: Claim-Änderungen oder veraltete Belege öffnen es erneut.
  - Keine reale Lead-Durchführung in diesem Slice; Nutzungstest bleibt Next Gate.
- nextGate: Einen realen öffentlichen Lead manuell durch die sechs Skills führen; Mensch prüft und sendet.

## Linked intent entry

- `docs/agent-team/intent_logbook/2026-07-03-sales-kit-skill-layer.md`
