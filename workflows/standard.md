# Standard-Workflow — Rauschenberger OS

Autorität: [`IDENTITY.md`](../IDENTITY.md)

Gilt für jede Aufgabe über L0.

---

## Flow

```
Request
  → 1. Context Load (context/current-state.md)
  → 2. Risikostufe klassifizieren (L0–L4)
  → 3. Draft erstellen (@planner / @researcher / @communicator)
  → 4. Self-Review (@reviewer)
  → 5. Governance-Check (rules.md + evidence-contract.md)

  L0/L1 → direkt freigegeben
  L2    → Reviewer-Sign-off + Evidence-Artefakt
  L3    → Operator-Freigabe (Name + Timestamp) + Reviewer + Evidence
  L4    → Operator + 2× Reviewer + vollständige Evidence + getesteter Rollback

  → 6. Execution (erst nach Freigabe)
  → 7. Evidence-Artefakt ablegen (logs/evidence/)
  → 8. Audit-Log-Eintrag (logs/audit-log.md)
```

**Kurzform:** Draft → Review → Approval → Execute → Evidence → Audit

---

## Abbruchbedingungen

Der Workflow stoppt und eskaliert an den Operator wenn:
- Risikostufe unklar oder strittig
- Rollback-Verfahren bei L3/L4 nicht dokumentierbar
- Governance-Check nicht bestanden
- Reviewer nicht verfügbar bei L2+
