# cockpit

In-repo Next.js App Router frontend surface for Cockpit.

## Scope

- Active migration target for Cockpit UI tickets.
- Uses existing backend API and Supabase/RLS-backed data model from this repository.
- Does not replace backend/Prisma authority.
- Phase-0 foundation now includes route groups, app shell, and protected-route middleware scaffolding.

## Current Route Structure

- Public health check: `/health`
- `/(auth)`: `/sign-in`, `/sign-up`, `/callback` (route handler)
- `/(onboarding)`: `/onboarding`
- `/(app)`:
  - `/dashboard`
  - `/inventory/*` (including `/inventory/bar-refill` and the Phase 1
    `/inventory/goods-receipt` shipped in `ccf0f50`)
  - `/kitchen/walk-route` (Phase 2 Küche physical count workflow)
  - `/movements`
  - `/workspaces`
  - `/storage`
  - `/alerts`
  - `/settings/*`
  - `/shift-handover` (Phase 1 read/draft/confirm, shipped in `ccf0f50` —
    LLM-synthesized handover draft is still pending, see below)
  - `/automation/suggestions` (Phase C planning stub, data-less)

## Middleware Note

- Protected routes now run through Supabase SSR middleware (`auth.getClaims()` + OrganizationMember lookup).
- Route access flow:
  - No valid claims -> redirect `/sign-in`
  - No `OrganizationMember` match:
    - On protected app routes -> redirect `/onboarding`
    - On `/onboarding` -> allow
  - Membership found:
    - On `/onboarding` -> redirect `/dashboard`
    - On protected app routes -> continue

## Navigation & Shell

The app shell (`app/components/app-shell.tsx`) renders the persistent chrome around `/(app)` routes:

- **Sidebar** (desktop ≥ 1024px): nav items are filtered by organization role via the `allowed` lists on each entry.
- **Bottom tab bar** (`app/components/bottom-nav.tsx`, mobile < 1024px): 5-slot tab bar (Start, Auffüllen, ⊕ quick-action sheet, Verlauf, Dashboard). The center `+` opens a slide-up sheet with "Verbrauch buchen" (→ `/movements`) and "Auffüllliste starten" (→ `/inventory/bar-refill`).
- **Quick-notes FAB** (`app/components/quick-notes-fab.tsx`): floating button opening a note / checklist overlay. Notes are persisted in `localStorage` under `bevero-quick-notes` (max 20); markdown preview is rendered from an in-house mini-parser with HTML-escaped input (no external markdown library).

### Role-based access (UI visibility)

Roles come from `OrganizationMember.role` via the auth provider; the `useRole()` hook (`hooks/useRole.ts`) exposes the current role with a safe `staff` fallback. Nav visibility (sidebar + bottom bar):

| Route | staff / viewer | manager | admin / owner |
| --- | --- | --- | --- |
| `/inventory/bar-refill`, `/movements`, `/inventory/goods-receipt` | ✅ | ✅ | ✅ |
| `/shift-handover` | ✅ (read/draft) | ✅ (confirm) | ✅ |
| `/dashboard`, `/inventory/*`, `/workspaces`, `/storage`, `/alerts` | ❌ | ✅ | ✅ |
| `/settings/*` | ❌ | ❌ | ✅ |
| `/automation/suggestions` | ✅ (stub only) | ✅ (stub only) | ✅ (stub only) |

> **Planned (not yet shipped):** `/admin/automation/rules` (admin+), the
> LLM-synthesized handover draft (Phase E remainder), the Service Worker
> offline cache (Phase D), and the production endpoints behind
> `/automation/suggestions` (Phase C). All are tracked under
> `docs/automation/semi-automated-operations-layer.md` and must not land
> before the spec exits the relevant phase and the corresponding ADR
> is `accepted`.

The root route (`app/page.tsx`) performs a server-side, role-based redirect after login: `owner`/`admin`/`manager` → `/dashboard`, otherwise → `/inventory/bar-refill`. This is UI visibility only — backend auth/RLS remains the source of truth.

