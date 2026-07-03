# MSPR Entry — Sales Kit P1.1c: Repo Reconciliation & Commit Readiness

- id: sales-kit-p1-1c-repo-reconciliation-20260703
- timestamp: 2026-07-03
- runId: baum-os-session-2026-07-03-p1-1c
- agentRole: reviewer/reconciler
- taskType: docs_state_review

## Scope

- layer: docs_only
- pathsInScope: `docs/sales-kit/`, `docs/sales-kit/skills/`, `docs/agent-team/mspr_logbook/`, `docs/agent-team/intent_logbook/`
- pathsOutOfScope: `apps/`, Runtime, DB, Deployment, Push, Versand, reale Leads
- autonomyTier: 1

## Code Change Context

- Trigger: P1.1b endete mit `partial`, weil (a) der Work-Docs-Validator den lokalen Changeset in der Sandbox nicht sah und (b) zwei parallele Commits auf `main`/`origin/main` die Abschlussbasis veränderten. P1.1c soll diese beiden Punkte reconcilen und entscheiden, ob commit-ready.
- Reuse decision: repo-lokale Validator- und Skill-Dateien verwendet, kein Shared-Core-Change, keine Fremdskill-Installation/Kopie.
- Files read: P1.1b-Mspr + Intent, `docs/sales-kit/p1.1b-closure.md`, `docs/sales-kit/sales-kit-index.md`, `docs/sales-kit/outreach-readiness.md`, `docs/sales-kit/first-contact-final.md`, `docs/sales-kit/dry-runs/demo-first-lead-dry-run.md`, sechs `docs/sales-kit/skills/*.skill.md`, `scripts/check-work-documentation.mjs`, Repo-AGENTS, Work-Documentation-Rule, `git log`/`git show` für `47ca501` und `c851236`.
- Files changed (Working-Tree):
  - `docs/sales-kit/p1.1b-closure.md` (Korrektur einer Stale-Validator-Bullet in „Verification / Validation“)
  - `docs/sales-kit/sales-kit-index.md` (Korrektur einer Stale-Behauptung in Abschnitt „Tracking-/Commit-Status“)
  - `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md` (Korrektur einer Stale-Validator-Bullet in „Review“)
  - **neu:** `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md` (dieser Eintrag)
  - **neu:** `docs/agent-team/intent_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md`
  - **neu:** `docs/sales-kit/p1.1c-closure.md`
- Product evidence: keine neuen Produktbehauptungen; nur Validator-, Status- und Tracking-Textkorrekturen plus die zur Slice-Pflicht gehörenden Work-Doc-Einträge.

## Repo-State (Observed)

- Branch: `main`, identisch mit `origin/main`.
- HEAD: `c851236 docs(sales-kit): finalize P1.1b contradiction cleanup + work documentation`.
- Vorhergehend: `47ca501 docs(sales-kit): add complete sales kit + production closure docs`.
- Working-Tree:
  ```
   M docs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md
   M docs/sales-kit/p1.1b-closure.md
   M docs/sales-kit/sales-kit-index.md
  ?? docs/agent-team/intent_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
  ?? docs/agent-team/mspr_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
  ?? docs/sales-kit/p1.1c-closure.md
  ```
- `git diff --check`: `pass`.
- `npm run check:work-docs`: `pass`. Siehe Validator-Befund unten.

## Commands / Validation

```bash
git status --short
git branch --show-current            # main
git log --oneline --decorate --graph --all -20
git diff --name-status
git diff --stat
git show --stat --format=fuller 47ca501
git show --stat --format=fuller c851236
git show --name-only --format="" 47ca501 | sort > /tmp/a.txt
git show --name-only --format="" c851236 | sort > /tmp/b.txt
comm -12 /tmp/a.txt /tmp/b.txt        # 14 Pfade, sequenziell überschrieben, kein Merge-Konflikt
git ls-files docs/sales-kit/          # 22, alle tracked, 0 untracked
git diff --check                      # pass
npm run check:work-docs               # pass (siehe unten)
```

