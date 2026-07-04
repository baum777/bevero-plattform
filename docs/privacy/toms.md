# Technisch-organisatorische Maßnahmen (TOM) — minimal (Art. 32 DSGVO)

**Stand:** 2026-07-04 · **Status:** `draft` · Schließt **P-B9**.
**Zweck:** Anlage zum Pilotkunden-AVV (`pilot-avv-annex.md`). Ohne dieses Dokument
ist der AVV nicht sauber abschließbar.

> ⚠️ Beschreibt den **aktuellen technischen Stand**, belegt aus dem Repo. Kein
> Nachweis rechtlicher Vollständigkeit, keine Zusicherung lückenloser Sicherheit.
> Jede Zeile nennt ihren Belegpfad; nicht belegte Punkte sind als `offen`
> markiert. Keine Rechtsberatung.

---

## 1. Vertraulichkeit (Zugriffskontrolle)

| Maßnahme | Umsetzung | Belegstand | Beleg |
|---|---|---|---|
| **Authentifizierung** | Supabase-Auth; JWT-Verifikation (HS256 + ES256 via JWKS), Bearer-Token, Ablauf-/`nbf`-Prüfung | belegt | `apps/api/src/modules/auth/actor.ts` |
| **Rollenbasierte Autorisierung (RBAC)** | Rollen owner/admin/manager/staff/viewer; `requireActorRole()`, `assertCanGrantOrganizationRole()` | belegt | `apps/api/src/modules/auth/actor.ts` |
| **Mandantentrennung** | `organizationId` auf zentralen Tabellen; Request hart auf eine Org gebunden (`selectActiveMembership`) | belegt (Code); Cross-Org-Integrationstest `offen` | `apps/api/prisma/schema.prisma`, `actor.ts` |
| **Row Level Security (RLS)** | RLS aktiv auf zentralen Tabellen; org-scoped SELECT-Policies; `UserProfile` self-or-org-Policy via `private.can_read_user_profile()` | belegt | `apps/api/prisma/migrations/20260527202000_enable_public_table_rls/`, `..._harden_user_profile_rls/`, ADR `docs/architecture/adr-rls-cockpit-reads.md` |
| **Cockpit-Direktread-Grenze** | Nur Tabellen mit org-scoped User-Policy; Shift-Tabellen bewusst Service-Role-only | belegt | `docs/architecture/adr-rls-cockpit-reads.md`, Contract-Test `apps/api/tests/rls-cockpit-reads-contract.test.ts` |

## 2. Integrität

| Maßnahme | Umsetzung | Belegstand | Beleg |
|---|---|---|---|
| **DB-Target-Guard** | Fail-closed-Prüfung vor risikobehafteten Prisma-Kommandos; Allowlist + Approval-Phrasen | belegt | `apps/api/scripts/verify-database-target.ts`, `apps/api/tests/database-target-guard.test.ts`, `apps/api/prisma.config.ts` |
| **Append-only-Bewegungen** | `InventoryMovement` mit `idempotencyKey` (unique), Snapshots append-only | belegt | `apps/api/prisma/schema.prisma` (`InventoryMovement`, `InventoryStockSnapshot`) |
| **Nachvollziehbarkeit (begrenzt)** | Wer/Was/Wann: `actorUserId`, Zeitstempel; `OperationalNoteAuditEvent` für Notizen | belegt — **kein** revisionssicherer/lückenloser Audit-Trail | `apps/api/prisma/schema.prisma` |

## 3. Transport / Übertragung

| Maßnahme | Umsetzung | Belegstand | Beleg |
|---|---|---|---|
| **TLS zur DB** | `sslmode=require` in DB-Verbindungsparametern (Template) | belegt (Template) | `.env.example` (`DATABASE_URL`/`DIRECT_URL` mit `sslmode=require`) |
| **HTTPS App-Zugriff** | Vercel-Hosting (TLS terminiert) | plausibel, nicht separat belegt | `docs/deployment-vercel.md` |
| **CORS-Beschränkung** | `CORS_ALLOWED_ORIGINS` muss Cockpit-Origin enthalten | belegt (Config-Vertrag) | `docs/deployment-vercel.md`, `.env.example` |

## 4. Verschlüsselung at rest

| Maßnahme | Umsetzung | Belegstand |
|---|---|---|
| **DB-Verschlüsselung at rest** | Supabase-/AWS-Plattformeigenschaft | **offen** — über Supabase-Doku/DPA zu belegen, nicht im Repo nachweisbar |

## 5. Secrets-Handling

| Maßnahme | Umsetzung | Belegstand | Beleg |
|---|---|---|---|
| **Kein Secret im Repo** | `.env*` in `.gitignore`; `.env.example` ohne Werte | belegt | `.gitignore`, `.env.example` |
| **Secret-Scan** | Gitleaks-Konfiguration + Pre-Commit | belegt | `apps/api/.gitleaks.toml`, `apps/api/.pre-commit-config.yaml` |
| **Keine Secrets in `NEXT_PUBLIC_*`** | Nur browser-sichere Werte publik | belegt (Regel) | `docs/productization/bevero-production-environment-closure.md` |

## 6. Verfügbarkeit / Wiederherstellbarkeit

| Maßnahme | Umsetzung | Belegstand |
|---|---|---|
| **Backup / PITR** | Supabase-Backups | **offen / blockiert (P-B5)** — „no visible backups" laut `docs/productization/bevero-database-boundary-v0.md`; Owner-Entscheidung erforderlich |

## 7. Organisatorisch

| Maßnahme | Umsetzung | Belegstand |
|---|---|---|
| **Work-Slice-Dokumentation** | MSPR- + Intent-Log pro nicht-trivialer Änderung; Secret-Check | belegt — `scripts/check-work-documentation.mjs`, `docs/agent-team/work_documentation_rule.md` |
| **Autonomie-/Approval-Stufen** | L0–L4; DB/Governance L2–L4 | belegt — `IDENTITY.md`, `governance/approval-matrix.md` |
| **Incident/Breach-Prozess** | 72h-Meldeprozess | **offen (Pr-B2)** — nicht dokumentiert |

---

## Offene TOM-Punkte (nicht als erfüllt darstellen)

- Verschlüsselung at rest — Beleg über Supabase/DPA (Abschnitt 4).
- Backup/PITR — Owner-Entscheidung (Abschnitt 6, P-B5).
- Breach-Prozess — zu erstellen (Abschnitt 7, Pr-B2).
- Cross-Org-Isolation — Integrationstest ergänzen (Abschnitt 1).
- Retention/Löschung — eigenes Konzept (P-B4 / Pr-B3), nicht Teil dieses TOM.

## Verwendung

Dieses Dokument wird als **Anlage „TOM"** an den Pilotkunden-AVV
(`pilot-avv-annex.md`) gehängt. Vor Übergabe: offene Punkte oben entweder
schließen oder im AVV als bekannte Einschränkung benennen.
