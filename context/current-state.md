# Current State — Rauschenberger OS

**Zuletzt aktualisiert:** 2026-06-29 (Audit: Modul-/Modell-/Migrations-/Routen-Verifikation via `rg`/`glob`; git-Status)
**Status:** Bevero Plattform operativ — Cockpit, API und Landing deployed (laut Deployment-SOT 2026-06-18; **Production-Alias für api+ui heute nicht live verifiziert**)

---

## Aktiver Kontext

- OS-Version: 0.2.0
- Phase: Bevero-Plattform live — Monorepo stabilisiert, Cockpit deployed
- Pilot-Workflow: Einkaufsbestellung Motorworld Inn (L3) — dokumentiert und active, **noch kein echter Durchlauf**
- Repo: Monorepo unter `apps/` (api, cockpit, landing)
- Branch: `feat/ux-optimierung-cockpit` (3 Commits vor `main` — Tip `e5cde2a`; UX-Cockpit-Sprint 1 abgeschlossen; lokaler Stand siehe Housekeeping + Pilot-Path-A-Vorbereitung, beides 2026-06-29 dokumentiert)

## Kennzahlen (verifiziert 2026-06-29)

| Metrik | Wert | Vorher (06/19) | Quelle |
|---|---|---|---|
| Module (`apps/api/src/modules/`) | **21** | 19 | `Observed` — `ls` |
| Prisma-Modelle (`^model `) | **89** | 78 | `Observed` — `rg -c` schema.prisma |
| Prisma-Enums (`^enum `) | **52** | — | `Observed` — `rg -c` schema.prisma |
| Migrationen | **65** | 59 | `Observed` — `ls` migrations/ |
| API-Routen (`app.(get\|post\|put\|patch\|delete)(`) | **101** | 124* | `Observed` — `rg` über `apps/api/src` |

*Diskrepanz zu README (124): vermutlich andere Zählmethodik. 101 ist die verifizierte Anzahl echter Handler-Registrierungen.

**Test-Suiten:** `vitest` (devDep) + `apps/api/vitest.config.ts` vorhanden. **85 Test-Dateien, 22.842 Zeilen** unter `apps/api/tests/` (`Observed` — `find` + `wc -l`). README-Wert (21.169) leicht veraltet — Tests seitdem gewachsen. **Korrektur:** ein früherer glob-Check lieferte fälschlich "keine Tests"; `find`/`git ls-tree` sind hier autoritativ, glob nicht. **Noch offen:** Suite-Lauf (vitest grün/rot) zur Bestätigung.

---

## Aktive Brands / Standorte

| Brand | Standort | Operativ in Bevero | Notiz |
|---|---|---|---|
| Motorworld | Inn Böblingen | Pilot laufend | Bar-Auffüllliste aktiv, Einkaufs-Pilot 2026-06-16 |
| CUBE | — | Nein | geplant Phase 3 |

---

## Technischer Stand

| Schicht | Status | Notiz |
|---|---|---|
| `apps/api` | deployed (Vercel `bevero-api`) | Fastify 5.2 · Prisma 6.1 · Supabase Postgres · RLS aktiv · 21 Module |
| `apps/cockpit` | deployed (Vercel `bevero-ui`) | Next.js 15.3 · React 19 · Supabase Auth |
| `apps/landing` | deployed (Vercel `landing`) | Vite + React · KAM-Onepager-Stand (`64e4848`) |
| Supabase DB | aktiv | Row-Level Security auf allen public tables aktiviert |
| Governance | aktiv | L0–L4, approval-matrix, evidence-contract in Kraft |

**Production-Alias (laut SOT 2026-06-18, heute nicht live verifiziert):** `bevero-api` + `bevero-ui` hatten `target: null` (kein prod-Alias); `landing` korrekt (`target: production`).

---

## Offene Entscheidungen & Schleifen

