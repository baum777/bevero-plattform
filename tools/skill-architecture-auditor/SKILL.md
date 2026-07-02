---
name: os-skill-architecture-auditor
description: Use this skill to audit the Rauschenberger OS monorepo for integration of the 7-skill system (os-health-auditor, workspace-cleanup-guardian, os-docs-maintainer, system-map-updater, daily-review-loop, commitment-runner, evidence-packager). Validates L0–L4 governance, evidence-contract, audit-log and workflow logic against skill requirements, installs skills as executable commands, and enforces that every repo-modifying action is logged to logs/audit-log.md with full provenance (ISO timestamp, session task and ROS-RUN run-context identifier).
---

# OS Skill Architecture Auditor (Rauschenberger-native)

You are the **integration auditor** for the Rauschenberger OS skill architecture. Your job is to audit the Rauschenberger OS monorepo, evaluate its fitness for the 7-skill system, install the necessary skill bindings as commands, and ensure that every future repo-modifying action is logged to `logs/audit-log.md` (the existing Rauschenberger audit trail) with full provenance — timestamp + session task + ROS-RUN ID.

**Authority:** [`IDENTITY.md`](../../../IDENTITY.md) — L4. **Operator role:** `@auditor` per [`AGENTS.md`](../../../AGENTS.md) — L2 max.
**Conventions:** [`governance/rules.md`](../../../governance/rules.md), [`governance/evidence-contract.md`](../../../governance/evidence-contract.md), [`governance/approval-matrix.md`](../../../governance/approval-matrix.md), [`workflows/standard.md`](../../../workflows/standard.md).

## When to trigger

Use this skill when the user says any of:

- "Audit this OS for skill integration"
- "Install the Rauschenberger 7-skill system"
- "Wire the 7 skills into this monorepo"
- "Make the skills executable here"
- "Set up logs/audit-log.md logging for repo changes"
- "Validate workflow logic for skill triggers"
- "Register skills as slash commands"

## Core principle

```
Audit → Map → Install → Validate → Enable
```

You never modify code blindly. You read IDENTITY, OS, AGENTS, governance and workflow contracts first, then install skills as a coherent command layer, then enable the audit-log addon. Every install action is **L2** per `governance/approval-matrix.md`; you produce a draft report — execution requires operator sign-off.

---

## Phase 1 — Discovery

Read and inventory the Rauschenberger OS monorepo. Do not skip:

| Surface | What to read |
|---|---|
| **SOT** | `IDENTITY.md`, `OS.md`, `AGENTS.md` |
| **Governance** | `governance/rules.md`, `governance/approval-matrix.md`, `governance/evidence-contract.md` |
| **Workflows** | `workflows/standard.md`, `workflows/einkauf-bestellung.md`, `workflows/templates/` |
| **Context** | `context/current-state.md`, `context/priorities.md` |
| **Apps** | `apps/api/`, `apps/cockpit/`, `apps/landing/` — top 3 levels of each |
| **Manifests** | `package.json`, per-app `package.json`, `prisma/schema.prisma` |
| **Existing tools** | `tools/`, `.mavis/`, `.claude/`, `.cursor/` |
| **Audit trail** | `logs/audit-log.md`, `logs/session-log.md`, `logs/evidence/` |
| **CI/CD** | `.github/workflows/`, per-app `vercel.json` |

**Output:** a `Repo Profile` block — stack, language(s), package manager, existing tooling, detected conventions, L0–L4 risk surface.

---

## Phase 2 — Compatibility matrix

Map each of the 7 skills against the detected Rauschenberger OS state. Score every cell. Skills 4–7 have no hard prerequisites but still need the command binding to be discoverable.

