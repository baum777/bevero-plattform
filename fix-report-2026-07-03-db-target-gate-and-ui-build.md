# bevero-plattform — Fix Report: DB-Zielgate & UI-Build Status

- Datum: 2026-07-03
- Schnitt: `2026-07-03-db-target-gate-and-ui-build-status`
- Agent-Rolle: Reviewer (read-only)
- Autonomiestufe: 1
- Bezug: Operator-Anfrage „prüfe ui build error und db config error"

## 1. Ergebnis

| Bereich | Status | Evidenz |
|---|---|---|
| UI-Build (cockpit + landing + api) | **pass** | `sandbox/diagnostics/2026-07-03/{landing,cockpit,api}-build.txt` |
| TypeScript-Typcheck | **pass** | `sandbox/diagnostics/2026-07-03/{cockpit,api}-typecheck.txt` |
| Prisma-Schema | **pass** | `sandbox/diagnostics/2026-07-03/api-prisma-validate.txt` |
| DB-Zielgate `npm run db:verify-target` | **fail** (fail-closed, beabsichtigt) | `sandbox/diagnostics/2026-07-03/db-verify.txt` |

Kein UI-Build-Fehler im aktuellen Stand des Repos reproduzierbar.
Ein **DB-Konfigurationsfehler** ist vorhanden, ist konsistent mit dem
fail-closed-Guard-Design vom `2026-07-02`-Schnitt, und erfordert eine
Owner-Entscheidung, bevor er behoben werden darf.

## 2. Befund 1 — DB-Zielgate

### 2.1 Symptom

```text
$ npm run db:verify-target
Database target role mismatch: detected production, BEVERO_DB_TARGET is unset.
(exit 1)
```

Quelle: `apps/api/scripts/verify-database-target.ts` (vollständige Quelle
gelesen; unverändert seit `2026-07-02-database-target-guardrail`).

### 2.2 Diagnose

Der Guard liest `process.env` (gefüllt aus `.env` via `dotenv.config` plus
Shell-Env) und leitet aus `DATABASE_URL` und `DIRECT_URL` einen Supabase-Ref ab.
Drei mögliche Pfade:

| Pfad | Wenn ausgelöst … |
|---|---|
| lokaler Hostname | Rolle `local`, Ref `local` |
| Ref in `OWNED_SUPABASE_TARGETS` | Rolle aus Registry-Eintrag |
| Ref in `FOREIGN_SUPABASE_TARGETS` | Rolle aus Registry-Eintrag, strikt read-only |
| sonst | wirft „unknown Supabase project ref" |

Die fehlende Konfiguration führt zu zwei kombinierten Bedingungen:

1. **Ref-Auflösung:** Der aus den URLs extrahierte Ref landet bei
   `czinchfegtglmrloxlmh` (FOREIGN-Eintrag → Rolle `production`). Das ist
   *nicht* der Owned-Ref für dieses Repo; AGENTS.md markiert diesen Ref
   explizit als **„Cross-Project blockiert"** für `bevero-plattform`.
2. **Gate-Variable fehlt:** `BEVERO_DB_TARGET` ist in `.env` gar nicht gesetzt
   (Präsenz-Count in `.env`: 1, aber dies ist `BEVERO_API_BASE_URL`, nicht die
   Gate-Variable). `.env.example` dokumentiert den Default
   `BEVERO_DB_TARGET="local"` — diese Zeile wurde beim Befüllen von `.env`
   nicht übernommen.

Der Guard tut also genau das, wofür er gebaut wurde: er verweigert die
Verifikation, weil weder (a) deklarierte Rolle noch (b) kompatible URL zur
Policy dieses Repos passen.

### 2.3 Konsequenz

- `npm run db:migrate:deploy` (Wrapper) ist ebenfalls blockiert — er macht
  zuerst `db:verify-target` und bricht bei Nicht-Null ab.
- Direkte `npx prisma migrate …`-Aufrufe werden durch
  `apps/api/prisma.config.ts` ebenfalls abgefangen.
- Das ist **gewollt**. Solange der Ref auf `czinchfegtglmrloxlmh` zeigt, ist
  das die *sicherste* mögliche Antwort: keine Bewegung am falschen Projekt.

