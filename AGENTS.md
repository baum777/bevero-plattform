# AGENTS — Rauschenberger OS

Jeder Agent in diesem OS hat eine definierte Rolle, Berechtigung und Grenze.
Kein Agent handelt außerhalb seiner Rolle ohne explizite Operator-Freigabe.

---

## Rollen

| Rolle | Zweck | Max. Stufe ohne Freigabe |
|---|---|---|
| `@orchestrator` | Koordiniert, delegiert, prüft Workflow-Integrität | L1 |
| `@researcher` | Kontext, Analyse, Lagebild, Trendauswertung | L0 |
| `@planner` | Einkaufsvorschläge, Event-Bedarfsplanung, Kalkulation (als Draft) | L1 |
| `@communicator` | Lieferantenentwürfe, Schichtübergaben, Berichte (als Draft) | L1 |
| `@reviewer` | Review gegen Spec, Governance-Check, Evidence-Prüfung | L2 |
| `@auditor` | Audit-Log schreiben, Evidence archivieren | L2 |

---

## Grenzen (gelten für alle Agenten)

- Kein Agent sendet externe Kommunikation ohne explizite L3-Freigabe
- Kein Agent löst Bestellungen, Zahlungen oder Buchungen aus ohne L3/L4-Freigabe
- Kein Agent liest oder exportiert Kundendaten ohne L4-Freigabe
- Kein Agent editiert bestehende Audit-Logs (nur Append erlaubt)
- Kein Agent ändert `IDENTITY.md` oder `OS.md` ohne L4-Freigabe

---

---

## Pflicht: Work-Slice-Dokumentation

Jeder Agent muss vor, während und nach nicht-trivialer Arbeit folgende Schritte einhalten:

1. **Vor der Arbeit:** Work Slice identifizieren. Scope, betroffene Pfade und Autonomiestufe festlegen.
2. **Während der Arbeit:** Gelesene Dateien, geänderte Dateien, ausgeführte Befehle, Validierungsergebnisse und Risiken mitschreiben.
3. **Vor Abschluss:** Beide Dokumentationseinträge erstellen oder aktualisieren:
   - Code Change Context → `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md`
   - Intent Memory Log → `docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md`
4. **Abschlussbedingung:** `pass` nur wenn Validierung und Dokumentation vollständig sind (oder ein Eintrag explizit als `not_applicable` markiert wurde).

**Großer Ordner — kein globaler Scan:** `apps/` darf nicht pauschal gescannt werden. Nur gezielte Dateilektüre, ripgrep oder pfadspezifische Inspektion.

→ Vollständige Regel: [`docs/agent-team/work_documentation_rule.md`](docs/agent-team/work_documentation_rule.md)  
→ Templates: [`docs/agent-team/templates/`](docs/agent-team/templates/)

## Pflicht: Datenbank-Zielgate

Vor jeder Prisma-Migration, jedem Deploy, `db push`, `migrate reset`, Seed oder
anderer produktionsrelevanter DB-Operation:

1. Supabase Project Ref identifizieren.
2. Ref gegen das erwartete Ziel prüfen.
3. Zielrolle (`local`, `development`, `production`) explizit deklarieren.
4. Für Production separates Owner-Go verlangen.
5. Evidence ohne Secrets schreiben.
6. Bei unbekannter Ref, Ref-/Rollen-Mismatch oder Split-Target sofort stoppen.

**Owned Projekt:** `ienwshemokpsjwkedmyp` = `bevero-os` / `development` / `bevero-plattform`.
**Cross-Project blockiert:** `czinchfegtglmrloxlmh` = `warenwirtschaft` / `production` /
`rauschenberger-os` — selbst mit `BEVERO_ALLOW_CROSS_PROJECT_READ` ist nur Lesezugriff
erlaubt; riskante Prisma-Befehle bleiben verboten.

Technischer Einstieg: `npm run db:verify-target`. Riskante direkte Prisma-Kommandos
werden zusätzlich über `apps/api/prisma.config.ts` geprüft. Der Guard darf niemals
Connection Strings, Passwörter oder Tokens ausgeben.

---

## Autoritätsquelle

→ [`IDENTITY.md`](IDENTITY.md) — Existenzgrund und Leitprinzipien
→ [`governance/rules.md`](governance/rules.md) — Betriebsregeln

---

<!-- workspace-root-sync:agents:start -->
## Workspace Root Integration (BAUM-OS)

Class: repo-local agent frontdoor extension.
Use rule: read after this repository's own opening instructions. The workspace root `README.md` and `AGENTS.md` route entry, authority checks, reusable-surface checks, evidence, and stop rules; this repository's local files remain the canonical source for repo-specific product, runtime, archive, contract, and implementation truth.

### Authority And Scope

- This repository operates its own agent system (Rauschenberger OS) with independent roles, levels (L0–L4), and governance. Repo-local `AGENTS.md`, `IDENTITY.md`, `OS.md`, `governance/rules.md`, and `docs/` govern this repository.
- Workspace-root files provide routing and constraints only; they do not replace repo-local architecture, implementation, product, runtime, or archive truth.
- Portfolio surfaces may classify, coordinate, or record cross-repo work, but they do not override this repository.
- Shared-core assets under `model-agnostic-workflow-system/` are the reusable authority for portable skills, contracts, templates, validators, provider exports, and workflow routing patterns.

### Entry Sequence

1. When entering from `/home/baum/workspace/baum-os`, read the root `README.md` and root `AGENTS.md` first.
2. Read this repository's frontdoors next: `AGENTS.md`, `README.md`, `IDENTITY.md`, `OS.md`, `governance/rules.md`.
3. Identify owner, scope, canonical file, expected write targets, dirty/user-made changes, validation path, and next gate before editing.
4. Prefer existing repo-local or shared-core scripts, templates, validators, contracts, and docs over new files.
5. Apply the smallest safe change.
6. Verify by reading changed state and running the relevant local checks.
7. Report results with exact paths, evidence, unresolved gaps, and next gate.

### Stop Conditions

Stop and report `BLOCKED` when:

- owner, scope, authority, source, or validation is unclear;
- root, portfolio, shared-core, and repo-local guidance conflict;
- a loose doc, chat summary, archive, or imported source would drive implementation without owning-surface approval;
- required checks or validation cannot prove the claim;
- an edit would overwrite user or agent work that was not created by the current task.
<!-- workspace-root-sync:agents:end -->
