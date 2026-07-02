# Intent Memory — Gastronovi Integration Concept Import

- id: gastronovi-integration-concept-2026-06-20
- timestamp: 2026-06-20T15:00:00+02:00
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-06-20-gastronovi-integration-concept.md`
- status: reviewed

## Core intention

Make the provided Gastronovi integration concept available in the repository's integrations documentation surface without implementing or promoting its proposed runtime behavior.

## Logic followed

The imported concept preserves a read-only Phase-1 posture, backend-secret boundaries, and explicit risk levels. It remains a concept until an owning implementation/spec process approves individual runtime changes.

## Design assumptions

- The supplied Markdown is the requested canonical content for this documentation slice.

## Tradeoffs

- Accepted: exact import with no editorial normalization.
- Rejected: implementing connector, scheduler, schema, routes, or environment changes alongside documentation.

## Durable memory

- Gastronovi is proposed as a read-only external POS/PMS input, not a replacement or writeback target in Phase 1.

## Do not reuse blindly

- Proposed endpoints, environment variables, data models, and TLS mechanics require source-backed implementation review before use.

## Relation to Rauschenberger OS / Bevero

- location logic: Motorworld Inn Böblingen is named as the pilot.
- role/approval logic: risk gates range from L0 reads through L4 writeback.
- inventory/procurement/shift-planning logic: downstream effects are concepts only.
- external-system boundary: no Phase-1 writeback.

## Next logic gate

Approve a dedicated implementation specification before creating Gastronovi runtime surfaces.
