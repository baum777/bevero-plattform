# Cockpit Runtime Smoke Checklist

Canonical scope for Cockpit runtime smoke in this repository.

## Latest Status (2026-06-01)

- Supabase runtime smoke (`npm run smoke:supabase`): pass
  - Transfer: pass
  - Cross-org rejection: pass
  - Profile RPC: pass
  - Alerts/backend route: pass
  - Dashboard history: pass
- RLS/browser-select validation:
  - Local migration/test slice: pass
  - New hardening migration: `prisma/migrations/20260601153000_harden_inventory_browser_select_rls/migration.sql`
  - Deploy: blocked (`npx prisma migrate status` reaches Supabase but exits with Prisma schema-engine error)
  - Pending live fix: authenticated browser role hydration needs SELECT grants on existing RLS-scoped membership/profile tables.
- Browser smoke:
  - Surface: In-App-Browser
  - `data:` navigation: blocked by Browser URL policy
  - Unauthenticated: pass (`/sign-in` HTTP 200 and DOM/screenshot reachable)
  - Authenticated `/movements`: partial
    - `/movements` loads with article/storage select UI and submit button visible.
    - Fresh console error check: none found.
    - Lead-role history path remains pending until the hardening migration is deployed.
  - Meaning: Cockpit routing/runtime and browser-select UI are reachable; live DB role hydration is still gated by migration deploy.

## Safety Gate

- `SMOKE_TEST_ENABLED=true`
- `DATABASE_URL` points to Supabase
- `DIRECT_URL` points to Supabase
- No local Postgres target for this run
- No secrets in logs, docs, git diff, or committed files
- No writes to non-`smoke_*` datasets

## Browser Smoke Seed Helper

- Script: `scripts/smoke/browser-smoke-seed.ts`
- Command:

```bash
SMOKE_TEST_ENABLED=true COCKPIT_SMOKE_SEED_ENABLED=true npm run smoke:browser:seed
```

- Safety behavior:
  - Without `SMOKE_TEST_ENABLED=true`: no writes, controlled skip
  - Without `COCKPIT_SMOKE_SEED_ENABLED=true`: no new writes
  - Without valid Supabase-backed `DATABASE_URL` and `DIRECT_URL`: controlled skip
- Data behavior:
  - Uses only isolated `smoke_*` ids/names
  - Upsert/find-or-create only for smoke scope
  - No unbounded deletes/updates
- User behavior:
  - Does not create Supabase Auth users in default path
  - Requires existing `COCKPIT_SMOKE_USER_ID` (or discoverable existing smoke membership user)

## Required Inputs For Authenticated Browser Smoke

Use this local-only template (never commit real credentials):

```env
COCKPIT_SMOKE_BASE_URL=http://localhost:3000
COCKPIT_SMOKE_USER_ID=<supabase-auth-user-uuid>
COCKPIT_SMOKE_USER_EMAIL=**SET_TEST_EMAIL**
COCKPIT_SMOKE_USER_PASSWORD=**SET_TEST_PASSWORD**
COCKPIT_SMOKE_EXPECTED_ROLE=owner
COCKPIT_SMOKE_TEST_ORG=<smoke_org_id>
COCKPIT_SMOKE_TEST_WORKSPACE=<smoke_workspace_id>
COCKPIT_SMOKE_TEST_ITEM=<smoke_item_id>
COCKPIT_SMOKE_SOURCE_STORAGE=<smoke_source_storage_id>
COCKPIT_SMOKE_TARGET_STORAGE=<smoke_target_storage_id>
COCKPIT_SMOKE_SAFE_TRANSFER_QTY=1
COCKPIT_SMOKE_ALLOW_MUTATIONS=false
```

`COCKPIT_SMOKE_ALLOW_MUTATIONS=true` is required for transfer or alert mutation steps.

## Auth Smoke User Setup (Preferred: Option A)

No automatic admin Auth-user creation is committed in this repo for browser smoke.

Use Supabase Dashboard manually:

1. Open `Authentication -> Users`.
2. Create a dedicated smoke user (or reset password of existing smoke user).
3. Confirm the user is usable for password sign-in.
4. Copy the user UUID into `COCKPIT_SMOKE_USER_ID`.
5. Set local `COCKPIT_SMOKE_USER_EMAIL` and `COCKPIT_SMOKE_USER_PASSWORD`.
6. Ensure this user is member of smoke organization/workspace (`OrganizationMember`, `WorkspaceMember`).

Valid password definition for browser smoke:

- Valid: the current password of the Supabase Auth user behind `COCKPIT_SMOKE_USER_EMAIL`
- Invalid sources:
  - database password
  - `service_role` key
  - anon/publishable key
  - Redis password
  - Vercel password
  - GitHub password

## Authenticated Browser Smoke Runbook

No dedicated automated browser runner is committed yet; use this deterministic manual runbook.

### Preconditions

- App available at `COCKPIT_SMOKE_BASE_URL` (default: `http://localhost:3000`)
- All required `COCKPIT_SMOKE_*` inputs set locally
- Valid Supabase Auth credentials

### Steps

1. Open `/sign-in` and login with `COCKPIT_SMOKE_USER_EMAIL` and `COCKPIT_SMOKE_USER_PASSWORD`.
2. If redirected to `/sign-in?error=invalid_credentials`: stop and mark `blocked`.
3. Verify dashboard load (`/dashboard`) and no hard error state.
4. Verify profile page (`/settings/profile`) load and profile form visibility.
5. Verify movements page (`/movements`) load and transfer form visibility.
6. Verify alerts page (`/alerts`) with role-consistent behavior:
   - admin/owner: table or empty-state, actions visible by status
   - viewer/staff without rights: `AccessDenied` path
7. Read-only check: transfer validation rejects same source/target.
8. Mutation step (only when `COCKPIT_SMOKE_ALLOW_MUTATIONS=true`):
   - Execute exactly one transfer using smoke ids and `COCKPIT_SMOKE_SAFE_TRANSFER_QTY`
   - Confirm movement appears in history and balances update consistently
9. Record console/runtime errors if visible in browser dev tools.

### Structured Outcome Template

- Target: localhost | preview | production
- Login/session: pass | invalid_credentials | skipped
- Dashboard: pass | fail | skipped
- Profile: pass | fail | skipped
- Movements/Transfer: pass | partial | fail | skipped
- Alerts: pass | partial | fail | skipped
- AccessDenied behavior: pass | fail | skipped
- Console errors: none | found | not checked
- Mutations: transfer run|skipped, alert action run|skipped, profile update run|skipped
- Cleanup: done | not needed | skipped

## Current Open Risk

- Authenticated browser runtime history/lead-role behavior is still partial until the pending RLS hardening migration is deployed and the runbook is re-executed.
