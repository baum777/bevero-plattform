# Sales-Kit-Index

**Stand:** 2026-07-03 (P1.1b Widerspruchsbereinigung + Dry Run) · **Zweck:** Ein Blick — welche Datei gilt wofür, welche Gates gelten und wie führt die manual-first Skill-Kette vom Produktkontext zum menschlich geprüften Mail-Entwurf.

---

## 1. Bestand

| Datei | Zweck | Status | Source of Truth für |
|---|---|---|---|
| `sales-kit-index.md` | Diese Bestandsübersicht | `current` | Kit-Struktur, Widerspruchsliste |
| `outreach-readiness.md` | Annahmen-Register, Capability Truth Table (O2), DSGVO-Stufen, Vor-Absenden-Checkliste, Owner-Entscheidungen | `current` | **Readiness**, Fähigkeits-Claims (Truth Table 2d), Versand-Freigabe |
| `first-contact-final.md` | Kanonische Erstmail-Vorlage (O2-bereinigt, Variante C + selbst gebaut) | `current` | **Erstmail** — einzige Draft-Basis; konkreter Versand braucht Readiness + Human Go |
| `first-contact-email.md` | Varianten-Bibliothek A–D mit Auswahlhilfe | `current` (Referenz) | Mail-Varianten für andere Zielrollen/Häuser — vor Nutzung erneut Claim-Red-Team ausführen |
| `follow-up-email.md` | 3 Follow-up-Situationen | `current` | Follow-up nach Erstkontakt |
| `lead-steckbrief-template.md` | Lead-Recherche-Vorlage inkl. sicherem Aufhänger, Verbotsliste, Quellenliste | `current` | **Lead-Steckbrief** |
| `pilot-conversation-guide.md` | 20–30-Min-Warenflussgespräch: Zeitblöcke, Fragen, Beobachtungspunkte, Fit-/No-Fit-Kriterien, Abschlussfrage | `current` | **Erstgespräch** |
| `sales-call-guide.md` | Älterer Gesprächsleitfaden | `duplicate` — superseded durch `pilot-conversation-guide.md` (Inhalte übernommen). Löschung = Owner-Entscheidung | — |
| `pilot-offer-light.md` | Interne Angebots-Vorlage nach positivem Erstgespräch, entscheidungsneutral | `current` | **Pilotangebot** (intern) |
| `pilot-onepager.md` | Kundenseitiges Übersichtsblatt fürs Gespräch | `current` (O1-gated) — W1/W3 bereinigt; keine Preis-/Vertragszusage bis O1 | Kundenseitige Pilot-Übersicht |
| `pricing-pilot-decision.md` | 3 Preisvarianten + Owner-Entscheidungsformular | `current` (Entscheidung offen) | **Pricing** — einzige Quelle für Zahlen |
| `workflow-audit-template.md` | Mini-Audit beim Rundgang (Ware, Information, Verantwortung) | `current` — Bar-Auffüllung und Küchen-Checks getrennt; Browser-/Pilotgrenze sichtbar | **Workflow-Audit** |
| `objection-handling.md` | 10 Einwände mit ehrlichen Antworten | `current` (O1/O3-gated) — W2/W4 bereinigt; offene Preis-/Datenzusagen entfernt | Einwandbehandlung |
| `sales-positioning.md` | Kernsatz + 5 Claims | `current` — W1 und pauschaler Audit-Trail-Claim bereinigt | Positionierung, Claims |
| `skills/bevero-product-marketing-context.skill.md` | Belegbaren Bevero Produkt-/Marktkontext mit JTBD, Versionsgrenze und O2-Status erzeugen | `current` | **Produktkontext-Vertrag** für die Skill-Kette |
| `skills/bevero-lead-research.skill.md` | Einen Betrieb aus öffentlichen Quellen recherchieren; Quelle, Datum und Confidence sichern | `current` | Lead-Research-Ablauf |
| `skills/bevero-operational-fit-score.skill.md` | Bevero-Fit evidenzbasiert bewerten; Hard Stops und billigste Tests benennen | `current` | Fit-Score-Vertrag |
| `skills/bevero-sales-claim-red-team.skill.md` | Kundenwirksame Claims gegen O2/O1/O3 und Evidenz red-teamen | `current` | Claim-Gate-Vertrag |
| `skills/bevero-outreach-readiness.skill.md` | Health-/Readiness-Check vor Draft und Human Review | `current` | Readiness-Ablauf und Send-Boundary |
| `skills/bevero-first-contact-draft.skill.md` | Einen belegten, kurzen Erstmail-Draft für menschliche Prüfung erzeugen | `current` | Draft-Ablauf; kein Versand |
| `dry-runs/demo-first-lead-dry-run.md` | Vollständiger synthetischer Skill-Ketten-Test ohne reale Daten oder Versand | `current` (Demo only) | Dry-Run-Evidenz; nicht für Outreach verwenden |
| `p1.1b-closure.md` | Closure mit W1–W4-, O2-, Dry-Run-, Versand-, Pilotstart- und Tracking-Status | `current` | P1.1b Ergebnis und Next Gate |