## Befund parallele Commits

| Commit | Inhalt | betrifft `docs/sales-kit/` | betrifft Work-Docs | Konfliktrisiko |
|---|---|---|---|---|
| `47ca501` | fügt das gesamte Sales-Kit (14 Dokumente + 6 Skills), task-1-2-gap-Docs, sowie 6 MSPR + 6 Intent-Einträge zu meist nicht-sales-kit-Themen (Vercel-Split, Production-Closure, Sales-Kit Light/Skill/Outreach-Pack/Lead-Pack) hinzu; passt `deployment-vercel.md`, `apps/cockpit/next.config.mjs`, mehrere README-Dateien an | ja (kompletter Bestand neu) | ja (12 Logbookeinträge neu) | **niedrig** — sequenzieller Vorgänger |
| `c851236` | modifiziert 13 Sales-Kit-Dateien aus `47ca501` (W1–W4-Bereinigung, O2-Re-Scan, RED/GREEN-Vokabular-Korrektur); fügt `dry-runs/demo-first-lead-dry-run.md`, `p1.1b-closure.md` und 2 MSPR + 2 Intent-Einträge hinzu (vercel-incident-containment, sales-kit-contradiction-cleanup-dry-run) | ja | ja | **niedrig** — sequenzieller Nachfolger auf `47ca501`; 14 überlappende Pfade werden direkt ersetzt, kein dreiwegiger Merge |

Beide Commits sind **sequenziell linear** auf `main`/`origin/main`. Es existieren weder überlappende noch widersprüchliche Änderungen derselben Zeilen auf parallelen Branches. Der Begriff „parallel“ in P1.1b-Dokumenten bezieht sich auf die Perspektive des lokalen P1.1b-Agenten, dessen Working-Tree zwei externe Pushes während desselben Slice sah. Aus Git-Sicht ist die Reihenfolge `47ca501` → `c851236`. Es liegt **kein Merge-/Rebase-Konflikt** vor und **keine O2-Re-Öffnung**.

## Sichtbarer lokaler Changeset (final)

`git status --short`:

```
 M docs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md
 M docs/sales-kit/p1.1b-closure.md
 M docs/sales-kit/sales-kit-index.md
?? docs/agent-team/intent_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
?? docs/agent-team/mspr_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
?? docs/sales-kit/p1.1c-closure.md
```

`git diff --stat` (nur die drei modifizierten Dateien):

```
...6-07-03-sales-kit-contradiction-cleanup-dry-run.md | 15 ++++++++++-----
 docs/sales-kit/p1.1b-closure.md                       | 19 +++++++++++++++----
 docs/sales-kit/sales-kit-index.md                     |  2 +-
 3 files changed, 26 insertions(+), 10 deletions(-)
```

`docs/sales-kit/` und `docs/sales-kit/skills/` sind vollständig tracked:

```
$ git ls-files docs/sales-kit/ | wc -l
22

$ git ls-files --others --exclude-standard docs/sales-kit/ | wc -l
0
```

Warum meldete `npm run check:work-docs` P1.1b „nothing to check“? Antwort: `scripts/check-work-documentation.mjs#getChangedFiles()` ruft `run("git status --short")` auf, das intern `.trim()` auf der **gesamten** Ausgabe anwendet. Damit geht das erste Leerzeichen der ersten Modified-Zeile verloren; `slice(3)` trifft anschließend `docs/` statt ` M `. Daraus folgen je nach Anzahl der Modified-Files unterschiedliche Effekte — bei der P1.1b-Sandbox-Konfiguration reichte das, um den vollständigen Pfad zu verlieren.

Welche Dateien sind in einen sauberen Commit aufzunehmen? Wenn nach Owner-Freigabe alle sechs Pfade übernommen werden: siehe Commit-Readiness unten. Keine zusätzlichen Sales-Kit-Dateien sind zu staged; insbesondere `docs/sales-kit/skills/*.skill.md` sind im aktuellen Working-Tree nicht modifiziert und gehören nicht in den P1.1c-Commit. Bewusst nicht aufgenommen werden sollen alle nicht-sales-kit-relevanten Dateien außerhalb der sechs unten gelisteten Pfade. Kein `git add -A`.

