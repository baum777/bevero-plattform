---
id: mspr-2026-06-09-cube-venue-spec-gap
timestamp: 2026-06-09T10:00:00.000Z
runId: cube-venue-spec-gap-2026-06-09
agentRole: orchestrator
taskType: governance_change
verdict: pass
---

# MSPR Entry — mspr-2026-06-09-cube-venue-spec-gap

- **Scope**:
  - layer: governance_policy
  - autonomyTier: 2
  - pathsInScope: ["docs/tasks/logik/00-cube-venue-spec-gap.md", "docs/tasks/logik/00a-cube-venue-model-spec.md", "docs/tasks/logik/00b-cube-source-conflict-validator.md", "docs/tasks/logik/00c-cube-event-economic-rules.md", "docs/DECISIONS.md", "docs/agent-team/mspr_logbook/2026-06-09-cube-venue-spec-gap.md"]
  - pathsOutOfScope: ["prisma/", "src/", "apps/", "web/", ".env*", ".github/workflows/", "package.json", "package-lock.json", "api/"]
- **Memory**:
  - newFindings:
    - "The user CUBE-Deepdive (2026-06-09) describes CUBE as a multi-unit hospitality system (Restaurant, o.T. Bar, Terrasse, Spange, Exklusiv-Events, Packages). The existing tasks/logik/01/02/03/08 cover the operative substrate (OperationalUnit, ServiceSlot, GroupRule, Menu, MenuItem, EventPackage, BeveragePackage, EventInquiry) but leave three gap clusters open: (A) Source-Conflict-Management, (B) Event-Wirtschaftsregeln, (C) Operations-Spec-Layer as a conceptual annotation layer."
    - "Three new spec files were created to close these gaps as documentation-only: 00a (venue-model annotations on Tasks 01/02/03), 00b (source-conflict-validator proposing CUBE_Source, CUBE_SourceField, CUBE_Conflict substrates with deterministic non-LLM detection), 00c (event-economic-rules proposing ExclusiveRentalPolicy, AfterMidnightStaffRate, NonFoodComponent, FurniturePolicy substrates with verbatim-from-Deepdive seeds, isActive=false, requiresManagerConfirmation=true markers)."
    - "ADR-0036 was appended to docs/DECISIONS.md as a single block with three sub-sections (A, B, C). Status: proposed. The ADR inherits and tightens the hard guardrails from ADR-0021 §3 (no LLM, no writeback, no service-role in user path, no InventoryMovement shortcut, append-only audit). It adds two new invariants: Brutto/Netto-Disziplin (Restaurant/Bar = gross_including_vat, Event/Bankett/Rental = net_excluding_vat) and verbatim-seed-marker (all Deepdive-derived numbers are NOT source-of-truth until manager verification)."
    - "The three gap clusters map cleanly to three proposed implementation ADRs: ADR-0029-A (Venue-Model-Impl, 11 new vitest cases), ADR-0029-B (Source-Conflict-Impl, 7 new vitest cases), ADR-0029-C (Event-Economic-Impl, 9 new vitest cases, 14-query Supabase promotion). All three follow the ADR-0022/0023 pattern: schema-only migration, RLS plan, read-only or single-mutation endpoint set, vitest gate, Supabase promotion script."
    - "Authority order reaffirmed: ADR-0014 → ADR-0017 → ADR-0021 → ADR-0022 → ADR-0023 → ADR-0030 → this ADR. In case of conflict, the previous ADR wins; ADR-0036 must be updated or superseded before any implementation begins. **Note (2026-06-09):** the original formulation listed ADR-0034 → ADR-0035 → ADR-0037 between ADR-0030 and ADR-0036; those ADRs were renamed and re-numbered to ADR-0034/0035/0048/0053 on 2026-06-09 (see `docs/tasks/logik/README.md` §'Task-Verzeichnis')."
    - "13 Open Questions are documented across the three specs and the ADR: Spange-Seed, parentContext shape, slot-overrides, capacity-policy placement, weather client-side, dayparts shape, CUBE_Source schema scope, CUBE_Conflict as own substrate, source-conflict mutation endpoint shape, ExclusiveRentalPolicy schema scope, security role placement, extraCostNetCents nullable, FurniturePolicy placement. Each routes to ADR-0029-A/B/C for resolution with a documented default."
  - reusableRules:
    - "Documentation-only slices follow the same pattern as code slices: MSPR entry + ADRs + spec files + cross-references. The pattern is reusable for any future documentation gate (e.g. ADR-0050+ for new product lines)."
    - "Verbatim-from-Deepdive seeds with isActive:false + requiresManagerConfirmation:true markers are the right pattern for unverified business data. The marker is a boolean column (not a separate review-task) and the Cockpit-Read-Endpoint can filter on it. This avoids creating premature review-tasks for values that may not be adopted."
    - "Source-Conflict-Management reuses the existing AutomationSuggestion/AutomationDecision append-only infrastructure (ADR-0022/0023). The CUBE_Conflict substrate is a fast list-view optimization, not a parallel decision system. Manager approval goes through the same path; the only addition is a winningFieldValue payload field for the resolve endpoint."
    - "Brutto/Netto-Disziplin is enforced via DB-Check-Constraint, not application code. The constraint fires on insert/update and raises PostgreSQL 23514 check_violation. This is the ADR-0016 Idempotenz-Geist applied to a price-mode invariant."
  - gotchas:
    - "ADR-0036 in docs/DECISIONS.md was appended after the last ADR block (which was the Phase C closure at line ~1524). The file is now ~1700+ lines. Future readers searching for ADR-0036 should grep for 'ADR-0036' rather than scroll to the bottom."
    - "The four new tasks/logik/00*.md files use a non-standard numbering (00, 00a, 00b, 00c) because they precede Tasks 01-13 in the workplan sequence (Sub-Phase 3.0). The README.md table in docs/tasks/logik/README.md does NOT list these four files yet — that is intentionally out-of-scope for this slice and routes to a follow-up documentation update."
    - "The verbatim seeds in 00c contain exact CUBE-Bankettmappe numbers (2.900 €, 9.000 €, 26 €/h, etc.) from 2026-06-09. These values MUST be marked as pre-verification in any future Cockpit display and MUST NOT be used for any business calculation without manager approval. A future ADR may supersede these with verified values."
    - "The CUBE_Source substrate (00b) is described as 'brand-übergreifend' (cross-brand) but the spec is CUBE-centric. Motorworld Inn will eventually need the same substrate; ADR-0029-B should consider whether the schema lives in 'public' (recommended) or a per-brand schema. This is Open Question 7."
    - "Spalte ground_floor (Spange) is mentioned in 00a §1 Open Question 1 as a seed gap, but is NOT proposed for this slice. The recommendation is a follow-up task (01.1-cube-spange-seed-impl.md) which is also out-of-scope here. A future owner must decide whether to add the Spange before or after the CUBE-Cockpit goes live."
