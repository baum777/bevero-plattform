# Task: Cockpit Audit Hardening — Cross-Cutting Quality, Type-Safety, ADR-Discipline

**Working title:** `cockpit-audit-hardening`

**Status:** `OPEN`
**Owner-ADR:** ADR-0059 (proposed, cross-cutting) — *(renumbered 2026-06-09: war ADR-0048, jetzt ADR-0059)*
**Depends on:** alle vorherigen Tasks (01–13)
**Source spec:** `docs/tasks/cockpit-audit-workplan.md`, ADR-0021, ADR-0022, ADR-0029 (Back-Promotion-Pattern)
**Target repo state:** `package.json` Scripts + `tsconfig.json` Stricter + `eslint`-Regeln + `vitest`-Setup + ADR-Discipline-Check-Script; CI-Workflow-Edit; 8 vitest cases (für das Discipline-Script).

## Decision

Cross-Cutting Hardening bündelt alle **Qualitäts-Disziplin-Maßnahmen**, die in den vorherigen 13 Tasks implizit erwartet, aber nicht explizit als Slice ausgeliefert wurden:

1. **TypeScript-Strictness** — `tsconfig.json` `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. Verifiziert, dass alle neuen Module in Tasks 01–13 strict-konform sind.
2. **ESLint-Regeln** — `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `no-restricted-syntax` für `console.log` in `src/routes/*` (außer explizit erlaubt).
3. **Prisma-Discipline** — `npx prisma validate` als pre-commit-Hook + CI-Step, `npx prisma format` als Auto-Format.
4. **ADR-Discipline-Check-Script** — `scripts/check-adr-discipline.ts` scannt `src/` nach Magic-Strings (`"CUBE"`, `"Motorworld"`, `"Rauschenberger"`) und gibt Warnings aus, wenn sie in `if`-Bedingungen ohne `LocationProfile`-Discriminator auftauchen. Verletzt ADR-0030 §Decisions §1.
5. **PII-Sanitization-Test** — `tests/lib/pii-sanitizer.test.ts` mit Property-Based-Tests (z.B. fast-check) für Sanitizer-Helper aus Task 12.
6. **Coverage-Gate** — `vitest --coverage` mit Mindestschwellen: 80% Lines, 70% Branches für `src/modules/*`, 60% für `src/routes/*`.
7. **CI-Workflow-Update** — `.github/workflows/ci.yml` um Steps erweitern: `prisma validate`, `typecheck`, `vitest --coverage`, `check-adr-discipline`.
8. **README-Update** — `README.md` mit Verweis auf `docs/tasks/logik/` als Re-Entry-Punkt für alle 13 Tasks.

**Bindungen:**
- ADR-0002 (read-only POS v1)
- ADR-0016 (Snapshot + Idempotenz, transaktional)
- ADR-0017 (RLS via `app_runtime`)
- ADR-0021 (alle Guardrails)
- ADR-0030 §Decisions §1 (Profil-Discriminator)
- ADR-0029 (Back-Promotion-Pattern)
- VISION §3 (Nicht-Scope), §11 (Guardrails)

**Out-of-Scope:**
- Performance-Optimierung (Caching-Tuning, DB-Indexing) — eigenes ADR.
- Security-Audit (Pen-Test, OWASP-Top-10) — `cso`-Skill, separates Audit.
- Migration zu anderem ORM — bewusst out-of-scope.
- Service-Worker-Registration — Phase D laut ADR-0021.
- LLM-Integrationen — bewusst out-of-scope, eigenes AI-Strategie-ADR.

## File scope

| Path | Aktion | Inhalt |
|---|---|---|
| `tsconfig.json` | edit | strict-Flags setzen |
| `.eslintrc.json` | edit | neue Regeln |
| `package.json` | edit | Scripts: `lint:discipline`, `check:adr`, `prisma:format` |
| `scripts/check-adr-discipline.ts` | new | ADR-Discipline-Check-Script |
| `scripts/setup-pre-commit.sh` | new | Optional pre-commit-Hook-Setup (nur Anleitung, kein echter Hook-Install) |
| `tests/lib/pii-sanitizer.test.ts` | new | Property-Based-Tests mit fast-check |
| `tests/scripts/check-adr-discipline.test.ts` | new | 8 vitest cases für das Discipline-Script |
| `vitest.config.ts` | edit | Coverage-Schwellen setzen |
| `.github/workflows/ci.yml` | edit | Steps: prisma validate, typecheck, vitest --coverage, check-adr-discipline |
| `README.md` | edit | Verweis auf `docs/tasks/logik/` + Reihenfolge der 13 Tasks |

## Open Questions

