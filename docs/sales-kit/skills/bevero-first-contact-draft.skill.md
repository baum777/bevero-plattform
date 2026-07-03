# Bevero First Contact Draft

## Zweck

Aus einem belegten Lead-Kontext genau einen kurzen, betriebsspezifischen Erstkontakt-Entwurf erstellen. Der Output ist ein Draft für menschliche Prüfung, keine Versandaktion.

## Wann verwenden

- Nur wenn Bevero Outreach Readiness mindestens `ready_for_draft` meldet.
- Für eine manuell zu versendende Erstkontakt-E-Mail an einen einzelnen Betrieb.
- Nicht für Sequenzen, Massenmail, LinkedIn-Nachrichten oder automatisierte Personalisierung.

## Inputs

- `ready_for_draft`-Ergebnis aus Bevero Outreach Readiness
- Aktuelles Bevero Product Marketing Context Paket
- Lead-Steckbrief mit sicherem Aufhänger und Quellenlinie
- Freigegebene Claim-IDs aus Sales Claim Red Team
- `../first-contact-final.md` als Mail-Source-of-Truth
- Absender-Signatur; keine Zugangsdaten

## Workflow

1. Health Check wiederholen: Empfängerrolle und öffentlicher Geschäftskanal sind belegt; O2 ist für alle verwendeten Produktclaims erfüllt.
2. Die kanonische Struktur aus `../first-contact-final.md` verwenden, aber nur belegte Bestandteile übernehmen.
3. Peer-Ton schreiben: operativ, konkret, ruhig. Mit der Welt des Betriebs beginnen, nicht mit Feature-Liste oder Unternehmenslob.
4. Personalisierung an genau eine öffentliche Beobachtung anbinden. Wenn die Mail ohne Aufhänger unverändert für jeden Betrieb passen würde, neu schreiben oder blockieren.
5. Einen niedrigen CTA verwenden: kurze Antwort oder 20–30 Minuten Abgleich. Genau eine Bitte; Weiterleitungsoption ist zulässig.
6. Nur Claim-IDs verwenden, die das Red Team freigegeben hat. Kein Preis, keine Referenz, kein ROI und keine Datenschutz-Stufe über dem Readiness-Resultat.
7. Sales-Floskeln und Druck entfernen: kein „revolutionär“, „all-in-one“, „Synergie“, künstliche Dringlichkeit oder Fake-`Re:`.
8. Quellen und verwendete Claim-IDs außerhalb des Mailtexts als Review-Metadaten ausgeben.
9. Outreach Readiness mit dem konkreten Entwurf erneut auf `ready_for_human_review` prüfen. Dann stoppen und an den Menschen übergeben.

## Output-Format

```markdown
# First Contact Draft — <Betrieb> — <Datum>

## Betreff
<eine kurze, unaufgeregte Zeile>

## Mail-Entwurf
<Text>

## Review-Metadaten — nicht mitsenden
- Empfängerquelle + Datum:
- Personalisierungsquelle + Datum:
- Verwendete Claim-IDs:
- O2-Prüfstand:
- Outreach-Readiness: <ready_for_human_review | partial | blocked>
- Offene manuelle Prüfung:

## Human Handoff
- Freigabe durch:
- Versand durch: Mensch
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Recherchierte Kontakt-/Unternehmensangaben brauchen Quelle und Datum; keine sensiblen Daten erfinden.
- Manual-first; genau ein Lead und genau ein Entwurf pro Durchlauf.
- Kein automatisierter Versand, kein Mail-Tool-Aufruf, kein Scheduling und kein Tracking-Pixel.
- Keine LinkedIn-Automation, kein Massenscraping und keine Serienpersonalisierung.
- Keine erfundenen Namen, Kontaktdaten, Pain Points, Referenzen oder Produktfähigkeiten.
- Keine Produktfähigkeit ohne O2. Unbelegten Claim abschwächen oder streichen; bei load-bearing Claim `blocked`.
- Der Mensch gibt Versand frei. Der Mensch sendet.

## Done-Kriterium

Ein einzelner kurzer Draft liegt mit belegter Personalisierung, einem niedrigen CTA, freigegebenen Claim-IDs und Review-Metadaten vor. Das konkrete Readiness-Ergebnis ist mindestens `ready_for_human_review`; der Skill hat keine externe Aktion ausgeführt.

## Related Sales-Kit Files

- `../first-contact-final.md`
- `../outreach-readiness.md`
- `../lead-steckbrief-template.md`
- `../follow-up-email.md`
- `../sales-kit-index.md`
- `bevero-outreach-readiness.skill.md`
- `bevero-sales-claim-red-team.skill.md`