- **Progress**:
  - actionsTaken:
    - "docs/tasks/logik/00-cube-venue-spec-gap.md created (3-4 KB). Cross-Reference-Tabelle (13 Deepdive-§ × 4 existierende Tasks × 3 neue Specs) documented. Three gap clusters named (A: Source-Conflict, B: Event-Economics, C: Operations-Spec-Layer). Authority-Anker zitiert. Hard-Guardrails explizit aus ADR-0021 §3."
    - "docs/tasks/logik/00a-cube-venue-model-spec.md created (5-6 KB). 8 Entscheidungs-Sections: Venue-Graph, Service-Slot-Matrix, Reservierungs-Decision-Engine, Offer-Catalog, Beverage-Packages, o.T. Bar, Private-Packages, Intake-Fallback. 6 Open Questions. Brutto/Netto-Invariante als DB-Check-Constraint-Spec formuliert. Annotationen für OperationalUnit, ServiceSlot, GroupRule, Menu, MenuItem, EventPackage, BeveragePackage, EventInquiry dokumentiert."
    - "docs/tasks/logik/00b-cube-source-conflict-validator.md created (4-5 KB). 4 Entscheidungs-Sections: Source-Versioning-Substrat (CUBE_Source, CUBE_SourceField), Conflict-Detection (CUBE_Conflict optional), Manager-Approval-Pfad via ADR-0022/0023, Cockpit-View-Out-of-Scope. 3 Open Questions. Beispiel-Workflow dokumentiert."
    - "docs/tasks/logik/00c-cube-event-economic-rules.md created (4-5 KB). 5 Entscheidungs-Sections: Exclusive-Rental-Policy, After-Midnight-Staff-Rate, Non-Food-Component, Furniture-Threshold-Konflikt, Out-of-Scope. 4 Open Questions. Verbatim-Beispiel-Seed mit isActive:false + requiresManagerConfirmation: true Markern. Brutto/Netto-Disziplin als DB-Constraint-Spec."
    - "ADR-0036 appended to docs/DECISIONS.md (Status: proposed, ~2-3 KB, after the Phase C closure at line ~1524). One block, three sub-sections (A, B, C). Hard-Guardrails explizit. Authority-Order bestätigt. Rollback-Plan dokumentiert. 13 Open Questions referenziert. 3 Implementation-ADRs (ADR-0029-A/B/C) als Next-Gate benannt."
    - "MSPR-Logbook entry (this file) created at docs/agent-team/mspr_logbook/2026-06-09-cube-venue-spec-gap.md following the existing 2026-06-08-phase-b-mutation-surface.md style (YAML frontmatter + scope + memory + progress + scorecard sections)."
  - filesRead:
    - "docs/DECISIONS.md (lines 1490-1524 to identify the ADR block insertion point)"
    - "docs/tasks/logik/README.md (full read, 102 lines, for the Handling Rules and Binding references)"
    - "docs/tasks/logik/01-cube-sub-units-data-model.md (full read, 59 lines)"
    - "docs/tasks/logik/02-cube-menu-matrix.md (full read, 59 lines)"
    - "docs/tasks/logik/03-cube-event-intake-read-apis.md (full read, 61 lines)"
    - "docs/tasks/logik/08-cockpit-cube-service-slot-dashboard.md (full read, 88 lines)"
    - "docs/agent-team/mspr_logbook/2026-06-08-phase-b-mutation-surface.md (first 50 lines for style reference)"
  - validation:
    - "No code was written. No schema was changed. No migration was added. No Fastify route was added. No Cockpit view was added. No .env* file was touched. No package.json was changed. No .github/workflows/ was touched. No web/ was touched (frozen per ADR-0013)."
    - "Markdown files (4 new + 1 extended) are valid Markdown. Tables use the pipe syntax. Code blocks use triple-backtick fences. Headings use ATX-style hashes. No HTML embeds."
    - "Cross-References zwischen den 4 neuen Dateien und dem ADR-0036-Block sind konsistent. Jede Datei nennt die anderen drei plus die existierenden Tasks 01/02/03/08 in den Bindings."
    - "No secrets committed. No .env* values referenced in any of the 4 new files or in the ADR-0036 block."
