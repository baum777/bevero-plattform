# Bevero — Operations Cockpit

**Public product name: Bevero Ops.** Bevero is an **operations cockpit for hospitality and site-based teams.** It answers the question that drives every service shift:

> **Is the operation ready for the next service phase — and if not, what needs to happen right now?**

Bevero makes station readiness, tasks, refill, production, HACCP, goods receipt, and shift handovers visible, actionable, and handover-ready — **without replacing existing planning, POS, ERP, or accounting systems.**

This document describes the Bevero monorepo and how its apps fit together.

> **Historical context:** Bevero grew out of a hospitality pilot in the Rauschenberger
> group (Motorworld Inn / CUBE). Those references are pilot / case-study context and
> governance history — not the product identity. See
> [`docs/productization/bevero-product-identity-v0.md`](docs/productization/bevero-product-identity-v0.md).

## Core Logic

```
Observation → Capture → Structure → Task → Responsibility → Completion → Proof → Handover
```

Bevero transforms shift knowledge, station demand, and goods movements into clear tasks for Kitchen, Bar, Service, Goods Receipt, and Management.

## Structure

```
bevero/
├── apps/
│   ├── api/                 # Bevero Fastify backend
│   │   ├── src/            # API routes, services, database logic
│   │   ├── prisma/         # Schema, migrations
│   │   └── tests/          # Unit + integration tests
│   │
│   ├── cockpit/            # Bevero Next.js operations cockpit
│   │   ├── app/            # App Router pages + layout
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities, API client
│   │
│   └── landing/            # Bevero investor landing page (Vite + React)
│       ├── src/            # React components
│       └── public/         # Static assets
│
├── docs/                    # Shared documentation
├── package.json             # Root workspaces config
└── README.md                # Monorepo overview
```

## Development

### Install Dependencies
```bash
npm install  # Installs all workspace dependencies
```

### Run Services

**Backend (Fastify + Postgres)**
```bash
npm run dev:api
# Runs on http://localhost:4000
# Prisma auto-generates client on postinstall
```

**Frontend (Next.js)**
```bash
npm run dev:cockpit
# Runs on http://localhost:3000
# Proxies /api/backend/* to localhost:4000
```

**Landing Page (Vite + React)**
```bash
npm run dev:landing
# Runs on http://localhost:5173
```

### Testing & Type Checking

**Full suite**
```bash
npm run typecheck   # All apps
npm test            # API tests (Vitest)
npm run ci          # CI mode (typecheck + test:ci)
```

**Per-workspace**
```bash
npm --workspace=apps/api run test
npm --workspace=apps/cockpit run typecheck
npm --workspace=apps/landing run typecheck
```

## Database

Bevero uses **Supabase PostgreSQL** (canonical) with **Prisma ORM**.

### Setup
```bash
# 1. Set environment variables in .env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# 2. Generate Prisma client
npm install  # Or: npm --workspace=apps/api run prisma:generate

# 3. Run migrations
npm --workspace=apps/api run prisma:migrate dev --name init

# 4. Seed demo data
npm --workspace=apps/api run prisma:seed
```

### Schema Changes
```bash
# Edit apps/api/prisma/schema.prisma
npm --workspace=apps/api run prisma:format     # Auto-format
npm --workspace=apps/api run prisma:validate   # Validate schema
npm --workspace=apps/api run prisma:migrate dev --name add_field  # Create migration
```

## Deployment

### Vercel

All three apps deploy independently:

**Backend (apps/api)**
- Serverless functions on Vercel
- Environment: `BEVERO_API_BASE_URL`, `DATABASE_URL`, `DIRECT_URL`
- Root: `apps/api/`

**Frontend (apps/cockpit)**
- Next.js on Vercel
- Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Root: `apps/cockpit/`

**Landing (apps/landing)**
- Vite app on Vercel
- Static hosting (HTML/CSS/JS)
- Root: `apps/landing/`

## API Documentation

See **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** and **[DECISIONS.md](./docs/DECISIONS.md)** for:
- System architecture and layers
- Data models and event contracts
- Technical decisions and ADRs
- Request/response examples

## Project Status

### ✅ Phase A (Built)
- Station readiness (Kitchen, Bar, Service areas)
- Prep, Refill, Production task types
- HACCP checkpoints and temperature docs
- Shift handover with open tasks
- Goods receipt capture
- Area and role scoping

### 🔄 Phase B (In Progress)
- Shift-based task routing
- Role and station assignment
- HACCP audit trail
- Mobile-first UI refinements

### 🚀 Phase C (Planned)
- Voice-to-task capture
- Photo-based goods receipt
- Integration adapters (existing planning/POS systems)
- Multi-site operations view

## Git History

**Migration commits (historical):**
- Bevero-webapp → `apps/api` + `apps/cockpit`
- Bevero-landing → `apps/landing`

Previous separate repos are now archived:
- `bevero-webapp/` → reference only (code is in `apps/api` + `apps/cockpit`)
- `bevero-landing/` → reference only (code is in `apps/landing`)

## Team Guides

- **[README.md](./README.md)** — Monorepo overview and quick start
- **[AGENTS.md](./AGENTS.md)** — AI agent roles and governance boundaries
- **[governance/rules.md](./governance/rules.md)** — OS governance rules (L0–L4)

## Questions?

See:
- **ARCHITECTURE.md** — System design & technical decisions
- **OS.md** — System map
- **README.md** — Monorepo overview