### 2.4 Empfohlener Fix-Pfad (drei Optionen, Owner-Entscheidung)

> `.env` und alle Schreiboperationen bleiben in diesem Schnitt **unverändert**.
> Der Owner/die Ownerin wählt eine der drei Optionen; ein Folge-Schnitt
> wendet sie an und führt den Re-Run des Gates aus.

**Option A — lokales Postgres (Docker `localhost:5432`)**

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/postgres?sslmode=disable"
DIRECT_URL="postgresql://user:password@localhost:5432/postgres?sslmode=disable"
BEVERO_DB_TARGET="local"
# BEVERO_EXPECTED_SUPABASE_REF leer lassen — Lokalziele dürfen keine Remote-Ref deklarieren
```

Erwarteter Re-Run-Output: `Database target verified: local (local-postgres / local).`

**Option B — Supabase-Development (`bevero-os` / owned)**

```dotenv
# Vorlage: <PLACEHOLDER> durch Vercel-/Supabase-Konsolen-Werte ersetzen.
# Der Ref ienwshemokpsjwkedmyp (owned) ist in AGENTS.md und
# docs/agent-team/intent_logbook/2026-07-02-database-target-guardrail.md
# bereits dokumentiert und darf hier stehen.
DATABASE_URL="postgresql://postgres.<OWNED_REF>:<DB_PASSWORD>@<POOLER_HOST>:<POOLER_PORT>/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<DB_PASSWORD>@db.<OWNED_REF>.supabase.co:5432/postgres?sslmode=require"
BEVERO_DB_TARGET="development"
BEVERO_EXPECTED_SUPABASE_REF="ienwshemokpsjwkedmyp"
```

Erwarteter Re-Run-Output: `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development).`

**Option C — Production (rauschenberger-os)** — *aus diesem Checkout nicht empfohlen*

Würde zusätzlich `BEVERO_ALLOW_PRODUCTION_MIGRATION="I_UNDERSTAND_THIS_TOUCHES_PRODUCTION"`
erfordern plus eine separate L3-Owner-Freigabe pro Operation. Per AGENTS.md
ist `czinchfegtglmrloxlmh` für `bevero-plattform` schreibseitig blockiert
(`Cross-Project blockiert: czinchfegtglmrloxlmh ... selbst mit BEVERO_ALLOW_CROSS_PROJECT_READ
ist nur Lesezugriff erlaubt; riskante Prisma-Befehle bleiben verboten`).

### 2.5 Re-Verifikations-Sequenz nach Fix

```bash
# 1. Read-only Gate-Run, kein Schreibzugriff
npm run db:verify-target          # erwartet: exit 0 + "Database target verified: …"

# 2. Optional, wenn Development-Ref benutzt wird
npm --workspace=apps/api run prisma:validate
npm --workspace=apps/api run typecheck
npm run typecheck                 # full repo

