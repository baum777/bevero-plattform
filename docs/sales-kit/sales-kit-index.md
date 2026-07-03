# Sales-Kit-Index

**Stand:** 2026-07-03 (P1.1a Sales Kit Skill Layer) · **Zweck:** Ein Blick — welche Datei gilt wofür, was ist aktuell, wo widerspricht sich das Kit und wie führt die manual-first Skill-Kette vom Produktkontext zum menschlich geprüften Mail-Entwurf.

---

## 1. Bestand

| Datei | Zweck | Status | Source of Truth für |
|---|---|---|---|
| `sales-kit-index.md` | Diese Bestandsübersicht | `current` | Kit-Struktur, Widerspruchsliste |
| `outreach-readiness.md` | Annahmen-Register, Capability Truth Table (O2), DSGVO-Stufen, Vor-Absenden-Checkliste, Owner-Entscheidungen | `current` | **Readiness**, Fähigkeits-Claims (Truth Table 2d), Versand-Freigabe |
| `first-contact-final.md` | Versandfertige Erstmail (O2-bereinigt, Variante C + selbst gebaut) | `current` | **Erstmail** — einzige versandfähige Fassung |
| `first-contact-email.md` | Varianten-Bibliothek A–D mit Auswahlhilfe | `current` (Referenz) | Mail-Varianten für andere Zielrollen/Häuser — nicht direkt versenden, enthält unbereinigte „Bar und Küche“-Formulierung |
| `follow-up-email.md` | 3 Follow-up-Situationen | `current` | Follow-up nach Erstkontakt |
| `lead-steckbrief-template.md` | Lead-Recherche-Vorlage inkl. sicherem Aufhänger, Verbotsliste, Quellenliste | `current` | **Lead-Steckbrief** |
| `pilot-conversation-guide.md` | 20–30-Min-Warenflussgespräch: Zeitblöcke, Fragen, Beobachtungspunkte, Fit-/No-Fit-Kriterien, Abschlussfrage | `current` | **Erstgespräch** |
| `sales-call-guide.md` | Älterer Gesprächsleitfaden | `duplicate` — superseded durch `pilot-conversation-guide.md` (Inhalte übernommen). Löschung = Owner-Entscheidung | — |
| `pilot-offer-light.md` | Interne Angebots-Vorlage nach positivem Erstgespräch, entscheidungsneutral | `current` | **Pilotangebot** (intern) |
| `pilot-onepager.md` | Kundenseitiges Übersichtsblatt fürs Gespräch | `needs-owner` — Preislogik trägt `> Annahme:` bis O1; „Auffüllliste“-Formulierung gegen Truth Table K2 prüfen | Kundenseitige Pilot-Übersicht |
| `pricing-pilot-decision.md` | 3 Preisvarianten + Owner-Entscheidungsformular | `current` (Entscheidung offen) | **Pricing** — einzige Quelle für Zahlen |
| `workflow-audit-template.md` | Mini-Audit beim Rundgang (Ware, Information, Verantwortung) | `needs-owner` — enthält „Auffüllliste Bar/Küche“ (Truth Table K2: nur Bar) | **Workflow-Audit** |
| `objection-handling.md` | 10 Einwände mit ehrlichen Antworten | `needs-owner` — Einwand 2 (WhatsApp-Vergleich, K7), Einwand 5 (Datenexport/Löschung unbelegt, O3), Einwand 6/7 (Preis, O1) | Einwandbehandlung |
| `sales-positioning.md` | Kernsatz + 5 Claims | `needs-owner` — Kernsatz sagt „Auffülllisten“ generisch; gegen K2 präzisieren | Positionierung, Claims |
| `skills/bevero-product-marketing-context.skill.md` | Belegbaren Bevero Produkt-/Marktkontext mit JTBD, Versionsgrenze und O2-Status erzeugen | `current` | **Produktkontext-Vertrag** für die Skill-Kette |
| `skills/bevero-lead-research.skill.md` | Einen Betrieb aus öffentlichen Quellen recherchieren; Quelle, Datum und Confidence sichern | `current` | Lead-Research-Ablauf |
| `skills/bevero-operational-fit-score.skill.md` | Bevero-Fit evidenzbasiert bewerten; Hard Stops und billigste Tests benennen | `current` | Fit-Score-Vertrag |
| `skills/bevero-sales-claim-red-team.skill.md` | Kundenwirksame Claims gegen O2/O1/O3 und Evidenz red-teamen | `current` | Claim-Gate-Vertrag |
| `skills/bevero-outreach-readiness.skill.md` | Health-/Readiness-Check vor Draft und Human Review | `current` | Readiness-Ablauf und Send-Boundary |
| `skills/bevero-first-contact-draft.skill.md` | Einen belegten, kurzen Erstmail-Draft für menschliche Prüfung erzeugen | `current` | Draft-Ablauf; kein Versand |

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
| W1 | „Auffüllliste Bar/Küche“ vs. Produktstand (nur Bar-Auffüllliste; Küche hat Checklisten/Walk-Route — Truth Table K2) | `workflow-audit-template.md` (Abschnitt Auffülllisten), `pilot-onepager.md`, `first-contact-email.md` (Varianten B/C), `sales-positioning.md` (Kernsatz), `objection-handling.md` (Einwand 9) | Bereinigt in: `first-contact-final.md`, `lead-steckbrief-template.md`, `pilot-conversation-guide.md`, `pilot-offer-light.md`. Rest: Owner-Freigabe für Sammelbereinigung — bis dahin gelten die bereinigten Dateien |
| W2 | WhatsApp-Einfachheits-Claim als Produkteigenschaft (K7: nicht belegbar) | `objection-handling.md` Einwand 2 | Empfohlene Formulierung in Truth Table K7 („der Anspruch ist…“) — Owner-Freigabe für Edit |
| W3 | Pilot-Umfang: Onepager listet 6 Prozesse „enthalten”, Positionierung/Guide sagen „1–2 Prozesse“ | `pilot-onepager.md` vs. `pilot-conversation-guide.md`, `pilot-offer-light.md` | Lesart: 6 = Kandidaten-Menü, 1–2 = tatsächlicher Pilot-Scope. Im Onepager klarstellen („davon wählen wir gemeinsam 1–2“) — Owner-Freigabe |
| W4 | Datenexport/Löschung wird in Einwandbehandlung zugesagt, ist aber unbelegt (O3) | `objection-handling.md` Einwand 5/7 | Bis O3 belegt: nur DSGVO-Stufe-1-Satz verwenden (`outreach-readiness.md` Abschnitt 3) |
| W5 | Zwei Gesprächsleitfäden | `sales-call-guide.md` vs. `pilot-conversation-guide.md` | Entschieden: `pilot-conversation-guide.md` ist kanonisch; alter Guide superseded, Löschung Owner-Entscheidung |

