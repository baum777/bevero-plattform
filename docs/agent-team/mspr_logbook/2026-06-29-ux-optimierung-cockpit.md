# MSPR Entry — UX-Optimierung Cockpit (Sprint 1 Kern)

- id: ux-opt-cockpit-2026-06-29
- timestamp: 2026-06-29T00:00:00Z
- runId: feat/ux-optimierung-cockpit
- agentRole: builder
- taskType: implementation

## Scope

- layer: app_local
- pathsInScope:
  - apps/cockpit/hooks/use-toast.ts
  - apps/cockpit/app/components/toast.tsx
  - apps/cockpit/app/components/app-shell.tsx
  - apps/cockpit/app/globals.css
  - apps/cockpit/app/(auth)/sign-in/page.tsx
  - apps/cockpit/app/(app)/movements/movements-client.tsx
  - apps/cockpit/app/(app)/inventory/items/items-client.tsx
  - apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx
  - apps/cockpit/app/(app)/mother-concern/page.tsx
- pathsOutOfScope:
  - apps/api/**
  - Prisma schema / migrations
  - password-reset backend flow (M1, separate slice)
- autonomyTier: 2

## Code Change Context

- Trigger/request: User-Auftrag „implement web optimierung" auf Basis `docs/UX_OPTIMIERUNGSKONZEPT_COCKPIT.md` (abgeleitet aus UX/UI Evaluation Report Juni 2026).
- Why the change was needed: Report bemängelt fehlendes Action-Feedback (3× dupliziertes Toast-Pattern), schwache Login-Fehler-UX, fehlende A11y-Grundlagen (Score 4/10) und Sprach-/Navigations-Inkonsistenzen.
- Files read:
  - apps/cockpit/app/(auth)/{actions.ts,sign-in/page.tsx,components/auth-submit-button.tsx}
  - apps/cockpit/lib/auth/errors.ts
  - apps/cockpit/app/components/app-shell.tsx, app/(app)/layout.tsx
  - apps/cockpit/app/globals.css (auth-feedback, mv-toast, focus blocks)
  - die drei Toast-Clients (movements/items/bar-refill)
- Files changed:
  - + apps/cockpit/hooks/use-toast.ts (zentraler `useToast`-Hook)
  - + apps/cockpit/app/components/toast.tsx (gemeinsame `<Toast>`-Oberfläche)
  - ~ globals.css: `.app-toast*` generalisiert (Alias zu `.mv-toast`), `.field-error`, `.sr-only`, `.skip-link`, globales `:focus-visible`
  - ~ sign-in/page.tsx: autoFocus, aria-invalid, aria-describedby, role="alert", `.field-error`
  - ~ app-shell.tsx: Alerts-Navigationsduplikat entfernt, Skip-Link + `#main-content`-Fokusziel
  - ~ movements/items/bar-refill-client.tsx: auf zentralen Hook + `<Toast>` migriert
  - ~ mother-concern/page.tsx: Titel „Mother Concern" → „Konzernübersicht"
- Commands run:
  - `npx tsc --noEmit` → pass (EXIT=0)
  - `npx next build` → partial (compile ✓, lint ✓, types ✓; bricht beim Prerender der Built-in-`/_error`-Seite)
  - `git stash -u && npx next build` (Clean-Tree-Gegenprobe) → **gleicher** Prerender-Fehler ohne meine Änderungen → Fehler ist pre-existing/umgebungsbedingt (Next 15.5 + React 19.2), nicht durch diesen Slice verursacht
- Validation results:
  - Typecheck grün. Build-Compile/Lint/Types grün. Prerender-Bruch reproduzierbar auch ohne den Slice → out of scope.

## Memory

- newFindings:
  - Drei Feature-Clients hielten je eine eigene Toast-State/Timer-Logik — jetzt durch `hooks/use-toast.ts` ersetzt.
  - `next build` schlägt lokal bereits auf `main` fehl (Prerender `/_error`, `/schichtplan/heute`) — Build ist kein verlässliches Gate in dieser Arbeitskopie; `tsc --noEmit` nutzen.
- reusableRules:
  - Neue Action-Feedbacks immer über `useToast` + `<Toast>` statt Ad-hoc-State.
  - Skip-Link-Fokusziel `#main-content` ist ein `<div tabIndex={-1}>`, KEIN `<main>` (mehrere Pages rendern bereits eigenes `<main>` → Landmark-Verschachtelung vermeiden).
- gotchas:
  - Login-Fehler darf aus Sicherheitsgründen nicht ein einzelnes Feld markieren → beide Felder + gemeinsame Meldung.
  - `.bar-refill-toast`-CSS ist jetzt verwaist (harmlos, nicht entfernt).

## Review

- status: pass
- risks:
  - items-Toast wurde von Inline-Badge auf fixe Bottom-Toast-Oberfläche umgestellt (bewusste Vereinheitlichung) — visuell nicht in echtem Browser verifiziert.
  - Build-Prerender-Fehler bleibt offen (pre-existing) — separat zu adressieren.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 4
  - safety: 4
  - evidenceQuality: 4
  - sideEffects: 4
- nextGate: Restliche Konzept-Items (P3 Unsaved-Guard, M2–M8, L1–L6) + visueller Smoke-Test + Build-Prerender-Fix.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-06-29-ux-optimierung-cockpit.md`
