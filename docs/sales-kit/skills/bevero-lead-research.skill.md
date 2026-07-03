# Bevero Lead Research

## Zweck

Einen einzelnen Zielbetrieb mit öffentlichen, nachvollziehbaren Quellen so untersuchen, dass ein belastbarer Lead-Steckbrief und ein sicherer Gesprächs- oder Mail-Aufhänger entstehen. Qualität und Quellenlinie sind wichtiger als Listenmenge.

## Wann verwenden

- Für einen konkreten Betrieb vor Fit-Score oder Erstkontakt.
- Wenn Ansprechpartner, Standortlogik oder operative Signale aktualisiert werden müssen.
- Nicht für den Aufbau großer Leadlisten oder personenbezogene Tiefenrecherche.

## Inputs

- Aktuelles Bevero Product Marketing Context Paket
- `../lead-steckbrief-template.md`
- Name, Standort oder offizielle Domain eines einzelnen Betriebs
- Recherche-Stichtag

## Workflow

1. Health Check: Zielbetrieb eindeutig identifizieren; bei Namensgleichheit Standort oder offizielle Domain klären.
2. Quellen nach Frage routen:
   - offizielle Website/Impressum: Identität, Standorte, öffentlich genannte Ansprechpartner und Geschäftskontakt;
   - Speisekarte, Angebots- und Eventseiten: Outlets, Betriebsmodell, Saisonalität;
   - offizielle Stellenanzeigen: Rollen, Schichtlogik, öffentlich genannte Tools;
   - öffentliche Branchenverzeichnisse oder Unternehmensprofile: Öffnungszeiten und Kategorie, gegen offizielle Quelle prüfen;
   - seriöse Presse: Expansion, Betreiberwechsel oder andere zeitliche Signale.
3. Pro Aussage Quelle, Veröffentlichungs- oder Abrufdatum und Confidence erfassen:
   - `high`: offizielle Quelle oder zwei unabhängige konsistente Quellen;
   - `medium`: eine glaubwürdige öffentliche Quelle;
   - `low`: indirekter Hinweis; nur als offene Hypothese verwenden.
4. Beobachtung und Ableitung trennen. Beispiel: „Bankettseite nennt drei Räume“ ist beobachtet; „mehrere Übergabepunkte“ ist abgeleitet.
5. Nur öffentlich veröffentlichte geschäftliche Kontaktwege erfassen. Keine E-Mail-Muster raten, keine privaten Kontaktdaten ergänzen.
6. Maximal drei plausible operative Hypothesen bilden und jeweils benennen, was sie widerlegen würde.
7. `../lead-steckbrief-template.md` ausfüllen. Nicht verifizierbare Felder mit `unklar` statt mit Annahmen füllen.
8. Einen sicheren Aufhänger formulieren, der auf einer Quelle beruht, kein Versagen unterstellt und keine Produktfähigkeit behauptet.

## Output-Format

```markdown
# Lead Research — <Betrieb> — <Datum>

## Identität
- Betrieb / Standort:
- Offizielle Domain:
- Öffentlicher Geschäftskontakt:

## Beobachtungen
| Beobachtung | Quelle | Datum | Confidence |
|---|---|---|---|

## Operative Hypothesen
| Hypothese | Ableitung aus | Confidence | Fails if / im Gespräch prüfen |
|---|---|---|---|

## Sicherer Aufhänger
- ...

## Lücken
- ...

## Übergabe
- Ausgefüllter Lead-Steckbrief: <Pfad oder eingebetteter Inhalt>
```

## Guardrails

- Gemeinsame Sales-Kit-Grenze: manual-first; kein automatisierter Versand, keine LinkedIn-Automation, kein Massenscraping. Der Mensch gibt Versand frei und sendet.
- Manual-first; ein Lead pro Durchlauf.
- Nur öffentliche Quellen. Kein Login-Wall-, CAPTCHA- oder Zugriffsschutz-Bypass.
- Kein Massenscraping, keine LinkedIn-Automation und kein automatisiertes Enrichment.
- Quelle plus Datum für jede Kontakt- und Unternehmensinformation erfassen.
- Keine sensiblen, privaten oder nicht veröffentlichten Daten erfassen oder erfinden.
- Keine Person aus Rolle, Namensmuster oder Domain ableiten. `unklar` ist ein gültiges Ergebnis.
- Recherchebeobachtungen bestätigen keine Produktfähigkeit; Produktclaims bleiben bis zur O2-Prüfung gesperrt.
- Recherche und Handeln strikt trennen: kein Kontakt, keine Nachricht, kein CRM-Write.

## Done-Kriterium

Der Lead-Steckbrief enthält eindeutige Identität, mindestens eine belegte betriebliche Beobachtung, Quellen mit Datum, ehrliche Confidence, höchstens drei prüfbare Hypothesen, einen sicheren Aufhänger und klar benannte Lücken.

## Related Sales-Kit Files

- `../lead-steckbrief-template.md`
- `../workflow-audit-template.md`
- `../sales-positioning.md`
- `../sales-kit-index.md`
- `bevero-product-marketing-context.skill.md`
