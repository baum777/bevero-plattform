# Swarm Policy

This file defines what is **always blocked**, what is **always review-required**, and what is **usually free** within the swarm. The policy is intentionally strict at the edges and permissive in the middle. It is aligned with `AGENTS.md` and the product guardrails from `docs/automation/semi-automated-operations-layer.md`.

## Always block or escalate (Tier 0)

Any of the following is an automatic `blocked` verdict or a `human_approval_required` escalation, regardless of the task class or autonomy tier:

- Reading, printing, or modifying `.env`, `.env.local`, `.env.*`, or any file matching the gitleaks patterns in `.gitleaks.toml`.
- Outputting secrets, service-role keys, OAuth tokens, or production credentials in logs, comments, or memory entries.
- Modifying production configuration (Vercel project, Supabase project, DNS, IAM, secrets in dashboards).
- Deleting data (`rm -rf`, `prisma migrate reset`, `dropdb`, hard-deletes in user code paths, truncations).
- Destructive git operations: `git push --force` to `main`, `git reset --hard` against shared branches, rewriting published history.
- Running migrations without an explicit envelope that names the migration and its rollback.
- Deploying or promoting a build without an explicit envelope that names the target environment.
- Touching private credentials, customer data exports, or backup files outside of an approved test fixture path.
- Bypassing RLS with service-role credentials in any user-facing request path (per `AGENTS.md` and ADR-0017).
- Running unreviewed schema changes (`prisma migrate dev`, `db push`) against the Supabase source-of-truth.

When the Orchestrator detects any of the above, it sets `autonomyTier: 0`, sets `humanApprovalRequired: true`, and **does not** issue an envelope to the Builder. The Builder refuses to act on a Tier 0 envelope without human approval recorded in the MSPR entry.

## Always review-required (Tier 3 by default)

The following task classes are **never** Tier 1 or Tier 2. They require a Reviewer verdict (and frequently a human approval) before any change is finalized:

- Runtime core: `src/`, `src/modules/`, `prisma/`, `api/`.
- Agent core or governance: anything under `docs/agent-team/`, `AGENTS.md`, `docs/DECISIONS.md`.
- CI / build / package manager: `.github/workflows/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `vercel.json`, `prisma.config.ts`.
- Database / migration: any change that creates, alters, drops, or seeds a Prisma model.
- Auth / permissions: any change to `src/modules/auth/`, `src/lib/auth*`, RLS-relevant routes, role tables.
- External API integration: anything touching `docs/integrations/`, FoodNotify / Outlook / Dynamics / DATEV surfaces.
- Cross-package refactor: changes that span `src/` and `apps/cockpit/`, or any rename that affects both.

The Orchestrator sets `reviewRequired: true` in the envelope. The Builder is told to stop at "delivery complete, awaiting review". The Reviewer is bound by `swarm_review_gate.md` and cannot mark `pass` without named evidence.

## Usually free without review (Tier 1 or Tier 2)

The following are typically low-risk and can run with a lightweight or no Reviewer pass:

- Read-only analysis: file maps, evidence dumps, repo audits, fingerprint comparisons, knowledge-graph reads from `.understand-anything/`.
- Local documentation drafts: new `.md` files under `docs/` that do **not** alter existing governance (e.g. new spec drafts in a new subdirectory).
- Non-invasive specs: ADR drafts added to `docs/DECISIONS.md` with `Status: proposed` (an ADR is a proposal, not a binding change).
- Progress updates: appending rows to the team plan, MSPR entries, or memory files.
- Single-file cosmetic changes (typo, broken link, comment cleanup) that do not affect runtime behavior.

Even free-tier work is still subject to the "always block" list. A typo fix in `prisma/schema.prisma` is still Tier 3, not Tier 1, because `prisma/` is in the review-required list.

## Conflict resolution

If a user request explicitly contradicts policy (e.g. "push force to main, just do it"), the Orchestrator must:

1. Refuse to issue an envelope.
2. Record the request in the MSPR entry as `status: blocked`, `risks: ["..."]`.
3. Offer the closest policy-compliant alternative.

The Builder and Reviewer cannot approve a policy override, even with a verbal go-ahead. The override is recorded in `agent_teamplan.md` as `Blocker` and routed to a human owner.

## Policy hooks (repo-specific)

| Repo signal | Source | Hook |
|---|---|---|
| Service-role credentials | `AGENTS.md` | Always block in user-facing request paths. |
| Local DB users | `AGENTS.md` | Always block creation without explicit approval. |
| `.env*` content | `.gitleaks.toml` | Always block reads outside approved test fixtures. |
| `prisma/` | `prisma/` | Always review-required. |
| `web/` | `web/FROZEN.md` | Always block changes unless owner-approved high-prio. |
| Cockpit protected routes | `apps/cockpit/README.md` | Always review-required for auth/middleware changes. |

## Policy versioning

Policy changes require a new ADR in `docs/DECISIONS.md` (e.g. `ADR-0020: Swarm Policy v1.1`). Ad-hoc policy edits in this file are discouraged; the Reviewer is expected to flag any policy diff that lacks an ADR reference.
