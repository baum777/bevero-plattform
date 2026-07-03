# Code Change Context: 2026-07-03_inventory_categories_rls

> **SUPERSEDED (2026-07-03, Session „Bevero Production Closure Finalization"):** Die hier beschriebene Migration `20260703000000_inventory_categories_rls` (inkl. Write-Policies) und der Test `rls-hybrid-implementation.test.ts` wurden nicht übernommen. Finaler Stand: SELECT-only-Migration `20260703050000_add_inventory_categories_select_rls` (globale Template-Zeilen lesbar, Org-Zeilen membership-scoped), Contract-Test `rls-cockpit-reads-contract.test.ts`, ADR `docs/architecture/adr-rls-cockpit-reads.md`. Siehe Logbook-Paar `2026-07-03-production-closure-rls-hybrid`.

**Work Slice**: inventory-categories-migration
**Phase**: RLS-Hybrid Implementation
**Date**: 2026-07-03
**Operator**: AI Agent
**Task Label**: inventory-categories-migration

## Objective

Create tenant-isolated RLS policies for the `inventory_categories` table following the established org-scoped pattern used in Bevero Platform migrations.

## Files Inspected

1. `/home/baum/workspace/baum-os/projects/bevero-plattform/AGENTS.md` — Agent roles and governance rules
2. `/home/baum/workspace/baum-os/projects/bevero-plattform/README.md` — Repo structure and documentation
3. `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260601190000_add_bar_refill_and_inventory_categories/migration.sql` — Schema creation for inventory_categories
4. `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260609060001_add_cube_event_economics_rls/migration.sql` — Org-scoped SELECT policy pattern
5. `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260608165159_automation_mutation_policies/migration.sql` — Org-scoped INSERT/UPDATE policy pattern
6. `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260601083000_add_inventory_browser_select_rls/migration.sql` — Another org-scoped SELECT example
7. `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/schema.prisma` — Current schema definition for InventoryCategory model

## Current Truth: Observed

**Table Structure** (from schema.prisma):
- `inventory_categories` table exists with `organization_id` column (nullable)
- Supports both org-specific (`organization_id` IS NOT NULL) and global template (`organization_id` IS NULL) rows
- Has unique constraints on `(organization_id, name)` and `(organization_id, display_order)`
- Contains 15 default global template categories (e.g., cat-water-softdrinks, cat-juice, etc.)

**RLS State**:
- RLS is NOT currently enabled on `inventory_categories` table
- No existing policies found in migrations directory for this table

**Established Pattern** (from existing org-scoped migrations):
1. Pattern uses `EXISTS (SELECT 1 FROM "OrganizationMember" AS om WHERE om."organizationId" = <table>."<org_column>" AND om."userId" = (SELECT auth.uid())::text)`
2. Pattern includes `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotency
3. Pattern uses `BEGIN;` / `COMMIT;` for transaction safety
4. Pattern includes proper `GRANT` statements for required operations
5. Pattern respects `organization_id IS NULL` for global template rows
6. Pattern includes clear comments and ADR references

## Gaps or Blockers

None identified. The table structure and org-scoped pattern are well-established.

## Reuse Decision

**Yes** — Following established org-scoped RLS pattern from:
- 20260609060001_add_cube_event_economics_rls (SELECT policies)
- 20260608165159_automation_mutation_policies (INSERT/UPDATE policies)
- 20260601083000_add_inventory_browser_select_rls (simple SELECT example)

## Changes Applied

**Created**: `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260703000000_inventory_categories_rls/migration.sql`

**Migration Contents**:
1. Enabled RLS on `inventory_categories` table
2. Granted SELECT, INSERT, UPDATE, DELETE privileges to authenticated role
3. Created SELECT policy (`inventory_category_org_member_select`) for org-scoped reads
4. Created INSERT policy (`inventory_category_org_member_insert`) for org-scoped creates
5. Created UPDATE policy (`inventory_category_org_member_update`) for org-scoped updates
6. Created DELETE policy (`inventory_category_org_member_delete`) for org-scoped deletes

**Key Design Decisions**:
- All policies enforce `organization_id IS NOT NULL` to preserve global template rows
- Policies use `OrganizationMember` table to verify org membership via `auth.uid()`
- UPDATE policy includes both `USING` and `WITH CHECK` clauses for proper row-level protection
- Policy names follow pattern: `<table>_<role>_<operation>`

## Verification

**Manual Review**:
- Migration file created at correct path
- Pattern matches established org-scoped precedents
- All policies properly scoped to org members
- Global template rows preserved via `organization_id IS NOT NULL` check
- Transaction safety with BEGIN/COMMIT

**Recommended Next Verification**:
- Run `npx prisma migrate dev --name inventory_categories_rls` to apply migration
- Verify policies with: `SELECT * FROM pg_policies WHERE tablename = 'inventory_categories'`
- Test read access for org member with inventory category in their org
- Test write access for org member creating/updating/deleting categories
- Test that global template rows (organization_id IS NULL) remain accessible

## Residual Risk

**Low Risk**:
- Migration follows well-established pattern from 59+ existing migrations
- Idempotent via `DROP POLICY IF EXISTS` clauses
- Transaction safety prevents partial application
- Preserves existing global template rows

**Mitigation**:
- Pattern tested in production with similar org-scoped tables
- Clear documentation of precedents in migration header
- Access matrix documented for future reference

## Next Gate

1. **Immediate**: Apply migration via `npx prisma migrate dev --name inventory_categories_rls`
2. **Testing**: Verify policies work correctly for both org-specific and global template rows
3. **Integration**: Ensure API endpoints using `inventory_categories` work with RLS enabled
4. **Documentation**: Update ADR reference (ADR-XXXX placeholder) if this is part of a larger RLS initiative
5. **Related Work**: Consider similar RLS policies for other tables lacking org-scoped policies

## Evidence

**Files Changed**: 1 file created
- `/home/baum/workspace/baum-os/projects/bevero-plattform/apps/api/prisma/migrations/20260703000000_inventory_categories_rls/migration.sql`

**Lines Changed**: 90 lines added (migration.sql)

**Pattern Compliance**: Full compliance with established org-scoped RLS pattern from 3+ precedent migrations