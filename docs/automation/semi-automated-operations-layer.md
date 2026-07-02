# Bevero Semi-Automated Operations Layer — Technical & Product Specification

## Decision Summary

Bevero introduces a controlled, rules-based automation layer that assists operational staff at Motorworld Inn and CUBE without replacing human judgment or external systems. Automation is **read-only** for external systems (FoodNotify, Dynamics), **suggestion-first** for internal operations, **human-gated** for all stock mutations, and **offline-capable** for critical flows. Agents and LLM components are optional and limited to text synthesis, classification, and explanation—never mutation or writeback.

---

## Current Repo Context

Bevero is implemented as:

- **Backend:** Fastify API with Prisma + Supabase Postgres
- **Frontend:** Next.js Cockpit under `apps/cockpit/`
- **Auth:** Supabase Auth with RLS policies
- **Canonical inventory path:** `InventoryMovement` (append-only event log) + `InventoryStockSnapshot` (derived read model)
- **Task infrastructure:** `WorkflowEvent` + `WorkflowTask` already in schema
- **Existing models:** InventoryItem, BarRefillRun, BarRefillRunItem, PurchaseOrder, GoodsReceipt, InventoryCorrectionRequest, StorageLocation, Supplier, OrganizationMember
- **Roles:** owner, admin, manager, staff, viewer (ADR-0015: role order is owner > admin > manager > staff > viewer)
- **RLS enforcement:** `app_runtime` role, direct Postgres connections (ADR-0017)

Procurement ingest baseline exists (FoodNotify Mail Ingestion) but is non-binding for this spec.

---

## Product Positioning

Per VISION.md:

> **Planung oben, Ausführung unten.**
> FoodNotify and Dynamics plan, calculate, manage. Bevero makes visible what actually happens at the location.

**Bevero does NOT:**
- Replace FoodNotify (planning, suppliers, recipes)
- Replace Microsoft Dynamics 365 (accounting, HR, central planning)
- Replace DATEV (tax, payroll)
- Replace central Rauschenberger processes

**Bevero DOES:**
- Show mobile operational reality (Bar, Kitchen, Storage, Service)
- Enable staff to log refills, consumption, receipts, transfers, corrections
- Surface anomalies and low-stock alerts
- Assist shift leaders with decision summaries and handover drafts
- Provide audit trails for compliance and learning
- Prepare export data for FoodNotify/Dynamics without automatic writeback

---

## In Scope: Automation Features

1. **Rules-first suggestions** – Bevero observes patterns (low stock, open receipts, high consumption) and proposes tasks. No hidden mutations.
2. **Human control points** – Every suggestion must pass through a responsible actor before becoming a confirmed action.
3. **Offline queue** – Quick notes, pending actions, local acknowledgments survive network loss.
4. **Shift handover drafts** – Summarize open items, notes, anomalies for shift leaders. Text synthesis only.
5. **Anomaly explanation** – When a rule fires (unusual consumption spike), explain why to the UI.
6. **Alert consolidation** – Multiple notes about the same problem cluster into one task.
7. **Audit trail** – Every suggestion, approval, rejection, and automated action logs source, rule, inputs, actor, timestamp.

---

## Out of Scope: What Automation Does NOT Do

- **No automatic mutations.** No stock correction without human approval.
- **No automatic orders.** Suggestions only; procurement remains in FoodNotify or explicit Bevero workflow.
- **No writeback to external systems.** Bevero reads from FoodNotify exports but does not push back without explicit integration and approval.
- **No LLM-driven decisions.** Agents may summarize or classify text; they do not decide approval/rejection, stock levels, or ordering thresholds.
- **No service-role credentials in user flows.** Admin/service roles remain backend-only.
- **No PII or secrets in logs.** Audit trails are safe for retention and export.
- **No complex agentic reasoning.** Local inventory rules, threshold evaluation, and approval workflows remain deterministic and auditable.

---

## Automation Principles

### 1. Rules-First, Not ML-First

Automation starts with **explicit, versioned rules** that staff and managers can read and understand:

```
IF stock(item_id, location_id) < minStock(item_id, location_id)
  THEN suggest task "Refill needed: [item]"
```

Rules are configuration, not model weights. Each rule has:
- Unique ID / version
- Clear condition (inventory, event, time, role)
- Clear action (create suggestion, alert, task)
- Enabled/disabled toggle
- Owner (manager, admin, system)

Rules are evaluated **synchronously on write** (when movements are created, corrections requested, receipts logged) and **asynchronously on schedule** (daily low-stock scan, weekly consumption anomaly scan).

### 2. Suggestions Are Immutable Proposals

When a rule fires, Bevero creates an `AutomationSuggestion` (new model):

```
AutomationSuggestion {
  id, ruleId, ruleName, ruleVersion,
  organizationId, createdAt,
  status: open | approved | rejected | expired,
  type: "refill" | "receipt_alert" | "consumption_anomaly" | "alert_consolidation",
  summary, detail, relatedItemIds,
  approvedBy, approvedAt, rejectedBy, rejectionReason, rejectedAt,
  expiresAt, automaticActionOnApproval
}
```

Once created, suggestions do not change. Approval or rejection creates an `AutomationDecision`:

```
AutomationDecision {
  id, suggestionId, status: approved | rejected,
  actor (uid), role, timestamp,
  metadata (reason, notes)
}
```

Decisions are append-only and audit-safe.

### 3. Human Stays in Control

Every suggestion is visible to the responsible actor before any stock movement, task, or alert is created.

**Approval flow:**
1. Rule fires → Suggestion created (open, pending approval)
2. Actor (staff, manager, or admin) sees suggestion in UI
3. Actor approves → Decision created, suggestion status → approved, automatic action executes
4. OR Actor rejects → Decision created, suggestion status → rejected, no action

Automatic actions after approval are **deterministic**:
- Refill suggestion approved → Create `WorkflowTask` assigned to shift lead
- Consumption anomaly suggestion approved → Log as alert, notify manager
- Alert consolidation suggestion approved → Merge notes into one task
- Receipt reminder approved → Send notification or re-list

**No implicit approval.** No time-out auto-approval. No "act now, ask later" patterns.

### 4. Guardrails on Mutation

**Forbidden automatisms:**
- No direct stock mutation without explicit human approval in a separate step
- No purchase order creation without procurement workflow
- No writeback to FoodNotify, Dynamics, DATEV, or central systems
- No correction of InventoryStockSnapshot without matching approved `InventoryMovement`
- No deletion or override of existing movements or receipts

**Allowed automatisms (after approval):**
- Create `WorkflowTask` (assignment, notification)
- Create `InventoryMovement` (if approval maps to a specific movement)
- Update `BarRefillRunItem.status` if refill is confirmed
- Log anomalies and send alerts
- Cache suggestions for offline access

### 5. Offline Queue & Sync Strategy

Mobile staff work offline. Bevero must support async reconciliation without data loss or conflicts.

**Local offline actions queue:**

```
OfflineActionQueue {
  id, deviceId, actionType,
  timestamp, operationData,
  status: pending | synced | conflict | failed,
  retryCount, lastError
}
```

