# Procurement Email Ingest — Phase 1

Ingests FoodNotify order emails from a Microsoft 365 / Outlook mailbox via Microsoft Graph,
validates the sender, parses the order, and persists it as a `pending_receipt` procurement
order. Phase 1 does **not** do goods receipt, DESADV, or stock movements.

## Data model

Migration `prisma/migrations/20260602120000_add_procurement_email_ingest`:

- `procurement_mail_imports` — raw-mail audit trail. `message_id` is UNIQUE (idempotency).
  `parse_status` ∈ `pending | ok | failed | skipped_dkim`, `parse_confidence` ∈ [0,1].
- `procurement_orders` — one per imported order. UNIQUE `(organization_id, external_order_number)`
  and UNIQUE `source_mail_import_id` (one order per mail).
- `procurement_order_items` — line items, `mapping_status='pending'` in Phase 1.
- `article_mappings` — table provisioned for Phase 2 mapping; unused in Phase 1.

Note: IDs are cuid `TEXT` (repo convention), not UUID. The original spec's `@db.Uuid`
foreign keys were dropped because they cannot reference cuid primary keys.

## Environment

See `.env.example`. Key variables:

| Variable | Purpose |
| --- | --- |
| `PROCUREMENT_ORGANIZATION_ID` | Org the imported orders are attributed to. Required for live ingest. |
| `MICROSOFT_TENANT_ID` | Microsoft Entra tenant ID for the app registration. |
| `MICROSOFT_CLIENT_ID` | Microsoft Graph app registration client ID. |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Graph client secret value. Secret surface only. |
| `FOODNOTIFY_MAILBOX` | Dedicated mailbox user principal name or ID, e.g. `orders@example.com`. |
| `FOODNOTIFY_MAIL_FOLDER` | Folder to poll. Defaults to `Inbox`; can be a dedicated FoodNotify folder. |
| `FOODNOTIFY_IMPORTED_FOLDER` | Folder used by optional post-processing move after import. |
| `FOODNOTIFY_FAILED_FOLDER` / `FOODNOTIFY_IGNORED_FOLDER` | Reserved target folders for later failure/ignored moves. |
| `FOODNOTIFY_FROM_FILTER` | Optional sender/domain filter, e.g. `foodnotify.com`. |
| `FOODNOTIFY_IMPORT_ENABLED` | Safe default `false`; disabled mode performs no Graph call. |
| `FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS` | Redis lock design gate for later scheduled import runs. |
| `FOODNOTIFY_PARSE_CONFIDENCE_MIN` | Orders below this score are rejected (default 0.85). |
| `FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD` | Alert when 24h failures exceed this (default 0). |
| `FOODNOTIFY_RAW_MAIL_MAX_BYTES` | Raw mail stored for audit, truncated to this size. |
| `FOODNOTIFY_TRUSTED_SENDER_DOMAINS` | Comma-separated trusted domains for the DKIM gate. |

### Microsoft Graph Outlook adapter

`src/modules/procurement/microsoft-graph-mail-source.ts` implements the live `MailSource`
port using Microsoft Graph app-only auth:

1. Request an app-only token with the OAuth2 client credentials flow.
2. List unread messages from `users/{mailbox}/mailFolders/{folder}/messages`.
3. Filter locally by `FOODNOTIFY_FROM_FILTER`.
4. Map Graph messages to `RawEmail` (`Message-ID`, Graph ID, mailbox/folder,
   sender, subject, received timestamp, body text/html, `DKIM-Signature`, `Received` headers).
5. Let `ProcurementIngestService` parse and write the DB rows.
6. Optionally move the Graph message after processing when `Mail.ReadWrite` is granted and a target folder is configured.

See `docs/integrations/foodnotify-outlook.md` for Microsoft admin setup, permissions,
admin consent, and Exchange Online mailbox scoping.

## Runtime: Vercel Cron → endpoint

The app runs on Vercel (serverless), so there is **no long-lived poll loop**. Ingest is
stateless and triggered by an HTTP call:

- `POST /procurement/ingest/mail-check` runs one poll and returns
  `{ polled, imported, failed, skippedDkim, duplicates }`.

Wire a Vercel Cron to hit this endpoint every 15 minutes. Because the endpoint is behind
Supabase-JWT admin auth, the cron must present an admin credential (service token). If a
simpler shared-secret guard is preferred, add a `CRON_SECRET` bearer check in
`procurement.route.ts` before going live.

```jsonc
// vercel.json (illustrative)
{ "crons": [{ "path": "/api/procurement/ingest/mail-check", "schedule": "*/15 * * * *" }] }
```

## Live Outlook adapter

Phase 1 ships an injectable `MailSource` port (`src/modules/procurement/mail.types.ts`)
and defaults to `NullMailSource` when `FOODNOTIFY_IMPORT_ENABLED=false`. Once the import
is enabled and the required Microsoft Graph env values are complete, `buildApp()` uses
`MicrosoftGraphMailSource`. Partial Graph credentials fail closed during app startup
instead of silently polling the wrong mailbox.

## DKIM (Phase 1 = domain check)

`DkimValidator` does **not** yet do full RSA-SHA256 verification. It accepts a mail only
when it provably comes from a trusted domain — preferring the `DKIM-Signature` `d=` tag,
falling back to the From domain and Received headers. The raw signature is persisted
(`dkim_signature`) so a full cryptographic re-check can be added later. Mails that fail are
stored with `parse_status='skipped_dkim'` and never parsed.

## Confidence scoring

- `1.0` — order number + supplier + ≥1 parsed item
- `0.9` — order number + supplier + quantity signal, no structured items
- `0.7` — order number + (supplier or quantity)
- `<0.7` — incomplete; below `FOODNOTIFY_PARSE_CONFIDENCE_MIN` ⇒ `parse_status='failed'`.

