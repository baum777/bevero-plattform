# MSPR Entry — Privacy-Paket: AVV/Subprozessor/TOM anlegen

- id: 2026-07-04-privacy-package-avv-subprocessor-tom
- timestamp: 2026-07-04T00:00:00Z
- runId: bevero-o3-privacy-package
- agentRole: builder
- taskType: docs_spec

## Scope

- layer: docs_only
- pathsInScope:
  - docs/privacy/README.md
  - docs/privacy/dpa-references.md
  - docs/privacy/subprocessors.md
  - docs/privacy/toms.md
  - docs/privacy/pilot-avv-annex.md
- pathsOutOfScope:
  - apps/** (kein Code, keine Migration, keine .env)
  - Vercel-/Supabase-Dashboards (keine externen Accounts)
  - jeder Vertragsabschluss (Owner-/Rechtsschritt)
- autonomyTier: 1

## Code Change Context

- Trigger/request: Nächster Arbeitsblock nach O3 DSGVO Review + Supplement —
  erstes konkretes Privacy-Paket bauen (stärkster Hebel: schließt P-B1, P-B7,
  P-B9; bereitet P-B2).
- Why the change was needed: O3-Review stand auf `partial`; Pilot dokumentarisch
  blockiert. Ohne DPA-Referenzstruktur, Subprozessor-Liste und minimales TOM ist
  der Pilotkunden-AVV nicht abschließbar.
- Files read:
  - docs/privacy/* (neu erstellt)
  - apps/api/prisma/schema.prisma
  - apps/api/src/modules/auth/actor.ts
  - apps/api/prisma/migrations/20260527202000_enable_public_table_rls/migration.sql
  - apps/api/prisma/migrations/20260531132000_harden_user_profile_rls/migration.sql
  - docs/architecture/adr-rls-cockpit-reads.md
  - docs/deployment-vercel.md
  - docs/productization/bevero-database-boundary-v0.md
  - docs/productization/bevero-production-environment-closure.md
  - docs/features/item-image-service.md
  - docs/sales-kit/outreach-readiness.md
  - .env.example (nur Variablennamen/Region-Host, keine Secrets)
- Files changed:
  - docs/privacy/README.md (neu)
  - docs/privacy/dpa-references.md (neu)
  - docs/privacy/subprocessors.md (neu)
  - docs/privacy/toms.md (neu)
  - docs/privacy/pilot-avv-annex.md (neu)
- Commands run:
  - `npm run check:work-docs` → pass (siehe Validation)
- Validation results:
  - Work-docs-Check grün; keine Secret-Muster in Logbuch-Einträgen.
  - Alle TOM-Aussagen mit Repo-Belegpfad hinterlegt; nicht belegte Punkte als
    `offen` markiert.

## Memory

- newFindings:
  - Supabase Storage / Item-Image-Service ist nur Spec (ADR-0059 `draft`), nicht
    implementiert; `TaskIssue.photoUrl` / `UserProfile.avatarUrl` haben keinen
    belegten Bucket/Policy im Repo.
  - Microsoft Graph + FoodNotify sind inaktiv (`FOODNOTIFY_IMPORT_ENABLED="false"`,
    Graph-Credentials leer) — als Reaktivierungs-Gate dokumentiert.
  - Supabase-Region nur aus `.env.example` ableitbar (`eu-west-1`/Irland), nicht
    Dashboard-verifiziert.
- reusableRules:
  - Privacy-Dokumente immer als Vorlage/Entwurf mit Status-Marker; nie als
    abgeschlossener Vertrag oder Konformitätsnachweis darstellen.
  - Jede TOM-Zeile braucht einen Belegpfad oder `offen`.
- gotchas:
  - `check:work-docs` scannt nur die geänderten MSPR-/Intent-Einträge auf Secrets,
    verlangt aber neue Einträge, sobald nicht-triviale Dateien geändert werden.

## Review

- status: pass
- risks:
  - Dokumente sind Entwürfe; reale DPA-Akzeptanz, Region-Verifikation und
    Vertragsschluss bleiben offene Owner-Schritte (P-B1/P-B2/P-B3/P-B8).
  - Keine juristische Prüfung erfolgt; AVV-Text selbst nicht enthalten.
- scorecard:
  - outcomeQuality: 4
  - scopeDiscipline: 5
  - safety: 5
  - evidenceQuality: 4
  - sideEffects: 5
- nextGate: Owner trägt DPA-Stände + verifizierte Regionen ein; danach P-B4/P-B5
  (Export/Löschung, Backup) und VVT/RoPA.

## Linked intent entry

- Intent Memory Log: `docs/agent-team/intent_logbook/2026-07-04-privacy-package-avv-subprocessor-tom.md`
