# Priorities — Rauschenberger OS

**Zuletzt aktualisiert:** 2026-06-29 (Audit + Kontext-Refresh)

---

## Aktueller Fokus

**Phase:** Pilot Go-Live (Manual Mode) — **Path A: Korrektur → Freigabe (L2)**

1. **Runtime-Gates verifizieren** — `bevero-ui` Demo-Login, Motorworld-Inn-Daten sichtbar, Manager-Rolle aktiv (live ✓, Rest braucht Login)
2. **Pilot-Durchlauf Path A** — Inventory-Korrektur → Freigabe, 2 Durchläufe (approve + reject) — siehe `docs/pilot/pilot-go-live-concept.md` §5
3. **Path B (folge)** — PurchaseOrder-Draft-UI im Cockpit bauen (an `POST /admin/purchase-orders`) → L3-Einkaufs-Pilot
4. **Track A** — Produkt-/Positionierungs-Konzept (`RAUSCHENBERGER-OS-SUMMARY.md` refresh)

**Pilot-Spec:** Path A (Korrektur→Freigabe, L2, voll verkabelt) · Operator/Manager Cheikh · Deploy `bevero-ui` (live) · Manual Mode. Einkauf-L3-Gap (PO-UI fehlt) dokumentiert §4.1.

---

## Repo-Hygiene (neu, aus Audit 2026-06-29)

- [x] Root `.vercel/` lokal entfernt (2026-06-29, git-neutral) — SOT-konform
- [ ] Stray Projekt `rauschenberger-os` (`prj_Z60vyyeyLELjWJ90udDE9Zh7KHfY`) im Vercel-Dashboard löschen (L3 Operator)
- [x] Branch-Housekeeping Teil 1: 23 gemergte Branches gelöscht (2026-06-29) · 7 ungemergte bleiben zur Review
- [x] `.zip`-Artefakte: `*.zip` in `.gitignore` + 3 Dumps physisch gelöscht (2026-06-29, ~122 MB)
- [~] Test-Abdeckung: 85 Test-Dateien / 22.842 Zeilen vorhanden (früherer "fehlend"-Verdacht war glob false-negative) · vitest-Suite-Lauf (grün/rot) noch offen
- [x] `apps/api/AGENTS.md`-Guardrail aktualisiert (2026-06-29): "proposed/not migrated" → "migrated + accepted" (ADR-0022/0023); Header → "spec adopted; Phase B/C landed". Hard-Guardrails unangetastet.

---

## Erledigte Meilensteine

- [x] IDENTITY.md als SOT stabilisiert
- [x] Pilot-Workflow dokumentiert: Einkaufsbestellung Motorworld Inn (L3)
- [x] Bevero-Integration spezifiziert: apps/api · Prisma-Schema · Supabase
- [x] Monorepo konsolidiert: api · cockpit · landing unter `apps/`
- [x] Row-Level Security auf Supabase aktiviert
- [x] Landing-Page deployed mit Architektur-Dokumentation + KAM-Onepager (`64e4848`)
- [x] Cockpit deployed
- [x] Branch `feat/landing-kam-onboarding` in `main` gemerged (`aa7b180`)
- [x] Production-Alias-404 aufgeklärt (stray root-Projekt, nicht canonical)

---

## Nächste Meilensteine (mit Gate-Zuordnung)

| # | Meilenstein | Gate | Owner | Stand |
|---|---|---|---|---|
| 1 | Stray Vercel-Projekt `prj_Z60vyyeyLELjWJ90udDE9Zh7KHfY` löschen | L3 Runtime | Operator (Vercel-Dashboard) | offen |
| 2 | Reviewer-Person real benennen (Pilot-Placeholder überschreiten) | organisatorisch | Operator | offen |
| 3 | Runtime-Gates verifizieren (Demo-Login / Motorworld-Daten / Manager-RBAC) auf `bevero-ui` | Runtime | Operator (Browser + Credentials) | offen |
| 4 | Pilot-Durchlauf Path A — 2 Runs (approve + reject) + Evidence + Audit-Eintrag | Runtime | Operator + Reviewer | offen (Runtime-Gates 3 zuerst) |
| 5 | vitest Suite-Lauf (`apps/api`, 85 Dateien / 22.842 Zeilen) — grün/rot | Runtime | Operator (braucht Supabase DB) | offen |
| 6 | 7 ungemergte Remote-Branches reviewen (merge oder delete) | organisatorisch | Operator | offen |
| 7 | Track A — `docs/RAUSCHENBERGER-OS-SUMMARY.md` refresh (IDENTITY/VISION/Landing-KAM konsolidiert) | Folgeslice | Builder (eigener Work-Slice) | offen |
| 8 | Live-Connector Bevero-Daten-Ingestion (L2) aktivieren | L2 + ADR-Gate | Builder (nach Pilot-Path-A-Evidenz) | zurückgestellt (v1) |

**Pilot-Path-A-Spec (verbindlich):** Inventory-Korrektur → Freigabe (L2) auf `bevero-ui`, Motorworld Inn Böblingen. Vollständige Spec: `docs/pilot/pilot-go-live-concept.md`. Einkauf-L3 (Path B) bleibt Build-Slice nach PO-UI.