## Monitoring & runbook: parse_failed

- `GET /procurement/health/mail-status` → `{ lastPollAt, failureCount24h, status }`
  (`status='alert'` when 24h failures exceed the threshold).
- `GET /procurement/health/parse-failures-24h` → alert payload or `null`.

When an alert fires:

1. Open the failing rows in `procurement_mail_imports` (`parse_status='failed'`) and read
   `parse_error_msg` and `raw_text`.
2. If it is a genuine FoodNotify order the parser missed, add/adjust a pattern in
   `foodnotify-parser.ts` and add a fixture-based test in
   `tests/procurement/foodnotify-parser.test.ts`.
3. If it is a duplicate `external_order_number`, confirm whether the order already exists;
   the unique constraint intentionally blocks double imports.
4. As a stop-gap, the order can be entered manually until the parser is patched.

## Tests

```
npx vitest run tests/procurement tests/procurement.migration.test.ts
```

Covers: migration contract, DKIM domain check, parser confidence/SKU/units/dates,
idempotency + DKIM gate + confidence threshold in the ingest service, read-service
pagination/scoping/alerting, and the HTTP routes incl. role enforcement.
```

---

# Procurement Wareneingang-Confirm — Phase 2

Phase 2 adds the goods-receipt confirm flow on top of the imported orders. Core rule:
**Import ≠ Bestand** — importing an order never touches stock. Stock only moves when a
lead explicitly confirms receipt. Out of scope: DESADV, reverse-order flow, Graph API,
inventory-item creation, RLS/RBAC.

## Data model

Migration `prisma/migrations/20260602140000_add_procurement_receive_flow`:

- `procurement_order_items.rejection_reason TEXT` — set when an item is partially/fully
  rejected (`damaged | not_delivered | refused`). `accepted_qty`/`delivered_qty` gain
  `>= 0` CHECK constraints.
- `article_mappings.created_by TEXT` — records which actor created the mapping.
- `InventoryMovement.procurement_order_item_id TEXT` — FK (ON DELETE SET NULL) linking a
  stock movement back to the confirmed order item, plus an index.

## Order status machine

`pending_receipt` → (PATCH items) → `needs_mapping` | `ready_to_confirm` → (POST receive)
→ `received` | `partially_received`. An order is editable only in the first three states
and receivable only in `pending_receipt`/`ready_to_confirm`.

## Endpoints (lead role: admin / shift_lead)

- `PATCH /procurement/orders/:id/items/:itemId` — draft adjustments only, **no stock
  booking**. Accepts `delivered_qty`, `inventory_item_id` (string to map, `null` to clear),
  `rejection_reason`, `comment`. Mapping an item upserts an `article_mappings` row
  (normalized `supplier + product_name` ⇒ `inventory_item_id`) so future imports auto-map.
  The order status is recomputed from item mapping state. Errors: `404` (unknown order/item),
  `409` (order/item no longer editable), `422` (unknown `inventory_item_id`).
- `POST /procurement/orders/:id/receive` — the **only** endpoint that mutates stock.
  Payload must cover **every** order item. Per accepted item (`accepted_qty > 0`) it writes
  one `goods_received` `InventoryMovement` and refreshes the stock snapshot. Rejections are
  recorded on the item (`accepted_qty = 0` + `rejection_reason`) with **no** movement.
  Errors: `409` (duplicate `item_id`, order not receivable, already confirmed, double-book),
  `422` (incomplete payload, unmapped item, `accepted_qty` > delivered).

## Triple-layer double-booking protection

1. **Synchronous guards** (before the transaction): order status, duplicate `item_id`,
   full-set coverage, per-item mapping + quantity checks.
2. **Serializable transaction**: the order status is re-checked inside a
   `Serializable` `$transaction`; a concurrent confirm fails with `409 "order was modified"`.
3. **Idempotency key**: each movement uses `procurement.receive.item:{itemId}`, which is
   `UNIQUE` on `InventoryMovement.idempotency_key`. A duplicate confirm hits a Postgres
   `P2002` and is surfaced as `409`. Snapshots are **recomputed from the movement log**
   (never incremented), so a rolled-back transaction leaves no drift.

## Auto-mapping

On ingest, items are matched against `article_mappings` by
`(organization_id, supplier_name, normalized product_name)`. A hit sets
`inventory_item_id` and `mapping_status='auto_mapped'`; otherwise `'pending'`. Normalization
is trim + lowercase (`normalizeProductName`), shared by ingest and the PATCH upsert so the
two always agree.

## Monitoring & runbook (admin)

- `GET /procurement/health/stuck-orders` → orders still unreceived after 48h
  (`{ count, thresholdHours, orders[] }` with `ageHours`). Investigate mapping gaps or a
  missing physical delivery.
- `GET /procurement/health/receive-errors` → 24h `procurement.receive_conflict` workflow
  events (duplicate/concurrent confirms). A best-effort breadcrumb is written outside the
  failed transaction; a spike means two users confirmed the same order — reload and retry.
- `GET /procurement/health/snapshot-integrity` → `{ ok, violationCount, violations[] }`
  for any **negative** stock snapshot. Since snapshots are recomputed from the log, a
  negative value points at an over-withdrawal or a missing receipt, not snapshot drift.

## Tests

```
npx vitest run tests/procurement
```

Phase 2 adds: receive-flow migration contract, write-service (PATCH mapping + status
promotion, edit/receive guards, partial receive, triple-layer double-booking), ingest
auto-mapping, monitoring read methods, and the PATCH/receive/health routes incl. role
enforcement.
