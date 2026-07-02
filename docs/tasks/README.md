# Task Workplans

Repo-local task workplans live here when they are not yet implementation
slices. Treat these files as re-entry and planning surfaces, not as proof that
the described code findings are already verified or fixed.

## Active Workplans

| Workplan | Source | Status | Next gate |
| --- | --- | --- | --- |
| [Cockpit Audit Workplan](./cockpit-audit-workplan.md) | `/home/baum/Downloads/WORKPLAN_cockpit_audit.md` imported on 2026-06-04 | `OPEN` | Pick one WP item, re-read affected files, verify the finding locally, then implement and validate that single slice. |

## Handling Rules

- Keep each WP item scoped to one implementation slice unless local evidence
  proves a tighter dependency.
- Before marking an item `[DONE]`, verify the code finding, run the listed
  validation commands where possible, and update the workplan status with local
  evidence.
- Do not treat audit text as canonical implementation truth until the affected
  repo files have been re-read in the current task.
