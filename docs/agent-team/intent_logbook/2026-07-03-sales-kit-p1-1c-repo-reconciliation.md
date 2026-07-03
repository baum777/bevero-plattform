# Intent Memory — Sales Kit P1.1c: Repo Reconciliation & Commit Readiness

- id: sales-kit-p1-1c-repo-reconciliation-20260703
- timestamp: 2026-07-03
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-p1-1c-repo-reconciliation.md`
- status: draft

## Core intention

Den von P1.1b hinterlassenen `partial`-Zustand nicht durch Aktionismus auflösen, sondern durch Sichtbarmachen, Reconciliation und ehrliche Commit-Empfehlung. P1.1c ist kein Sales-Slice, sondern ein Repo-State-Slice, der die Voraussetzungen für einen späteren echten Lead klären soll.

## Logic followed

- Parallele Commits wurden nicht ignoriert und nicht „neutralisiert“. Sie wurden als externe Zustandsänderung klassifiziert, gegen den Restdiff gehalten und auf Konflikte geprüft. Ergebnis: linear, kein Merge-Konflikt, keine O2-Re-Öffnung.
- Der lokale Restdiff wurde nicht verworfen, weil er Stale-Validator-Behauptungen korrigiert — und genau diese Stale-Behauptungen waren ein P1.1b-Restproblem.
- Es wurde kein `git add -A`, kein Push, kein Versand ausgelöst. Keine Commits durch den P1.1c-Agenten.
- Stale-Claims in den drei modifizierten Dateien wurden minimal und wortlauttreu ausgetauscht; keine neuen Produktbehauptungen, keine neuen Sales-Artefakte.
- Die Pflicht-Work-Doc-Einträge (MSPR, Intent, Closure) wurden gemäß `AGENTS.md`-Regel „Pflicht: Work-Slice-Dokumentation“ erstellt; sie sind nicht Sales-Artefakte, sondern Execution Evidence und Design Memory für P1.1c.

## Durable memory

- „Parallel“ während eines laufenden Slice kann zeitliches Erscheinen heißen, ist aber bei sequenziell-linearen Commits derselben Branch git-fehlerfrei. Erst bei divergierenden Branches oder echtem Konfliktpfad wird aus „parallel“ ein echtes Risiko.
- Work-Doc-Validator-Ausgaben sind kritisch: „pass (nothing to check)“ ist *nicht* dasselbe wie „pass (alle Pflichten erfüllt)“. Wer Validator-Logs zitiert, muss die exakte Phrase, den Skript-Pfad und die `git status`-Quellkonfiguration mitführen.
- Skript-Bugs, die nur das erste Element einer Liste korrumpieren, sind schwer zu erkennen, weil Tests mit einem einzigen Element grün sind. Ein Sanity-Test mit ≥2 Modified-Files ist Pflicht für jeden Listen-Parser.
- Stale-Behauptungen in committeten Doku-Dateien sind kein Streichungskandidat, sondern Abschlusskorrektur — der nächste Owner-Reader würde die Doku sonst gegen observable Realität lesen und falsche Schlüsse ziehen.
- Bei Skript-Bugs, die nur ein Listenformat (Modified) und nicht ein anderes (Untracked) betreffen, reicht es kurzfristig, einen Pflichteintrag im nicht-betroffenen Format anzulegen — das ist eine Notlösung, kein Standard.
- Ein `pass`-Ergebnis eines Validators ist kein Selbstzweck. Die Diagnose-Ausgabe muss mitgelesen werden, weil dieselbe Logik durchaus grünes Licht bei korrupter Anzeige liefern kann.

## Do not reuse blindly

- Den P1.1c-Vorbehalt „commit-ready nur unter Bedingungen“ nicht in einen Default-OK umdeuten. Ohne Owner-Freigabe und Validator-Fix-Entscheidung nicht pushen.
- Den Skript-Bug-Workaround „zwei Work-Doc-Einträge mit Untracked-Format anlegen“ nicht zum Standard machen. Workaround kaschiert Bug; Fix ist die dauerhafte Lösung.
- Die 6-Datei-Commit-Grenze nicht aufblähen (kein `git add -A`). Andere `M`-Dateien außerhalb des Sales-Kit-Slice gehören in eigene Commits.

## Decisions taken

- Der Restdiff wird nicht zusammengeführt, bevor die drei Stale-Validator-Bullets korrigiert sind. Korrektur ist in P1.1c dokumentiert und angewendet.
- Versand bleibt `blocked / not_sent`. Pilotstart bleibt `blocked`. Keine dieser Aussagen wurde durch P1.1c verändert.
- Validator-Bug wird explizit dokumentiert, nicht stillschweigend umgangen. Der Bugfix ist als separater Commit empfohlen, nicht als Teil des Sales-Kit-Docs-Slice.
- P1.1c erzeugt Pflicht-Work-Doc-Einträge (MSPR, Intent, Closure) gemäß lokaler AGENTS-Regel. Sie werden im selben 6-Pfade-Commit vorgeschlagen.

## Next logic gate

Owner-Review und Entscheidung über (a) Validator-Fix-Reihenfolge, (b) Commit-Grenze = 6 Dateien, (c) Zeitpunkt für den nächsten realen Lead. Bis dahin kein Versand, kein Push, kein Deployment, kein neuer Lead.