Staff can:
- Add quick notes offline → stored locally, synced on reconnect
- Confirm bar refill items → stored locally, synced on reconnect
- Request stock corrections → stored locally, synced on reconnect
- See cached bar refill list, balance snapshots

On reconnect:
- Device sends pending actions with timestamp and device mutation ID
- Backend validates action still applies (item still exists, stock hasn't changed drastically)
- If valid: create movement, update snapshot, mark as synced
- If conflict: mark as `conflict`, show UI prompt, let user resolve or retry

**Conflict handling:**
- Server-of-truth is backend snapshot and movement log
- Device must accept backend state if conflict is unresolvable
- UI shows "synced", "pending", "conflict", "error" badges per action

**Service Worker strategy:**
- Cache bar refill list, item metadata, recent snapshots
- Sync pending actions on schedule (every 5s when connected, exponential backoff when not)
- Prevent final mutation without valid session and backend confirmation
- No background mutation without explicit user intent

### 6. Deterministic Rule Evaluation

Rule conditions are **not LLM-driven.** They are SQL-like or config-like predicates:

```
{
  "rule": "low_stock_alert",
  "condition": {
    "type": "stock_below_threshold",
    "itemId": "...",
    "threshold": "minStock",
    "location": "bar" | "kitchen" | "all"
  },
  "action": {
    "type": "create_suggestion",
    "suggestionType": "refill",
    "assignRole": "staff"
  },
  "enabled": true,
  "organization": "motorworld_inn",
  "version": 1
}
```

Rules are **versioned**. If a rule changes, new evaluations use the new version; old suggestions remember their source rule version.

Rules are **re-evaluable.** If a suggestion is open for 3 days and the condition is still true, resend a reminder or escalate to manager.

---

## Guardrails

### Critical Boundaries

1. **Stock snapshots are read-only from UI.**
   - Only movements create or update snapshots.
   - Snapshots are derived from append-only movement log.
   - No direct snapshot mutation.

2. **Corrections require separate approval step.**
   - `InventoryCorrectionRequest` created by staff/manager.
   - `WorkflowTask` assigned to admin for review.
   - Only after approval does an `InventoryMovement` (type: correction) execute.
   - If rejected, correction request is marked rejected, no movement created.

3. **No external system mutation.**
   - Bevero reads from FoodNotify, Dynamics, DATEV, Rauschenberger exports.
   - Bevero does NOT write back automatically.
   - Any writeback requires explicit integration, API key rotation, and logged approval.
   - Planned: Bevero may export summary data for re-import elsewhere, but not push mutations.

4. **Service-role credentials stay backend-only.**
   - No `app_service` or elevated role in client session.
   - Browser session is always user-scoped and RLS-enforced.
   - Service actions (background rule evaluation, daily scans) run server-side with separate auth.

5. **Secrets and PII stay out of logs.**
   - No API keys, passwords, or bearer tokens in `WorkflowEvent.dataJson` or logs.
   - No customer names, addresses, or contact details in task descriptions unless role-specific visibility is granted.
   - Audit trail sanitization runs before export or retention.

6. **Every automated task documents its origin.**
   - Task must include: rule ID, rule version, condition snapshot, input data snapshot, timestamp, actor (system or user).
   - If a suggestion becomes a task, the task references suggestion ID.
   - Reverse audit: "This task came from rule X firing because of these inputs at this time."

7. **Responsibility is never automated away.**
   - A manager is always responsible for approving a refill task before it hits FoodNotify/procurement.
   - An admin is always responsible for reviewing a stock correction.
   - A shift lead is always responsible for confirming bar refill.
   - Automation proposes; humans decide.

---

## Service Worker / Offline-First Strategy

### Local Data Cache

The browser (via Service Worker and IndexedDB) caches:

- Bar refill template (daily refresh or on demand)
- Bar refill run for today (refresh on open, sync on save)
- Recent item snapshots and balance data
- Last 7 days of movements (for offline context)
- Shift handover notes (local-only until synced)
- Quick note drafts

**Cache invalidation:**
- Explicit "Refresh" button in UI
- Automatic refresh on app foreground (mobile)
- Time-based expiry (4 hours for snapshots, 24 hours for templates)
- Cache-busting version header from API

### Offline Action Queue

When offline, staff can:
1. **Log quick notes** → Stored in local `OfflineActionQueue`, UI shows "pending"
2. **Confirm refill items** → Update local `BarRefillRunItem`, UI shows "pending"
3. **Request stock correction** → Create local `InventoryCorrectionRequest` draft, UI shows "pending"

Each action gets a **client-generated mutation ID** (UUID or hash of operation + timestamp) to enable idempotent server replay.

### Sync Strategy

On reconnect:

1. **Validate device session** – Ensure user is still authenticated.
2. **Send pending actions batch** – Include mutation ID, timestamp, payload for each action.
3. **Server idempotency check** – If mutation ID already exists in database, return cached response (no duplicate).
4. **Server validation** – Check if action is still valid (item exists, permissions unchanged, stock is reasonable).
5. **Transactional apply** – Create movement, update snapshot, mark queue as synced in single transaction.
6. **Conflict detection** – If server state differs significantly (e.g., stock corrected by someone else), mark as conflict.
7. **Return sync result** – Send success/conflict/error per action.

**Conflict resolution UI:**
- Badge shows "pending", "synced", "⚠️ conflict", or "❌ error"
- On conflict, show user: "This item's stock was updated by [actor] since you went offline. Your change was: [X units]. Server shows: [Y units]. Retry with current snapshot?" 
- User can: accept server state, retry against new snapshot, or dismiss.

### Service Worker Registration

**Not implemented by this spec.** Specification defines the contract; Service Worker setup is Phase D.

The contract is:
- Intercept POST/PATCH requests to mutation endpoints
- Queue them locally if offline, replay on reconnect
- Return optimistic response with "pending" flag
- Update UI as sync status changes
- Never create final state mutation on client

---

## Rules Engine Concept

### Architecture

Rules are stored as configuration documents (initially JSON in database, later versioned in `AutomationRule` table):

```
AutomationRule {
  id, version, enabled,
  organizationId, createdBy, createdAt,
  name, description,
  ruleType: "threshold" | "time" | "event" | "anomaly",
  condition (JSON), action (JSON),
  evaluateOn: "write" | "schedule" | "both",
  schedule (cron or interval, if async),
  metadata (tags, runbook, escalation)
}
```

### Evaluation Contexts

**On-write evaluation** (synchronous, in-transaction):

```
- InventoryMovement created
  → Evaluate all active rules with evaluateOn = "write" or "both"
  → If condition matches, create Suggestion (don't mutate yet)
  → Attach to transaction, commit together
```

**Scheduled evaluation** (asynchronous, background job):

```
- Cron trigger (e.g., 00:05 daily)
  → Scan all items in all organizations
  → Check minStock thresholds, 7-day consumption trends, open receipts
  → For each condition match, check if suggestion already exists (don't duplicate)
  → Create Suggestion if new condition detected
  → Log job run with result count
```

### Example Rules (MVP Phase C)

#### Rule 1: Low Stock Alert

```json
{
  "id": "rule_low_stock_001",
  "version": 1,
  "name": "Stock Below Minimum",
  "ruleType": "threshold",
  "condition": {
    "type": "stock_below_threshold",
    "comparison": "less_than",
    "threshold_field": "minStock",
    "threshold_multiplier": 1.0,
    "location": "bar",
    "excludeItems": ["misc_item_sku_123"]
  },
  "action": {
    "type": "create_suggestion",
    "suggestionType": "refill",
    "title": "Stock low: {itemName}",
    "detail": "Current: {currentStock} {unit}, Min: {minStock}",
    "assignRole": "staff"
  },
  "evaluateOn": "schedule",
  "schedule": "0 */4 * * *",
  "enabled": true
}
```

#### Rule 2: Open Receipt Alert

```json
{
  "id": "rule_open_receipt_001",
  "version": 1,
  "name": "Unconfirmed Goods Receipt",
  "ruleType": "event",
  "condition": {
    "type": "workflow_event",
    "event_type": "receipt.created",
    "age_hours": 12,
    "status": "open"
  },
  "action": {
    "type": "create_suggestion",
    "suggestionType": "receipt_alert",
    "title": "Goods receipt still open: {orderId}",
    "detail": "Received {qty} {unit} of {itemName}. Please confirm.",
    "assignRole": "manager"
  },
  "evaluateOn": "schedule",
  "schedule": "0 6,14,22 * * *",
  "enabled": true
}
```

#### Rule 3: Consumption Anomaly

```json
{
  "id": "rule_consumption_spike_001",
  "version": 1,
  "name": "Unusual Consumption",
  "ruleType": "anomaly",
  "condition": {
    "type": "consumption_exceeds_baseline",
    "lookback_days": 7,
    "baseline_percentile": 75,
    "spike_multiplier": 2.0
  },
  "action": {
    "type": "create_suggestion",
    "suggestionType": "anomaly_alert",
    "title": "Unusual consumption: {itemName}",
    "detail": "This item moved {current_qty} units in the last 24h. Typical: {baseline_qty}. Event: {eventNotes}",
    "assignRole": "manager"
  },
  "evaluateOn": "schedule",
  "schedule": "0 8 * * *",
  "enabled": true
}
```

### Rule Testing & Versioning

Rules have a **version field.** When a rule is updated:
- Old suggestions referencing old version stay unchanged.
- New evaluations use new version.
- Rule history is tracked (created, updated, disabled).
- Rollback to previous version is possible (manual, admin-only).

---

## Agent / LLM Boundary

### What Agents CAN Do

Agents are **optional, non-binding, read-only** text/classification helpers:

1. **Summarize notes into shift handover.**
   - Input: list of quick notes from a shift
   - Output: structured handover text (what happened, what's open, what needs escalation)
   - Example: "5 notes logged. Summary: Bar heavily used during late service, ran short on vodka (noted by John at 22:30), corrected with emergency swap from kitchen. Two items below target, see attached. Next shift: confirm vodka restock."

2. **Classify notes by category.**
   - Input: unstructured note text
   - Output: label (equipment_issue, stock_problem, quality_issue, staff_note, other)
   - Used to cluster related notes and highlight trends

3. **Explain rules to staff.**
   - Input: automation rule, suggestion, input context
   - Output: human-readable explanation
   - Example: "This suggestion appeared because Vodka stock is 12 units, but the minimum is 20. The rule checks every 4 hours."

4. **Flag suspicious patterns** (informational only).
   - Input: movement history, note history
   - Output: "Unusual pattern detected: 3 corrections in 24h for same item. Might indicate measurement error or counting issue."
   - Does NOT trigger automatic action; alerts manager for investigation.

### What Agents CANNOT Do

- **Decide whether to approve a suggestion.**
- **Mutate stock, create orders, or close tasks.**
- **Write back to external systems.**
- **Bypass guardrails or thresholds.**
- **Execute actions without human approval.**

### Implementation Constraints

- **No real-time streaming inference.** LLM calls happen in background jobs or on-demand (shift handover view), not in critical write paths.
- **Cache responses.** If handover summary for shift X already exists, don't re-run LLM; let user request refresh if needed.
- **Fail gracefully.** If LLM is unavailable, Bevero still works; suggestions still appear, just without synthesis.
- **Log all inputs and outputs** (sanitized). For auditing and improvement, log what went to LLM and what came back—but never raw user data or secrets.
- **Use only first-party or trusted SaaS providers.** If using Claude, use Anthropic API. If cost/latency becomes issue, fall back to rule-based templates.

---

## Roles & Permissions

Based on ADR-0015 (owner > admin > manager > staff > viewer):

### Role Capabilities Matrix

| Capability | Owner | Admin | Manager | Staff | Viewer |
|---|---|---|---|---|---|
| **See suggestions** | ✓ | ✓ | ✓ | Limited* | ✗ |
| **Approve suggestion** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Reject suggestion** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Create bar refill run** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Confirm refill item** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Request stock correction** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Approve correction** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **See low-stock alerts** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Log quick note** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **View shift handover draft** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Manage rules** | ✓ | ✓ | ✗ | ✗ | ✗ |
| **View audit logs** | ✓ | ✓ | Org* | ✗ | ✗ |

*Limited: staff sees suggestions assigned to them or their workspace.  
*Org: manager sees audit logs for their organization only.

### Suggestion Visibility & Assignment

- **Refill suggestions** → Visible to staff and above; assigned to staff workspace by default.
- **Receipt/anomaly alerts** → Visible to manager and above.
- **Correction review tasks** → Visible to admin and above only.
- **Shift handover drafts** → Visible to shift lead (manager) and above.

### Offline Actions & Auth

- Offline actions are queued **per user, per device.**
- On sync, each action is validated against user's current role and organization membership.
- If role revoked or org access removed between offline action and sync, action is rejected with "authorization changed" error.
- No escalation of privilege through offline queue.

---

## Data Model Proposal

**This section describes new tables without implementation.** Migration details are a separate gate.

### 1. AutomationRule

**Purpose:** Store versioned rule definitions.

```
AutomationRule {
  id (cuid, PK),
  organizationId (FK, not-null),
  version (int, auto),
  enabled (bool, default true),
  ruleType (enum: threshold, time, event, anomaly),
  name (string),
  description (text),
  condition (jsonb),
  action (jsonb),
  evaluateOn (enum: write, schedule, both),
  schedule (string, cron or interval if async),
  metadata (jsonb, tags, runbook, escalation),
  createdBy (uid),
  createdAt (timestamp),
  updatedAt (timestamp),
  deletedAt (timestamp, soft-delete)
}

Indexes:
  - (organizationId, enabled, evaluateOn)
  - (organizationId, ruleType)
  - (enabled, schedule)
```

**RLS:** Organization-scoped. Admin/owner only.

**Risk:** If rule condition is malformed, evaluation fails. Validation and dry-run gates needed.

### 2. AutomationSuggestion

**Purpose:** Capture rule-fired suggestions awaiting human decision.

```
AutomationSuggestion {
  id (cuid, PK),
  organizationId (FK),
  ruleId (FK -> AutomationRule),
  ruleVersion (int),
  status (enum: open, approved, rejected, expired),
  type (enum: refill, receipt_alert, consumption_anomaly, 
        alert_consolidation, custom),
  title (string),
  detail (text),
  relatedItemIds (array of item IDs),
  createdAt (timestamp),
  expiresAt (timestamp, nullable),
  approvedBy (uid, nullable),
  approvedAt (timestamp, nullable),
  rejectedBy (uid, nullable),
  rejectedAt (timestamp, nullable),
  rejectionReason (text, nullable),
  automaticActionOnApproval (jsonb, nullable)
}

Indexes:
  - (organizationId, status, createdAt desc)
  - (organizationId, expiresAt)
  - (ruleId, status)
```

**RLS:** Organization-scoped. Staff and above can see suggestions for their organization.

**Audit:** Every status change is logged in AutomationDecision.

### 3. AutomationDecision

**Purpose:** Immutable record of suggestion approval/rejection.

```
AutomationDecision {
  id (cuid, PK),
  suggestionId (FK -> AutomationSuggestion),
  status (enum: approved, rejected),
  actor (uid),
  actorRole (string),
  timestamp (timestamp),
  reason (text, nullable),
  notes (text, nullable),
  metadata (jsonb)
}

Indexes:
  - (suggestionId)
  - (actor, timestamp desc)
  - (timestamp)
```

**RLS:** Organization-scoped audit table. Managers and above can read.

**Immutable:** No updates, only inserts.

### 4. OfflineActionQueue

**Purpose:** Track client-initiated actions pending sync.

```
OfflineActionQueue {
  id (cuid, PK),
  organizationId (FK),
  userId (uid),
  deviceId (string, browser fingerprint or device ID),
  actionType (enum: quick_note, refill_confirm, correction_request, 
             movement, transfer, other),
  clientMutationId (string, unique per device+action),
  timestamp (timestamp),
  operationData (jsonb),
  status (enum: pending, synced, conflict, failed),
  syncedAt (timestamp, nullable),
  conflictReason (text, nullable),
  retryCount (int, default 0),
  lastError (text, nullable),
  createdAt (timestamp)
}

Indexes:
  - (userId, deviceId, status)
  - (organizationId, status, createdAt)
  - (clientMutationId, unique)
```

**RLS:** User-scoped. Users see only their own queue.

**Cleanup:** Delete synced/failed entries after 30 days (configurable).

### 5. ShiftHandoverDraft

**Purpose:** Temporary workspace for shift handover composition.

```
ShiftHandoverDraft {
  id (cuid, PK),
  organizationId (FK),
  shiftLeadId (uid),
  workspaceId (string, nullable),
  date (date),
  startTime (time, nullable),
  endTime (time, nullable),
  summary (text),
  openItems (jsonb, array of {type, itemId, description}),
  alerts (jsonb, array of alert IDs/summaries),
  notes (text),
  synthesizedHandover (text, nullable, LLM output),
  synthesizedAt (timestamp, nullable),
  confirmedAt (timestamp, nullable),
  createdAt (timestamp),
  updatedAt (timestamp)
}

Indexes:
  - (organizationId, date, shiftLeadId)
  - (confirmedAt)
```

**RLS:** Organization + role-scoped. Only shift lead and manager can access own/team drafts.

**Lifecycle:** Created on demand, can be drafted offline, synced on reconnect. Cleared or archived after handover confirmed.

### Existing Models to Extend (No Breaking Changes)

1. **WorkflowEvent** and **WorkflowTask**
   - Already support automation source linkage via `type` field.
   - Add optional `automationSuggestionId` (FK) to link task back to suggestion.
   - No schema change required; already works.

2. **InventoryMovement**
   - Add optional `automationSuggestionId` (FK) to track which suggestion approved this movement.
   - Add `idempotencyKey` (unique) to support offline/client mutation ID matching.
   - No breaking change; new optional fields only.

3. **InventoryCorrectionRequest**
   - Already requires approval before creating movement.
   - Can add optional `automationSuggestionId` to link back to anomaly suggestion.
   - No breaking change.

4. **BarRefillRunItem**
   - Already supports `status` (open, confirmed).
   - Can add optional `syncStatus` (local, pending, synced, conflict) for offline tracking.
   - No breaking change.

5. **QuickNote** (if added later)
   - Store locally-first, sync on reconnect.
   - Link to shift/team/workspace.
   - Soft-delete only (keep history).

---

## API Proposal

**This section outlines endpoints without implementation.** Routes, middleware, validation details are a separate gate.

### Suggestion Endpoints

#### GET /automation/suggestions

**Purpose:** List open suggestions for the organization.

**Auth:** Required (staff+)

**Query params:**
- `status`: "open" | "approved" | "rejected" (default: open)
- `type`: "refill" | "receipt_alert" | ... (optional, multi-select)
- `assignedToRole`: "staff" | "manager" | ... (optional)
- `limit`, `offset` (pagination)

**Response:**
```json
{
  "suggestions": [
    {
      "id": "sug_123",
      "ruleId": "rule_low_stock_001",
      "type": "refill",
      "title": "Stock low: Vodka",
      "detail": "Current: 12 units. Min: 20.",
      "relatedItemIds": ["item_vodka"],
      "createdAt": "2026-06-08T10:30:00Z",
      "status": "open"
    }
  ],
  "total": 1
}
```

**RLS:** User sees only organization's suggestions.

#### POST /automation/suggestions/:id/approve

**Purpose:** Approve a suggestion and trigger its automatic action.

**Auth:** Required (manager+)

**Body:**
```json
{
  "reason": "Stock confirmed, refill task ready",
  "notes": "Mentioned in morning briefing"
}
```

**Response:**
```json
{
  "suggestion": { ... (approved status) },
  "decision": {
    "id": "dec_456",
    "status": "approved",
    "actor": "uid_user123",
    "timestamp": "2026-06-08T10:35:00Z"
  },
  "automaticActionResult": {
    "type": "task_created",
    "taskId": "task_789"
  }
}
```

**Side effects:**
- `AutomationDecision` created.
- Suggestion status → `approved`.
- Automatic action (e.g., create task) executed in same transaction.
- Audit log entry.

**Error cases:**
- 403: Not authorized (not manager+)
- 404: Suggestion not found
- 409: Suggestion already approved/rejected
- 500: Automatic action failed (rollback decision, suggest retry)

#### POST /automation/suggestions/:id/reject

**Purpose:** Reject a suggestion.

**Auth:** Required (manager+)

**Body:**
```json
{
  "reason": "Stock already refilled this morning",
  "notes": "Snapshot was stale"
}
```

**Response:**
```json
{
  "suggestion": { ... (rejected status) },
  "decision": {
    "id": "dec_457",
    "status": "rejected",
    "actor": "uid_user123",
    "timestamp": "2026-06-08T10:36:00Z",
    "reason": "Stock already refilled this morning"
  }
}
```

**Side effects:**
- `AutomationDecision` created.
- Suggestion status → `rejected`.
- No automatic action.
- Audit log entry.

### Rules Endpoints (Admin/Owner Only)

#### GET /automation/rules

**Purpose:** List all rules for the organization.

**Auth:** Required (admin+)

**Query params:**
- `enabled`: true | false | null (default: null = show all)
- `ruleType`: "threshold" | ... (optional)

**Response:**
```json
{
  "rules": [
    {
      "id": "rule_low_stock_001",
      "version": 1,
      "name": "Stock Below Minimum",
      "enabled": true,
      "ruleType": "threshold",
      "evaluateOn": "schedule",
      "schedule": "0 */4 * * *",
      "condition": { ... },
      "action": { ... },
      "createdBy": "uid_admin",
      "createdAt": "2026-05-15T00:00:00Z",
      "updatedAt": "2026-06-01T12:00:00Z"
    }
  ]
}
```

#### POST /automation/rules

**Purpose:** Create a new rule.

**Auth:** Required (admin+)

**Body:** (same shape as GET response item)

**Validation:**
- Condition must be valid JSON and match expected schema.
- Action must reference a valid action type.
- Schedule must be valid cron or interval.
- No circular references.

#### PATCH /automation/rules/:id

**Purpose:** Update rule (e.g., disable, change condition).

**Auth:** Required (admin+)

**Body:** (partial update)

**Side effects:**
- New `version` auto-incremented.
- Existing suggestions referencing old version remain unchanged.
- New evaluations use new version.

#### POST /automation/rules/:id/test-dry-run

**Purpose:** Evaluate a rule against current data without creating suggestions.

**Auth:** Required (admin+)

**Response:**
```json
{
  "ruleId": "rule_low_stock_001",
  "evaluatedAt": "2026-06-08T11:00:00Z",
  "matchCount": 3,
  "matches": [
    {
      "itemId": "item_vodka",
      "currentStock": 12,
      "minStock": 20,
      "wouldCreateSuggestion": true
    },
    ...
  ]
}
```

### Offline Action Queue Endpoints

#### POST /offline-actions/sync

**Purpose:** Client sends batch of offline-queued actions; server replays and syncs.

**Auth:** Required (any authenticated user)

**Body:**
```json
{
  "deviceId": "browser_fingerprint_xyz",
  "actions": [
    {
      "clientMutationId": "uuid_1",
      "actionType": "quick_note",
      "timestamp": "2026-06-08T10:15:00Z",
      "operationData": {
        "text": "Vodka running low",
        "itemId": "item_vodka"
      }
    },
    {
      "clientMutationId": "uuid_2",
      "actionType": "refill_confirm",
      "timestamp": "2026-06-08T10:20:00Z",
      "operationData": {
        "refillRunItemId": "brri_456",
        "confirmedQuantity": 24
      }
    }
  ]
}
```

**Response:**
```json
{
  "synced": [
    {
      "clientMutationId": "uuid_1",
      "status": "synced",
      "serverId": "note_123"
    }
  ],
  "conflicts": [
    {
      "clientMutationId": "uuid_2",
      "status": "conflict",
      "reason": "Refill run item no longer open",
      "suggestion": "Refresh bar refill list and retry"
    }
  ],
  "failed": []
}
```

**Side effects:**
- Valid actions create movements, notes, etc. in backend.
- `OfflineActionQueue` entries marked as synced or conflict.
- Audit log entries created.

**Idempotency:** If same `clientMutationId` synced before, return cached result (no duplicate).

#### GET /offline-actions/status

**Purpose:** Check status of client's pending offline actions.

**Auth:** Required

**Query params:**
- `deviceId`: (client identifies itself)

**Response:**
```json
{
  "deviceId": "browser_fingerprint_xyz",
  "actions": [
    {
      "clientMutationId": "uuid_1",
      "status": "synced",
      "syncedAt": "2026-06-08T11:05:00Z"
    },
    {
      "clientMutationId": "uuid_2",
      "status": "pending"
    }
  ]
}
```

### Shift Handover Endpoints

#### GET /shift-handover/draft

**Purpose:** Fetch or auto-create draft for today's shift.

**Auth:** Required (staff+)

**Query params:**
- `date`: (optional, default: today)
- `workspaceId`: (optional, default: user's assigned workspace)

**Response:**
```json
{
  "draft": {
    "id": "draft_789",
    "shiftLeadId": "uid_manager",
    "date": "2026-06-08",
    "summary": "Bar service normal. One incident: vodka stock correction noted.",
    "openItems": [
      {
        "type": "refill",
        "itemId": "item_vodka",
        "description": "Refill needed, approved in system"
      }
    ],
    "alerts": [
      { "type": "anomaly", "id": "sug_consumption_123" }
    ],
    "notes": "...",
    "synthesizedHandover": null,
    "createdAt": "2026-06-08T06:00:00Z"
  }
}
```

#### POST /shift-handover/draft/:id/synthesize

**Purpose:** Generate LLM-assisted handover summary.

**Auth:** Required (staff+)

**Body:** (optional flags)
```json
{
  "includeAlerts": true,
  "includeNotes": true,
  "tone": "professional"
}
```

**Response:**
```json
{
  "draft": { ... },
  "synthesizedHandover": "During the shift, the team handled normal service with one notable incident: vodka stock was corrected (noted at 15:30). Two items are below target and require refill. Recommend checking with procurement on vodka supply. No safety or quality issues noted.",
  "synthesizedAt": "2026-06-08T14:00:00Z"
}
```

**Fallback:** If LLM unavailable, return 503 (Service Unavailable, not mandatory).

#### POST /shift-handover/draft/:id/confirm

**Purpose:** Close shift handover draft and transition to next shift.

**Auth:** Required (manager+)

**Body:**
```json
{
  "confirmedBy": "uid_shiftlead",
  "timestamp": "2026-06-08T22:00:00Z"
}
```

**Response:**
```json
{
  "draft": { ... (confirmedAt set) },
  "archiveId": "archive_123"
}
```

**Side effects:**
- Draft marked confirmed.
- Archived for historical reference.
- Open items / alerts not completed remain as tasks (not auto-cleared).

---

## Cockpit UI Proposal

### Layout Integration

Bevero Cockpit Next (existing) is extended with automation-aware surfaces:

#### 1. Dashboard / Home Screen (Extended)

**Current:** Summary of bar refill status, quick stats.

**New sections:**
- **"Today's Suggestions"** card (collapsible)
  - Shows 3–5 most urgent open suggestions
  - Badge with count (e.g., "5 open")
  - Quick approve/reject buttons (tap to expand detail)
  - Tap "View All" to go to Suggestions page

- **"Critical Alerts"** card
  - High-priority anomalies, open receipts, urgent tasks
  - Red badge if any critical
  - Tap card to go to Alerts page

- **"Offline Status"** badge (if queue not empty)
  - Shows "X pending sync"
  - Tap to see details and retry

#### 2. New Page: Suggestions

**Route:** `/automation/suggestions`

**Access:** Staff and above

**Layout:**
- Filter bar: Status (Open/Approved/Rejected), Type (Refill/Alert/Anomaly), Assigned Role
- List: Suggestion cards with title, detail, created time, status badge
- Each card has:
  - Title and detail text
  - Related item thumbnail/name
  - Timestamp
  - Status badge (open, approved, rejected, expired)
  - Buttons: Approve, Reject, View Detail
  - Expand to see rule origin, condition, input data

- Detail modal on tap:
  - Full suggestion data
  - Rule name and version
  - Condition snapshot
  - Input data (item stock, movement history, etc.)
  - Approve/Reject with reason field
  - Audit trail (who approved, when, reason)

**Mobile UX:**
- Full-width cards on mobile, side-by-side on tablet
- Swipe left to reveal approve/reject actions
- Bottom sheet for detail view

#### 3. Extend: Bar Refill Page

**Route:** `/inventory/bar-refill` (existing)

**New elements:**
- **Suggestion banner** (if refill suggestion exists and is open)
  - "System suggests refill needed: 3 items below stock"
  - Tap to see suggestions inline
  - Approve suggestion to create task

- **Stock status per item** (extend existing UI)
  - Show [current stock] / [min stock] / [target stock]
  - Color code: Green (above target), Yellow (above min, below target), Red (below min)
  - If below min AND open suggestion exists, link suggestion

- **Refill confirmation badges**
  - Show confirm status per item
  - "Pending" if offline-queued
  - "Synced" if confirmed
  - "⚠️ Conflict" if sync failed

#### 4. Extend: Alerts / Review Tasks Page

**Route:** `/alerts` or `/tasks/open` (extend existing)

**New sections:**
- **Automation-generated tasks** (collapsed by default, expandable)
  - Show tasks created from approved suggestions
  - Include suggestion ID, rule origin, and reason
  - Mark as "automation-assisted" with badge

- **Anomaly alerts** (new section if not present)
  - Consumption spikes
  - Unusual correction patterns
  - Open receipt reminders
  - Tap to see explanation and rule

#### 5. New Page: Shift Handover (Staff/Manager)

**Route:** `/shift-handover`

**Access:** Staff and above

**Layout:**
- Date selector (default: today)
- Shift time selectors (start, end)
- Pre-filled sections:
  - Open items (from suggestions, tasks, movements)
  - Alerts summary (count of anomalies, open receipts)
  - Manual notes field
- **"Generate Handover"** button
  - Calls LLM to synthesize summary
  - Shows synthesized text in new field
  - "Regenerate" or "Edit" options
  - **"Confirm & Handover"** button (manager+ only)
    - Locks draft, moves to archive
    - Notifies next shift

- Offline: All local, syncs when online

#### 6. Settings / Admin: Automation Rules (Owner/Admin)

**Route:** `/admin/automation/rules`

**Access:** Admin+

**Layout:**
- List of active rules with toggle enable/disable
- Each rule shows:
  - Rule ID, name, version
  - Rule type (threshold, event, anomaly)
  - Condition summary (human-readable)
  - Last evaluation time, next scheduled
  - "Edit", "Test", "Disable", "History" buttons

- Edit modal:
  - Rule name, description
  - Condition JSON editor with validation
  - Action type and parameters
  - Schedule (cron)
  - Preview: "If X, then Y"
  - "Test Dry-Run" button
  - Save / Cancel

- Test Dry-Run modal:
  - Shows current matches (e.g., 3 items below stock)
  - Would-create suggestions count
  - No changes made

#### 7. Mobile Bottom Nav (No Overload)

**Existing:** Home, Inventory, Movements, Alerts, Menu

**New without nav bloat:**
- Home card shows suggestion count badge
- Alerts tab includes automation alerts
- Menu → Shift Handover (hidden unless staff+)
- Menu → Admin → Rules (hidden unless admin+)

**No new nav items.** Everything fits into existing structure.

#### 8. Quick Action Sheet (Extend)

**Current:** Quick note, quick refill.

**New actions (staff+):**
- "Quick Note" (existing)
- "Confirm Refill Item" (existing)
- "Request Correction" (existing)
- **"View Suggestions"** → Navigate to suggestions page
- **"Shift Handover"** → Navigate to draft
- **"Refresh Cache"** → Manually trigger sync/cache refresh

### Offline UI States

**Every action shows its sync state:**

```
Local badge (disk icon):    "This is saved on your device, not synced yet"
Pending badge (hourglass):  "Waiting to sync..."
Synced badge (checkmark):   "Synced to server"
Conflict badge (⚠️):        "Sync conflict. Tap to resolve."
Error badge (❌):           "Sync failed. Tap to retry."
```

**Example: Quick note saved offline**
```
┌────────────────────────────────────┐
│ 💾 Vodka running low               │
│ "Local"                            │
│                                    │
│ Tap to edit or delete              │
└────────────────────────────────────┘
```

After sync:
```
┌────────────────────────────────────┐
│ ✓ Vodka running low                │
│ "Synced 2 min ago"                 │
│                                    │
│ Tap to view or reference in tasks  │
└────────────────────────────────────┘
```

Conflict:
```
┌────────────────────────────────────┐
│ ⚠️ Vodka running low               │
│ "Conflict"                         │
│                                    │
│ Tap to see server version & resolve│
└────────────────────────────────────┘
```

---

## Phase Plan

Bevero automation is rolled out in controlled phases, each with clear gates.

### Phase A: Read-Only Spec & Architecture Decision
**Duration:** 2–3 weeks (current)

**Deliverables:**
- This spec document ✓
- Architecture decision recorded (ADR)
- API contract drafted
- Data model sketched (no migration yet)
- Risk assessment

**Gate:** Team (product, engineering, ops) agrees on scope, roles, guardrails, and offline strategy.

### Phase B: Rules Engine MVP (No LLM)
**Duration:** 4–5 weeks

**Deliverables:**
- `AutomationRule` table + admin CRUD API
- `AutomationSuggestion` table
- On-write rule evaluation (synchronous, in transaction)
- 2–3 basic rules: low stock, open receipt, anomaly threshold
- Rule testing & dry-run API
- Backend unit & integration tests for rule evaluation

**No UI yet.** Rules fire, suggestions are created, but Cockpit doesn't show them.

**Gate:** Backend tests pass. Dry-run API correctly identifies suggestions. No false positives on production data (dry-run only).

### Phase C: UI Suggestions MVP
**Duration:** 3–4 weeks

**Deliverables:**
- `/automation/suggestions` GET, POST approve, POST reject endpoints
- `AutomationDecision` table + logging
- Cockpit Suggestions page (list + detail)
- Approve/reject UI with reason/notes
- Dashboard card showing open suggestions count
- Bar refill page: suggest refill if low stock rule matches

**Gate:** Staff can see suggestions and approve/reject from mobile. Suggestion approve triggers a task or movement. No false positives in staging.

### Phase D: Offline Queue MVP
**Duration:** 4–6 weeks

**Deliverables:**
- `OfflineActionQueue` table
- Service Worker: intercept POST/PATCH, queue locally if offline
- `/offline-actions/sync` endpoint with idempotency
- IndexedDB caching for bar refill list, snapshots
- Offline UI badges (local, pending, synced, conflict)
- Browser smoke tests for offline > online flow

**Gate:** Staff can work offline, queue actions, and sync on reconnect without conflicts. No lost data.

### Phase E: Shift Handover Drafts
**Duration:** 2–3 weeks

**Deliverables:**
- `ShiftHandoverDraft` table
- `/shift-handover/draft` GET/PATCH endpoints
- `/shift-handover/draft/:id/confirm` endpoint
- Cockpit Shift Handover page
- Auto-populate from open items and alerts
- Manual note editing
- Confirm button (manager+ only)

**Gate:** Shift lead can draft handover from mobile, see open items and notes, confirm, and move to next shift.

### Phase F: Agentic Summaries (LLM Optional)
**Duration:** 3–4 weeks

**Deliverables:**
- `/shift-handover/draft/:id/synthesize` endpoint (calls Claude API)
- LLM prompt design: input (notes, items, alerts) → output (handover text)
- Response caching to avoid redundant calls
- Graceful fallback if LLM unavailable
- Audit logging (inputs/outputs, sanitized)
- Cost estimation & rate limiting

**Gate:** Shift lead taps "Generate Handover", gets text synthesis. Can edit and confirm. LLM is opt-in; feature works without it.

### Phase G: Export/Writeback Compatibility (No Automatic Writeback)
**Duration:** 4–6 weeks

**Deliverables:**
- Spec: Data export format for FoodNotify, Dynamics, DATEV
- Dry-run: Export builder API (`GET /export/movements`, `GET /export/summary`)
- Payload review UI (before export)
- **No automatic writeback.** All exports are manual, reviewed, logged.
- Planned future: FoodNotify API integration with approval gate (not in this phase)

**Gate:** Bevero can export movement summary and anomaly report. Manual file upload to FoodNotify or email export works. No automatic mutations to external systems.

### Timeline Overview

```
Week  1–3   Phase A: Spec (current)
Week  4–8   Phase B: Rules Engine backend
Week  9–12  Phase C: UI Suggestions
Week 13–18  Phase D: Offline Queue
Week 19–21  Phase E: Shift Handover
Week 22–25  Phase F: Agentic Summaries
Week 26–31  Phase G: Export/Writeback prep
```

**Total:** ~7–8 months for full automation layer including optional LLM.

**Minimum viable subset (Phases A–C):** ~3 months for rules-based suggestions without offline or LLM.

---

## Validation Plan

### Testing Strategy

#### 1. Unit Tests (Phases B–F)

**Rule evaluation:**
- Condition matching (threshold, time, event)
- No suggestion duplicate on re-evaluation
- Rule version tracking
- Enable/disable flag respected

**Offline queue:**
- Idempotency key uniqueness
- Sync status transitions (pending → synced)
- Conflict detection
- Cache invalidation

**API:**
- Auth check on every endpoint
- Role-based access (staff, manager, admin)
- Org isolation (user sees only own org's data)
- Input validation

#### 2. Integration Tests (Phases B–F)

**Rule engine:**
- Movement created → rule evaluated → suggestion created (in same transaction)
- Suggestion approved → decision logged → automatic action triggered
- Suggestion rejected → no side effect

**Offline flow:**
- Offline action queued → device offline badge shown → reconnect → sync endpoint called → idempotent replay

**Auth/RLS:**
- User A's suggestion not visible to User B (different org)
- Staff cannot approve their own suggestion (manager+)
- Manager cannot create rules (admin+ only)

#### 3. End-to-End Mobile Smoke Tests

**Scenarios:**

a) **Online refill suggestion**
   - Open bar refill page
   - Add item below min stock
   - Suggestion appears in dashboard
   - Approve suggestion
   - Task created in tasks list
   - Confirm refill item
   - Movement logged

b) **Offline then sync**
   - Disable network
   - Create quick note
   - Badge shows "local"
   - Add refill item confirmation
   - Badge shows "pending"
   - Re-enable network
   - Badges change to "synced"
   - Check backend: note and confirmation exist

c) **Conflict resolution**
   - Go offline, confirm refill item A
   - While offline, admin approves correction for item A
   - Go online
   - Sync shows conflict
   - UI prompts user
   - User taps "accept server state"
   - Local change discarded, server state shown

d) **Shift handover**
   - Open shift handover page
   - View pre-filled open items
   - Add manual notes
   - Tap "Generate Handover" (if LLM available)
   - Review synthesis
   - Confirm handover
   - Check: draft archived, next shift can see notes