## 4. Owner-Entscheidungen (konsolidiert)

| # | Entscheidung | Wo | Blockiert |
|---|---|---|---|
| O1 | Preisvariante wählen | `pricing-pilot-decision.md` | Erstgespräch-Preisnennung, Angebotsversand |
| O3 | DSGVO Stufe 2 belegen (Supabase-Region, DPAs, Export, Löschprozess) oder bewusst Stufe 1 | `outreach-readiness.md` Abschnitt 3 | Pilotstart-Unterlagen |
| O4 | Sammelbereinigung W1–W3 in den `needs-owner`-Dateien freigeben | dieser Index, Abschnitt 3 | Konsistenz des Kits (nicht den Versand — die versandkritischen Dateien sind bereinigt) |
| O5 | `sales-call-guide.md` löschen oder als Archiv behalten | dieser Index, W5 | nichts (nur Hygiene) |

_O2 (Produktfähigkeiten) bleibt ein hartes Claim-Gate. Die Claim-Menge der aktuellen `first-contact-final.md` hat das Gate am 2026-07-03 auf Code-/Test-Ebene bestanden; neue, geänderte oder veraltete Claims öffnen O2 automatisch erneut. Der Runtime-Smoke bleibt zusätzlich Pflicht vor Pilotstart._

## 5. Manual-first Skill-Kette

1. `skills/bevero-product-marketing-context.skill.md` → datiertes Kontextpaket erzeugen; O2-Status pro Produktclaim übernehmen.
2. `skills/bevero-lead-research.skill.md` → genau einen Betrieb aus öffentlichen Quellen recherchieren und `lead-steckbrief-template.md` füllen.
3. `skills/bevero-operational-fit-score.skill.md` → Fit, Hard Stops, load-bearing assumptions und nächsten manuellen Test bestimmen.
4. `skills/bevero-sales-claim-red-team.skill.md` → alle geplanten Claims gegen O2/O1/O3 prüfen; unbelegte Aussagen abschwächen oder streichen.
5. `skills/bevero-outreach-readiness.skill.md` → Health Check; höchstens `ready_for_draft` ausgeben.
6. `skills/bevero-first-contact-draft.skill.md` → genau einen Mail-Entwurf aus `first-contact-final.md` und freigegebenen Claim-IDs erstellen.
7. `skills/bevero-outreach-readiness.skill.md` erneut → konkreten Entwurf höchstens auf `ready_for_human_review` setzen.
8. Mensch prüft Empfänger, Inhalt und Zeitpunkt, gibt Versand frei und sendet selbst.

**Fallback:** Kann ein Gate nicht belegt werden, wird die Aussage gestrichen, der neutrale öffentliche Geschäftskanal verwendet oder der Durchlauf `partial`/`blocked` beendet. Kein Skill sendet, plant Versand, schreibt in ein CRM, automatisiert LinkedIn oder erzeugt Leadlisten per Massenscraping.

## 6. Der Weg zum ersten Lead (Dateien)

1. Skill-Kette Abschnitt 5 bis `ready_for_human_review` ausführen.
2. `lead-steckbrief-template.md`, Claim Ledger und Readiness-Ergebnis gemeinsam prüfen.
3. `first-contact-final.md` personalisieren und Vor-Absenden-Checkliste (`outreach-readiness.md` Abschnitt 4) durchgehen → **Freigabe und Versand sind Owner-Handlungen**.
4. Bei Antwort: Gespräch nach `pilot-conversation-guide.md`.
5. Bei Fit: `pilot-offer-light.md` ausfüllen — vorher muss O1 entschieden sein.