## 2. Source-of-Truth-Kurzreferenz

| Frage | Antwort steht in |
|---|---|
| Welcher Vertrag definiert den Sales-spezifischen Produktkontext? | `skills/bevero-product-marketing-context.skill.md`; Produktfakten bleiben repo-lokal belegt, aktuelle Claim-Freigaben stehen in `outreach-readiness.md` Abschnitt 2d |
| Was darf ich behaupten? | `outreach-readiness.md` Abschnitt 2d (Truth Table) |
| Welche Mail geht raus? | `first-contact-final.md` — keine andere |
| Was kostet der Pilot? | `pricing-pilot-decision.md` — bis O1 entschieden ist: gar nichts kommunizieren |
| Wie recherchiere ich einen Lead? | `lead-steckbrief-template.md` |
| Wie führe ich das Erstgespräch? | `pilot-conversation-guide.md` |
| Wie bereite ich das Angebot vor? | `pilot-offer-light.md` |
| Was sage ich zu Datenschutz? | `outreach-readiness.md` Abschnitt 3 (Stufe 1, solange O3 offen) |

**SOT-Grenze:** Der Product-Marketing-Context-Skill ist die Source of Truth für Felder, Ablauf und Gates des Sales-Kontexts. Er überschreibt keine Produktwahrheit. Produktfähigkeiten müssen weiterhin aus Repo-Evidenz in `outreach-readiness.md` Abschnitt 2d abgeleitet werden.

## 3. Offene Widersprüche

| # | Widerspruch | Betroffene Dateien | Auflösung |
|---|---|---|---|
| W1 | Bar-/Küchen-Auffüllliste wurde vermischt | Betroffene Mail-, Positionierungs-, Onepager-, Audit- und Einwandtexte | `closed 2026-07-03` — nur Bar-Auffüllliste; Küche ausschließlich als angrenzender Check-Prozess bzw. klare Nicht-Fähigkeit |
| W2 | WhatsApp-Einfachheit wurde als Produkteigenschaft dargestellt | `objection-handling.md` Einwand 2; O2 K7 | `closed 2026-07-03` — Tatsachenclaim entfernt; Praktikabilität wird offen im Pilot geprüft |
| W3 | Kandidaten-Menü mit tatsächlichem Pilotumfang verwechselt | `pilot-onepager.md` vs. Gesprächs-/Offer-Guide | `closed 2026-07-03` — Menü explizit; tatsächlicher Pilot wählt 1–2 Prozesse |
| W4 | Datenexport/Löschung trotz offenem O3 zugesagt | `objection-handling.md` Einwand 5/7 | `closed 2026-07-03` — Export-/Löschzusage entfernt; nur Stufe-1-Satz, O3 bleibt Pilotstart-Gate |
| W5 | Zwei Gesprächsleitfäden | `sales-call-guide.md` vs. `pilot-conversation-guide.md` | Entschieden: `pilot-conversation-guide.md` ist kanonisch; alter Guide superseded, Löschung Owner-Entscheidung |

## 4. Owner-Entscheidungen (konsolidiert)

| # | Entscheidung | Wo | Blockiert |
|---|---|---|---|
| O1 | Preisvariante wählen | `pricing-pilot-decision.md` | Erstgespräch-Preisnennung, Angebotsversand |
| O3 | DSGVO Stufe 2 belegen (Supabase-Region, DPAs, Export, Löschprozess) oder bewusst Stufe 1 | `outreach-readiness.md` Abschnitt 3 | Pilotstart-Unterlagen |
| O5 | `sales-call-guide.md` löschen oder als Archiv behalten | dieser Index, W5 | nichts (nur Hygiene) |

