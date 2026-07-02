# logs/audit-log.md — Rauschenberger OS Audit Trail

This file is the append-only audit log for every repo-modifying action executed under the Rauschenberger OS, including actions performed by the 7-skill system. **Do not edit prior entries.** Always append at the bottom.

Conforms to: [`governance/evidence-contract.md`](../../../governance/evidence-contract.md) and [`governance/rules.md`](../../../governance/rules.md) rule 4 ("Audit ist nicht optional").

Rauschenberger-native adaptation of the Mavis `memory.md` template — same logic and architecture, integrated with the existing Rauschenberger audit trail. **No parallel `memory.md` is created.**

---

<!-- New entries below this line -->

## [YYYY-MM-DDTHH:MM:SSZ] — Short task title

- **ROS-RUN:** ROS-RUN-YYYYMMDD-HHMMSS-xxxxxx
- **Session:** root:<session_id> | branch:<session_label>
- **Task:** <one-line description of the repo change>
- **Triggered by:** /<skill-name> | <user prompt>
- **Files touched:**
  - `path/to/file.ext` — created
  - `path/to/file.ext` — modified
  - `path/to/file.ext` — deleted
- **Run context:**
  - Branch: <branch>
  - Commit: <short sha>
  - Agent: @<role> (rauschenberger-os) | Mavis v3
  - Host: <Claude Code | Cursor | other>
  - Risk: L0 | L1 | L2 | L3 | L4 (per IDENTITY.md)
  - Reviewer: @reviewer | "self" (L1)
  - Operator approval: <name + timestamp | "n/a" (L0/L1) | "pending" (L2+)>
- **Validation:** <lint | type-check | test | smoke | governance-check>
- **Evidence:** logs/evidence/YYYY-MM-DD-<slug>.md (L2+; "n/a" at L0/L1)
- **Status:** draft | approved | executed | rolled_back (per evidence-contract.md)
- **Rollback:** <rollback procedure | "n/a" for reversible actions>
- **Notes:** <follow-ups, risks, open questions>
- **Parent ROS-RUN:** ROS-RUN-... (if this is a follow-up run)