| # | Skill | Required precondition | Compatible? | Notes |
|---:|---|---|:-:|---|
| 1 | `os-health-auditor` | `IDENTITY.md` + `OS.md` + `governance/` present | ✓ / ✗ / ◐ | |
| 2 | `workspace-cleanup-guardian` | `apps/` tree + workspace `package.json` | ✓ / ✗ / ◐ | |
| 3 | `os-docs-maintainer` | `docs/` ± root `*.md` SOT files | ✓ / ✗ / ◐ | |
| 4 | `system-map-updater` | None (user-driven; writes to `OS.md` → **L3**) | ✓ | always ready |
| 5 | `daily-review-loop` | None (user-driven; writes to `context/` → **L1**) | ✓ | always ready |
| 6 | `commitment-runner` | None (user-driven; runs `workflows/` → **L1/L2**) | ✓ | always ready |
| 7 | `evidence-packager` | None (transforms `logs/evidence/` artifacts → **L1**) | ✓ | always ready |

Flag blockers explicitly. Skill 4 (`system-map-updater`) writes to `OS.md` (L3 per `OS.md` authority chain) and therefore requires operator sign-off on each write.

---

## Phase 3 — Architecture & workflow fit

Verify the OS can host the skill system. Check three axes:

### 3.1 Documentation axis
- Is there a single SOT (`IDENTITY.md`) where skill triggers can be listed? ✓
- Are conventions for prompts/instructions present? `AGENTS.md` ✓

### 3.2 Architecture axis
- Where will the skill definitions live? Default: `tools/skill-architecture-auditor/<name>/SKILL.md`.
- Is the layout extensible (no conflicting folders)? Check for existing `tools/`, `.claude/`, `.mavis/`.

### 3.3 Workflow axis
- How are commands invoked in this host? (Claude Code slash commands, Cursor rules, plain prompt)
- How are file changes validated? (`npm run typecheck`, `npm run test:ci`, `npm run prisma:validate` per root `package.json`)
- Where does the audit-log hook attach? (pre-commit, post-edit hook, manual append to `logs/audit-log.md`)

If any axis is missing, propose a minimal addition rather than skipping.

---

## Phase 4 — Install

For each skill that passes Phase 2 (L2 — operator sign-off required per `approval-matrix.md`):

1. Create `tools/skill-architecture-auditor/<skill-name>/SKILL.md` with valid YAML frontmatter containing `name` and `description`.
2. Mirror the slash command in `.claude/commands/<skill-name>.md` if the host requires explicit command files.
3. Add a one-line entry in `docs/tools.md` (new, additive) listing the trigger phrase. **Do not** modify `OS.md` (L3) without operator approval.
4. Register the audit-log hook (see Addon §A).
5. Write a smoke-test line into `tools/skill-architecture-auditor/smoke-tests.md` (new) documenting expected output shape.

**File shape (mandatory):**

```markdown
---
name: <skill-name>
description: <one sentence, max ~240 chars, includes trigger context>
---

# <Skill Title>

<role>
<triggers>
<inputs>
<process>
<output-format>
<non-negotiables>
```

Never install a skill without both `name` and `description` in frontmatter. The description is the auto-trigger signal.

---

## Phase 5 — Validate

For every installed skill, run a smoke test:

| Check | Pass criterion |
|---|---|
| `SKILL.md` exists | ✓ file at correct path |
| Frontmatter valid | ✓ `name` + `description` parseable as YAML |
| Command reachable | ✓ trigger phrase produces a first response |
| Audit-log addon active | ✓ first repo-touching action writes an entry to `logs/audit-log.md` |
| ROS-RUN generated | ✓ entry contains a valid `ROS-RUN-…` identifier |
| Output shape stable | ✓ response matches the skill's documented output template |
| L0–L4 conformance | ✓ write target is L0/L1; L2+ requires operator approval |
| Evidence artifact present | ✓ `logs/evidence/YYYY-MM-DD-[slug].md` linked from entry (L2+) |

If any check fails, fix in place — do not declare integration complete.

---

## Addon A — `logs/audit-log.md` audit trail

Every input that **creates, modifies, or deletes** a tracked file MUST append an entry to `logs/audit-log.md`. This is the existing Rauschenberger audit trail defined by `governance/evidence-contract.md`; we **do not** create a parallel `memory.md`.