# 3. Erst danach: db:migrate:deploy (sofern Schema-Änderungen anstehen)
npm run db:migrate:deploy
```

Jeder dieser Schritte respektiert die AGENTS.md-Vorgaben
(Ref → Rolle → erwarteter Ref → L-Freigabe-Tokens).

### 2.6 Was bei diesem Schnitt *nicht* geändert wurde

- `.env` — bleibt wie der Operator/die Operatorin es zuletzt gespeichert hat.
- `.env.example` — bleibt unverändert (dokumentiert bereits die richtigen Vars).
- `apps/api/scripts/verify-database-target.ts` — nicht angefasst.
- `apps/api/prisma.config.ts` — nicht angefasst.
- Keine Migration, kein Seed, kein `db push`, kein `db reset`.
- Kein Deployment, kein Commit, kein Push.

## 3. Befund 2 — UI-Build

### 3.1 Symptom (Operator-Annahme)

„UI-Build-Error prüfen" — Operator erwartet einen Fehler.

### 3.2 Diagnose

Drei Production-Builds, alle heute ohne Fehler:

| Workspace | Befehl | Exit | Stdout (gekürzt) |
|---|---|---|---|
| apps/landing | `vite build` | 0 | `dist/index.html 38.84 kB │ gzip 10.63 kB, built in 137ms` |
| apps/cockpit | `next typegen && tsc --noEmit` | 0 | `Generating route types... ✓ Route types generated successfully` |
| apps/cockpit | `next build` | 0 | `Compiled successfully in 2.8s`; 50+ Routen, alle als `ƒ Dynamic` |
| apps/api | `tsc --noEmit -p tsconfig.json` | 0 | (silent pass) |
| apps/api | `prisma validate` | 0 | `The schema at prisma/schema.prisma is valid 🚀` |
| apps/api | `tsc -p tsconfig.json` (build) | 0 | (silent pass) |

Volltexte unter `sandbox/diagnostics/2026-07-03/`.

### 3.3 Bewertung

- **Im aktuellen Checkout ist kein UI-Build-Fehler.**
- `.env` und `apps/cockpit/.env.local` werden vom Build korrekt gelesen
  (Next.js meldet `Environments: .env.local` ohne Warnung).
- Wenn ein Fehler aus einer früheren Sitzung oder einem anderen Checkout
  erinnert wurde, reproduziert er sich hier nicht.

### 3.4 Empfehlung

- Wenn ein konkreter Fehler aus einem Log oder Tooling vorliegt → bitte
  Volltext oder Pfad nachreichen, dann gezielt reproduzieren.
- Wenn der Fehler eine Annahme war → als erledigt betrachten; nächste
  Aufmerksamkeit gehört dem DB-Zielgate.

## 4. Sekundäre Beobachtungen (nicht-blockierend)

| Beobachtung | Datei | Empfehlung |
|---|---|---|
| `NODE_ENV="production"` in `.env`; `.env.example` hat `NODE_ENV="development"` | `.env:13` vs `.env.example:5` | Owner-Entscheidung: ist diese `.env` für lokales Dev oder Prod-Smoke gedacht? |
| `BEVERO_DB_TARGET`-Variablen in `.env` fehlen komplett | `.env` vs `.env.example` | Mit Option A/B oben beheben |
| Prisma-7-Upgrade-Hinweis | `npm run prisma:validate` | Major-Upgrade nach eigenem Schnitt, nicht in diesem Block |

## 5. Geänderte Dateien (dieser Schnitt)

Keine Produktdateien. Nur Doku- und Diagnose-Artefakte:

- `fix-report-2026-07-03-db-target-gate-and-ui-build.md` *(dieses Dokument)*
- `docs/agent-team/mspr_logbook/2026-07-03-db-target-gate-and-ui-build-status.md`
- `docs/agent-team/intent_logbook/2026-07-03-db-target-gate-and-ui-build-status.md`
- `sandbox/diagnostics/2026-07-03/*.txt` (Build- und Gate-Outputs)

## 6. Validierungs-Zusammenfassung

- Build-Beweise unter `sandbox/diagnostics/2026-07-03/`, alle `exit 0`.
- Gate-Beweis unter `sandbox/diagnostics/2026-07-03/db-verify.txt`,
  `exit 1`, einzeilige stderr-Meldung.
- Keine Secrets, keine `.env`-Werte in den Artefakten — Host-Strings
  anonymisiert, Variablenwerte nie geschrieben.

## 7. Nächstes Gate

1. **Owner-Entscheidung Option A / B / C** (Befund 2.4).
2. Folgeschnitt unter L2-Freigabe: `.env` gezielt anpassen, kein
   generischer Diff, ein Commit mit `MSPR:`- und `Intent:`-Link.
3. `npm run db:verify-target` muss nach der Anpassung `exit 0` mit
   „Database target verified: …" liefern.
4. Erst danach: Schema-/Migrations- oder Deployment-Schritte erwägen,
   jeweils mit eigenem MSPR/Intent-Slice.

---

## Appendix A — Split-Env Discovery (Folge der Option-B-Wahl)

### A.1 Symptom

Beim ersten Versuch, B.2 anzuwenden, lieferten zwei Verifier-Aufrufe
unterschiedliche Antworten:

- `npx tsx apps/api/scripts/verify-database-target.ts` (CWD = root)
  → `detected development`
- `npm run db:verify-target` (CWD = `apps/api/` via npm workspaces)
  → `detected production`

### A.2 Ursache

Zwei `.env`-Dateien mit widersprüchlichen Refs existieren parallel.
`dotenv.config({ path: ".env" })` liest relativ zum CWD; npm-Workspaces
setzen den CWD auf das Workspace-Paket, also liest der Verifier die
Datei `apps/api/.env`, nicht das Wurzel-`.env`.

| Datei | mtime | DATABASE_URL-Ref |
|---|---|---|
| `./.env` | 2026-07-03 | `ienwshemokpsjwkedmyp` (owned dev) |
| `./apps/api/.env` | 2025-06-19 | `czinchfegtglmrloxlmh` (foreign prod) |

`apps/api/.env` ist ein Pre-Incident-Snapshot (vgl. `2026-07-02-supabase-fresh-db-env-swap`).
Dessen URLs wurden nie aktualisiert.

### A.3 Folge für Option B

Sub-Pfad **B.2** (Operator macht URL-Swap, Agent nur Gate-Variablen) ist
allein nicht ausreichend: die Gate-Variablen müssen in **die Datei**,
die der Verifier tatsächlich liest (`apps/api/.env`), und die URLs dort
müssen ebenfalls auf `ienwshemokpsjwkedmyp` zeigen.

### A.4 Vom Operator gewählter Sub-Pfad

Sub-Pfad **B.2c**: Operator übernimmt alle `.env`-Edits eigenständig
(sowohl URLs als auch Gate-Variablen, in beiden Dateien). Agent macht
keinen `.env`-Edit, sondern verifiziert nach Operator-Bestätigung den
Endzustand mit `npm run db:verify-target` und dokumentiert das
Ergebnis in einem Folge-MSPR/intent-Slice.

### A.5 Quellen

- Befund: `sandbox/diagnostics/2026-07-03/discovery-split-env.md`
- Probe-Skript: `sandbox/diagnostics/2026-07-03/probe-verify-env.ts`
- Originale Diagnostik (vor B): `sandbox/diagnostics/2026-07-03/db-verify*.txt`

### A.6 Resolved — Verifikation nach Operator-„fertig"

Nach Operator-Bestätigung wurden fünf unabhängige Checks ausgeführt
(Transkript: `sandbox/diagnostics/2026-07-03/db-verify-b2c-final.txt`):

| # | Aufruf | CWD | Liest | Exit | Result |
|---|---|---|---|---|---|
| 1 | `npx tsx apps/api/scripts/verify-database-target.ts` | root | `./.env` | 0 | `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development).` |
| 2 | `npx tsx scripts/verify-database-target.ts` | `apps/api/` | `apps/api/.env` | 0 | `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development).` |
| 3 | `npm run db:verify-target` | root | `apps/api/.env` (npm workspaces CWD) | 0 | `Database target verified: ienwshemokpsjwkedmyp (bevero-os / development).` |
| 4 | probe `probe-verify-env.ts` | root | `./.env` | — | ref=`ienwshemokpsjwkedmyp`, role=`development` |
| 5 | probe `probe-verify-env.ts` | `apps/api/` | `apps/api/.env` | — | ref=`ienwshemokpsjwkedmyp`, role=`development` |

Zusätzlich bestätigen beide Probes:

- `BEVERO_DB_TARGET = "development"` in beiden Dateien gesetzt
- `BEVERO_EXPECTED_SUPABASE_REF = "ienwshemokpsjwkedmyp"` in beiden Dateien gesetzt
- Pooler-Hostname konsistent: `aws-1-eu-central-1.pooler.supabase.com`
- Ports korrekt: 6543 (transaction pooler) für `DATABASE_URL`, 5432 (session direct) für `DIRECT_URL`
- `username_decoded == "postgres.ienwshemokpsjwkedmyp"` für beide URLs in beiden Dateien

**Status:** `pass`. Der DB-Target-Gate ist aus allen bekannten Aufruf-Pfaden
grün, das Split-Env-Risiko aus A.2 ist strukturell aufgelöst.

### A.7 Folge-Slices (Verifikation dokumentiert)

- `docs/agent-team/mspr_logbook/2026-07-03-bevero-b2c-verification-pass.md`
- `docs/agent-team/intent_logbook/2026-07-03-bevero-b2c-verification-pass.md`

— Ende des Berichts (mit Appendix, Status: pass) —