### Theme

Light/dark theme is managed by `hooks/useTheme.ts`, backed by `localStorage` key `bevero-theme` and a no-flash bootstrap script in the root layout.

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_COMMIT_SHA`

`NEXT_PUBLIC_API_BASE_URL` must point to the stable `bevero-plattform-api`
surface for Cockpit flows that still call repository-owned Fastify endpoints.
It is public browser configuration, not a secret. Do not point it at the
Cockpit frontend origin.

## Backend Gate

Current backend-dependent Cockpit flows:

| File | Flow | Backend endpoint | Auth/JWT | DB mutation |
| --- | --- | --- | --- | --- |
| `app/(app)/movements/movements-client.tsx` | Movement history | `GET /admin/inventory/movements` | Supabase bearer token | No |
| `app/(app)/movements/movements-client.tsx` | Book goods receipt | `POST /goods-receipts` | Supabase bearer token | Yes |
| `app/(app)/movements/movements-client.tsx` | Book withdrawal | `POST /withdrawals` | Supabase bearer token | Yes |
| `app/(app)/movements/movements-client.tsx` | Request correction | `POST /correction-requests` | Supabase bearer token | Yes |
| `app/(app)/movements/movements-client.tsx` | Book transfer | `POST /transfers` | Supabase bearer token | Yes |
| `app/(app)/kitchen/walk-route/walk-route-client.tsx` | Walk-Route variance → correction request (Phase 2 Kitchen) | `POST /correction-requests` | Supabase bearer token | Yes |
| `app/(app)/freigaben/freigaben-client.tsx` | Approve / reject correction (Phase 2 Kitchen) | `POST /admin/correction-requests/:id/approve|reject` | Supabase bearer token (manager+) | Yes |
| `app/(app)/freigaben/page.tsx` | List open correction requests | `GET /admin/correction-requests?status=open` | Supabase bearer token | No |
| `app/(app)/inventory/bar-refill/refill-client.tsx` | Create/load bar refill run | `POST /bar-refill/runs` | Supabase bearer token | Yes |
| `app/(app)/inventory/bar-refill/refill-client.tsx` | Update requested quantity | `PATCH /bar-refill/runs/:runId/items/:itemId` | Supabase bearer token | Yes |
| `app/(app)/inventory/bar-refill/refill-client.tsx` | Confirm run item | `POST /bar-refill/runs/:runId/items/:itemId/confirm` | Supabase bearer token | Yes |
| `app/(app)/inventory/bar-refill/refill-client.tsx` | Cancel run item | `POST /bar-refill/runs/:runId/items/:itemId/cancel` | Supabase bearer token | Yes |
| `lib/backend/review-tasks.ts` | List review tasks | `GET /admin/review-tasks` | Supabase bearer token | No |
| `app/api/alerts/tasks/[id]/[command]/route.ts` | Start/resolve/dismiss review task | `POST /admin/review-tasks/:id/:command` | Supabase bearer token | Yes |

### Planned Backend Endpoints (Phase B / C / D / E)

The following endpoints are specified in
`docs/automation/semi-automated-operations-layer.md` and must not be
implemented before the corresponding phase gate and an accepted ADR.
They are listed here for the Cockpit frontend to plan UI surface
against; do not import or call them from Cockpit until they exist on
the backend.

| Surface | Endpoint | Auth | Notes |
| --- | --- | --- | --- |
| List suggestions | `GET /automation/suggestions` | Supabase bearer (staff+) | Filters: status, type, assigned role |
| Approve suggestion | `POST /automation/suggestions/:id/approve` | Supabase bearer (manager+) | Triggers deterministic automatic action |
| Reject suggestion | `POST /automation/suggestions/:id/reject` | Supabase bearer (manager+) | Audit reason required |
| List rules (admin) | `GET /automation/rules` | Supabase bearer (admin+) | Filter by enabled, ruleType |
| Create / update rule | `POST\|PATCH /automation/rules` | Supabase bearer (admin+) | New version on update |
| Dry-run rule | `POST /automation/rules/:id/test-dry-run` | Supabase bearer (admin+) | No mutations |
| Sync offline actions | `POST /offline-actions/sync` | Supabase bearer (any) | Idempotent via `clientMutationId` |
| Offline status | `GET /offline-actions/status` | Supabase bearer (any) | Per-device |
| Fetch handover draft | `GET /shift-handover/draft` | Supabase bearer (staff+) | Auto-creates today's draft |
| Synthesize handover | `POST /shift-handover/draft/:id/synthesize` | Supabase bearer (staff+) | Optional LLM; 503 if unavailable |
| Confirm handover | `POST /shift-handover/draft/:id/confirm` | Supabase bearer (manager+) | Locks draft into archive |

For the current MVP/Beta gate, keep Cockpit-Next as the frontend and run the Fastify backend as a separate stable API target configured through `NEXT_PUBLIC_API_BASE_URL`. Migrating these flows into Next route handlers or Supabase server logic is the cleaner long-term consolidation path, but it should happen endpoint-by-endpoint with explicit auth, RLS, and mutation tests.

## Commands

From repository root:

```bash
npm run dev:cockpit        # Next.js dev server
npm run build:cockpit      # Production build
npm --workspace=apps/cockpit run typecheck  # TypeScript type-check
```

## Known Build Warning

- Next.js may warn about multiple lockfiles because the repository root contains `package-lock.json` (npm workspace).
- Current status: documented and accepted.
- Reason: intentional for npm workspace layout; Cockpit inherits root dependencies.

## UI Primitives

- `app/components/ui/button.tsx`
- `app/components/ui/badge.tsx`
- `app/components/ui/card.tsx`
- `app/components/ui/empty-state.tsx`
- `app/components/ui/error-state.tsx`

## Shell Components & Hooks

- `app/components/app-shell.tsx` — sidebar + topbar + mounts bottom nav and quick-notes FAB
- `app/components/bottom-nav.tsx` — mobile tab bar + quick-action sheet
- `app/components/quick-notes-fab.tsx` — floating note / checklist overlay (localStorage)
- `hooks/useRole.ts` — current organization role (`staff` fallback)
- `hooks/useTheme.ts` — light/dark theme state (`bevero-theme`)

## Inventory Data Reads

- Inventory pages currently query Supabase directly through:
  - `lib/supabase/queries/inventory.ts`
- Covered reads:
  - `InventoryItem` list with status/search filters
  - `InventoryStockSnapshot` + `InventoryItem` + `StorageLocation` aggregation for balances

## Planned Cockpit Surfaces (Automation Layer)

The following sub-sections describe the Cockpit frontend surface for the
automation layer specified in
`docs/automation/semi-automated-operations-layer.md`. They are split
between **already shipped** (Phase 1) and **still planned** (Phases B,
C, D, E-remaining, F). Do not scaffold the planned sections before
the spec exits the relevant phase and the corresponding ADR is
`accepted`.

### Shipped (Phase 1)

These are real routes backed by real implementation. They are listed
here for the planning context, not as proposals.

- **`/shift-handover`** — read / draft / confirm shift handover
  (shipped in `ccf0f50`). Provides the date selector, manual notes
  field, and the manager+ confirm button. **Does not yet call the
  optional LLM synthesize endpoint** described in the spec; that is
  the Phase E remainder, tracked below.
- **`/inventory/goods-receipt`** — intake of incoming goods against a
  purchase order (shipped in `ccf0f50`). Creates a
  `GoodsReceipt`-style workflow task and refreshes the stock snapshot
  in the same Prisma transaction (per ADR-0006 / ADR-0007).

### Still planned (Phase C, D, E-remaining, F)

#### Suggestions Page (Phase C, planned)

**Route:** `/automation/suggestions`
**Current state:** planning stub shipped at
`apps/cockpit/app/(app)/automation/suggestions/page.tsx` with a
data-less role-gated empty state. Will be wired to
`GET /automation/suggestions` when ADR-0022 is accepted and the
backend endpoints are in place.
**Access (when shipped):** Staff and above. Approve / reject actions
are manager+.
**Source spec:** §Cockpit UI Proposal → Suggestions in
`docs/automation/semi-automated-operations-layer.md`.

Layout (planned):

- Filter bar: status (`open` / `approved` / `rejected`), type
  (`refill` / `receipt_alert` / `consumption_anomaly` /
  `alert_consolidation`), assigned role.
- List of suggestion cards with title, detail, related item thumbnail,
  timestamp, status badge. Each card has `Approve` / `Reject` /
  `View Detail`. Expand to see rule origin, condition snapshot, input
  data, and audit trail.
- Detail modal: full suggestion data, rule name + version, condition
  snapshot, input data, reason field, full decision history.
- Mobile UX: full-width cards, swipe-left to reveal approve/reject,
  bottom sheet for detail.

Dashboard integration (planned):

- "Today's Suggestions" card on `/dashboard`, collapsible, badge with
  open count, quick approve/reject, "View All" link to this page.
- "Offline Status" badge (if `OfflineActionQueue` is non-empty) — see
  the Offline Cache section below.

#### LLM-Synthesized Handover Draft (Phase E, remainder)

**Route:** same as the shipped `/shift-handover`; the synthesize
endpoint is a separate action.
**Current state:** the shipped `/shift-handover` page does not call
the synthesize endpoint. The "Generate Handover" button is planned.
**Source spec:** §Cockpit UI Proposal → Shift Handover (LLM section)
in `docs/automation/semi-automated-operations-layer.md`.

- "Generate Handover" button calls the optional LLM synthesize
  endpoint. If the LLM is unavailable the feature degrades gracefully
  (no synthesis, manual draft still works).
- "Regenerate" / "Edit" actions for the synthesized text.
- The shipped confirm flow already covers the manager+ lock and
  archive.

#### Offline Cache & Sync (Phase D, planned)

**Component:** Service Worker (registration deferred to a separate
gate per spec).
**Source spec:** §Service Worker / Offline-First Strategy and
§Offline Queue & Sync Strategy in
`docs/automation/semi-automated-operations-layer.md`.

Local data cache (planned):

- Bar refill template (daily refresh or on demand).
- Bar refill run for today (refresh on open, sync on save).
- Recent item snapshots and balance data.
- Last 7 days of movements (offline context).
- Shift handover notes (local-only until synced).
- Quick note drafts.

Cache invalidation (planned): explicit "Refresh" button, automatic
refresh on app foreground (mobile), time-based expiry (4h for
snapshots, 24h for templates), cache-busting version header from the
API.

Offline action queue (planned):

- Staff can log quick notes, confirm refill items, and request stock
  corrections while offline. Each action gets a client-generated
  `clientMutationId` (UUID / operation+timestamp hash) for idempotent
  server replay.
- Local `OfflineActionQueue` shows per-action status badges:
  `local` (saved on device, not synced), `pending` (waiting to sync),
  `synced` (confirmed by backend), `⚠️ conflict`, `❌ error`.
- On reconnect the Cockpit posts the batch to
  `POST /offline-actions/sync`. The server is the source of truth and
  may return conflicts; the UI must show a conflict resolution prompt
  with the option to accept server state, retry against the new
  snapshot, or dismiss.

UI surfaces (planned):

- Bar refill item rows show per-item sync status (`Offen` / `Pending`
  / `Synced` / `⚠️ Conflict` / `❌ Error`).
- Quick notes FAB notes show the same badge vocabulary.
- "Offline Status" card on `/dashboard` lists pending and conflicted
  actions with retry / resolve actions.

Hard rules for the offline slice:

- Never mutate stock on the client without a confirmed server response
  and a valid session.
- No background mutation without explicit user intent.
- Auth and role are re-validated on sync; revoked access rejects
  queued actions with `authorization changed`.
- No PII or secrets in cached payloads. Audit trail sanitization runs
  before export or retention.
