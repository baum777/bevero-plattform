# Bevero Cockpit Read-Smoke Runbook (ergänzend)

**Bezug:** Ergänzt [`bevero-production-ui-smoke-runbook.md`](./bevero-production-ui-smoke-runbook.md). Dort ausgeschlossene Routen + Lücken werden hier mit einem **API-Level read-only Pfad** und **gezielten Read-Checks** geschlossen, ohne UI-Mutationen auszulösen.

**Stand:** 2026-07-03 · **Result vor Ausführung:** `blocked` (Owner-Gate O4 Umgebung).
**Modus:** read-only gegen eine genehmigte **Nicht-Production-DB** (Dev `ienws…` oder isolierte Test-DB). Niemals gegen Production-Supabase (`czinch…`).

---

## 0. Was dieser Runbook schließt — und warum

Der bestehende Production-UI-Smoke-Runbook schließt explizit `/inventory/bar-refill` aus, weil das bloße Öffnen der Cockpit-Seite mutiert:

- `apps/cockpit/app/(app)/inventory/bar-refill/refill-client.tsx:202–205` erstellt beim Mount einen `POST /bar-refill/runs`, wenn heute noch kein Lauf existiert ("No run yet for today — create it."). Browser-Öffnen ist damit **mutierend** und für den Production-UI-Smoke ungeeignet.
- Der Dashboard-Loading-Fix, der einen Refill-Run-Trigger aus dem Dashboard entfernt, ist **lokaler Code, in `apps/cockpit/app/(app)/dashboard/` aber nicht mehr aufrufbar** (grep nach `bar-refill|refillRun|createRun|BarRefillRun` in den Dashboard-Dateien liefert **0 Treffer**) → der Fix ist im Repo belegbar; deployed Status bleibt separat zu verifizieren.

Zusätzlich fehlen im bestehenden Runbook zwei Read-Checks für Cockpit-Oberflächen:

- **Kategorien-Gruppierung** im Bestands-Browser (Schema: `InventoryItem.categoryId` + `InventoryCategory`).
- **Review-Task-Zähler** in der Übersicht (Cockpit-Route `/freigaben`, Client `freigaben-client.tsx`).

Dieser Runbook definiert beide Bereiche so, dass ein Owner sie **ohne UI-Mutation** schließen kann.

---

## 1. Querverweis auf den bestehenden Runbook

Unverändert gültig bleiben aus `bevero-production-ui-smoke-runbook.md`:

- **Preconditions** (Environment-Matrix, separater Smoke-Account, Owner-Acknowledgement zu Auth-Metadaten, Browser-Capture aktiv, Mutation-Blocking-Harness).
- **Stop Rules** (Stop + `blocked` bei unerwartetem Supabase-Projekt, jeder Business-Mutation, 5xx, Login-Loops, Daten/Tokens in Evidence).
- **Read-only-Checks 1–8, 11, 12** (Sign-In, Auth, Origins, `/inventory/items`, `/storage`, `/alerts`, `/settings/profile`, Network/Console, Sign-out).
- **Evidence Template** (Zeitstempel, Operator, Deployment-Commit, Rolle+Ref, Routen-Result, HTTP-Klasse, Mutation-Versuche, redacted Screenshots; **keine** Credentials/Tokens/Cookies/Headers/Kunden-Rohdaten).
- **Pass Rule** (alle nicht-ausgeschlossenen Routen pass, keine unblocked Business-Mutation, Matrix-Match, Evidence reviewed; schließt **nicht** Backup/PITR, autorisiert **nicht** Feature-Work).

Dieser Runbook **ersetzt keine** dieser Punkte. Er ergänzt sie um die Bereiche **bar-refill read-only**, **Dashboard-Fix-Beleg**, **Kategorien-Gruppierung** und **Review-Task-Zähler**.

---

## 2. Zusätzliche Preconditions

- **Umgebung:** Nur gegen die in der Environment-Matrix als `development` oder `test` deklarierte Supabase-Project-Ref ausführen. Refs:
  - `ienwshemokpsjwkedmyp` (Bevero Dev) — erlaubt.
  - Isolierte Test-DB, separat deklariert — erlaubt.
  - `czinchfegtglmrloxlmh` (Rauschenberger Pilot Prod) — **verboten**. Smoke bricht ab.
  - Andere/unbekannte Refs — Smoke bricht ab.
- **Credentials:** HS256-Smoke-JWT für einen `codex-read-smoke-*` Smoke-`OrganizationMember` (Manager-Rolle). Wird vor Ausführung gemintet, nach Abschluss entfernt (gleiches Muster wie `scripts/smoke-cockpit-shift-handover.ts`).
- **Mutation-Blocking-Harness:** Muss zusätzlich `POST /bar-refill/runs` blocken (nicht nur die Universal-POST/PATCH/PUT/DELETE-Liste). Begründung: kein versehentlicher `createOrGetTodayRun`-Trigger durch direkten API-Aufruf.
- **Netzwerk-Capture:** weiter aktiv.
- **Kein Browser:** Schritte R1–R6 sind **HTTP/Fastify**-Calls (z. B. via `app.inject()` analog `scripts/smoke-inventory-api.ts`). Kein Öffnen der Cockpit-Seite `/inventory/bar-refill`.
- **Skript-Naming:** Alle Smoke-Rows tragen das Präfix `codex-read-smoke-*`.

---

## 3. Zusätzliche Stop Rules

Smoke stoppt sofort und wird `blocked`, wenn:

