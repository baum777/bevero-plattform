# Bevero — Mobile Operations Layer Monorepo

**Öffentlicher Produktname: Bevero Ops.**

**Version:** 0.2.0 · **Stand:** 2026-07-02  
Autor: Cheikh Baum

---

## Was ist dieses Repo?

Dieses Monorepo ist die Codebasis von **Bevero** — einem mobilen
**Operations Layer** für Standortbetriebe (Gastronomie, Hotellerie, Catering,
Event- und Filialbetriebe).

Bestehende Systeme planen. Bevero macht Ausführung, Abweichungen, Übergaben
und Nachweise vor Ort sichtbar — ohne Planungs-, POS-, ERP- oder
Buchhaltungssysteme zu ersetzen.

Es enthält drei deployed Apps unter `apps/` sowie die Produkt-, Governance-
und Entscheidungsdokumentation, die Ausführung kontrolliert und nachvollziehbar
hält.

> KI darf entwerfen. Menschen geben operative Konsequenzen frei.

**Historischer Kontext:** Bevero entstand aus einem Hospitality-Pilot in der
Rauschenberger Gruppe (Motorworld Inn / CUBE). Diese Bezüge sind Pilot-/
Case-Study-Kontext und Governance-Historie — **nicht** die Produktidentität.
Siehe [`docs/productization/bevero-product-identity-v0.md`](docs/productization/bevero-product-identity-v0.md).

---

## Repo-Struktur

```
bevero/
│
├── apps/
│   ├── api/          Fastify 5 REST API — Bevero Backend
│   ├── cockpit/      Next.js 15 Cockpit UI — Bevero Frontend
│   └── landing/      Vite + React Investor Landing Page
│
├── assets/           Screenshots und statische Artefakte
├── docs/             Architektur, Entscheidungen, Deployment-SOT
├── governance/       Regeln, Freigabe-Matrix, Evidence-Contract
├── logs/             Session-Log, Audit-Log, Evidence
├── scripts/          Utility-Skripte
├── tests/            Monorepo-weite Tests
├── tools/            Audit-Skripte und Agent-Skills
├── workflows/        Operative Prozessdokumente (z.B. Einkaufsbestellung)
├── context/          Laufender OS-Kontext (current-state, priorities)
│
├── IDENTITY.md       SOT — Existenzgrund, L0–L4, Autoritätskette
├── OS.md             Systemkarte — Repo-Aufbau, Dateistruktur
├── AGENTS.md         Agent-Rollen und Grenzen
├── BEVERO.md         Bevero Workspace — Inventory Platform
└── MIGRATION.md      Migrationsstatus und -history
```

---

## Apps

### `apps/api` — Bevero API

Fastify 5 REST API mit Prisma 6 und Supabase Postgres.

```bash
cd apps/api
npm install
npm run dev        # lokaler Dev-Server
npm test           # Vitest
npm run typecheck  # TypeScript strict
```

**Stack:** TypeScript 5.7 · Fastify 5.2 · Prisma 6.1 · Supabase Postgres · Zod 3 · Vitest  
**Kennzahlen:** 78 Prisma-Modelle · 59 Migrationen · 20 Module · 124 API-Routen · 21.169+ Testzeilen  
**Vercel-Projekt:** `bevero-api` (`prj_EcJwphogd9Gi1KbOLtQWPpfoQjOW`)

**Module (Stand 2026-06-24):** inventory · procurement · kitchen · shift-planning · gastronovi · workspaces · alerts · notes · approvals · automation · auth · ... (20 gesamt)

---

### `apps/cockpit` — Bevero Cockpit

Next.js 15 App Router Cockpit mit Supabase Auth und RBAC.

```bash
cd apps/cockpit
npm install
npm run dev        # Next.js Dev-Server
npm run typecheck
npm run build
```

**Stack:** Next.js 15.3 · React 19 · @supabase/ssr · TypeScript 5.7  
**Seiten:** 40 page.tsx (Dashboard, Inventory, Procurement, Mother-Concern, Workspaces, Shift-Handover …)  
**Screenshots:** 18 Cockpit-Ansichten dokumentiert unter `assets/Screenshots/01-tabs/`  
**Vercel-Projekt:** `bevero-ui` (`prj_FhYjq24YzoWd6nXaOn3fIlRNos8Z`)

---

### `apps/landing` — Bevero Landing

Statische Investor-/IT-Präsentation mit Cockpit-Screenshots und Architektur-Dokumentation.

```bash
cd apps/landing
npm install
npm run dev        # Vite Dev-Server
npm run build      # Output: dist/
```

**Stack:** Vite 5 · React 18  
**Vercel-Projekt:** `landing` (`prj_Yxi8zycTxkwOGp7ZSKBdlS66dAlX`)

---

## Deployment

Alle drei Apps deployen auf separate Vercel-Projekte. Details in [`docs/deployment-vercel.md`](docs/deployment-vercel.md).

**Regel:** Immer aus dem App-Verzeichnis deployen — nie aus dem Repo-Root.

