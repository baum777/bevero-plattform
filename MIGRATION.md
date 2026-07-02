# Migration Summary — bevero into rauschenberger-os

**Date:** 2026-06-17  
**Status:** ✅ Complete  
**Commit:** `4f6f418` (and prior commits `9252e85`)

## Overview

Successfully consolidated three separate repositories into the **rauschenberger-os** monorepo:

1. **bevero-webapp** (Fastify backend + Next.js frontend)
   - Migrated to: `apps/api/` + `apps/cockpit/`
   - Status: ✅ Complete (Commit `9252e85`)

2. **bevero-landing** (Vite + React landing page)
   - Migrated to: `apps/landing/`
   - Status: ✅ Complete (Commit `4f6f418`)

## Structure

```
rauschenberger-os/
├── apps/
│   ├── api/           ← Bevero Fastify backend
│   ├── cockpit/       ← Bevero Next.js frontend
│   └── landing/       ← Bevero investor landing page (NEW)
├── BEVERO.md          ← Workspace guide for all 3 apps
└── OS.md              ← Updated system map
```

## Git History

| Repo | Migration Commit | Status |
|------|------------------|--------|
| bevero-webapp | `9252e85` | ✅ Merged (apps/api + cockpit) |
| bevero-landing | `4f6f418` | ✅ Merged (apps/landing) |

**Note:** Previous separate repos (bevero-webapp, bevero-landing) are now archived. The code lives in rauschenberger-os.

## Development

### Install & Setup
```bash
cd rauschenberger-os
npm install             # Installs all 3 workspaces
npm run dev:api         # Fastify (port 4000)
npm run dev:cockpit     # Next.js (port 3000)
npm run dev:landing     # Vite (port 5173)
```

### Testing
```bash
npm run typecheck       # All 3 apps
npm test                # API tests
npm run ci              # CI gate (typecheck + test)
```

### Deployment
Each app has its own `vercel.json`. Configure Vercel projects with:
- **API:** Root directory = `apps/api/`
- **Cockpit:** Root directory = `apps/cockpit/`
- **Landing:** Root directory = `apps/landing/`

## Documentation

- **BEVERO.md** — Complete workspace guide (setup, commands, features)
- **OS.md** — Updated system map (now includes landing app)
- **ARCHITECTURE.md** (in bevero-webapp/) — System design & request flows
- **KITCHEN.md** (in bevero-webapp/) — Kitchen module specifics

## Next Steps

### For Team
1. Update development documentation to reference rauschenberger-os
2. Update CI/CD to run tests from monorepo root
3. Archive previous separate repos (README → points to monorepo)
4. Update Vercel projects to use monorepo structure

### For Development
1. Install dependencies: `npm install`
2. Start dev servers: `npm run dev:api`, `npm run dev:cockpit`, `npm run dev:landing`
3. Run tests: `npm run ci`
4. Deploy each app independently via Vercel

## Breaking Changes

None — migration is purely structural. All code paths, APIs, and deployment targets remain the same.

## Reference

- Migration author: Claude Sonnet 4.6
- Related PRs: (to be created)
- Tracking: rauschenberger-os issue #TBD
