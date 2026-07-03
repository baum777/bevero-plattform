# MSPR Entry — Production Closure: RLS-Hybrid (inventory_categories Policy + WorkflowTask-KPI auf Backend-Proxy)

- id: 2026-07-03-production-closure-rls-hybrid
- timestamp: 2026-07-03T07:20:00Z
- runId: baum-os session "Bevero Production Closure Finalization"
- agentRole: builder
- taskType: infra_db_change

## Scope

- layer: cross_package
- pathsInScope:
  - apps/api/prisma/migrations/20260703050000_add_inventory_categories_select_rls/migration.sql
  - apps/api/src/modules/inventory/inventory.schemas.ts
  - apps/api/src/modules/inventory/inventory-read.service.ts
  - apps/api/src/routes/inventory.route.ts
  - apps/cockpit/lib/backend/review-tasks.ts
  - apps/cockpit/lib/supabase/queries/dashboard.ts
  - apps/api/tests/inventory-read.service.test.ts
  - apps/api/tests/inventory.routes.test.ts
  - apps/api/tests/rls-cockpit-reads-contract.test.ts
  - docs/architecture/adr-rls-cockpit-reads.md
  - docs/productization/bevero-database-boundary-v0.md
- pathsOutOfScope:
  - docs/sales-kit/ (fremder Dirty State, unangetastet)
  - docs/agent-team/*_logbook/2026-07-03-sales-kit-*.md (fremder Dirty State, unangetastet)
  - alle übrigen RLS-Policies/Tabellen
- autonomyTier: 2

## Code Change Context

- Trigger/request: Owner-Entscheidungen 1+2 aus dem Closure Gate 2026-07-03 (Baum-OS `sandbox/runs/20260703T042500Z/bevero-production-closure.md`): RLS-Hybrid umsetzen, P0-Incident formal schließen, Review auf `pass`.
- Why the change was needed: Zwei Cockpit-Direktread-Flächen waren fail-closed (nur Service-Role-Policy): `inventory_categories` (leere Kategorien-Gruppierung) und `WorkflowTask` (Alert-History konstant 0 → falsche Pilot-Zahlen). `WorkflowTask` hat kein Org-Feld — eine User-Policy wäre org-blind (Tenant-Isolation-Bruch).
- Files read: Policy-Muster `20260601083000_add_inventory_browser_select_rls/migration.sql`, `dashboard.ts`, `review-tasks.ts`, `inventory-read.service.ts`, `inventory.route.ts`, `schema.prisma` (InventoryCategory/WorkflowTask), bestehende Tests.
- Files changed: siehe pathsInScope (Migration + 5 Quell-/3 Testdateien + 2 Doku-Dateien).
- Commands run:
  - `npm --workspace=apps/api run typecheck` → pass
  - `npm --workspace=apps/api run test -- --run tests/rls-cockpit-reads-contract.test.ts tests/inventory-read.service.test.ts tests/inventory.routes.test.ts` → pass (3 Files, 64 Tests)
  - `npm run ci` → siehe Abschlussbericht (vollständiges Gate)
- Validation results:
  - Neue Migration folgt exakt dem bestehenden org-scoped SELECT-Muster; keine Service-Role-/Public-/Write-Grants.
  - `dashboard.ts` liest `WorkflowTask` nicht mehr direkt; Alert-KPIs + History kommen vollständig aus `listReviewTasksForCurrentUser({ windowDays: 30 })` → `GET /admin/review-tasks?windowDays=30` (JWT + Org-Membership + adminOnly-Rollen serverseitig).
  - `GET /admin/review-tasks`: optionaler `windowDays`-Parameter (1–365, validiert, 400 bei Fehlwert), Default-Verhalten unverändert; Response-Rows additiv um `resolvedAt` erweitert.
  - Contract-Test `rls-cockpit-reads-contract.test.ts` erzwingt die ADR-Regeln dauerhaft (keine org-blinde WorkflowTask-Policy, kein Direktread, Policy-Inhalt der Migration).
  - Migration wurde NICHT gegen eine Remote-DB angewandt (kein DB-Kommando in dieser Session); Anwendung über guardrail-geschützten Prozess nach Owner-Freigabe.
