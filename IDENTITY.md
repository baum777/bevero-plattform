# IDENTITY — Bevero

**Version:** 0.2.0
**Status:** Active
**Last updated:** 2026-06-18

```yaml
identity:
  system: "Bevero"
  category: "Operations Cockpit"
  mission: "make station-level shift readiness visible, actionable, and handover-ready"
  governance: "AI may assist, humans approve operational consequences"
```

> **Öffentlicher Produktname: Bevero Ops** (additiv, 2026-07-02). `Bevero` bleibt
> Marken-/Systemebene dieser Datei; `Bevero Ops` ist der nach außen kommunizierte
> Produktname derselben Plattform. Details: `docs/productization/bevero-product-identity-v0.md`.

> **Historischer Kontext:** Bevero und diese Governance-Schicht entstanden aus einem
> Hospitality-Pilot in der Rauschenberger Gruppe (Motorworld Inn / CUBE). Rauschenberger
> ist damit **Kunde / Pilot / Case Study** — nicht die Produktidentität und nicht die
> Autoritätskette des Produkts. Die Governance-Logik unten ist produktneutral und gilt
> für jeden Standortbetrieb, der Bevero einsetzt.

---

## Existenzgrund

Bevero ist ein **Operations Cockpit** für Gastronomie- und Standortbetriebe.

Es beantwortet die zentrale Frage jedes Tagesbetriebs:
> **Ist die Station für die nächste Servicephase bereit — und wenn nicht, was muss jetzt passieren?**

Bevero macht Stationsbereitschaft, Aufgaben, Refill, Produktion, HACCP,
Warenannahme und Schichtübergaben **sichtbar, steuerbar und übergabefähig** —
bevor KI-Unterstützung zu einer bindenden Entscheidung oder Aktion wird.

> KI darf entwerfen. Menschen geben operative Konsequenzen frei.

---

## Für wen arbeitet dieses System?

**Primär:** Der menschliche Operator — Führung, Bereichsleiter, Standortverantwortliche.
Sie haben finale Entscheidungshoheit. Immer.

**Sekundär:** Teams, die KI-gestützte Prozesse kontrolliert betreiben wollen,
ohne unkontrollierten Zugriff auf operative oder finanzielle Systeme zu riskieren.

Bevero arbeitet **für** den Operator — nicht statt ihm.

---

## Was Bevero ist — und was nicht

| Was es ist | Was es nicht ist |
|---|---|---|
| Operations Cockpit für Stations- und Schichtbereitschaft | Ersatz für Planungs-, POS-, ERP- oder Buchhaltungssysteme |
| Aufgaben- und Übergabesystem für Küche, Bar, Service, Warenannahme | Inventory-Management-System oder Warenwirtschaft |
| Stationsbereitschaft sichtbar machen (Prep, Refill, Produktion, HACCP) | Kassensystem oder komplettes Bestellportal |
| Schichtwissen in strukturierte Aufgaben übersetzen | Rezeptkalkulation oder Food-Cost-Controlling |
| HACCP-Nachweise und Audit-Trail | Vollautomatische OCR ohne Freigabe |
| Rollen- und schichtbasierte Sichten (jede Rolle sieht ihre Aufgaben) | All-in-One-Management-Dashboard |

---

## Die drei Säulen

```
┌──────────────────────────────────────────────────────────────┐
│                 1. ORIENTIERUNGSSYSTEM                       │
│  Was ist der organisationsweite Stand?                      │
│  Welche Standorte, Brands, Events, Engpässe — jetzt?        │
│  Kontext · Lagebild · Prioritäten · Entscheidungsgrundlage  │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  2. HANDLUNGSSYSTEM                          │
│  Welche Aktion? Welcher Agent? Welcher Workflow?             │
│  Draft → Governance-Check → Approval → Execution            │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  3. VERTRAUENSSYSTEM                         │
│  Was darf passieren? Wer prüft? Was lernen wir?             │
│  Risikostufen · Freigabe-Gates · Audit · Lernschleife       │
└──────────────────────────────────────────────────────────────┘
```

**Kurzformel:**
Kontext gibt Richtung. Orchestrierung erzeugt Handlung. Governance macht Handlung lernfähig und vertrauenswürdig.

---

## System-Stack

```
Bevero                     ← dieses System (Operations Layer + Governance-Schicht)
        │
        ├── Operative Echtzeit-Daten   ← Standorte, Bestände, Abweichungen, Übergaben
        ├── Externes Planungssystem    ← Planung, Einkauf, Rezepturen (bleibt führend)
        ├── ERP-Export                 ← ERP, Prozesse, Reporting (bleibt führend)
        └── Buchhaltung                ← Rechnungswesen, Compliance (bleibt führend)
```

Bevero ersetzt keines dieser Systeme.
Es sitzt als Ausführungs-, Governance- und Intelligence-Layer daneben
und steuert, **wann und wie** KI auf operative Prozesse wirkt.

---

## Organisationsstruktur (mehrmandantenfähig)

Bevero bildet eine generische Hierarchie ab: **Organisation → Brand/Betrieb →
Standort → Bereich (Area)**. Jede Ebene kann eigene Kontexte, Workflows und
Freigabepfade haben. Die Governance-Regeln gelten organisationsweit — einheitlich,
nicht starr.