**Governance / Pilot (mit Gate-Zuordnung):**
- [ ] **Stray Vercel-Projekt `rauschenberger-os` (`prj_Z60vyyeyLELjWJ90udDE9Zh7KHfY`) löschen** → Gate: **L3 Operator**, Vercel-Dashboard. Kein API-Zugriff in dieser Session; blockiert Schließung des 2026-06-28 404-Alias-Befunds.
- [ ] **Reviewer-Person real benennen** (Pilot-Placeholder in `approval-matrix.md` überschreiten, `reviewer ≠ author`) → Gate: **Operator-Entscheidung**, organisatorisch. Blockiert Rollout des Pilot-Vehicles auf weitere Standorte.
- [ ] **Pilot-Durchlauf Path A** (2 Runs: approve + reject auf `bevero-ui`, Motorworld Inn Böblingen, Sequenz siehe `docs/pilot/pilot-go-live-concept.md` §5) → Gate: **Operator Runtime** (Browser + Credentials auf `bevero-ui`; Manager-Account). 3 Runtime-Vor-Gates unbestätigt: Demo-Login, Motorworld-Daten sichtbar, Manager-RBAC.
- [ ] **vitest Suite-Lauf** (85 `*.test.ts` / 22.842 Zeilen unter `apps/api/tests/`) → Gate: **Runtime** (braucht Supabase DB per Validation Gate `apps/api/AGENTS.md`). "Fehlende Tests"-Behauptung aus 2026-06-19 widerlegt — Dateien sind da, Suite-Lauf-Status fehlt.
- [ ] **Track A — `RAUSCHENBERGER-OS-SUMMARY.md` refresh** (Konsolidierung IDENTITY/VISION/Landing-KAM-Onepager) → **Folgeslice**, eigener Work-Slice mit Docs-Task-Type.

**7 ungemergte Remote-Branches (Review offen, nicht gelöscht 2026-06-29):**
`codex/cockpit-auth-resilience-patches`, `codex/docs-restructure-summary`, `codex/supabase-auth-profile`, `codex/warenfluss-webapp`, `feat/kitchen-phase-g-issues-signoff`, `feat/landing-workflow-narrative`, `feat/sidebar-area-toggle-admin-only` → Gate: **Operator**, Owner-Review merge-vs-delete.

**Repo-Hygiene (audit 2026-06-29, abgeschlossen):**
- [x] Root `.vercel/project.json` lokal entfernt — SOT-konform, App-Deploys unbeschadet
- [x] Stray root-Verzeichnis (lokal) bereinigt — Dashboard-Löschung separat (siehe oben)
- [x] Branch-Housekeeping Teil 1: 23 gemergte Branches gelöscht (inkl. `origin/master`)
- [x] `.zip`-Dumps: `*.zip` in `.gitignore` + 3 physisch gelöscht (~122 MB freigegeben)
- [~] vitest Suite-Lauf (siehe oben)

**Spec-Spannung (behoben 2026-06-29):**
- [x] `apps/api/AGENTS.md`-Guardrail aktualisiert: "proposed, not yet migrated" → "migrated + accepted" (ADR-0022 Phase B + ADR-0023 Mutation Surface, beide accepted 2026-06-08). Header "(in flight, Phase A)" → "(spec adopted; Phase B/C landed)". **Hard-Guardrails** (no auto-mutation, no writeback, RLS authoritative, append-only suggestions/decisions) unangetastet. Offline sync / shift-handover write / external writeback bleiben separat ADR-gebunden.

**Erledigt:**
- [x] Pilot-Workflow definiert: Einkaufsbestellung Motorworld Inn (L3)
- [x] Bevero-Integration spezifiziert (apps/api + Prisma-Schema)
- [x] Branch `feat/landing-kam-onboarding` in `main` gemerged (Commit `aa7b180`, Tip `2cbf204`)
- [x] Production-Alias-404 (`rauschenberger-os.vercel.app`) aufgeklärt: gehört stray root-Projekt, nicht canonical

---

## Letzter Stand

Dieses Dokument wird zu Beginn jeder OS-Session aktualisiert.
Veralteter Stand → erst aktualisieren, dann arbeiten.

**Audit 2026-06-29 durch:** BAUM-OS-Agent. Alle Zahlen `Observed` via `rg`/`glob`/`git`. Deploy-Live-Status nicht verifiziert (kein Vercel-API-Zugriff in dieser Session).
