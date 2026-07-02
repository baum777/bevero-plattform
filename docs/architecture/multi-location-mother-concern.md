# Multi-Standort & Mother-Concern Architecture (Phase A — Contract)

> **Status:** Phase A contract. This document is the authority for the multi-standort
> / CUBE premium architecture on the operational standort layer. It complements
> `docs/ARCHITECTURE.md` (the POS-adapter / external-source anti-corruption layer)
> and is governed by `ADR-0030`.
>
> This document does **not** authorize a Prisma migration, a new API route, or a
> new UI surface. Those are gated to a Phase B ADR (working title **ADR-0031**)
> and a Phase C ADR.

## 1. Hierarchy

```text
Rauschenberger / Mother Concern
  └─ Brand / Betrieb               (e.g. "Motorworld Inn", "CUBE")
     └─ Location / Standort        (e.g. "Motorworld Inn BB", "CUBE Stuttgart")
        └─ Area / Bereich          (Bar, Küche, Lager, Service, Restaurant, Event)
           └─ StorageLocation      (concrete physical spot / shelf)
              └─ InventoryItem     (with per-Location config)
```

| Layer            | Owner              | Purpose                                                            | Existing Prisma model |
|------------------|--------------------|--------------------------------------------------------------------|------------------------|
| Mother Concern   | Rauschenberger     | Cross-standort overview, exports, audit, comparison.               | (none yet — new)       |
| Brand            | Brand team         | Groups locations under one brand.                                  | (none yet — new)       |
| Location         | Standortleitung    | Concrete site with a profile.                                      | (none yet — new)       |
| Area             | Section lead       | Bar, Küche, Lager, Service, Restaurant, Event.                     | (none yet — new)       |
| StorageLocation  | Storage team       | Physical spot / shelf inside an Area.                              | `StorageLocation` (existing, kept as-is) |
| InventoryItem    | Catalog / location | Article with per-location config.                                  | `InventoryItem` (existing, kept as-is) + new `LocationInventoryConfig` |

The plan deliberately keeps the existing `StorageLocation` and `InventoryItem`
models. The new tables (`Brand`, `Location`, `Area`, `LocationInventoryConfig`)
layer on top. This is a Phase A scope decision, not a long-term commitment. If
the team later decides that the physical-spot semantics belong on a different
table (e.g. a new `StorageSpot` underneath `StorageLocation`), that is a future
refactor with its own ADR.

## 2. New Entities (Phase B scope; documented here as contract)

### 2.1 Organization / Mother Concern

Represents Rauschenberger or any comparable top-level concern.

Conceptual fields:

* `id`
* `name`
* `slug`
* `createdAt`
* `updatedAt`

### 2.2 Brand / Betrieb

A named group of locations under one mother concern (e.g. "Motorworld Inn",
"CUBE").

Conceptual fields:

* `id`
* `organizationId`
* `name`
* `slug`
* `createdAt`
* `updatedAt`

### 2.3 Location / Standort

A concrete site. Carries the **profile** that drives profile-specific behavior.

Conceptual fields:

* `id`
* `organizationId`
* `brandId`
* `name`
* `slug`
* `type`         (free-form site type: e.g. "inn", "restaurant", "event")
* `profile`      (see `LocationProfile` below)
* `isActive`
* `createdAt`
* `updatedAt`

`profile` is one of:

```ts
type LocationProfile =
  | "MOTORWORLD_STANDARD"
  | "CUBE_PREMIUM"
  | "EVENT_BANKETT_FUTURE";
```

### 2.4 Area / Bereich

Operational section inside a location.

Conceptual fields:

* `id`
* `locationId`
* `name`
* `type`         (e.g. "bar", "kitchen", "storage", "service", "restaurant", "event")
* `sortOrder`
* `createdAt`
* `updatedAt`

### 2.5 StorageLocation precision

Existing `StorageLocation` stays. The new `Location.precisionLevel` (or an
explicit `StoragePrecisionLevel` column on the new tables) drives how strict
the location's storage logic is.

```ts
type StoragePrecisionLevel =
  | "BASIC"
  | "DETAILED"
  | "PREMIUM_TRACEABLE";
```

For CUBE: `PREMIUM_TRACEABLE`. For Motorworld Inn: `BASIC` or `DETAILED`.

### 2.6 InventoryItem + LocationInventoryConfig

The article master (`InventoryItem`) stays global / org-wide. A new
`LocationInventoryConfig` carries the per-standort overrides.

Conceptual fields on `LocationInventoryConfig`:

