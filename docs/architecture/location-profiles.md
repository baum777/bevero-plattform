# Location Profiles (Phase A — Contract)

> **Status:** Phase A contract. Governed by `ADR-0030`. Companion to
> `docs/architecture/multi-location-mother-concern.md` and
> `docs/architecture/cube-premium-compatibility.md`.

## 1. The `LocationProfile` Enum

```ts
type LocationProfile =
  | "MOTORWORLD_STANDARD"
  | "CUBE_PREMIUM"
  | "EVENT_BANKETT_FUTURE";
```

A `Location` carries exactly one profile. The profile is the discriminator
that drives profile-specific operational behavior. **The profile is the
authority. The location name is not.** CUBE is a profile, not a hardcoded
string in any UI, service, or rule.

## 2. The Profile-Basiert Rule

UI, services, and rules **must** branch on `location.profile` (or the typed
enum). Hardcoding on `location.name === "CUBE ..."` is rejected by code
review. The same rule applies in reverse: hardcoding on
`location.name === "Motorworld ..."` to enable standard behavior is rejected
because the standard behavior is the default, not a name-based branch.

If a new brand (e.g. "Depot X") joins Bevero and uses the
`MOTORWORLD_STANDARD` profile, the existing Motorworld flows must serve it
without a single name check.

## 3. `MOTORWORLD_STANDARD`

The default profile. Fits Motorworld Inn Böblingen and any future
"pragmatic mobile bar / kitchen" site.

Behavioral expectations:

* Fast mobile bedienung on the existing Cockpit routes:
  * `/inventory/bar-refill` — bar-refill flow, accumulate quantity model
    (`-5 / -2 / -1 / +1 / +2 / +5`).
  * `/inventory/balances`, `/inventory/items`, `/storage` — read-only stock
    and storage views.
  * `/inventory/goods-receipt`, `/inventory/withdrawal`, `/inventory/transfers`
    — operational bookings, all human-driven, all append-only via
    `InventoryMovement`.
  * `/movements`, `/alerts`, `/dashboard`, `/shift-handover`, `/procurement` —
    existing read surfaces.
* Pragmatic empty / error states. No premium-only UI noise.
* Standard storage precision (`BASIC` or `DETAILED`).
* Standard handover. `ShiftHandoverDraft` exists; LLM-synthesized handover
  remains opt-in (per `ADR-0021`).
* No required quality notes. No required batch notes. `qualityNoteRequired`
  and `batchNoteAllowed` are both `false` on the default `LocationInventoryConfig`.

## 4. `CUBE_PREMIUM`

A premium restaurant profile. Fits CUBE Stuttgart and any future premium site.

Behavioral expectations:

* **Profile is the discriminator.** The UI must not hardcode
  `location.name === "CUBE ..."`. It must check
  `location.profile === "CUBE_PREMIUM"`.
* **Bar and Restaurant are separate Areas.** They are not merged into one
  flow. The Cockpit does not show a single "bar+restaurant" tab on CUBE
  sites.
* **Stricter storage precision.** `StoragePrecisionLevel = "PREMIUM_TRACEABLE"`.
  Quality-sensitive articles require richer shelf/area info.
* **Quality notes are surfaced.** Articles with
  `LocationInventoryConfig.qualityNoteRequired = true` (premium items,
  fresh produce, batch-sensitive goods) require a quality note on
  withdrawal / correction.
* **Premium handling required.** Articles with
  `LocationInventoryConfig.premiumHandlingRequired = true` require a human
  approval step before the relevant `InventoryMovement` is committed.
* **Batch / lot notes allowed.** `batchNoteAllowed = true` is the default for
  sensitive categories. This is **additive metadata** on the existing
  `InventoryMovement.note` field, not a new table.
* **Handover with higher quality bar.** The shift lead's
  `ShiftHandoverDraft` is expected to include an explicit "premium items
  open" or "quality notes unresolved" section. The data model already
  supports this through the existing `ShiftHandoverDraft.openItems` /
  `ShiftHandoverDraft.alerts` JSON fields; no schema change is implied at
  the handover layer.
* **UI tone is precise, not flashy.** Premium does not mean gold gradients.
  It means clearer labeling, stricter empty / error states, and explicit
  "this is a quality-sensitive operation" copy where the data calls for it.

What CUBE Premium **does not** do:

* No automatic stock mutation.
* No automatic ordering.
* No LLM-driven approval of premium movements. LLM components (when used)
  may only synthesize the handover text.
* No writeback to external systems.
* No service-role credentials in client paths.
* No new write endpoint just for CUBE. The write endpoints already exist
  (goods receipt, withdrawal, transfer, correction) and CUBE uses them with
  the same append-only `InventoryMovement` guarantee.

## 5. `EVENT_BANKETT_FUTURE`

Reserved name only. No site is currently on this profile.

This contract names the profile so the Phase B data model can carry the value
without an immediate schema change, and so documentation is consistent.
Phase A does not commit to a UI, a service, or a workflow for this profile.

Future expected behavior (documented only, not implemented):

* Packing lists.
* Picking / commissioning.
* Return quantities vs. planned quantities.
* Mobile event checklists.
* Photo / deviation evidence.
* Post-event reconciliation exports for FoodNotify / Dynamics / Rauschenberger
  controlling.

None of the above is in scope for the current slice. A future ADR (Phase 6 in
`docs/VISION.md` §10) will gate the implementation.

## 6. UI Branching Pattern (guidance for Phase D)

A Phase D UI slice that wants to branch on profile reads it from a typed
context (e.g. `useLocationContext()` returning `{ locationId, name, profile }`),
**not** from a hardcoded name check. The contract guarantees that the profile
value is set on every `Location` row, defaulting to `MOTORWORLD_STANDARD` for
backwards compatibility when the column is added.

## 7. Cross-References

* `docs/architecture/multi-location-mother-concern.md` — the parent contract.
* `docs/architecture/cube-premium-compatibility.md` — CUBE-specific behavior.
* `docs/VISION.md` §6 (Phase 2), §7 (Phase 3), §10 (Phase 6).
* `ADR-0030` (proposed) — this document's owning ADR.
