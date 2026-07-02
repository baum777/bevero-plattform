# OS Skill Architecture Auditor (Rauschenberger-native)

A meta-skill that audits the Rauschenberger OS monorepo and installs a 7-skill system as executable commands, with a `logs/audit-log.md` audit-trail addon. Rauschenberger-native adaptation of the Mavis skill-architecture-auditor pattern — same logic and architecture, integrated with existing Rauschenberger governance (L0–L4, `governance/evidence-contract.md`, `logs/audit-log.md`).

## Files

```
tools/skill-architecture-auditor/
├── SKILL.md                       # The skill itself (drop into .claude/skills/ or invoke as slash command)
├── README.md                      # This file
├── scripts/
│   └── ros-run-id.py              # Python helper to mint ROS-RUN identifiers
└── templates/
    └── audit-entry.md             # Append-only template for logs/audit-log.md (evidence-contract conformant)
```

## Quick start

1. Read [`SKILL.md`](./SKILL.md) — it is the contract.
2. (Optional) Wire `scripts/ros-run-id.py` into your pre-commit hook or runtime to mint `ROS-RUN-…` IDs for new audit entries.
3. Use `templates/audit-entry.md` as the template when appending to `logs/audit-log.md` (the existing Rauschenberger audit trail — not a new `memory.md`).
4. Trigger the skill with: `/os-skill-architecture-auditor` or any of the trigger phrases listed in `SKILL.md`.

## What it produces

- A `Repo Profile` of the Rauschenberger OS monorepo.
- A 7-row compatibility matrix (one per OS-aligned skill).
- A list of installed skills with paths.
- A `logs/audit-log.md` hook status (installed / manual / missing).
- A blocker list.
- Human-verifiable next actions.

## ROS-RUN format

```
ROS-RUN-{YYYYMMDD}-{HHMMSS}-{6char_hash}
```

- Generated per run, never reused.
- Linked from each `logs/audit-log.md` entry.
- Carries an optional parent `ROS-RUN-…` for follow-up runs.

Mirrors the Mavis MSPR scheme, adapted to Rauschenberger OS naming (Rauschenberger OS Run Identifier).

## Audit-log contract

Every repo-modifying action appends an entry to `logs/audit-log.md` using the schema defined in [`governance/evidence-contract.md`](../../../governance/evidence-contract.md). Pure reads and inspection never log. See `SKILL.md` → Addon A for the full schema and `templates/audit-entry.md` for the template.

**Append-only** — never overwrite prior entries. This conforms to `AGENTS.md` boundary ("Kein Agent editiert bestehende Audit-Logs (nur Append erlaubt)").

## Governance binding

- **Authority:** [`IDENTITY.md`](../../../IDENTITY.md) (L4)
- **Operator role:** `@auditor` per [`AGENTS.md`](../../../AGENTS.md) — L2 max
- **Conventions:** [`governance/rules.md`](../../../governance/rules.md), [`governance/evidence-contract.md`](../../../governance/evidence-contract.md), [`governance/approval-matrix.md`](../../../governance/approval-matrix.md)
- **Workflow:** [`workflows/standard.md`](../../../workflows/standard.md)

## The 7 OS-aligned skills

| # | Skill | Risk | Write target |
|---:|---|:-:|---|
| 1 | `os-health-auditor` | L2 | `governance/`, `logs/evidence/` |
| 2 | `workspace-cleanup-guardian` | L2 | `apps/`, root `package.json` |
| 3 | `os-docs-maintainer` | L2 | `docs/` |
| 4 | `system-map-updater` | L3 | `OS.md` (operator sign-off required) |
| 5 | `daily-review-loop` | L1 | `context/` |
| 6 | `commitment-runner` | L1/L2 | `workflows/`, `logs/evidence/` |
| 7 | `evidence-packager` | L1 | `logs/evidence/` |

## Source

Adapted from the Mavis `skill-architecture-auditor` package (SKILL.md, mspr-generator.py, memory-entry.md, README.md) with Rauschenberger-native substitutions:

- MSPR → ROS-RUN
- `memory.md` → `logs/audit-log.md` (existing Rauschenberger audit trail)
- Mavis 7-skill set → Rauschenberger OS 7-skill set (mapped to existing agent roles + OS pillars)
- Mavis v3 agent → `@auditor` role (rauschenberger-os AGENTS.md)
- Foreign branding removed; OS-internal naming only