* `id`
* `locationId`
* `inventoryItemId`
* `areaId`
* `storageLocationId`         (the default shelf for this article at this location)
* `targetQuantity`            (Sollmenge)
* `minimumQuantity`           (Mindestmenge)
* `premiumHandlingRequired`   (CUBE-only flag for high-value items)
* `qualityNoteRequired`       (CUBE-only flag for items needing quality notes)
* `batchNoteAllowed`          (optional batch / lot notes)
* `isActive`

## 3. Mother-Concern Overview Endpoint (deferred to Phase C)

The spec defines a read-only `GET /mother-concern/overview` endpoint. The
contract is:

* Aggregates per location: open refill runs, critical stock alerts, open goods
  receipts, recent deviations, unresolved notes, movement summary.
* **No mutations.** This route is read-only by design.
* Source-of-truth: the new `Location` / `Area` / `LocationInventoryConfig` /
  `BarRefillRun` / `GoodsReceipt` / `InventoryMovement` tables. Without the
  data model from Phase B, this endpoint cannot be implemented honestly.

**Decision:** the endpoint is documented here as a contract and explicitly
**deferred to Phase C**. A stub implementation against the existing
`StorageLocation` rows would produce a misleading API contract and is rejected.

## 4. Guardrails (restated for the standort context)

The following guardrails are restated from `AGENTS.md`,
`docs/automation/semi-automated-operations-layer.md`, and `ADR-0021` §3 in
standort context. They apply to any Phase B / Phase C slice that lands on top
of this contract.

* No automatic stock mutation. Suggestions only; humans approve.
* No automatic writeback to FoodNotify, Microsoft Dynamics 365, DATEV, or any
  central Rauschenberger system. Bevero reads only.
* No LLM-driven approval, ordering, or stock mutation. LLMs are optional,
  read-only text / classification helpers.
* No service-role credentials in user-facing request paths. RLS is the
  authority.
* `InventoryStockSnapshot` is read-only from the UI. Only `InventoryMovement`
  (append-only) updates snapshots.
* The `AutomationDecision` append-only invariant (BEFORE UPDATE / BEFORE DELETE
  triggers) is not affected by this contract.
* The mother-concern overview route is read-only and never writes.

## 5. Open Questions (gated to Phase B / Phase C ADR)

1. **`OrganizationMember` vs `LocationMember`.** Today, `OrganizationMember`
   carries `userId × organizationId × role`. With a mother concern + brand +
   location hierarchy, should membership be mother-concern-scoped, location-
   scoped, or both? Options: (a) keep `OrganizationMember` as mother-concern
   membership and add a new `LocationMember` for per-standort roles; (b) widen
   `OrganizationMember` with a `locationId` column; (c) keep as-is and rely on
   `organizationId` filtering. **Phase A does not decide. Phase B ADR (ADR-0031)
   will.**
2. **Mother-concern overview endpoint shape.** Aggregations, alerting
   thresholds, and export format are not pinned by this contract. They will be
   defined when Phase C is in scope.
3. **Profile-driven Cockpit landing pages.** Whether the Cockpit post-login
   landing route changes by `location.profile` (e.g. CUBE Premium shows a
   "Service-Vorbereitung" card) is a Phase D UI concern, not a Phase A
   architecture concern. The contract is "the profile is queryable; the UI can
   branch on it."

## 6. Out of Scope (Hard)

* No ERP replacement. FoodNotify, Microsoft Dynamics 365, DATEV, and central
  Rauschenberger processes stay leading.
* No central event planning.
* No HR / recruiting.
* No automatic ordering or auto-purchasing.
* No writeback to external systems of any kind.
* No service-role in client paths.
* No LLM as a decider.

## 7. Cross-References

* `docs/VISION.md` — Phases 2, 3, and 5 are the strategic intent.
* `docs/ARCHITECTURE.md` — POS-adapter / external-source layer; this document
  is the standort / operational layer.
* `docs/automation/semi-automated-operations-layer.md` — automation rules,
  suggestions, decisions. The location-profile contract is **not** a rules
  contract; it is a standort-profile contract. The two should not be conflated.
* `AGENTS.md` §Active Specs — authority order.
* `ADR-0021` (accepted) — automation spec, hard guardrails.
* `ADR-0022` (accepted), `ADR-0023` (accepted), `ADR-0028` (accepted), `ADR-0029` (accepted) — the promotion pattern this contract follows.
* `ADR-0030` (proposed → accepted) — this document's owning ADR.