## Skript-Bug in `scripts/check-work-documentation.mjs` (diagnostiziert, **nicht gefixt** in P1.1c)

`run(cmd)` ruft `execSync(cmd, { encoding: "utf8" }).trim()`. Das `.trim()` strippt führende Leerzeichen der **gesamten** `git status --short`-Ausgabe und damit der ersten Zeile. Anschließend schneidet `slice(3)` drei Zeichen — bei einer mit ` M ` beginnenden Modified-Zeile ist das erste Zeichen `M`, das dritte ist ` `. Daraus entsteht z. B. bei „M docs/agent-team/...“ (führendes Leerzeichen bereits weg) → `ocs/agent-team/...` (falsch).

Reproduktion lokal mit `git status --short`-Output vor Erstellung der P1.1c-Doku (nur 3 Modified-Dateien):

```
"M docs/agent-team/..."             -> slice(3) -> "ocs/agent-team/..."    (KORRUPT)
" M docs/sales-kit/p1.1b-closure.md" -> slice(3) -> "docs/sales-kit/..."  (richtig)
" M docs/sales-kit/sales-kit-index.md" -> slice(3) -> "docs/sales-kit/..."  (richtig)
```

Folge: der MSPR-Pfad erscheint corrupt und matcht `newMsprEntries = changedFiles.filter(f => f.startsWith(MSPR_DIR + "/"))` nicht. Validator wirft in der Konfiguration *ohne* untracked-Mspr-Datei „No new MSPR entry found in this changeset“, obwohl einer vorhanden ist.

Mit den drei neuen untracked P1.1c-Doku-Dateien (`??`-Prefix) tritt der Bug nicht auf, weil `trim()` `?`-Zeichen nicht antastet und `slice(3)` bei `?? ` den Pfad korrekt trifft. Daher sieht der Validator jetzt zusätzlich die korrekten Pfade und meldet `pass`. Der Bug existiert weiter und wird beim nächsten Slice ohne neue untracked MSPR/Intent-Einträge wieder zuschlagen — ferner in CI mit gestaffeltem Diff gegen `BASE_SHA`, wo die Pfad-Erkennung über eine andere Route läuft. Fix-Empfehlung (für späteren separaten Commit): `run(cmd)` darf nicht `.trim()` auf der Gesamtausgabe aufrufen, sondern muss pro Zeile trimmen oder die Zerlegung robuster gestalten.

## Validator-Ergebnis (verbatim, finaler Working-Tree)

```
── Work Documentation Check ──────────────────────────────────

  Changed files (non-trivial): 4
    · ocs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md
    · docs/sales-kit/p1.1b-closure.md
    · docs/sales-kit/sales-kit-index.md
    · docs/sales-kit/p1.1c-closure.md

  ✓  New MSPR entry in changeset: 2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
  ✓  New Intent Memory entry in changeset: 2026-07-03-sales-kit-p1-1c-repo-reconciliation.md
  ✓  No obvious secret patterns found in changed documentation entries.

── Result: pass ──────────────────────────────────────────────
```

Damit ist die P1.1b-Behauptung „Work-Docs-Check in der Sandbox leer / nicht aussagekräftig“ überholt: der Validator ist jetzt aussagekräftig und meldet `pass`, scheitert aber visuell weiterhin an der ersten Modified-Pfad-Anzeige (`ocs/agent-team/...`). Das ist eine reine kosmetische Korruption, die den `pass`/`fail`-Pfad der Logik nicht beeinflusst — beide Pfade (MSPR, Intent) werden über die untracked-Einträge bedient. Der Skript-Bug bleibt aber ein valides P0-Hygiene-Thema und sollte in einem separaten Commit adressiert werden.

