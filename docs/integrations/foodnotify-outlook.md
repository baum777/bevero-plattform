# FoodNotify Outlook / Microsoft Graph Integration

Status: prepared, not live.

## Architecture

```text
Outlook / Microsoft 365 mailbox
  -> Microsoft Graph MailSource
  -> ProcurementIngestService
  -> FoodNotifyParser
  -> ArticleMapping lookup
  -> ProcurementOrder(status=pending_receipt | needs_mapping)
  -> manual receive confirmation
  -> InventoryMovement(type=goods_received)
```

Importing an email never increases stock. Stock changes only in
`ProcurementWriteService.receiveOrder()` after a lead confirms the pending receipt.

## Microsoft 365 Admin Inputs

Required values:

- `MICROSOFT_TENANT_ID`: Microsoft Entra tenant ID.
- `MICROSOFT_CLIENT_ID`: app registration client ID.
- `MICROSOFT_CLIENT_SECRET`: client secret value, stored only as a backend secret.
- `FOODNOTIFY_MAILBOX`: dedicated mailbox address or mailbox ID.
- `FOODNOTIFY_MAIL_FOLDER`: source folder, default `Inbox`.

Required Microsoft Graph setup:

- Application permission `Mail.Read` for read-only import.
- Application permission `Mail.ReadWrite` only if messages should be marked or moved after processing.
- Admin consent for the selected application permissions.
- Mailbox scoping through Exchange Online RBAC for Applications or an equivalent scoped access control. Do not grant tenant-wide mailbox access without a documented scope.

References:

- Microsoft Graph list messages: `https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messages`
- Microsoft Graph move message: `https://learn.microsoft.com/en-us/graph/api/message-move`
- Microsoft identity client credentials flow: `https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow`
- Exchange Online RBAC for Applications: `https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access`

## ENV

```env
MICROSOFT_TENANT_ID=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""

FOODNOTIFY_MAILBOX=""
FOODNOTIFY_MAIL_FOLDER="Inbox"
FOODNOTIFY_IMPORTED_FOLDER="FoodNotify/Imported"
FOODNOTIFY_FAILED_FOLDER="FoodNotify/Failed"
FOODNOTIFY_IGNORED_FOLDER="FoodNotify/Ignored"
FOODNOTIFY_FROM_FILTER=""
FOODNOTIFY_IMPORT_MODE="graph"
FOODNOTIFY_IMPORT_ENABLED="false"
FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS="300"
```

`FOODNOTIFY_IMPORT_ENABLED=false` is the safe default. In disabled mode the import service returns an empty summary and performs no Microsoft Graph call.

## Security Rules

- Do not commit real Microsoft, Supabase, or mailbox secrets.
- Do not use normal mailbox passwords or Global Admin credentials.
- Keep all Microsoft Graph credentials backend-only; never expose them through `NEXT_PUBLIC_*`.
- Use a dedicated mailbox or folder for FoodNotify confirmations.
- Store raw text/html only as needed for audit and parser debugging; keep `FOODNOTIFY_RAW_MAIL_MAX_BYTES` bounded.
- Tests must use synthetic or anonymized fixtures only.

## Operations

- Admin route: `POST /integrations/foodnotify/email-import/run`.
- Existing route remains available: `POST /procurement/ingest/mail-check`.
- Existing pending receipt routes remain canonical:
  - `GET /procurement/orders?source=foodnotify_email&status=pending_receipt`
  - `GET /procurement/orders/:id`
  - `PATCH /procurement/orders/:id/items/:itemId`
  - `POST /procurement/orders/:id/receive`
- Every import run returns a summary with `found`, `imported`, `duplicates`, `failed`, and `ignored`.