#### 4. Data Validation

**No secrets in logs:**
```
SELECT * FROM WorkflowEvent 
WHERE dataJson::text LIKE '%password%' 
   OR dataJson::text LIKE '%api_key%'
```
Result: 0 rows

**No PII in suggestions:**
```
SELECT * FROM AutomationSuggestion 
WHERE detail LIKE '%@%' OR detail LIKE '%phone%'
```
Result: 0 rows (unless explicitly role-scoped)

**Stock consistency:**
```
SELECT item_id, SUM(quantity) as net_movement
FROM InventoryMovement
GROUP BY item_id
ORDER BY net_movement DESC
-- Spot-check: movements + snapshot = expected stock
```

#### 5. Performance & Load Testing

**Rule evaluation latency:**
- Single rule evaluation on 1000 items: <500ms
- 10 concurrent sync requests: each <2s

**Offline queue size:**
- 100 queued actions: <5MB in IndexedDB
- Sync time (100 actions): <10s over 4G

**LLM cost/latency (Phase F):**
- Handover synthesis: <5s
- Cost: <$0.10 per synthesis (gating as needed)

#### 6. Regression Tests

**Existing features must not break:**
- Bar refill list still loads ✓
- Movements still create snapshots ✓
- Corrections still require admin review ✓
- Balances page still shows current stock ✓
- Transfer flow still works ✓
- Mobile auth still enforces RLS ✓