## Restdiff-Scan: Widersprüche & Überclaims

- Bar/Küche-Trennung über alle relevanten Dateien: keine einzige aktive „Küchen-Auffüllliste“-Behauptung. Treffer auf `docs/sales-kit/pilot-offer-light.md` und `docs/sales-kit/dry-runs/demo-first-lead-dry-run.md` (Anti-Persona + „Nicht zusagen“). Sonst „Auffüllliste“ stets mit „für die Bar“ qualifiziert oder als Kontext-/Audit-Frage.
- WhatsApp: alle Treffer sind Kontext (Status quo beim Kunden, Audit-Frage, Positionierungs-Gesprächshook). Capability Truth Table K7 = `unconfirmed`, Verbotsformulierung explizit.
- Versand: durchgehend `blocked / not_sent`, keine Mail-Tool-Aktivierung, keine Freigabe, alle Versand-Hooks zeigen explizit auf Owner-Handlung mit `ready_for_human_review` als Voraussetzung.
- Pilotstart: durchgehend `blocked`, O1, O3, Runtime-Smoke und 1–2-Prozess-Scope explizit offen. Keine vorzeitigen Startzusagen.
- Keine neuen O2-relevanten Claims, keine neuen Run-/Runtime-Behauptungen.
- Keine geänderten Produkt-, Architektur- oder Operating-Logik-Inhalte. P1.1c modifiziert ausschließlich Validator-Status- und Tracking-Texte.

## Commit-Readiness

- `commit-ready: yes`, **aber nur unter den unten genannten Bedingungen** und nur mit ausdrücklicher Owner-Freigabe.
- Empfohlene Commit-Grenze: **ein einziger Docs-Commit** mit den 3 modifizierten Dateien (Korrekturen der Stale-Validator-Bullets) **plus** den 3 neuen P1.1c-Dokumenten (MSPR/Intent/Closure) = 6 Pfade insgesamt.
- Dateien, die in den Commit gehören:
  - `docs/sales-kit/p1.1b-closure.md`
  - `docs/sales-kit/sales-kit-index.md`
  - `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md`
  - `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md`
  - `docs/agent-team/intent_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md`
  - `docs/sales-kit/p1.1c-closure.md`
- Dateien, die nicht in den Commit gehören: alle anderen Pfade; insbesondere keine nicht-modifizierten Sales-Kit-Dateien, keine `docs/sales-kit/skills/*.skill.md`. Kein `git add -A`, kein Push.
- Offene Owner-Entscheidungen:
  1. Validator-Skript-Bug fixen (separater Commit) oder Workaround akzeptieren. Empfehlung: separater Fix-Commit, weil Skript-Änderung ein technischer Hygiene-Schritt ist und mit dem Sales-Kit-Docs-Slice nichts zu tun hat.
  2. Über die oben genannte 6-Pfade-Commit-Grenze entscheiden.
  3. Bei Commit: vor `git push` Work-Docs-Check in einer Umgebung wiederholen, die das sandbox-bedingte Kindprozess-Problem nicht hat, oder mit gefixtem Skript.

## Review

- status: pass
- Parallele Commits `47ca501`/`c851236`: sequenziell, lineare Historie, kein Merge-Konflikt, kein O2-Re-Open.
- Lokaler Changeset: 3 modifizierte Dateien (Stale-Validator-Korrekturen), 3 neue untracked Dateien (P1.1c-Dokumentation).
- `git diff --check`: pass.
- `npm run check:work-docs`: pass (mit kosmetischer Pfad-Korruption in der ersten Modified-Zeile, die das Logik-Ergebnis nicht beeinflusst).
- Widerspruchsscan W1–W4, O2, Versand, Pilotstart: keine Beanstandung.
- nextGate: Owner-Review der Commit-Grenze; danach Work-Docs-Check wiederholen (idealerweise mit gefixtem Skript); danach Push erst nach ausdrücklichem Go.

## Linked intent entry

- `docs/agent-team/intent_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md`
