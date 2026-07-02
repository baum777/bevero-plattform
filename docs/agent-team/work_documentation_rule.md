# Work Documentation Rule

Status: proposed fixed repo rule  
Scope: all repo work, including docs-only, implementation, bugfixes, refactors, CI, database, deployment, and governance changes

## Rule

Every non-trivial work step in this repository is a **work slice** and must leave two durable records:

1. **Code Change Context** — what changed in the repo, why that change was needed, which files were touched, which commands were run, and how the result was validated.
2. **Intent Memory Log** — which product, architecture, governance, or operating logic the work followed; what idea was preserved; what should be remembered for later work.

A work slice is not complete until both records exist or are explicitly marked `not_applicable` with a reason.

## Where to write records

| Record | Path | Purpose |
|---|---|---|
| Code Change Context | `docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md` | Execution evidence: scope, files read, files changed, commands, validation, review verdict. |
| Intent Memory Log | `docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md` | Design memory: intention, logic followed, decisions, tradeoffs, durable learnings. |
| Durable distilled memory | `docs/agent-team/agent_memory.md` | Reviewer-curated long-lived facts promoted from MSPR and intent entries. |

## Minimum required content

### 1. Code Change Context

Each work slice must record:

- request/context that triggered the slice
- scope and paths in/out of scope
- files read
- files changed
- commands run
- validation result
- risks and review verdict
- next gate

Use `docs/agent-team/mspr_logbook.md` and `docs/agent-team/mspr_schema.json` as the canonical structure.

### 2. Intent Memory Log

Each work slice must separately record:

- core intention of the slice
- product or architecture logic followed
- assumptions made
- tradeoffs accepted
- logic that should be reused later
- logic that must **not** be reused blindly
- relationship to Bevero / Rauschenberger OS / location / role / approval model where relevant

This entry is not a dump of implementation details. It explains the **why** behind the work.

## Stop condition

A Builder, coding agent, or human contributor must stop before final delivery if:

- files were changed but no MSPR entry was created,
- product/architecture logic changed but no Intent Memory Log was created,
- validation was performed but not recorded,
- a work slice touches `apps/`, `src/`, `prisma/`, `.github/`, `.env*`, deployment, auth, or governance files without explicit scope and review status.

## Exception for tiny edits

Tiny edits may use a compact entry, but not zero documentation.

Tiny edits include:

- typo fixes
- formatting-only Markdown cleanup
- broken internal link fix
- comment-only clarification

Minimum compact record:

```md
- date:
- slice:
- filesChanged:
- changeType: tiny_edit
- reason:
- validation:
- intentMemory: no durable logic change | see intent_logbook/<entry>.md
```

## What must never be logged

- secrets, API keys, service-role credentials, OAuth tokens
- customer data or personally identifiable information
- raw database exports
- `.env*` contents
- unverifiable claims stated as facts

## Reviewer rule

The Reviewer cannot mark a slice as `pass` unless the final answer or PR description names:

- the MSPR entry path
- the Intent Memory Log path
- the validation evidence
- any unresolved risk or next gate

## Local and CI validation

The rule can be checked locally at any time:

```bash
npm run check:work-docs
```

In CI (GitHub Actions), the workflow `.github/workflows/work-documentation.yml` runs automatically on every PR targeting `main`. It compares changed files against the base branch and fails if:

- No MSPR entry exists under `docs/agent-team/mspr_logbook/`.
- No Intent Memory entry exists under `docs/agent-team/intent_logbook/`.
- A documentation entry contains an obvious secret pattern (production credentials, private keys, API tokens).

The check is intentionally lightweight — it verifies presence, not completeness. Quality review is still the Reviewer's responsibility.

## Commit / PR convention

A PR or implementation commit should reference both records:

```txt
Docs:
- MSPR: docs/agent-team/mspr_logbook/YYYY-MM-DD-<slug>.md
- Intent: docs/agent-team/intent_logbook/YYYY-MM-DD-<slug>.md
```