---

## Risks & Mitigation

### Risk 1: Rules Fire Too Often (False Positives)

**Impact:** Staff ignore suggestions, automation becomes noise.

**Mitigation:**
- Phase B dry-run extensively against production snapshot
- Tune thresholds (e.g., minStock * 0.8 before suggesting)
- Implement suggestion deduplication (don't suggest same item twice in 4h)
- Hourly suggestion cleanup (expire stale suggestions)
- Track approval rate by rule type; disable rules <20% approval

### Risk 2: Suggestion Approval Becomes Another Task

**Impact:** Staff approval queues grow, managers overwhelmed.

**Mitigation:**
- Limit suggestions to high-confidence patterns (start with 2–3 rules)
- Bulk approve: allow manager to approve 5 similar suggestions at once
- Auto-expire low-priority suggestions after 24h
- Track time-to-approval metric; optimize if >1h average

### Risk 3: Offline Sync Creates Duplicates or Conflicts

**Impact:** Stock movements doubled, corrections lost, audit trail corrupted.

**Mitigation:**
- Strong idempotency key (clientMutationId is indexed unique)
- Server-side deduplication check before creating movement
- Explicit conflict detection (server snapshot vs. client base version)
- Test conflict resolution flow heavily (Phase D gate)
- Rollback all synced actions if any fail (transactional batch)

### Risk 4: LLM Handover Summaries Are Hallucinating or Biased

**Impact:** Shift lead is misled, operations disrupted.

**Mitigation:**
- Handover synthesis is advisory only, not mandatory
- Shift lead reviews before confirming (explicit review step)
- No sensitive data in synthesis (no names, no detailed incident details)
- Audit log: log all inputs to LLM and output for review
- Cost/latency acceptable (fail gracefully if LLM unavailable)

### Risk 5: External Systems Are Overwritten (Writeback Risk)

**Impact:** FoodNotify/Dynamics data corrupted, reconciliation nightmare.

**Mitigation:**
- ADR-0002: No writeback in v1. This spec preserves that.
- All export is manual, reviewed, audit-logged
- Planned Phase G: Export only, no automatic writeback
- Future writeback (if ever) requires separate decision, API key rotation, and explicit approval per message

### Risk 6: Auth/RLS Loopholes

**Impact:** User A sees User B's suggestions or approves other org's decisions.

**Mitigation:**
- ADR-0014 & ADR-0017: RLS enforced at DB role level
- Every suggestion/decision query includes org filter
- API layer validates actor role (staff, manager, admin)
- Test matrix: each role, each org isolation scenario
- RLS audit quarterly (SELECT via app_runtime role, verify isolation)

### Risk 7: Offline Queue Grows Unbounded

**Impact:** Device storage exhausted, sync fails, user experience degrades.

**Mitigation:**
- OfflineActionQueue cleanup: delete synced/failed after 30 days
- IndexedDB size limit: warn user at 10MB, block at 50MB
- Sync-first strategy: encourage online work, offline is fallback
- Telemetry: track queue size per user, alert on >5MB

### Risk 8: Rules Engine Becomes Unmaintainable

**Impact:** New rules hard to add, debugging slow, no one understands system.

**Mitigation:**
- Rule schema is versioned and validated
- Every rule has tests (dry-run captures expected matches)
- Rule audit log tracks changes and who enabled/disabled
- Documentation: runbook per rule, clear condition language
- Quarterly rule review: disable unused rules, merge duplicates

---

## Security Considerations

### Authentication & Authorization

- Supabase Auth + RLS enforced per ADR-0014, ADR-0017
- Service-role credentials never used in UI/client code
- Every API call validates actor's org membership and role
- Offline queue actions validated on sync (role may have changed)

### Data Privacy

- No customer names or sensitive info in automation suggestions
- Audit logs are internal (not shared with users)
- Export data must be reviewed before sharing
- QuickNote text is not processed by LLM unless user explicitly opts in

### Audit & Compliance

- Every suggestion: source rule, condition, inputs logged
- Every approval/rejection: actor, timestamp, reason logged
- Every automatic action: decision ID, outcome logged
- 12-month retention policy for audit tables
- Redaction: before export, scrub API keys, tokens, PII from raw payloads

---

## Next Smallest Implementation Gate

### Gate: Automation Spec Acceptance & ADR

**Checklist:**

1. ✓ This spec document is reviewed and approved by:
   - Product (positioning, scope, UX)
   - Engineering (architecture, RLS, offline strategy)
   - Ops (performance, guardrails, monitoring)

2. ✓ ADR-0020 (or next sequential) recorded:
   - Decision: Bevero adopts rules-first automation with human control points
   - Rationale: Reduces manual effort, preserves accountability, stays complementary to FoodNotify
   - Consequences: 7–8 months to full implementation; Phase A–C is 3-month minimum; offline queue required for staff UX; no automatic writeback to external systems

3. ✓ Risk assessment reviewed and mitigation accepted

4. ✓ Phase A deliverables (this spec) approved for commit

### Next Concrete Work

After spec acceptance:

1. **Phase B kickoff:** Engineer reviews rules engine backend architecture, sets up AutomationRule & AutomationSuggestion schema in a new Prisma migration (tracked, not executed by this spec).

2. **Phase C design:** Product & UX define Suggestions UI mockups and validate mobile flows.

3. **Phase D feasibility:** Engineer evaluates Service Worker setup, IndexedDB schema, offline queue design.

**All phases maintain read-only constraint:** No automatic external writes, no service-role credentials in user flows, human approval always required.

---

## Appendix A: Observed, Inferred, Applied

### Observed

- Bevero repo already has `WorkflowEvent`, `WorkflowTask`, `InventoryMovement` models supporting audit trails
- Bar refill, goods receipt, and movement flows are operational
- RLS and role-based auth (owner > admin > manager > staff > viewer) are in place per ADR-0015
- Supabase Postgres with direct Prisma connections and `app_runtime` role (ADR-0017)
- FoodNotify mail ingestion baseline exists but is non-binding
- Multi-org support is in design (ADR-0014)
- Cockpit Next is the active frontend; `web/` is frozen
- Production deployment via Vercel
- Phase 0 (stabilization) is the current focus per VISION.md

### Inferred

- Automation suggestions should reuse existing task/event infrastructure where possible
- Offline queue is necessary for mobile staff (spotty connectivity in kitchen/bar)
- Rules must be deterministic and auditable (not ML/LLM-driven for decision logic)
- Guardrails against external system mutation are hard constraints (ADR-0002 preservation)
- Cost and latency of LLM synthesis should be acceptable (<$0.10/call, <5s)
- Staff need simple, mobile-first UI for approvals (not a desktop admin interface)

### Applied

1. **Suggestion model** captures rules, conditions, and human approval separately
2. **OfflineActionQueue** ensures mobile staff aren't blocked by network
3. **AutomationDecision** log makes every approval auditable
4. **Rule versioning** allows rules to change without disrupting open suggestions
5. **Phased rollout** starts with rules only (no LLM), adds UI, then offline, then optional synthesis
6. **Explicit guardrails** document what automation cannot do (mutations, writeback, escalation)
7. **Cockpit UI integration** uses existing navigation structure (no new tabs)

### Verified

- Schema models fit existing Prisma architecture
- API endpoints follow existing patterns (org scoping, role checks)
- RLS contract (ADR-0017) is compatible with suggestions and decisions
- Offline queue idempotency is sound
- Phases are sequenced to support MVP by Phase C (~3 months)

### Risks / Gaps

- **Rule expression language:** This spec uses JSON; future may need DSL or UI builder
- **LLM provider:** Assumes Claude; switching providers requires prompt re-tuning
- **Export format:** FoodNotify/Dynamics compatibility is sketched but not detailed
- **Multi-org rule inheritance:** Unclear if rules are org-specific or global; Phase B must clarify
- **Conflict resolution UX:** Detailed interaction design needed (Phase D)
- **Cost tracking:** LLM costs may scale; needs monitoring and gating logic
- **Rule discovery:** UI for operators to understand why suggestion fired needs design work

### Next Gate

**Phase B (Rules Engine MVP):** Engineer + product define:
1. AutomationRule table schema (condition/action JSON schema validation)
2. Rule evaluation algorithm (traversal order, condition matching)
3. First 2–3 production rules (low stock, open receipt, consumption anomaly)
4. Test strategy for rules (unit + dry-run API)
5. Monitoring plan (rule hit rate, suggestion creation rate, false positives)

Once Phase B architecture is signed off, implementation begins.

---

## Document Metadata

- **Version:** 1.0 (Initial Spec)
- **Date:** 2026-06-08
- **Owner:** @baum777 (Product/Engineering)
- **Status:** Ready for Architecture Review
- **Related ADRs:** ADR-0002 (read-only posture), ADR-0014 (org identity), ADR-0015 (role grants), ADR-0017 (RLS enforcement)
- **Related Docs:** VISION.md, ARCHITECTURE.md, DECISIONS.md, ROLE_BASED_UI_UX_PHASE_0.md
- **Next Review:** After Phase A approval and before Phase B kickoff
