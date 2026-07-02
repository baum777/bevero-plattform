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

---

## Autoritätsquelle

→ [`IDENTITY.md`](IDENTITY.md) — Existenzgrund und Leitprinzipien
→ [`governance/rules.md`](governance/rules.md) — Betriebsregeln
