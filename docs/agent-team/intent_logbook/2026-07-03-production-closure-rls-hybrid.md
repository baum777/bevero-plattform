# Intent Memory — Production Closure: RLS-Hybrid (inventory_categories Policy + WorkflowTask-KPI auf Backend-Proxy)

- id: 2026-07-03-production-closure-rls-hybrid
- timestamp: 2026-07-03T07:20:00Z
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-production-closure-rls-hybrid.md`
- status: reviewed

## Core intention

Die letzten zwei funktionalen Production-Blocker aus dem Review 2026-07-02 schließen, ohne die Tenant-Isolation aufzuweichen: keine stillen Nullwerte im Pilot-Cockpit, kein org-blinder Datenzugriff, keine Architektur-Neubauten während des Piloten.

## Logic followed

Hybrid-Modell aus dem ADR `docs/architecture/adr-rls-cockpit-reads.md`: Cockpit-Direktreads nur gegen Tabellen mit org-scoped User-Policy (deshalb `inventory_categories` per Migration nach bestehendem Muster geöffnet — die Tabelle hat `organization_id`); Tabellen ohne Org-Feld (`WorkflowTask`) bleiben Service-Role-only und werden ausschließlich über die app-schicht-autorisierte API konsumiert. Der bestehende `/admin/review-tasks`-Pfad wurde additiv erweitert (`windowDays`, `resolvedAt`) statt einen neuen Endpunkt zu bauen.

## Design assumptions

- `organization_id IS NULL`-Kategorien sind globale Template-Zeilen by design (Seed `20260601190000`, `InventoryItem.category_id` referenziert sie direkt, keine Per-Org-Kopien) → für authentifizierte Nutzer lesbar; sie enthalten keine Tenant-Daten. Eine strikte NULL-blockende Policy wurde während der Session geprüft und verworfen, weil sie den Kategorien-Bug nicht behoben hätte.
- Die Alert-History im Übersichts-Query war vor diesem Slice faktisch immer leer (fail-closed Read), daher ist die Umstellung regressionsfrei; mit `windowDays` wird sie erstmals korrekt befüllt.
- Rollen-Gating der Alert-Daten (adminOnly am Endpoint, `access: forbidden` für andere Rollen) ist gewollt und bleibt unverändert.

## Tradeoffs

- Accepted:
  - Alert-History ist nur für owner/admin-Rollen sichtbar (wie die Alert-KPIs zuvor auch).
  - `windowDays` nutzt `Date.now()` im Service (keine injizierbare Uhr) — für ein 30-Tage-Fenster ausreichend, Tests prüfen die Where-Struktur statt exakter Zeitstempel.
- Rejected:
  - Org-blinde SELECT-Policy auf `WorkflowTask` (Tenant-Isolation-Bruch).
  - Vollständiger Backend-Proxy für alle 13 Cockpit-Read-Flächen (unverhältnismäßig im Pilot).

## Durable memory

Regel für alle künftigen Slices: Eine neue Tabelle darf nur dann direkt vom Cockpit gelesen werden, wenn im selben Slice ihre `org_member_select`-Policy entsteht; Tabellen ohne Org-Feld gehen immer über die API. Der Contract-Test `apps/api/tests/rls-cockpit-reads-contract.test.ts` bricht CI, wenn dagegen verstoßen wird.