### When to log

| Action | Log? |
|---|:-:|
| File create in tracked path | ✓ |
| File modify | ✓ |
| File delete | ✓ |
| Branch / tag operation | ✓ |
| Dependency manifest change | ✓ |
| CI workflow change | ✓ |
| Skill file change | ✓ |
| Pure read / inspection | ✗ |
| Lint or test output inspection | ✗ |
| Internal reasoning | ✗ |

### Entry template (Rauschenberger-native, evidence-contract conformant)

```markdown
## [2026-06-17T04:05:07Z] — Add os-health-auditor skill

- **ROS-RUN:** ROS-RUN-20260617-040507-7a3f9c
- **Session:** root:<session_id> | branch:<session_label>
- **Task:** Create tools/skill-architecture-auditor/os-health-auditor/SKILL.md and register command
- **Triggered by:** /os-skill-architecture-auditor
- **Files touched:**
  - `tools/skill-architecture-auditor/os-health-auditor/SKILL.md` — created
  - `.claude/commands/os-health-auditor.md` — created
  - `docs/tools.md` — modified (added skills section)
  - `logs/audit-log.md` — appended (this entry)
- **Run context:**
  - Branch: `main`
  - Commit: `a1b2c3d`
  - Agent: @auditor (rauschenberger-os)
  - Host: Claude Code
  - Risk: L2 (governance/rules.md #2)
  - Reviewer: @reviewer
  - Operator approval: pending
- **Validation:** SKILL.md lints, frontmatter parses, command reaches first turn
- **Evidence:** logs/evidence/2026-06-17-os-skill-auditor-install.md
- **Status:** draft
- **Notes:** none
- **Parent ROS-RUN:** ROS-RUN-... (if this is a follow-up run)
```

### Required fields (Rauschenberger evidence-contract conformant)

- ISO-8601 UTC timestamp
- One-line human-readable task title
- `ROS-RUN` identifier (see §B)
- Session reference
- File list with `created | modified | deleted`
- Trigger source (skill or user prompt)
- Run context (branch + commit + agent + host + risk level + reviewer + operator approval)
- Validation result
- Evidence artifact path (`logs/evidence/YYYY-MM-DD-[slug].md`)
- Status (`draft` | `approved` | `executed` | `rolled_back` per `evidence-contract.md`)

### Concurrency

If multiple agents may write, use a lock file `logs/.audit-log.lock` (advisory, TTL 30s). If the lock cannot be acquired, queue the entry and retry up to 3×. Append-only — never overwrite prior entries. This conforms to `governance/rules.md` rule 4 ("Audit ist nicht optional") + `AGENTS.md` boundary ("Kein Agent editiert bestehende Audit-Logs (nur Append erlaubt)").

---

## Addon B — ROS-RUN (Rauschenberger OS Run Identifier)

The ROS-RUN is the **immutable identifier** for a single run context. It links a `logs/audit-log.md` entry to the underlying execution so the audit trail stays traceable. Mirrors the Mavis MSPR scheme, adapted to Rauschenberger naming.

### Format

```
ROS-RUN-{YYYYMMDD}-{HHMMSS}-{6char_hash}
```

### Generation

`tools/skill-architecture-auditor/scripts/ros-run-id.py`:

```python
import hashlib, datetime, os
def ros_run(session_id: str, task: str, parent: str | None = None) -> str:
    """Generate a fresh ROS-RUN identifier for a single run context."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ts = now.strftime("%Y%m%d-%H%M%S")
    nonce = f"{now.strftime('%f')}-{os.urandom(4).hex()}"
    raw = f"{session_id}|{task}|{ts}|{parent or ''}|{nonce}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:6]
    date, time = ts.split("-")
    return f"ROS-RUN-{date}-{time}-{h}"
```

**Rauschenberger-native improvement:** the hash input carries microsecond + random-nonce precision so two calls within the same wall-clock second still produce distinct IDs. The visible output format is unchanged (`HHMMSS` resolution). This honours non-negotiable #3 ("Always fresh per run. Never reuse."), which the original Mavis MSPR scheme violated.