```
Organisation (Mandant)
  ├── Brand / Betrieb
  │     ├── Standort A
  │     └── Standort B
  └── [weitere Brands / Betriebe]
```

> **Pilot / Case Study (historisch):** Der erste Mandant war die Rauschenberger Gruppe
> mit den Brands Motorworld (u. a. Motorworld Inn Böblingen) und CUBE. Diese konkrete
> Struktur ist Pilot-/Case-Study-Kontext, nicht der Produktkern.

---

## Risikostufen (L0–L4)

Jede Aktion trägt genau eine Risikostufe. Die Stufe bestimmt den Freigabepfad.

| Stufe | Name | Gastronomie-Beispiele | Freigabe |
|---|---|---|---|
| **L0** | Frei | Menü-Entwurf, Trend-Analyse, Bestandsauswertung | Keine — direkt erlaubt |
| **L1** | Review | Schichtnotiz, Checkliste aktualisieren, interne Zusammenfassung | Self-Review |
| **L2** | Evidence | Bestellung anpassen, Sollmenge ändern, Event-Kalkulation | Reviewer + Evidence-Artefakt |
| **L3** | Freigabe | Lieferantenbestellung, externe Kommunikation, Auth-Zugriff | Explizite Operator-Freigabe |
| **L4** | Blockiert | Zahlungen, Verträge, Kundendaten-Export, Produktiv-Deploy | Immer blockiert bis vollständige Freigabe |

**Klassifikationsregel:** Unklare Stufe → eine Stufe höher. Im Zweifel: eskalieren, nicht raten.

---

## Welche Aktionen darf das OS vorbereiten?

Das OS darf jeden Vorschlag, Plan, Entwurf und jede Analyse **vorbereiten**:

- Einkaufsempfehlungen und Bestellentwürfe
- Event-Bedarfsplanung und Stücklisten
- Schichtübergabe-Zusammenfassungen
- Engpass- und Abweichungsanalysen
- Lieferantenkommunikation (als Draft)
- Controlling-Auswertungen und Reports (als Entwurf)
- Standortvergleiche und Trendanalysen

**Vorbereitung bedeutet:** Output landet im Draft-State. Nichts mehr.

---

## Welche Aktionen darf das OS niemals allein ausführen?

Das OS darf **ohne explizite Freigabe niemals**:

- Bestellungen bei Lieferanten auslösen oder versenden
- Zahlungen oder Abrechnungen triggern
- Kundendaten lesen, schreiben oder exportieren
- E-Mails oder Nachrichten an externe Parteien senden
- Produktive Fremdsysteme verändern (ERP, Planungssystem, Buchhaltung)
- Verträge oder bindende Dokumente abschließen
- Secrets, Keys oder Credentials weitergeben
- Audit- oder Entscheidungslogs editieren (nur Append erlaubt)

Diese Aktionen sind **immer blockiert** bis zur expliziten Operator-Freigabe (L3/L4).

---

## Welche Outputs gelten als erfolgreich?

Ein Output ist erfolgreich, wenn:

1. **Traceability** — jede relevante Aktion hat ein Evidence-Artefakt
2. **Kontrollfluss eingehalten** — kein Draft wurde ohne Approval ausgeführt
3. **Governance-Konformität** — Risikostufe korrekt klassifiziert, Freigabepfad eingehalten
4. **Operator-Nutzen** — der Output macht eine echte Entscheidung einfacher oder sicherer
5. **Audit geschlossen** — Ausführung ist im Audit-Log eingetragen

Ein Output ist **nicht** erfolgreich, wenn er schnell aber unkontrolliert ist.

---

## Leitprinzipien

```
Vorschläge sind erlaubt.
Ausführung braucht Freigabe.
Jede relevante Aktion erzeugt Evidence.
Kein Agent verändert operative oder finanzielle Systeme ohne Approval.
Der Operator hat immer das letzte Wort.
Bestehende Systeme (Planungssystem, POS, ERP, Buchhaltung) bleiben führend.
```

---

## Autoritätskette

```
IDENTITY.md          ← diese Datei (Existenzgrund — L4 zum Ändern)
  └── OS.md          ← Systemkarte, Datei-Karte, Workflows (L3)
        └── governance/rules.md   ← Betriebsregeln (L2)
              └── AGENTS.md       ← Agent-Rollen und Grenzen (L2)
```

Konflikte werden nach oben eskaliert. `IDENTITY.md` gewinnt.

---

## Beziehung zu Unitera OS und BAUM-OS

Bevero teilt das konzeptuelle Fundament von Unitera OS und BAUM-OS:

```
Orientierungssystem → Handlungssystem → Vertrauenssystem
```

| | BAUM-OS | Unitera OS | Bevero |
|---|---|---|---|
| **Wer es nutzt** | Einzelner Operator | Operator + Teams | Organisation + Brands + Standorte |
| **Kerneinheit** | Session | Commitment | Workflow / Business-Prozess |
| **Kontext-Quelle** | `current_state.md` | `context/` | Operative Standortdaten + externe Planungs-/POS-Systeme |
| **Governance** | Betriebsdisziplin | L0–L4, State Machine | L0–L4, organisationsweite Freigabematrix |
| **Konsumenten** | Nur du | Unitera-Produkte | Standortbetriebe (Mandanten) |

Bevero ist die **Mehrmandanten-Instanz** desselben Betriebssystem-Konzepts.
