# Vercel Deployment — Bevero-Plattform SOT

**Stand:** 2026-07-03
**Gültig für:** Monorepo `bevero-plattform`
**Team / Scope:** `forgedfromwood`

---

## Canonical Projects

Diese drei Projekte sind die einzigen autorisierten Bevero-Plattform-Ziele.
Die alten Projekte `bevero-api` und `bevero-ui` bleiben unangetastet und sind
keine Bevero-Plattform-Deploy-Ziele.

| App | Vercel-Projekt | Projekt-ID | Repo-relativer Root | Status |
|---|---|---|---|---|
| `apps/api` | `bevero-plattform-api` | `prj_QEYGXu3hbDyvuCkUX2Sh0uJUQL7M` | `apps/api` | linked, preview-only, prod blocked |
| `apps/cockpit` | `bevero-plattform-cockpit` | `prj_ymfMaXixvk2FaDgQ7Nyd4QSwj28i` | `apps/cockpit` | linked, preview-only, prod blocked |
| `apps/landing` | `bevero-plattform-landing` | `prj_94WhlY4UzKh8GcSrAwVXmytHKM6Z` | `apps/landing` | linked, preview-only, prod blocked |

Note: `vercel project inspect` shows `Root Directory = "."` because the project
was linked from the app directory itself. Repo-relative ownership still lives in
the app paths above.

---

## Hard Rules

* Never deploy from the repo root.
* Keep the repo-root `.vercel/` absent.
* Use preview deploys first.
* Production deploys require a separate Owner GO.
* Do not reuse any Bevero-Plattform app as a transport for legacy
  `rauschenberger-os` Vercel projects.

Preview command shape:

```bash
cd apps/api && vercel
cd apps/cockpit && vercel
cd apps/landing && vercel
```

Observation from this session: `vercel deploy` on the local CLI produced
production-targeted deployments and aliases. Do not use it as the preview
command in this workspace.

Production remains blocked until a separate Owner approval is issued:

```bash
cd apps/api && vercel deploy --prod
cd apps/cockpit && vercel deploy --prod
cd apps/landing && vercel deploy --prod
```

---

## Root Context

The repo root must not carry a live Vercel project link. If `.vercel/` reappears
at the repo root, treat it as a deploy-safety regression and remove it before
any further deployment work.

---

## Environment Boundary

### `apps/api` — `bevero-plattform-api`

Framework: Node / Fastify

Required runtime variables:

| Variable | Scope | Notes |
|---|---|---|
| `NODE_ENV` | config | `production` for prod-only deploys |
| `DATABASE_URL` | secret | Supabase pooled Postgres URL |
| `DIRECT_URL` | secret | Supabase direct URL for Prisma / migrations |
| `SUPABASE_JWT_SECRET` | secret | Auth token verification |
| `CORS_ALLOWED_ORIGINS` | config | Must include the Bevero-Plattform Cockpit origin |
| `UPSTASH_REDIS_REST_URL` | secret | Redis runtime dependency, if enabled |
| `UPSTASH_REDIS_REST_TOKEN` | secret | Redis runtime dependency, if enabled |
| `LOG_LEVEL` | config | Default `info` |
| `DEMO_MODE` | config | Must be `false` in production |
| `SYNC_ENABLE_SCHEDULED_JOBS` | config | Default `false` |
| `PROCUREMENT_ORGANIZATION_ID` | config | Only for FoodNotify ingest flows |
| `MICROSOFT_TENANT_ID` | secret | Only for Graph integration flows |
| `MICROSOFT_CLIENT_ID` | secret | Only for Graph integration flows |
| `MICROSOFT_CLIENT_SECRET` | secret | Only for Graph integration flows |
| `FOODNOTIFY_MAILBOX` | config | Only for Graph integration flows |
| `FOODNOTIFY_IMPORT_ENABLED` | config | Default `false` |

### `apps/cockpit` — `bevero-plattform-cockpit`

Framework: Next.js

Required runtime variables:

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase anon / publishable key |
| `BEVERO_API_BASE_URL` | public config | Required; no fallback to `bevero-api` or localhost |
| `NEXT_PUBLIC_APP_ENV` | public | `production` / `preview` / `local` |
| `NEXT_PUBLIC_COMMIT_SHA` | public | Vercel git commit SHA |
| `NEXT_PUBLIC_SITE_URL` | public | Optional, for auth redirects |

### `apps/landing` — `bevero-plattform-landing`

Framework: Vite

No secrets. Keep landing static unless a documented public URL dependency is
introduced later.

---

## Legacy Shared Projects

Die folgenden Vercel-Projekte existieren historisch oder aktuell im Team, sind
aber keine Bevero-Plattform-Ziele:

| Projekt | Zuordnung | Aktion |
|---|---|---|
| `bevero-api` (`prj_EcJwphogd9Gi1KbOLtQWPpfoQjOW`) | legacy shared project | nicht verwenden, unangetastet lassen |
| `bevero-ui` (`prj_FhYjq24YzoWd6nXaOn3fIlRNos8Z`) | legacy shared project | nicht verwenden, unangetastet lassen |
| `landing` (`prj_Yxi8zycTxkwOGp7ZSKBdlS66dAlX`) | legacy landing project | nicht verwenden, unangetastet lassen |
| `rauschenberger-os` (`prj_Z60vyyeyLELjWJ90udDE9Zh7KHfY`) | stray/root history | root link darf nicht zurückkehren |

---

## Validation Gate

Before any production release:

1. `vercel env ls` checked for each app.
2. Preview deploy succeeds or the failure mode is explicitly documented.
3. Cockpit build no longer falls back to the legacy API project.
4. Owner gives separate production approval.