_O2 (Produktfähigkeiten) bleibt ein hartes Claim-Gate. Nach W1–W4 wurde die Truth Table erneut geprüft: K1–K5/K9 sind in enger Form bestätigt, K6/K8 nur partial und eng verwendbar, K7 unconfirmed und entfernt, K10 future. Neue, geänderte oder veraltete Claims öffnen O2 automatisch erneut._

## 5. Versand- und Pilotstart-Gates

| Gate | Erforderlich | Aktueller Stand |
|---|---|---|
| **Draft** | Product Context, Lead-Steckbrief mit öffentlichen Quellen, Fit Score, Claim Red Team/O2, Readiness | Für reale Leads noch nicht ausgeführt; Demo-Dry-Run ist nicht versendbar |
| **Versand** | konkreter Draft = `ready_for_human_review`, korrekter öffentlicher Geschäftskanal, menschliche Prüfung und Freigabe | Kein Versand erfolgt; ausschließlich Owner-Handlung |
| **Pilotstart** | O1 entschieden, O3-Unterlagen geschlossen, Runtime-Smoke bestanden, schriftlicher 1–2-Prozess-Scope | `blocked` — O1, O3 und Runtime-Gate offen |

## 6. Manual-first Skill-Kette

1. `skills/bevero-product-marketing-context.skill.md` → datiertes Kontextpaket erzeugen; O2-Status pro Produktclaim übernehmen.
2. `skills/bevero-lead-research.skill.md` → genau einen Betrieb aus öffentlichen Quellen recherchieren und `lead-steckbrief-template.md` füllen.
3. `skills/bevero-operational-fit-score.skill.md` → Fit, Hard Stops, load-bearing assumptions und nächsten manuellen Test bestimmen.
4. `skills/bevero-sales-claim-red-team.skill.md` → alle geplanten Claims gegen O2/O1/O3 prüfen; unbelegte Aussagen abschwächen oder streichen.
5. `skills/bevero-outreach-readiness.skill.md` → Health Check; höchstens `ready_for_draft` ausgeben.
6. `skills/bevero-first-contact-draft.skill.md` → genau einen Mail-Entwurf aus `first-contact-final.md` und freigegebenen Claim-IDs erstellen.
7. `skills/bevero-outreach-readiness.skill.md` erneut → konkreten Entwurf höchstens auf `ready_for_human_review` setzen.
8. Mensch prüft Empfänger, Inhalt und Zeitpunkt, gibt Versand frei und sendet selbst.

**Fallback:** Kann ein Gate nicht belegt werden, wird die Aussage gestrichen, der neutrale öffentliche Geschäftskanal verwendet oder der Durchlauf `partial`/`blocked` beendet. Kein Skill sendet, plant Versand, schreibt in ein CRM, automatisiert LinkedIn oder erzeugt Leadlisten per Massenscraping.

## 7. Der Weg zum ersten Lead (Dateien)

1. Skill-Kette Abschnitt 6 bis `ready_for_human_review` ausführen.
2. `lead-steckbrief-template.md`, Claim Ledger und Readiness-Ergebnis gemeinsam prüfen.
3. `first-contact-final.md` personalisieren und Vor-Absenden-Checkliste (`outreach-readiness.md` Abschnitt 4) durchgehen → **Freigabe und Versand sind Owner-Handlungen**.
4. Bei Antwort: Gespräch nach `pilot-conversation-guide.md`.
5. Bei Fit: `pilot-offer-light.md` ausfüllen — vorher muss O1 entschieden sein.

## 8. Tracking-/Commit-Status

Während dieses Slices erschienen extern/parallel erst Commit `47ca501` (P1.1a-Bestand) und anschließend `c851236` (P1.1b-Bereinigung + Work Docs) auf `main` und `origin/main`; dieser Agent hat weder committed noch gepusht. Der P1.1b-Bestand ist dadurch tracked. Lokal verbleiben nur die nach `c851236` ergänzten Abschlusskorrekturen als Modifikationen. `npm run check:work-docs` meldet `fail` mit drei sichtbaren Pfaden — der Validator sieht den Changeset also, scheitert aber an einem `trim()`/Off-by-one im Skript (`docs/agent-team/mspr_logbook/…` wird zu `ocs/agent-team/…`) und an einem fehlenden Intent-Eintrag im Changeset. Empfehlung: keine weitere Commit-/Push-Aktion, bis Owner die parallelen Commits und den verbleibenden Diff geprüft hat; danach entweder Validator-Fix oder Intent-Eintrag mit aufnehmen.
