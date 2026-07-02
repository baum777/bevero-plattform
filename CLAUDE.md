# CLAUDE — Operating Guide for Claude Code

This guide gives Claude Code clear operating instructions for this repository. Read it at the start of every session.

---

## Start-of-work checklist

Before any non-trivial work, read:

1. `README.md` — repo structure, apps, deployment, governance overview
2. `AGENTS.md` — agent roles, hard limits, work-slice documentation rule
3. `docs/agent-team/work_documentation_rule.md` — mandatory two-track documentation
4. `context/` — current-state and priorities files if present

---

## Large-folder rule

Do **not** scan `apps/` globally. The folder is large and contains three deployed applications.

- Use targeted `Read` calls with known paths.
- Use `grep`/`rg` with specific patterns and path prefixes.
- Use path-specific inspection only (`apps/api/src/modules/X/`, not `apps/`).

---

## Work-slice rule

Every non-trivial work step requires two documentation records before it is complete:

| Track | Location |
|---|---|
| Code Change Context | `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md` |
| Intent Memory Log | `docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md` |

Use the templates in `docs/agent-team/templates/`.  
A work slice may only be `pass` if both records exist or one is explicitly `not_applicable` with a reason.

---

## Completion rule

Do not report a result as `pass` unless:

- Validation was performed and recorded.
- Code Change Context entry exists.
- Intent Memory Log entry exists (or is `not_applicable`).
- Unresolved risks are named.

---

## Safety rule

Never expose, log, or include in any output:

- Secrets, API keys, service-role credentials, OAuth tokens
- `.env*` file contents
- Raw customer data or PII
- Production database exports or connection strings with credentials
- Private keys or signing secrets

If a file path suggests sensitive content (`.env`, `secrets/`, `credentials`), do not read it unless explicitly instructed.

---

## Output style

Final responses must include:

- **Result:** `pass` | `partial` | `blocked`
- **Files changed:** list with paths
- **Validation:** what was run and what passed/failed
- **Risks:** any unresolved issues
- **Next step:** what comes after this work slice

---

## Local validation

Run the work-documentation check before considering a slice complete:

```bash
npm run check:work-docs
```

This verifies that MSPR and Intent Memory entries exist and contain no obvious secret patterns. It does not replace quality review.

---

## Autonomy levels (from IDENTITY.md)

| Level | Name | Requires |
|---|---|---|
| L0 | Free | Nothing — proceed immediately |
| L1 | Review | Self-review before delivery |
| L2 | Evidence | Reviewer + evidence artefact |
| L3 | Freigabe | Explicit operator approval |
| L4 | Blocked | Multi-step approval, always |

Documentation-only changes are typically L1. App code, database migrations, and governance changes are L2–L4.
