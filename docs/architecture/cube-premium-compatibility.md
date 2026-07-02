# CUBE Premium Compatibility (Phase A — Contract)

> **Status:** Phase A contract. Governed by `ADR-0030`. Companion to
> `docs/architecture/multi-location-mother-concern.md` and
> `docs/architecture/location-profiles.md`.

## 1. Why CUBE is Not a Motorworld Fork

CUBE is a **profile**, not a fork. The same Bevero binary, the same
`prisma/schema.prisma`, and the same Cockpit frontend serve both Motorworld
Inn Böblingen and CUBE Stuttgart. The discriminator is
`Location.profile === "CUBE_PREMIUM"`, never `Location.name === "CUBE ..."`.

This contract prevents the recurring failure mode of "one-off premium
behavior creeping into the platform as a hardcoded branch." Every CUBE
behavior must be expressible as a profile-conditional, not a name match.

## 2. Operational Differences From Motorworld

| Aspect                | Motorworld Standard             | CUBE Premium                                              |
|-----------------------|---------------------------------|-----------------------------------------------------------|
| Areas                 | Bar, Küche, Lager, Service      | Bar, Restaurant, Service, Küche, Premium-Lager (separated) |
| Storage precision     | `BASIC` / `DETAILED`            | `PREMIUM_TRACEABLE`                                       |
| Premium handling      | not required                    | required for high-value articles                          |
| Quality notes         | optional                        | required for sensitive articles                           |
| Batch / lot notes     | allowed (opt-in)                | allowed by default for sensitive categories               |
| Schichtübergabe       | standard handover               | standard handover + explicit "premium items open" section |
| UI tone               | pragmatic, fast                 | precise, stricter empty / error states                    |
| Bar / Restaurant      | merged into bar flow            | **never merged**                                          |

## 3. `LocationInventoryConfig` for CUBE

The `LocationInventoryConfig` row carries per-standort overrides. For CUBE
the relevant flags are:

* `premiumHandlingRequired = true` on high-value items. The withdrawal /
  transfer / correction flow for these items expects a human confirmation
  step. The existing
  `InventoryCorrectionRequest` / `OperationalRoles` model already
  supports this; no new table is required at the contract layer.
* `qualityNoteRequired = true` on sensitive items. The withdrawal / correction
  flow for these items expects a non-empty `note` on the resulting
  `InventoryMovement`. The existing `note` field on `InventoryMovement`
  carries this; no new column is implied.
* `batchNoteAllowed = true` for categories where lot / batch tracking is
  expected. The `note` field on `InventoryMovement` is the carrier; richer
  batch metadata is a future concern and is **not** a Phase A contract.

A CUBE `LocationInventoryConfig` for a non-premium item (e.g. a standard
bottled water) sets all three flags to `false` and behaves like a Motorworld
config. The profile is a discriminator; the per-item flags are the actual
gates.

## 4. `StoragePrecisionLevel = PREMIUM_TRACEABLE`

For CUBE, every `StorageLocation` is implicitly traceable. The
`precisionLevel` lives on the new standort layer (not on the existing
`StorageLocation` table) and is read by the UI / read APIs to surface
"trace this item end-to-end" affordances. The actual trace data is
carried by the existing `InventoryMovement` / `GoodsReceiptItem` /
`GoodsReceipt` records. No new trace table is implied at the contract
layer.

## 5. Bar and Restaurant Are Separate Areas

A CUBE `Location` has at least these Areas:

* `bar`
* `restaurant`
* `service`
* `kitchen`
* `premium_storage` (or equivalent name, decided per-site)

The Cockpit bar-refill flow, which is built for Motorworld-style operations,
is **not** the CUBE entry point. CUBE may have its own refill flow that
targets `restaurant` and `service` Areas. The Phase A contract does not
prescribe the UI; it only requires that the data model supports multiple
Areas per Location with per-Area `LocationInventoryConfig` rows.

## 6. Handover Quality Bar

A CUBE shift handover expects an explicit "premium items open" or
"quality notes unresolved" entry. The data is already expressible through
the existing `ShiftHandoverDraft.openItems` / `ShiftHandoverDraft.alerts`
JSON fields. The contract is "the UI on a CUBE site prompts the shift lead
to fill these in." It is **not** "the system auto-fills them." No
auto-fill, no LLM-as-decider, no service-role shortcut.

## 7. What Phase A Does Not Decide

* **Per-CUBE item premium classification.** A CUBE admin will eventually mark
  which items are premium. That is a Phase B seed / data decision, not a
  Phase A contract decision.
* **CUBE-specific Cockpit pages.** A future Phase D slice will land a
  CUBE-specific landing page or sidebar. Phase A only sets the
  discriminator.
* **CUBE writeback to FoodNotify / Dynamics / DATEV.** Not in scope. Hard
  no-writeback rule applies.

## 8. What the Plan Forbids

* A hardcoded `if (location.name.startsWith("CUBE"))` in any TypeScript file.
* A separate `cube_*` table that mirrors a Motorworld table.
* A `CUBE_ONLY_*` env var that turns on premium behavior.
* A service-role shortcut for "premium = admin."

## 9. Cross-References

* `docs/architecture/multi-location-mother-concern.md` — the parent
  contract (mother concern, hierarchy, guardrails).
* `docs/architecture/location-profiles.md` — the three profiles, the
  profile-basiert rule.
* `docs/VISION.md` §7 (Phase 3 — CUBE-Kompatibilität).
* `ADR-0030` (proposed) — this document's owning ADR.
