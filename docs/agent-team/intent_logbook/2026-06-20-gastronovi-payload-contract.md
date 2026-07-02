---
work_slice_id: WS-2026-06-20-GASTRONOVI-CONNECTOR-001 / Phase 2A
date: 2026-06-20
agent: @planner (Sonnet 4.6)
risk_level: L1
slice_type: docs-only / planning
---

# Intent — Gastronovi Payload Contract & Normalizer Plan

## Why Payload Contract Comes Before Runtime Normalizer

A Normalizer that maps external fields to internal events is only correct if the field semantics are understood and agreed. Writing implementation code before the contract is settled creates two failure modes:

1. **Silent correctness loss**: If `amount` on a receipt is net-of-tax in the real Gastronovi export but the normalizer assumes gross, Bevero's KPIs are wrong from day one — with no error thrown and no test failing.
2. **Rework churn**: Field name or format differences between the synthetic fixture and the real export require a rewrite of all mapping code, tests, and any downstream consumers.

The payload contract document (`gastronovi-payload-contract-v1.md`) acts as a **checkpoint gate**: it surfaces all assumptions as named items that require partner confirmation before they become code. A reviewer can approve or reject the contract without reading TypeScript.

The normalizer plan (`gastronovi-normalizer-plan.md`) documents the intended implementation boundary, failure modes, and the exact shape of the `WorkflowEventCandidate` so that Slice #2B can be implemented without further design discussion.

## Why No Endpoint or Polling Is Added Yet

The Source Connector (`eef196c`) establishes the fetch boundary: it fetches, validates against Zod schemas, and returns typed payloads. It does not schedule itself. Adding a polling scheduler now would:

- Require `GASTRONOVI_ENABLED=true`, which is an L3 gate (Operator approval only)
- Trigger real or near-real network calls against an endpoint that is not officially confirmed
- Couple the polling interval to a normalizer that does not yet exist, producing data in the Raw Payload Store with no processing path

Polling is deferred to Slice #2C+ — after the normalizer exists and the Workflow Event Store write path is defined.

## Why Official Gastronovi Partner/API Confirmation Remains a Blocker

Gastronovi is not a freely documented public developer API. Per `docs/integrations/gastronovi.md` (Source-of-Truth Boundary):

> Allowed Phase-1 ingestion sources: official export, certified partner interface, contractually approved API access, synthetic fixtures for unit tests.
> Forbidden: reverse engineering, RPA, scraping, non-certified production integration.

The synthetic fixtures used in Slice #1 tests are structurally plausible but not verified against the actual Gastronovi system. The following are all assumptions at this point:

- Field names (`totalRevenue`, `externalId`, `reference`, etc.)
- `externalId` format and global uniqueness guarantee
- Whether PII-adjacent fields (`customerEmail`, `cardPan`, `customerId`) appear in any of the three event types
- The `paymaster.posted` `reference` field semantic

Until a Gastronovi partner contact provides an export specification or a certified partner interface is available for testing, the `syntheticFixture: true` flag on every `WorkflowEventCandidate` signals to any consuming layer that the data shape is unverified.

## How This Protects the Anti-Corruption-Layer Boundary

Per `docs/ARCHITECTURE.md`:

> Internal workflow logic must not depend on those external shapes. Every external payload is stored first as raw data and translated later into an internal, versioned event.

The contract and normalizer plan enforce this principle structurally:

1. **The `WorkflowEventCandidate` shape is Bevero-owned**, not Gastronovi-owned. If Gastronovi renames `totalRevenue` to `revenueTotal`, only the normalizer mapping changes — the WorkflowEvent schema and all downstream Rules Engine rules are unaffected.

2. **The `payloadHash` is decoupled from field names**. The sha256 hash is computed over the raw payload before normalization. Normalizer logic changes do not invalidate stored hashes.

3. **The failure-mode table classifies errors by Bevero's error policy**, not by Gastronovi's HTTP status codes. A structural error from Gastronovi and a structural error from a format change are both handled identically by the normalizer.

4. **No Cockpit UI logic and no Rules Engine task creation belong to the normalizer**. Bevero's internal business rules are never expressed as conditions on Gastronovi field values directly — they operate on the normalized `WorkflowEventCandidate` fields.

## What a Future Reader Should Understand

1. The payload contract v1 is a planning artifact, not a production specification. It becomes a production specification only after partner/contract confirmation is received and the document is updated to remove all synthetic-placeholder annotations.

2. The `syntheticFixture: true` flag on `WorkflowEventCandidate` is a runtime guard against accidentally promoting planning-phase data into production Rules Engine evaluations. It must remain `true` until the contract is confirmed.

3. Slice #2B begins only when: partner confirmation received, `@vitest/coverage-v8` installed, Operator L3 sign-off for `GASTRONOVI_ENABLED=true` in a non-production environment.

4. The normalizer plan's failure-mode table is the normative reference for error classification in any future normalizer implementation. Changes require a new version of this plan and a corresponding MSPR entry.