```bash
cd apps/api     && vercel deploy --prod
cd apps/cockpit && vercel deploy --prod
cd apps/landing && vercel deploy --prod
```

---

## CI / Lokales Setup

Das Monorepo nutzt npm workspaces. Alle Dependencies von Root installieren:

```bash
npm install          # installiert alle workspaces
```

CI-Gate (GitHub Actions, `apps/api/.github/workflows/ci.yml`):
- `typecheck` → `test --run` → `build` → `prisma validate`
- Blockiert jeden Merge bei Fehler

### Datenbank-Sicherheitsgate

Vor jedem migrations- oder DB-schreibenden Prisma-Befehl:

```bash
npm run db:verify-target
```

Bekannte Ziele: `ienwshemokpsjwkedmyp` = Bevero Development / `bevero-plattform`;
`czinchfegtglmrloxlmh` = Warenwirtschaft Production / `rauschenberger-os`. Aus
`bevero-plattform` heraus ist `czinchfegtglmrloxlmh` standardmäßig blockiert
(Cross-Project Read-Only); nur mit `BEVERO_ALLOW_CROSS_PROJECT_READ` ist Lesezugriff
für Incident-Verifikation erlaubt, riskante Prisma-Befehle bleiben verboten.
Details und Stop-Regeln:
[`docs/productization/bevero-database-boundary-v0.md`](docs/productization/bevero-database-boundary-v0.md).

---

## Governance

Jede KI-Aktion trägt eine Risikostufe. Die Stufe bestimmt den Freigabepfad.

| Stufe | Name | Freigabe |
|---|---|---|
| L0 | Frei | Keine — sofort |
| L1 | Review | Self-Review |
| L2 | Evidence | Reviewer + Evidence-Artefakt |
| L3 | Freigabe | Explizite Operator-Freigabe |
| L4 | Blockiert | Mehrstufige Freigabe, immer |

Regeln: [`governance/rules.md`](governance/rules.md)  
Freigabe-Matrix: [`governance/approval-matrix.md`](governance/approval-matrix.md)  
Produktvision: [`docs/VISION.md`](docs/VISION.md) · Produktidentität: [`docs/productization/bevero-product-identity-v0.md`](docs/productization/bevero-product-identity-v0.md)  
Repo-Audit (historisch): [`docs/RAUSCHENBERGER-OS-SUMMARY.md`](docs/RAUSCHENBERGER-OS-SUMMARY.md)

---

## Arbeitsdokumentation (Work Slice Rule)

Jeder nicht-triviale Arbeitsschritt in diesem Repo ist ein **Work Slice** und muss zwei separate Dokumente hinterlassen: einen **Code Change Context** (was wurde geändert, warum, welche Validierung) und ein **Intent Memory Log** (welche Produktlogik, Architekturentscheidung oder Governance-Absicht stand dahinter). Die beiden Tracks werden bewusst getrennt gehalten: Implementierungsdetails veralten, Intentionen bleiben länger gültig.

→ Vollständige Regel: [`docs/agent-team/work_documentation_rule.md`](docs/agent-team/work_documentation_rule.md)  
→ Einträge unter: `docs/agent-team/mspr_logbook/` (Code) · `docs/agent-team/intent_logbook/` (Intent)

---

## Schlüsseldokumente

| Datei | Inhalt |
|---|---|
| [`IDENTITY.md`](IDENTITY.md) | Existenzgrund, Säulen, System-Stack — einzige SOT |
| [`OS.md`](OS.md) | Systemkarte — Repo-Aufbau, Dateistruktur |
| [`MIGRATION.md`](MIGRATION.md) | Migrationsstatus und -history |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records |
| [`docs/deployment-vercel.md`](docs/deployment-vercel.md) | Kanonische Vercel-Projekte und Deploy-Regeln |
| [`docs/agent-team/work_documentation_rule.md`](docs/agent-team/work_documentation_rule.md) | Work-Slice-Regel und Two-Track-Dokumentation |
| [`context/current-state.md`](context/current-state.md) | Laufender OS-Kontext |
| [`context/priorities.md`](context/priorities.md) | Aktuelle Prioritäten und Meilensteine |
| [`logs/audit-log.md`](logs/audit-log.md) | Append-only Audit-Log |

---

## Externe Systeme

Bevero ersetzt keine bestehende Infrastruktur. Diese Systeme bleiben führend;
Bevero bindet sie über generische Connector-/Export-Schichten an:

- **Externes Planungssystem** (z. B. FoodNotify) — Planung, Einkauf, Rezepturen
- **POS-Source-Connector** (z. B. Gastronovi) — Kassensystem (Beispiel-Connector: `apps/api/src/modules/gastronovi/`)
- **ERP-Export** (z. B. Microsoft Dynamics 365) — ERP, Reporting
- **Buchhaltung** (z. B. DATEV) — Rechnungswesen
- **Supabase** — Produktionsdatenbank (Postgres + Auth + RLS)
