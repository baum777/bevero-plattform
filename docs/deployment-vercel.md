# Vercel Deployment — SOT

**Stand:** 2026-06-18  
**Gültig für:** Monorepo `rauschenberger-os`  
**Team-ID:** `team_UDEAB38fNwJF8GYv9wkJsKSc` (Account: `baum`)

---

## Kanonische Projekte

Diese drei Projekte sind die einzigen autorisierten Deployment-Ziele.
Jeder weitere `vercel deploy`-Aufruf muss auf eines davon zeigen.

| App | Vercel-Projekt | Projekt-ID | Root Directory | Production URL |
|---|---|---|---|---|
| `apps/api` | **bevero-api** | `prj_EcJwphogd9Gi1KbOLtQWPpfoQjOW` | `apps/api` | bevero-api.vercel.app |
| `apps/cockpit` | **bevero-ui** | `prj_FhYjq24YzoWd6nXaOn3fIlRNos8Z` | `apps/cockpit` | bevero-ui.vercel.app |
| `apps/landing` | **landing** | `prj_Yxi8zycTxkwOGp7ZSKBdlS66dAlX` | `apps/landing` | landing-seven-kappa-69.vercel.app |

Framework-Versionen: Fastify 5.2 · Next.js 15.3 · Vite 5 · Node.js 24.x · Region: `fra1`

---

## Deployment-Regel

**Immer aus dem App-Verzeichnis deployen — nie aus dem Repo-Root.**

```bash
# API
cd apps/api && vercel deploy --prod

# Cockpit
cd apps/cockpit && vercel deploy --prod

# Landing
cd apps/landing && vercel deploy --prod
```

Das Repo-Root hat kein `.vercel/project.json` mehr (bewusst entfernt 2026-06-18).
Ein `vercel deploy` aus dem Root würde ein neues, ungewolltes Projekt erzeugen.

---

## Vercel Dashboard: Root Directory-Einstellung

Für jeden Deploy aus dem Monorepo muss in den Vercel Projekt-Settings
der **Root Directory**-Wert korrekt gesetzt sein:

| Projekt | Settings → Root Directory |
|---|---|
| bevero-api | `apps/api` |
| bevero-ui | `apps/cockpit` |
| landing | `apps/landing` |

→ Vercel Dashboard: `Project → Settings → General → Root Directory`

---

## Stale Projekte — löschen

Diese Projekte sind Relikte und sollen im Vercel Dashboard gelöscht werden:

| Projekt | Projekt-ID | Grund |
|---|---|---|
| `cockpit` | `prj_57V8ZDUA3HR7VDjiPABkkho7sCY0` | Fehlgeschlagener Migrationversuch (ERROR), nicht verlinkt |
| `cockpit-next` | `prj_FPmMOlne0k50LBN2nRxvPRAN75Dq` | Alter Name vor Monorepo-Umbenennung |
| `bevero-landing` | `prj_IUMGcRi607rtvWrtfc4IpIRHU479` | Abgelöst durch `landing` |
| `rauschenberger-os` | `prj_PFdhBHEgrVw1Mi8WYzrzShGXs2vw` | Versehentlich beim `vercel link` im Root erzeugt |

Löschen: `Project → Settings → General → Delete Project`

---

## Produktion-Deployment wiederherstellen

`bevero-api` und `bevero-ui` haben aktuell `target: null` auf dem letzten Deploy —
kein gesetzter Production-Alias. Einmalig je App mit `--prod` deployen:

```bash
cd apps/api    && vercel deploy --prod
cd apps/cockpit && vercel deploy --prod
```

`landing` ist bereits korrekt (`target: production`).

---

## Backend — bevero-api (`apps/api`)

- Framework: Other / Node.js
- Install: `npm install --include=dev`
- Build: `npm run build`
- Output Directory: leer lassen
- Entry: `api/index.ts` (via `apps/api/vercel.json`)

### Environment Variables

| Variable | Pflicht | Typ | Hinweis |
|---|---|---|---|
| `NODE_ENV` | ja | config | `production` für Prod-Deployments |
| `DATABASE_URL` | ja | secret | Supabase pooled Postgres URL (Runtime) |
| `DIRECT_URL` | ja | secret | Supabase direct URL (Prisma/Migrations) |
| `SUPABASE_JWT_SECRET` | ja | secret | Supabase Bearer-Token-Verifikation |
| `CORS_ALLOWED_ORIGINS` | ja | config | `bevero-ui`-Origin, z.B. `https://bevero-ui.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | prod ja | secret | Redis (Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | prod ja | secret | Redis (Upstash) |
| `LOG_LEVEL` | optional | config | Default: `info` |
| `DEMO_MODE` | optional | config | Muss `false` in Produktion sein |
| `SYNC_ENABLE_SCHEDULED_JOBS` | optional | config | Default: `false` |
| `PROCUREMENT_ORGANIZATION_ID` | nur FoodNotify-Ingest | config | Org-ID für importierte Bestellungen |
| `MICROSOFT_TENANT_ID` | nur FoodNotify-Graph | secret | Microsoft Entra Tenant-ID |
| `MICROSOFT_CLIENT_ID` | nur FoodNotify-Graph | secret | Graph App Registration Client-ID |
| `MICROSOFT_CLIENT_SECRET` | nur FoodNotify-Graph | secret | Graph Client Secret |
| `FOODNOTIFY_MAILBOX` | nur FoodNotify-Graph | config | M365-Postfach UPN/ID |
| `FOODNOTIFY_IMPORT_ENABLED` | optional | config | Default: `false` |

---

## Frontend — bevero-ui (`apps/cockpit`)

- Framework: Next.js
- Install: `npm install --include=dev`
- Build: `npm run build`
- Output Directory: leer lassen

### Environment Variables

| Variable | Pflicht | Typ | Hinweis |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ja | public config | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ja | public config | Supabase Anon/Publishable Key |
| `NEXT_PUBLIC_API_BASE_URL` | ja | public config | `bevero-api` Production-URL, kein trailing slash |
| `NEXT_PUBLIC_APP_ENV` | ja | public config | `production` / `preview` / `local` |
| `NEXT_PUBLIC_COMMIT_SHA` | empfohlen | public config | Vercel Git Commit SHA |
| `NEXT_PUBLIC_SITE_URL` | optional | public config | Für Auth-Redirects |

Keine Backend-Secrets in `bevero-ui` setzen — alle `NEXT_PUBLIC_*` sind browser-sichtbar.

---

## Landing — landing (`apps/landing`)

- Framework: Vite
- Install: `npm install`
- Build: `npm run build`
- Output Directory: `dist`

Keine Secrets — statisches Frontend ohne Backend-Abhängigkeit.

---

## Runtime Boundary

Cockpit-Backend-Calls ausschließlich über `NEXT_PUBLIC_API_BASE_URL`.
Kein Fallback auf `localhost:4000` oder eigene Origin.
Kein Secret darf im Frontend landen.