1. Soll das `check-adr-discipline`-Script als Hard-Fail (CI bricht) oder Soft-Warn laufen? — **Empfehlung: Soft-Warn in v1** (gibt Warning-Liste aus, CI bricht nicht), Hard-Fail als Phase-5.5-Folge nach manueller Code-Bereinigung.
2. Soll `no-restricted-syntax` für `console.log` auch in `src/modules/*` gelten? — **Empfehlung: nur in `src/routes/*`**, weil Module oft Debug-Logs brauchen.
3. Soll Coverage-Gate auch für `tests/` selbst gelten? — **Empfehlung: nein**, weil Tests keine Coverage brauchen.
4. Soll `tsconfig.json` `"exactOptionalPropertyTypes": true` aktivieren, obwohl es Breaking-Change für bestehenden Code sein kann? — **Empfehlung: ja, mit explizitem Migrations-Slice**, weil Type-Safety in Tasks 01–13 davon profitiert.
5. Soll `prisma format` als Auto-Format (pre-commit) oder nur als Check (CI) laufen? — **Empfehlung: nur als Check**, weil Auto-Format bestehende Diffs verwischt.

## Gate (Definition of Done)

- `npm run typecheck` grün mit strict-Flags
- `npm run lint` grün
- `npm run test` (vitest) grün, 597 total (589 + 8 neue)
- `npm run check:adr` läuft ohne Hard-Fail (Soft-Warn-Liste ≤ 10 Warnungen)
- `npm --prefix apps/cockpit-next run typecheck` grün
- CI-Workflow lokal nachvollziehbar (`act` oder GitHub-Actions-Dry-Run)
- Owner-Acceptance

## Next gate

Dieses Hardening-Slice ist **Voraussetzung** für alle nachfolgenden Slices (z.B. ADR-0061 Mutation Surface, ADR-0062 PII-Vollzugriff, Phase 6 Mobile Event-Execution). Ohne dieses Slice keine weiteren ADRs. *(ADR-0042/ADR-0047 renumbered 2026-06-09; siehe README §"Bewusst NICHT")*

---

# Zusammenfassung aller 14 Tasks

| # | Working Title | Owner-ADR | File | Status |
|---|---|---|---|---|
| 01 | cube-sub-units-data-model | ADR-0034 | `01-cube-sub-units-data-model.md` | OPEN |
| 02 | cube-menu-matrix | ADR-0035 | `02-cube-menu-matrix.md` | OPEN |
| 03 | cube-event-intake-read-apis | ADR-0048 | `03-cube-event-intake-read-apis.md` | OPEN |
| 04 | motorworld-inn-standortlogik-contract | ADR-0049 | `04-motorworld-inn-standortlogik-contract.md` | OPEN |
| 05 | motorworld-inn-data-model | ADR-0050 | `05-motorworld-inn-data-model.md` | OPEN |
| 06 | mother-concern-read-apis | ADR-0051 | `06-mother-concern-read-apis.md` | OPEN |
| 07 | cockpit-standort-picker-kontext | ADR-0052 | `07-cockpit-standort-picker-kontext.md` | OPEN |
| 08 | cockpit-cube-service-slot-dashboard | ADR-0053 | `08-cockpit-cube-service-slot-dashboard.md` | OPEN |
| 09 | cockpit-motorworld-event-space-board | ADR-0054 | `09-cockpit-motorworld-event-space-board.md` | OPEN |
| 10 | rauschenberger-meta-layer-contract | ADR-0055 | `10-rauschenberger-meta-layer-contract.md` | OPEN |
| 11 | mother-concern-data-model | ADR-0056 | `11-mother-concern-data-model.md` | OPEN |
| 12 | mother-concern-read-apis-v2 | ADR-0057 | `12-mother-concern-read-apis-v2.md` | OPEN |
| 13 | cockpit-mother-concern-dashboard | ADR-0058 | `13-cockpit-mother-concern-dashboard.md` | OPEN |
| 14 | cockpit-audit-hardening | ADR-0059 | `14-cockpit-audit-hardening.md` | OPEN |

## Reihenfolge der Abarbeitung

**Sequenz 1 (CUBE-Substrate):** 01 → 02 → 03
**Sequenz 2 (Motorworld-Substrate):** 04 → 05 → 06 → 07
**Sequenz 3 (CUBE-Cockpit):** 08 (parallel zu 09 möglich, aber Task 07 als Voraussetzung)
**Sequenz 4 (Motorworld-Cockpit):** 09 (nach 07, parallel zu 08)
**Sequenz 5 (Meta-Layer):** 10 → 11 → 12 → 13
**Sequenz 6 (Cross-Cutting):** 14 (am Ende, vor allen Folge-ADRs)

## Coverage-Schätzung

- **Tasks 01–03 (CUBE):** ~3 ADRs, ~13 neue Modelle, ~32 vitest cases
- **Tasks 04–07 (Motorworld):** ~3 ADRs, ~7 neue Modelle, ~24 vitest cases
- **Tasks 08–09 (Cockpit Standort):** ~2 ADRs, ~5 Cockpit-Routen, ~5 vitest cases
- **Tasks 10–13 (Meta-Layer):** ~4 ADRs, ~10 neue Modelle, ~30 vitest cases
- **Task 14 (Hardening):** ~1 ADR, ~8 vitest cases, CI-Update

**Total:** ~13 ADRs, ~35 neue Modelle, ~99 neue vitest cases, ~15 neue Cockpit-Routen, ~30+ neue Read-Endpoints, ~14 Supabase-Promotion-Scripts.

**Geschätzte Sprint-Dauer:** 6–8 Sprints (à 2 Wochen), abhängig von Owner-Review-Geschwindigkeit.
