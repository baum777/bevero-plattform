# Intent Memory — Sales Kit Widerspruchsbereinigung & First Lead Dry Run (P1.1b)

- id: sales-kit-contradiction-cleanup-dry-run-20260703
- timestamp: 2026-07-03
- linkedMSPR: `docs/agent-team/mspr_logbook/2026-07-03-sales-kit-contradiction-cleanup-dry-run.md`
- status: draft

## Core intention

Das Sales Kit soll nicht nur eine sichere finale Mail besitzen, sondern über alle verwendbaren Texte hinweg dieselben Produktgrenzen einhalten. Der erste Skill-Dry-Run soll belegen, dass die Kette einen Draft erzeugen und bei fehlender realer Quellenlinie trotzdem sicher vor Versand stoppen kann.

## Logic followed

- W1 wurde durch echte Scope-Trennung gelöst: Bar hat eine bestätigte Auffüllliste; Küche wird nicht als Refill-Fähigkeit verkauft.
- W2 wurde nicht durch weichere Werbesprache ersetzt. Die UX-Gleichsetzung mit WhatsApp entfällt; Praktikabilität ist eine offene Pilotfrage.
- W3 trennt Kandidaten-Menü und vertraglichen Pilot-Scope. Nur 1–2 Prozesse werden konkret vereinbart.
- W4 nutzt fail-closed Stufe 1. Export, Löschung, EU-Hosting und AVV bleiben O3-Gates statt Gesprächszusagen.
- „Audit Trail“ wurde auf den konkret belegten Warenbewegungsverlauf mit Wer/Was/Wann reduziert.
- Browser-Code belegt Browser-Nutzung, aber nicht die praktische Mobile-Eignung im Lageralltag.
- Der synthetische Lead ist ein Test-Fixture, keine Research-Quelle. Deshalb darf die Kette einen Demo-Draft, aber keine reale Versandfreigabe erzeugen.

## Skill feedback

- Der Dry Run zeigte Statusdrift im Product-Marketing-Context-Skill (`needs wording change` vs. `partial/future`). Ein deterministischer RED-Check reproduzierte den Drift; die minimale Skill-Änderung synchronisiert das Vokabular.
- Die Safety-Grenze funktioniert: fehlende öffentliche Leadquelle und fehlender realer Geschäftskanal führen trotz inhaltlich sauberem Draft zu `blocked / not_sent`.

## Durable memory

- Ein negativer/gesperrter Claim darf in Truth Tables und Verbotslisten stehen, aber nicht als aktive Kundenbehauptung.
- Code-/UI-Struktur ist keine Runtime- oder Alltagstauglichkeitsevidenz.
- Ein Dry Run ist erfolgreich, wenn er sowohl den Happy Path bis zum Draft als auch den korrekten Stop vor externer Handlung beweist.

## Do not reuse blindly

- Fixture-Punkte, Beobachtungen und Formulierungen nie in einen realen Lead übernehmen.
- O2-Belege sind an Repo-Stand und Claim-Wortlaut gebunden.
- Tracking-/Commit-Status ist kein fachlicher Claim, bleibt aber ein Validierungsrisiko; parallele Commits während eines laufenden Slice müssen explizit als externe Zustandsänderung erfasst werden.

## Next logic gate

Sales-Kit als zusammenhängenden Docs-Slice owner-reviewen und gezielt erfassen; danach einen realen Lead ausschließlich aus öffentlichen Quellen neu durchlaufen lassen.