- **Scorecard** (Reviewer verdict from swarm_review_gate.md):
  - correctness: 9/10 — Spec is internally consistent; no logical contradictions across the 4 files or against the ADR-0036 block. Deducted for the 13 Open Questions which are documented but not resolved (intentional; routes to ADR-0029-A/B/C).
  - scopeAdherence: 10/10 — Documentation-only slice. Zero code, zero schema, zero migration, zero route, zero Cockpit view. Hard-Guardrails eingehalten.
  - authorityCompliance: 10/10 — Authority-Order zitiert in jeder Datei. ADR-Discipline eingehalten (kein Code-Slice, daher kein acceptiertes ADR nötig). AGENTS.md Stop-Conditions nicht ausgelöst.
  - readability: 9/10 — Tabellen, Code-Blöcke, Gliederungen konsistent. Deducted for the verbatim German spec text in 00b/00c (intentional; reflects the user's German source).
  - rollbackSafety: 10/10 — Single git revert removes all 4 new files + the ADR-0036 block. No data, no schema, no env, no CI state.
  - overall: pass. Slice is ready for owner review and ADR-0036 acceptance.
- **Risks**:
  - "Spec-Drift: The 4 new files contain proposed field extensions (e.g. parentContext, dayparts, isKidsPackage) that may conflict with future implementation work. Mitigation: each field is documented as 'optional' or 'Annotation, nicht Ersetzung'."
  - "Premature Implementation: An agent may read the specs and start writing code before ADR-0036 is accepted. Mitigation: the specs explicitly state 'Target repo state: Keine. Reine Spec.' in the header."
  - "Scope Creep in Cockpit: A future agent may try to add Cockpit views in the same slice. Mitigation: the ADRs in tasks/logik/01-13 enforce the 'Read-only by default' rule and the Cockpit-View for each new substrate is its own follow-up task."
  - "Owner-Review-Verzug: ADR-0036 has 13 Open Questions. Owner may delay acceptance until each is resolved. Mitigation: 6 of 13 questions have a recommended default; 7 are architectural decisions that need owner input."
- **Next Gate**:
  - "Owner review of the 4 new files plus the ADR-0036 block in docs/DECISIONS.md."
  - "If accepted, three implementation ADRs become draftable: ADR-0029-A (Venue-Model-Impl), ADR-0029-B (Source-Conflict-Impl), ADR-0029-C (Event-Economic-Impl). Each follows the ADR-0022/0023 pattern: schema-only migration, RLS plan, read-only or single-mutation endpoints, vitest gate, Supabase promotion script."
  - "If rejected, the 4 new files plus the ADR-0036 block are reverted via single git revert. No data, no schema, no env, no CI state left behind."

### Hand-off Notes

- "The CUBE-Deepdive is a high-quality but dense source. The three gap clusters (A, B, C) were identified by reading the 4 existing tasks (01/02/03/08) and the gap-README. Future work should NOT re-do this gap analysis; the cross-reference table in 00-cube-venue-spec-gap.md is canonical."
- "The verbatim-from-Deepdive seeds in 00c are intentionally NOT promoted to isActive=true in this slice. A future owner decision must mark them active after verifying against the actual Bankettmappe PDF."
- "CUBE_Source substrate is proposed as brand-übergreifend (public schema). If a future implementation decides per-brand isolation, ADR-0029-B must document the schema split."
- "Source-Conflict-Resolution uses a dedicated endpoint pair (POST /admin/cube/conflicts/:id/resolve) per Open Question 3 default. If owner prefers extending the existing ADR-0023 body with winningFieldValue, ADR-0029-B must document the body schema change."
- "Furniture-Threshold-Konflikt is placed in 00c (Event-Economics), not 00b (Source-Conflict). Both are valid placements; owner decision routes to ADR-0029-C."
