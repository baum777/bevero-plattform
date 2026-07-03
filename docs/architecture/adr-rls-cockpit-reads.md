# ADR: RLS-Strategie für Cockpit-Direktreads (Hybrid)

Status: **accepted** (Owner-Entscheidung 2026-07-03, Bevero Production Closure Finalization)
Datum: 2026-07-03
Vorlauf: Entwurf `sandbox/runs/20260703T042500Z/adr-draft-rls-cockpit-reads.md` (Baum-OS-Workspace), Production Review 2026-07-02 + Closure Gate 2026-07-03.

## Kontext

Das Cockpit liest 13 Datenflächen direkt mit User-Session (Publishable Key + RLS) von Supabase; alle übrigen Daten laufen über die Fastify-API (Prisma, direkte DB-Verbindung, Autorisierung in der App-Schicht, RLS wird umgangen). 11 der 13 Direktread-Flächen waren durch bestehende org-scoped Policies (`*_org_member_select`, `*_isolation`) korrekt tenant-isoliert. Zwei Flächen waren fail-closed (nur Service-Role-Policy):

1. `inventory_categories` — Bestands-Browser-Gruppierung; Tabelle hat `organization_id`.
2. `WorkflowTask` — Review-Task-KPI/History im Übersichts-Query; Tabelle hat **kein** Org-Feld.

Fail-closed heißt: kein Datenleck, aber leere Ergebnisse → falsche Pilot-Zahlen (Alert-History konstant 0) bzw. leere Gruppierungen.

## Entscheidung

**Hybrid-Modell:**

1. **User-Read-Policy nur für `inventory_categories`** — forward-only Migration `20260703050000_add_inventory_categories_select_rls` nach dem Muster von `20260601083000_add_inventory_browser_select_rls`: `GRANT SELECT … TO authenticated` + Policy `inventory_categories_org_member_select`. Org-Zeilen (`organization_id IS NOT NULL`) sind strikt membership-scoped über `OrganizationMember` gegen `auth.uid()`. **Globale Template-Zeilen (`organization_id IS NULL`) sind lesbar** — die im Entwurf offene Frage „gibt es gewollte globale Default-Kategorien?" ist per Repo-Evidenz beantwortet: Der Seed in `20260601190000` legt die 15 Kategorien ausschließlich als globale Template-Zeilen an (`ON CONFLICT DO NOTHING`, Unique-Index scoped auf `organization_id IS NULL`), kein Migrations- oder API-Code erzeugt Org-Kopien, und `InventoryItem.category_id` referenziert diese Template-IDs direkt. Eine org-only Policy hätte für jede User-Session 0 Zeilen geliefert und die fachliche Lücke (leere Gruppierung) nicht geschlossen. Die Template-Zeilen enthalten keine Tenant-Daten; SELECT-only, kein Schreibpfad für User-Sessions.
2. **Kein User-Read auf `WorkflowTask`.** Eine Policy auf dieser globalen Tabelle wäre zwangsläufig org-blind (Tenant-Isolation-Bruch) — verworfen. Der Übersichts-Query (`apps/cockpit/lib/supabase/queries/dashboard.ts`) bezieht Alert-KPIs **und** Alert-History jetzt vollständig über den bestehenden org-scoped Backend-Pfad `listReviewTasksForCurrentUser` → `GET /admin/review-tasks` (Supabase-JWT, Org-Membership, adminOnly-Rollen in der API). Der Endpoint wurde additiv um einen optionalen `windowDays`-Parameter (1–365) und das Feld `resolvedAt` erweitert; das Default-Verhalten (nur offene Tasks) ist unverändert.
3. **Grundsatz:** Direkte Cockpit-Reads sind nur für Tabellen mit org-scoped User-Policy zulässig. Jede neue Tabelle, die das Cockpit direkt lesen soll, braucht im selben Slice ihre `org_member_select`-Policy. Alle anderen Tabellen bleiben Service-Role-only; Shift-Tabellen (`shift_sessions`, `shift_session_events`) bleiben bewusst ohne User-Policy, da das Cockpit sie ausschließlich über `lib/backend/*` liest.

## Absicherung

Contract-Test `apps/api/tests/rls-cockpit-reads-contract.test.ts` erzwingt:
- `inventory_categories`-Migration enthält die org-scoped SELECT-Policy und keine breiten/schreibenden Grants;
- keine Migration öffnet `WorkflowTask` für `authenticated` (Policy oder Grant);
- `dashboard.ts` enthält keinen `from("WorkflowTask")`-Read und nutzt den Proxy-Helper mit `windowDays`;
- der Proxy-Helper transportiert `resolvedAt` und `windowDays`.

## Konsequenzen

- Beide fachlichen Lücken sind mit einem Slice geschlossen (1 Migration + 1 Query-Umstellung), ohne Architekturwechsel.
- Das Muster „RLS für Cockpit-Reads, App-Schicht-Autorisierung für API" ist explizit statt implizit.
- Die Migration ist erstellt, aber **nicht** gegen eine Remote-DB angewandt — Anwendung läuft über den regulären, guardrail-geschützten Migrationsprozess (`db:migrate:deploy` mit DB-Target-Guard) nach Owner-Freigabe.
- Offene Folgefrage (nicht Teil dieses ADR): langfristige Konsolidierung auf Backend-Proxy-only als Post-Pilot-Thema.

## Verworfene Alternativen

- **Vollständiger Backend-Proxy sofort:** unverhältnismäßiger Umbau während des Piloten; 11 funktionierende, korrekt isolierte Flächen müssten ohne Not migriert werden.
- **Org-blinde SELECT-Policy auf `WorkflowTask`:** Tenant-Isolation-Bruch, abgelehnt.

## Verifikation nach DB-Anwendung (offen, Operator)

1. Read-only-Livecheck: Bestands-Browser zeigt Kategorien; Übersicht zeigt Alert-History > 0 bei vorhandenen Tasks; Fremd-Org-Query liefert 0 Zeilen.
2. Supabase Advisor erneut laufen lassen (deckt sich mit gequeuetem Hardening-Block in `os/DECISIONS.md`).
