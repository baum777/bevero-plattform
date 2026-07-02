# Agent Memory

Memory in the swarm is **deliberately small and durable**. The swarm has no vector DB and no embedding pipeline (this repo does not have one), so memory is plain Markdown under this directory, distilled by the Reviewer from MSPR entries.

## Three layers

### 1. Working memory (transient, per-run)

- Lives in the MSPR entry of the current run.
- Discarded when the run ends unless something is promoted to repo memory.
- Never written to disk as a long-lived artifact.

### 2. Repo memory (durable, this repo)

- Lives in this file (`agent_memory.md`).
- Reviewer-curated from MSPR entries and Intent Memory entries that scored `Evidence Quality >= 4`.
- Updated by appending a new dated section; never silently overwriting.
- Source-of-truth: every entry must cite the MSPR entry and/or Intent Memory entry it came from.

### 3. Semantic memory (optional, not implemented in this slice)

- Would require embeddings, a vector store, and a retrieval path.
- This repo has `.understand-anything/` (fingerprints + knowledge graph) and a CI smoke flow, but **no vector DB**.
- Per the Spec: "Nicht neu implementieren, wenn das Repo dafür keine Infrastruktur besitzt."
- A future ADR may opt in to a vector store (e.g. `pgvector` on Supabase). Until then, semantic memory is **out of scope**.

## Memory rules (always)

- Only long-lived findings. Throw-away task details stay in the MSPR entry; per-slice product/architecture intent stays in `intent_logbook/`.
- No secrets. No service-role keys. No PII. No customer data.
- No unverified guesses promoted to facts. Label claims as Observed / Inferred / Recommended / Applied / Verified (per `AGENTS.md` evidence language).
- Always include the source MSPR entry id and the file path it referenced.
- Memory **never** overrides scope or policy. If a memory item conflicts with `swarm_policy.md`, the policy wins and the memory item is re-classified.

## Distillation process

1. The Reviewer reads the final MSPR entry and the linked Intent Memory entry of a slice.
2. For each finding that scored `Evidence Quality >= 4` and is durable, the Reviewer appends a bullet under the matching section below.
3. If a finding contradicts a prior memory item, the older item is moved to "Superseded" with a link to the new one.
4. The Reviewer signs off the distillation by appending a `distilledFrom` line with the source MSPR entry id.

## Sections

### Repo conventions worth remembering

- `docs/agent-team/` is the swarm governance surface. Do not place runtime code or CI here.
- `AGENTS.md` and `docs/DECISIONS.md` are repo-local authority. Workspace-root files are routing only.
- `web/` is **frozen** (see `web/FROZEN.md`).
- The Cockpit is `apps/cockpit/`. The active backend is `src/` (Fastify + Prisma + Supabase).
- ADR numbering: `ADR-NNNN` in `docs/DECISIONS.md`. The first paragraph of each ADR states the active decision.
- The Cockpit has a `launch.json` under `.claude/` for Claude Code runs (`npm run dev:cockpit` on port 3000).
- Pre-commit hook is gitleaks only; lint/typecheck are not part of pre-commit.

### Operations

- Token scopes matter: a PAT without `workflow` cannot push to `.github/workflows/*` and the Contents API returns 403 for the same path. Workaround: extend token scope or apply diffs via a tool with the scope.
- Rebase then merge-commit (no squash) preserves the doc history when merging spec PRs.

### Gotchas

- The repo's CI workflow references `actions/checkout@v6` and `actions/setup-node@v6` (non-existent). Latest stable major is `v4`. Using `v6` silently fails Actions validation; the PR then has no status checks at all.
- `git ls-tree` without `-r` only shows the top-level tree. The just-merged spec is at `docs/automation/semi-automated-operations-layer.md` and is not visible from the root listing.
- The repo's `package.json` mixes backend and cockpit commands. The CI workflow currently only covers the backend; cockpit typecheck is a known gap.

### Reusable rules (cross-task)

- Before any non-trivial change, the Orchestrator produces a `SwarmTaskEnvelope` and an MSPR entry stub. The Builder does not start without both.
- The Reviewer never marks `pass` without named evidence. "Looks good" is not evidence.
- A workstream that touches `prisma/`, `src/`, `apps/`, `web/`, or `.env*` is **at minimum** Tier 3 with full review, regardless of the task class.
- Out-of-scope edits are an automatic `needs_rework` on the first review and `blocked` on the second, regardless of how small the edit is.

### Superseded

- _none yet_
