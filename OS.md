# Bevero — Systemkarte

**Version:** 0.2.0
**Status:** Active
**Last updated:** 2026-06-16

---

## Was dieses System ist

→ Vollständig definiert in [`IDENTITY.md`](IDENTITY.md) — einzige autoritative Quelle.

`OS.md` ist die **Systemkarte** — sie zeigt, wie das Bevero-Monorepo aufgebaut ist,
wo Dateien liegen und wie Workflows laufen.

> **Code-Identität:** Das npm-Workspace-Root heißt `bevero-platform` und die App-Pakete
> `@bevero-platform/*`. Die Produktidentität ist **Bevero** (öffentlicher Produktname:
> **Bevero Ops**).

---

## Repo-Struktur

```
bevero-platform/
├── IDENTITY.md              ← SOT — Existenzgrund, L0–L4, Autoritätskette (L4)
├── OS.md                    ← Systemkarte (L3)
├── AGENTS.md                ← Agent-Rollen und Grenzen (L2)
├── BEVERO.md                ← Bevero Workspace (Operations Cockpit)
├── package.json             ← npm workspace root
│
├── apps/
│   ├── api/                 ← Bevero Fastify API + Prisma + Supabase (@bevero-platform/api)
│   │   ├── src/             ← Module, Routes, Server
│   │   ├── api/             ← Vercel serverless entry (api/index.ts)
│   │   ├── prisma/          ← Schema, Migrations, Seeds
│   │   ├── scripts/         ← Smoke Tests, Utilities
│   │   ├── tests/           ← Vitest-Suites
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vercel.json      ← API-Deployment-Konfiguration
│   │
│   ├── cockpit/             ← Bevero Next.js Cockpit UI (@bevero-platform/cockpit)
│   │   ├── app/             ← Next.js App Router
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── package.json
│   │   └── vercel.json      ← Cockpit-Deployment-Konfiguration
│   │
│   └── landing/             ← Bevero Investor Landing Page (Vite + React) (@bevero-platform/landing)
│       ├── src/             ← React components
│       ├── public/          ← Static assets
│       ├── package.json
│       ├── index.html
│       └── vercel.json      ← Landing-Deployment-Konfiguration
│
├── docs/                    ← Architektur, Entscheidungen, Bevero-Dokumentation
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── VISION.md
│   └── …
│
├── governance/              ← OS-Betriebsregeln
│   ├── rules.md
│   ├── approval-matrix.md
│   └── evidence-contract.md
│
├── context/                 ← Betriebskontext und Prioritäten
│   ├── current-state.md
│   └── priorities.md
│
├── logs/                    ← Audit-Trail und Session-Log
│   ├── audit-log.md
│   ├── session-log.md
│   └── evidence/
│
└── workflows/               ← Governed Workflows
    ├── standard.md
    ├── einkauf-bestellung.md
    └── templates/
```

---

## Datei-Karte (Governance-Ebene)

| Säule | Thema | Datei |
|---|---|---|
| Root | Existenzgrund, Leitprinzipien, Risikostufen | [`IDENTITY.md`](IDENTITY.md) ← SOT |
| Root | Diese Systemkarte | [`OS.md`](OS.md) |
| Root | Agent-Rollen und Grenzen | [`AGENTS.md`](AGENTS.md) |
| Governance | Betriebsregeln | [`governance/rules.md`](governance/rules.md) |
| Governance | Approval-Matrix | [`governance/approval-matrix.md`](governance/approval-matrix.md) |
| Governance | Evidence-Contract | [`governance/evidence-contract.md`](governance/evidence-contract.md) |
| Kontext | Aktueller Betriebsstand | [`context/current-state.md`](context/current-state.md) |
| Kontext | Aktive Prioritäten | [`context/priorities.md`](context/priorities.md) |
| Logs | Audit-Log | [`logs/audit-log.md`](logs/audit-log.md) |
| Logs | Session-Log | [`logs/session-log.md`](logs/session-log.md) |
| Workflows | Standard-Workflow | [`workflows/standard.md`](workflows/standard.md) |
| Workflows | Pilot: Einkaufsbestellung | [`workflows/einkauf-bestellung.md`](workflows/einkauf-bestellung.md) |

---

## App-Karte (Bevero Workspace)

| App | Pfad | Stack | Deployment |
|---|---|---|---|
| API | `apps/api/` | Fastify · Prisma · Supabase · TypeScript | Vercel (root: `apps/api`) |
| Cockpit | `apps/cockpit/` | Next.js 15 · React 19 · Supabase Auth | Vercel (root: `apps/cockpit`) |
| Landing | `apps/landing/` | Vite · React 18 | Vercel (root: `apps/landing`) |

**Wichtig:** Alle drei Apps haben eigene `vercel.json`. Vercel-Projekte müssen
ihr Root Directory auf `apps/api`, `apps/cockpit` bzw. `apps/landing` zeigen.

---

## Befehle (Workspace-Root)

```bash
# Develop
npm run dev:api          # Fastify API starten (localhost:4000)
npm run dev:cockpit      # Next.js Cockpit starten (localhost:3000)
npm run dev:landing      # Vite Landing Page starten (localhost:5173)

# Build
npm run build:api        # API production build
npm run build:cockpit    # Cockpit production build
npm run build:landing    # Landing production build

# Test & Verify
npm run typecheck        # alle Apps typchecken
npm run test             # Vitest (API)
npm run ci               # typecheck + test (CI-Gate)
npm run prisma:validate  # Prisma-Schema validieren
```

---

## Autoritätskette

```
IDENTITY.md   (L4 — Existenzgrund, niemals allein ändern)
  └── OS.md   (L3 — Systemkarte)
        └── governance/rules.md   (L2)
              └── AGENTS.md       (L2)
```

Konflikte: IDENTITY.md gewinnt.

---

## Standard-Workflow (Kurzform)

```
Request → Context Load → Draft → Self-Review → Risk Classification
  → Human Approval (ab L2) → Execution → Evidence → Audit-Log
```

Vollständig: [`workflows/standard.md`](workflows/standard.md)
