# Intent Memory Log: 2026-07-03_inventory_categories_rls

> **SUPERSEDED (2026-07-03, Session „Bevero Production Closure Finalization"):** Die hier beschriebene Migration `20260703000000_inventory_categories_rls` (inkl. Write-Policies) und der Test `rls-hybrid-implementation.test.ts` wurden nicht übernommen. Finaler Stand: SELECT-only-Migration `20260703050000_add_inventory_categories_select_rls` (globale Template-Zeilen lesbar, Org-Zeilen membership-scoped), Contract-Test `rls-cockpit-reads-contract.test.ts`, ADR `docs/architecture/adr-rls-cockpit-reads.md`. Siehe Logbook-Paar `2026-07-03-production-closure-rls-hybrid`.

**Work Slice**: inventory-categories-migration
**Phase**: RLS-Hybrid Implementation
**Date**: 2026-07-03
**Task Label**: inventory-categories-migration

## Product Logic / Intent

**Goal**: Enable tenant isolation for inventory categories via Row Level Security (RLS), ensuring that organizations can only access and modify their own categories while preserving global template categories.

**Business Context**:
- Bevero supports multi-tenant operations where each organization needs isolated inventory categories
- Global template categories (organization_id IS NULL) provide default categories that all organizations can reference but not modify
- Individual organizations can create custom categories for their specific needs
- This follows the broader RLS-Hybrid implementation strategy for securing tenant data

**Security Intent**:
- Prevent cross-tenant data leakage in inventory category access
- Enforce least-privilege access: org members only see/modify their org's categories
- Maintain audit trail of who created/modified which categories via auth.uid()

**User Experience Intent**:
- Org members can view and manage their organization's custom categories
- Global template categories remain visible to all (via API layer, not this RLS policy)
- No disruption to existing category functionality

## Architecture / Design Decisions

**RLS Pattern Selection**:
- **Chosen Pattern**: Org-scoped via OrganizationMember table join
- **Rationale**: Follows established Bevero pattern used across 3+ precedent migrations (cube_event_economics, automation_mutation, inventory_browser_select)
- **Benefits**: Leverages existing org membership infrastructure, consistent with codebase patterns, well-tested in production

**Policy Granularity**:
- **Level**: Table-level RLS with row-level filtering
- **Rationale**: Table-level provides sufficient isolation; column-level not needed for this use case
- **Scope**: All CRUD operations (SELECT, INSERT, UPDATE, DELETE) for org members

**Global Template Preservation**:
- **Design**: All policies include `organization_id IS NOT NULL` check
- **Rationale**: Preserves global template rows from org-member modification while allowing org-scoped policies to apply
- **Future Consideration**: Global template rows may need separate service-role policies for management

**Naming Convention**:
- **Pattern**: `<table>_<role>_<operation>` (e.g., `inventory_category_org_member_select`)
- **Rationale**: Clear, self-documenting policy names that match existing Bevero conventions

## Governance / Regulatory

**Access Matrix** (documented in migration header):
```
InventoryCategory  read: org member  | write: org member
```

**Security Classification**: L1 (Review) — follows established pattern, no new attack surface introduced

**Compliance Alignment**:
- **Tenant Isolation**: ✓ Enforced via org-scoped policies
- **Least Privilege**: ✓ Org members only access their org's data
- **Audit Trail**: ✓ auth.uid() provides user attribution

## Cross-Surface Dependencies

**Upstream Dependencies**:
- OrganizationMember table (for org membership verification)
- Supabase Auth (for auth.uid() resolution)

**Downstream Dependencies**:
- Any API endpoints querying/creating/updating/deleting inventory categories
- Prisma client queries involving InventoryCategory model
- Bar refill template items (which reference inventory categories)

**Integration Points**:
- API layer may need adjustments for global template row visibility
- Bar refill templates may need to handle both org-specific and global categories

## Future Considerations

**Planned Enhancements**:
- [ ] ADR-XXXX reference to be updated if this is part of formal RLS initiative
- [ ] Consider service-role policies for global template management
- [ ] Evaluate need for role-based restrictions within org (e.g., staff read-only, admin full access)

**Potential Extensions**:
- Additional RLS policies for other inventory-related tables
- Row-level audit logging for category modifications
- Category-level permissions for specific user groups

**Migration Strategy**:
- Current: Manual migration creation following established pattern
- Future: Consider automated RLS policy generation for new org-scoped tables

## Non-Goals / Out of Scope

**Explicitly Not Addressed**:
- Role-based permissions within organizations (all org members get same access level)
- Global template row access (this is handled separately by API layer or service-role)
- Category-level permissions for specific users or groups
- Historical data migration (only new RLS policies)

**Rationale**:
- Role-based permissions require broader RBAC implementation (separate initiative)
- Global template access pattern is application-specific, not RLS concern
- Keeping migration focused and low-risk following established pattern

## Risk Assessment

**Security Risks**: LOW
- Pattern is well-tested in production across multiple tables
- No new attack surface introduced
- Least-privilege principle maintained

**Operational Risks**: LOW
- Idempotent migration design (DROP IF EXISTS)
- Transaction safety (BEGIN/COMMIT)
- Backward compatible with existing data

**Business Risks**: LOW
- No user-facing changes in this migration
- Preserves existing functionality
- Enables proper tenant isolation for future category management features

## Success Criteria

**Technical**:
- [ ] Migration applies without errors
- [ ] RLS policies visible in pg_policies
- [ ] Org members can read their org's categories
- [ ] Org members can create/update/delete their org's categories
- [ ] Global template rows remain untouched (organization_id IS NULL)

**Business**:
- [ ] No disruption to existing category functionality
- [ ] Proper tenant isolation enforced
- [ ] Audit trail preserved via auth.uid()

**Verification**:
- [ ] Manual testing of CRUD operations
- [ ] Policy inspection via SQL queries
- [ ] Integration testing with API endpoints

## Lessons Learned

**Pattern Reproducibility**: HIGH
- Org-scoped RLS pattern is highly consistent across Bevero codebase
- Clear precedents make migration creation straightforward
- Pattern could potentially be automated for future org-scoped tables

**Documentation Quality**: HIGH
- Existing migrations include detailed ADR references and comments
- Access matrix pattern helps document security boundaries
- Pattern precedents are well-documented in migration headers

**Integration Considerations**: MEDIUM
- Global template rows require separate handling (not RLS)
- API layer may need adjustments for complete multi-mode access
- Coordination needed between RLS and application-layer logic