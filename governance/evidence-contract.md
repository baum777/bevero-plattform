# Evidence Contract — Rauschenberger OS

Autorität: [`IDENTITY.md`](../IDENTITY.md)

Jede Aktion ab L2 erzeugt ein Evidence-Artefakt.
Ein Artefakt ohne diese Felder ist ungültig.

---

## Pflichtfelder

```markdown
---
date: YYYY-MM-DD
action: [Kurzbeschreibung der Aktion]
risk_level: L2 | L3 | L4
author: [Name oder Agent-Rolle]
reviewer: [Name oder "self" bei L1]
operator_approval: [Name + Timestamp | "n/a" bei L0/L1]
status: draft | approved | executed | rolled_back
rollback: [Rollback-Verfahren | "n/a" bei reversiblen Aktionen]
---
```

---

## Ablageort

| Stufe | Ablage |
|---|---|
| L0/L1 | Kein Artefakt erforderlich |
| L2 | `logs/evidence/YYYY-MM-DD-[slug].md` |
| L3/L4 | `logs/evidence/YYYY-MM-DD-[slug].md` + Operator-Freigabe als Anhang |

---

## Audit-Eintrag

Jedes L2+-Artefakt bekommt nach Execution einen Eintrag in `logs/audit-log.md`:

```
YYYY-MM-DD | L2 | [Aktion] | [Author] | [Reviewer] | executed | [evidence-link]
```