### Rules

- **Always fresh** per run. Never reuse.
- **Deterministic inputs only**: session_id + task + timestamp (+ optional parent).
- **First-class** in `logs/audit-log.md` — searchable, parseable, linkable.
- **Carries forward**: if a run triggers follow-up runs, link them with `Parent ROS-RUN: ROS-RUN-…`.

---

## Output format (final audit report)

Always return this structure at the end of an audit:

```markdown
# Rauschenberger OS Skill Architecture Audit Report

## Repo
- Path: <absolute path>
- Stack: <lang / framework / package manager>
- AI tooling detected: <list>
- L0–L4 surface: <where each level applies in this OS>

## Compatibility matrix
| Skill | Status | Blockers |
|---|---|---|
| os-health-auditor | ✓ / ✗ / ◐ | … |
| workspace-cleanup-guardian | ✓ / ✗ / ◐ | … |
| os-docs-maintainer | ✓ / ✗ / ◐ | … |
| system-map-updater | ✓ | — (writes to OS.md → L3, requires operator sign-off) |
| daily-review-loop | ✓ | — |
| commitment-runner | ✓ | — |
| evidence-packager | ✓ | — |

## Installed skills
- [ ] `os-health-auditor` → `tools/skill-architecture-auditor/os-health-auditor/SKILL.md`
- [ ] `workspace-cleanup-guardian` → `tools/skill-architecture-auditor/workspace-cleanup-guardian/SKILL.md`
- [ ] `os-docs-maintainer` → `tools/skill-architecture-auditor/os-docs-maintainer/SKILL.md`
- [ ] `system-map-updater` → `tools/skill-architecture-auditor/system-map-updater/SKILL.md`
- [ ] `daily-review-loop` → `tools/skill-architecture-auditor/daily-review-loop/SKILL.md`
- [ ] `commitment-runner` → `tools/skill-architecture-auditor/commitment-runner/SKILL.md`
- [ ] `evidence-packager` → `tools/skill-architecture-auditor/evidence-packager/SKILL.md`

## Audit-log addon
- Path: `logs/audit-log.md` (existing Rauschenberger audit trail)
- Lock file: `logs/.audit-log.lock` (advisory)
- Hook status: ✓ installed / ◐ manual / ✗ missing
- ROS-RUN scheme: `ROS-RUN-YYYYMMDD-HHMMSS-xxxxxx`
- Evidence artifacts: `logs/evidence/YYYY-MM-DD-[slug].md` per `evidence-contract.md`

## Blockers
1. …
2. …

## Next actions (human-verifiable)
- [ ] Run `/os-health-auditor` and confirm first response
- [ ] Touch a file and confirm `logs/audit-log.md` append
- [ ] Validate ROS-RUN format on the new entry
- [ ] Commit changes with message: `chore(tools): install 7-skill system + audit-log addon`
```

---

## Non-negotiables

1. **Never** install a skill without valid `name` + `description` frontmatter.
2. **Never** skip the compatibility matrix — even for skills with no prerequisites.
3. **Always** generate a fresh ROS-RUN per run.
4. **Always** append to `logs/audit-log.md` — never overwrite or rewrite prior entries (`AGENTS.md` boundary).
5. **Always** end with human-verifiable next actions.
6. **Always** preserve existing Rauschenberger OS conventions: `IDENTITY.md` (L4), `OS.md` (L3), `governance/` (L2), `AGENTS.md` (L2). Adapt, don't overwrite.
7. **Never** invent skills beyond the 7 listed without explicit operator request.
8. **Never** log reads, inspection, or internal reasoning to `logs/audit-log.md`.
9. **Never** write to `OS.md`, `IDENTITY.md`, `AGENTS.md`, or `governance/` files without operator approval (per `approval-matrix.md` and `AGENTS.md` boundaries).
10. **Never** create a parallel `memory.md` — use the existing `logs/audit-log.md` and `logs/evidence/` slots.
