# Intent Memory — Repo Work Documentation Rule

- id: 2026-06-20-repo-work-documentation-rule
- timestamp: 2026-06-20T00:00:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-repo-work-documentation-rule.md`
- status: reviewed

## Core intention

Establish a permanent, enforceable norm that every non-trivial work step in this repo produces two separate durable records: one for implementation evidence and one for design/product/governance intention. The two tracks must never collapse into one.

## Logic followed

The existing MSPR system captured what agents did but not why in a durable, reusable way. Product intent, architecture decisions, and governance reasoning were either buried in MSPR progress fields or not written at all. This rule separates the two concerns so that:

- Code Change Context becomes the execution trail (auditable, time-bounded).
- Intent Memory Log becomes the reasoning trail (durable, forward-looking).

## Design assumptions

- Agents and human contributors will follow conventions without CI enforcement if the rule is clearly stated in AGENTS.md and CLAUDE.md.
- The intent logbook does not need its own schema enforced by CI at this stage; Markdown convention is sufficient.
- Templates reduce friction enough that contributors will use them rather than writing freeform.

## Tradeoffs

- Accepted:
  - Two files per slice adds overhead for tiny edits (mitigated by the compact-entry exception in the rule).
  - No CI enforcement at this stage — convention over automation for now.
- Rejected:
  - Merging intent into MSPR entries: intentionally rejected because intent stays relevant longer than code-change detail, and mixing them makes distillation harder.
  - A runtime database or vector store for intent memory: out of scope for this repo's current architecture.

## Durable memory

- The repo now has two parallel logbook tracks. New slices should produce both or explicitly mark one `not_applicable`.
- CLAUDE.md is the Claude Code-specific entry point — it must stay up to date as conventions evolve.
- The `apps/` no-scan rule is governance, not preference — it protects against accidental large reads in an agent context.

## Do not reuse blindly

- The compact-entry exception (tiny_edit) must not become the default. It is for genuinely trivial changes only.
- Intent entries should not duplicate MSPR progress detail — they explain reasoning, not actions.

## Relation to Rauschenberger OS / Bevero

- location logic: repo-wide; affects all contributors and agents working across apps, docs, and governance.
- role/approval logic: L1 (docs-only); this rule itself does not change any approval gate.
- inventory/procurement/shift-planning logic: not directly affected; but future work in those domains must follow this rule.
- external-system boundary: no external systems involved in this slice.

## Next logic gate

Should a CI or pre-commit check verify that PRs with non-trivial file changes include MSPR + intent entry paths in the PR description or commit message? That would make the convention machine-enforceable rather than cultural.