- die aufgerufene Supabase-/API-Origin **nicht** zur freigegebenen Nicht-Prod-Ref passt;
- ein `POST /bar-refill/runs` trotz Harness erfolgreich durchgeht (Mutation-Fail) oder ein 5xx erscheint;
- ein `GET` Aufruf die Actor-/Org-Rollenprüfung umgeht (HTTP 200 ohne gültiges JWT für einen `OrganizationMember`);
- ein Smoke-Row ohne `codex-read-smoke-*`-Präfix entsteht;
- der Review-Task-Zähler-Aufruf Daten außerhalb des Smoke-Mitglieds enthält;
- eine `.env`-, JWT-, Ref-, Password- oder Origin-Ausgabe in Logs/Screenshots landen würde.

---

## 4. Zusätzliche Checkliste

| # | Check | Aufruf / Pfad | Expected | Evidence |
|---|---|---|---|---|
| **R1** | Heutiger BarRefillRun **read-only** laden | `GET /bar-refill/runs/today` (Route: `apps/api/src/routes/inventory.route.ts:466–484`) | HTTP 200; Body hat **kein `codex-read-smoke-`-Feld** (existierender oder leerer Run des Smoke-Mitglieds); keine Mutation | status-code, body-snippet, origin |
| **R2** | Bestehender Run read-only | `GET /bar-refill/runs/:id` (`inventory.route.ts:485–503`) | HTTP 200 oder 404 (kein Run → 404 ist ok); **keine** POST im Network | status-code |
| **R3** | Mutation-Block bestätigt | Versuchter `POST /bar-refill/runs` über Harness, **mit demselben Auth wie R1**, mit Smoke-Prefix-Payload | Vom Harness blockiert (kein 2xx); wenn 2xx → **Smoke fail** | harness-log, status (erwartet 4xx/5xx oder blockierter Request) |
| **R4** | Dashboard-Fix im Repo belegt | `rg "bar-refill\|refillRun\|createRun\|BarRefillRun" apps/cockpit/app/(app)/dashboard` | **0 Treffer** (Repo-Beleg, deployed Status separat) | rg-Output |
| **R5** | Kategorien-Gruppierung Schema/API | Schema `InventoryCategory` (`schema.prisma:122`) + `InventoryItem.categoryId` (`schema.prisma:89`) + Read-only Endpoint `GET /inventory/items` (Cockpit-Pfad) | Mindestens ein `codex-read-smoke-*` Item mit gesetzter `categoryId` wird mit seinem Kategorie-Namen gruppiert zurückgegeben | status-code, ein Item-Snippet |
| **R6** | Review-Task-Zähler | `GET /correction-requests?status=open` analog zu `/freigaben` (`apps/cockpit/app/(app)/freigaben/freigaben-client.tsx`, Service `correction.service.ts`) | HTTP 200; `count(open) >= 0`; Payload enthält **nur** Smoke-Mitglied-Org-Rows (keine cross-org leaks) | status-code, count |

> **Hinweis zu R5/R6:** Werden `0` Items/Reviews zurückgegeben, ist das kein Fail — leerer Zustand ist zulässig. Wichtig ist, dass die Endpoints ohne Mutation antworten und die Org-Grenze halten.

---

## 5. Wo die Runbook-Befunde liegen

Ausführen durch den Owner oder ein autorisiertes Smoke-Skript (Style analog `apps/api/scripts/smoke-cockpit-shift-handover.ts`, aber **read-only + happy-path**). Ergebnis ablegen in:

```
evidence/YYYY-MM-DD-cockpit-read-smoke.md
```

Inhalt exakt nach dem **Evidence Template** des Production-UI-Smoke-Runbooks (Zeitstempel, Operator, Deployment-Commit, Rolle+Ref, Routen-Result, HTTP-Klasse, Mutation-Versuche, redacted Screenshots, finaler Result + exakter Blocker). Keine Secrets, keine kundenbezogenen Rohdaten.

---

## 6. Pass Rule (Zusatz)

Dieser Runbook ist `pass`, wenn **alle** Bedingungen gelten:

- R1–R6 jeweils `pass` (R5/R6 dürfen leer sein, aber HTTP 200 + org-scoped + keine Mutation).
- R3 bestätigt, dass `POST /bar-refill/runs` blockiert wird.
- Bestehender Production-UI-Smoke-Runbook (`bevero-production-ui-smoke-runbook.md`) ist **zusätzlich** `pass` und nicht durch diesen Runbook ersetzt.
- Evidence-File unter `evidence/` liegt vor, ohne Secrets, Roh-Kunden- oder Auth-Daten.
- Die ausgeführte Supabase-Ref entspricht der freigegebenen Nicht-Prod-Matrix.

Ein Pass auf diesem Runbook **schließt nur das Read-only-Cockpit-Gate**. Backup/PITR (O5), Advisor-Hardening (O6), DSGVO Stufe 2 (O3) und Preisentscheidung (O1) bleiben separate Owner-Gates für Pilot-Go-Live.

---

## 7. Was dieser Runbook ausdrücklich **nicht** tut

- Keine Auslösung von `POST /bar-refill/runs` (verifiziert nur, dass der Pfad blockiert ist / der existierende Run read-only geladen wird).
- Kein Login in den Cockpit-Browser und kein Öffnen von `/inventory/bar-refill` (mutiert beim Mount).
- Kein Production-Zugriff gegen `czinch…`.
- Keine Secrets, JWTs oder Ref-Passwörter in Evidence, Logs oder Screenshots.
- Keine Änderung am Production-UI-Smoke-Runbook oder an einer Code-/Test-Datei.
