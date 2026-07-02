# prd.md

## 1. Rollen & Rechte

| Rolle | Rechte | Typische Aufgaben | Sicht auf das System |
|---|---|---|---|
| **Geschäftsführung / Betriebsleitung** | Vollzugriff lesend, Freigaben, Nutzer- & Rollenverwaltung, Stammdaten (Artikel, Lagerorte) | Überblick, Eskalationen, Rollenvergabe | Standort-Gesamtsicht: alle Vorgänge, offene Freigaben, Audit-Trail |
| **Küchenchef** | Freigabe von Warenannahmen & Korrekturen im Bereich Küche, Auffülllisten Küche verwalten, Artikel im Küchenbereich pflegen | Warenannahme kontrollieren, Korrekturen freigeben, Übergaben lesen/schreiben | Bereichssicht Küche + zugehörige Lagerorte |
| **Schichtleitung** | Schichtübergaben erstellen/abschließen, Umlagerungen durchführen, Auffülllisten zuweisen, kleinere Korrekturen anstoßen | Schicht führen, Übergabeprotokoll, offene Punkte nachhalten | Schichtsicht: aktuelle Übergabe, offene Aufgaben, heutige Vorgänge |
| **Bar / Service** | Auffülllisten abarbeiten, Warenbewegungen der eigenen Ausgabestelle erfassen, Notizen zur Übergabe beisteuern | Auffüllen, Bewegungen buchen, Auffälligkeiten melden | Arbeitslisten-Sicht: „meine Liste, meine Ausgabestelle" |
| **Lager / Warenannahme** | Warenannahme erfassen (inkl. Foto, Fehlmengen), Umlagerungen zwischen Lagerorten | Lieferungen annehmen, Ware einlagern, Differenzen melden | Warenfluss-Sicht: Annahmen des Tages, Lagerorte, offene Einlagerungen |
| **Controlling / Steuerberater (extern, read-only)** | Nur lesen: Bewegungen, Audit-Trail, Exporte (CSV) | Nachvollziehen, prüfen, exportieren | Berichtssicht ohne Eingriffsmöglichkeit |

Grundprinzip: **Jede schreibende Aktion ist einer Person zugeordnet.** Es gibt keine anonymen Sammelkonten.

> Annahme: Im Pilotbetrieb teilen sich Service-Mitarbeitende ggf. ein Gerät; die Anmeldung erfolgt dann per persönlichem PIN-Wechsel auf dem Schichtgerät, damit die Personenzuordnung erhalten bleibt.

## 2. Kernprozesse (End-to-End)

### 2.1 Warenannahme

- **Trigger:** Lieferant trifft ein (typisch 7:00–10:00 Uhr).
- **Schritte:** Lager/Warenannahme öffnet „Neue Warenannahme" → wählt Lieferant (generische Stammdaten) → erfasst Positionen (Artikel, Menge, Ziellagerort) → fotografiert Lieferschein → markiert Abweichungen (Fehlmenge, Bruch, falscher Artikel) als Abweichungsposition.
- **Freigabe:** Annahme ohne Abweichung gilt als abgeschlossen mit Erfassung. Annahme **mit** Abweichung erfordert Freigabe durch Küchenchef (Bereich Küche) bzw. Schichtleitung (Bereich Bar/Service).
- **Audit-Eintrag:** Wer hat wann was angenommen, welche Abweichung, wer hat freigegeben, Foto-Referenz.

### 2.2 Umlagerung zwischen Lagerorten

- **Trigger:** Ware wird gebraucht, wo sie nicht liegt (z. B. Keller → Barlager vor Schichtbeginn).
- **Schritte:** Berechtigte Rolle wählt Quell-Lagerort → Artikel + Menge → Ziel-Lagerort → bestätigt. Optional Anlass (z. B. „Auffüllliste Bar Nr. 214").
- **Freigabe:** Standard-Umlagerungen ohne Freigabe (Erfassung genügt). Umlagerungen, die einen Lagerort rechnerisch ins Minus buchen würden, lösen einen Korrekturprozess aus (siehe 2.5).
- **Audit-Eintrag:** Bewegung mit Quelle, Ziel, Menge, Person, Zeit, Anlass.

### 2.3 Auffüllliste Bar/Küche

- **Trigger:** Schichtbeginn oder fester Tageszeitpunkt (z. B. 15:00 Uhr vor Abendgeschäft).
- **Schritte:** System erzeugt vorbefüllte Auffüllliste aus Verbrauchs-/Auffüllmustern (AI-Assist, MVP: heuristisch aus Historie) → Schichtleitung prüft, ergänzt, weist zu → Bar/Service arbeitet Positionen ab; jedes Abhaken erzeugt die zugehörige Umlagerung → nicht erfüllbare Positionen werden mit Grund markiert („nicht im Keller gefunden").
- **Freigabe:** Liste gilt als abgeschlossen, wenn alle Positionen erledigt oder begründet offen sind; Schichtleitung schließt ab.
- **Audit-Eintrag:** Listenversion (vorbefüllt vs. final), Bearbeiter je Position, erzeugte Bewegungen, offene Positionen mit Grund.

> Hinweis (Scope-Lock): Die Vorbefüllung aus Historie ist per `mvp-scope-lock.md` nach Pilot v1.5 verschoben; MVP-Core startet vorlage-basiert.

### 2.4 Schichtübergabe

- **Trigger:** Schichtwechsel (typisch 16:00 Uhr) oder Betriebsschluss.
- **Schritte:** System erstellt Übergabeentwurf automatisch aus den Vorgängen der Schicht (Annahmen, Abweichungen, offene Listenpositionen, offene Freigaben) → gehende Schichtleitung ergänzt Freitext-Punkte (max. kurz, mit Verantwortlichem) → übergibt → kommende Schichtleitung liest und **bestätigt aktiv** die Übernahme.
- **Freigabe:** Die Bestätigung der übernehmenden Schichtleitung ist die Freigabe. Unbestätigte Übergaben bleiben sichtbar offen.
- **Audit-Eintrag:** Übergabeprotokoll mit beiden Personen, Zeitstempeln, Inhalt eingefroren zum Übergabezeitpunkt.

### 2.5 Freigabe-/Korrekturprozess

- **Trigger:** Erfassungsfehler, Zähldifferenz, Bruch/Schwund, nachträgliche Änderung eines Vorgangs.
- **Schritte:** Berechtigte Rolle erstellt Korrekturantrag mit Bezug auf den Originalvorgang + Grund → zuständige Freigaberolle (Küchenchef / Betriebsleitung je nach Bereich) prüft → gibt frei oder lehnt mit Kommentar ab.
- **Freigabe:** Zwei-Personen-Prinzip verpflichtend: Ersteller ≠ Freigebender.
- **Audit-Eintrag:** Originalvorgang bleibt unverändert bestehen; die Korrektur ist ein neuer, verknüpfter Eintrag. **Nichts wird jemals gelöscht oder überschrieben.**

## 3. Datenobjekte (hohe Ebene, kein Schema)

| Objekt | Zweck & wichtigste Beziehungen |
|---|---|
| **Artikel** | Was bewegt wird (Name, Einheit, Bereich Küche/Bar). Bezieht sich auf Bewegungen und Auffülllisten-Positionen. |
| **Lagerort** | Wo Ware liegt (Keller, Kühlhaus 1/2, Barlager …). Quelle/Ziel jeder Bewegung. |
| **Bewegung** | Eine Warenbewegung: Annahme, Umlagerung oder Korrektur. Verknüpft Artikel, Lagerort(e), Person, Zeit, ggf. Anlass (Auffüllliste, Warenannahme). |
| **Warenannahme** | Klammer um die Bewegungen einer Lieferung: Lieferant, Positionen, Abweichungen, Lieferschein-Foto, Freigabestatus. |
| **Auffüllliste** | Arbeitsliste je Ausgabestelle und Schicht: Positionen mit Soll, Status, Bearbeiter; erzeugt Bewegungen beim Abhaken. |
| **Übergabeprotokoll** | Eingefrorener Schichtstand: automatisch gesammelte Vorgänge + Freitext-Punkte, übergebende und übernehmende Person, Bestätigungsstatus. |
| **Freigabe** | Entscheidung einer berechtigten Rolle zu einem Vorgang (Annahme mit Abweichung, Korrektur): Entscheider, Ergebnis, Kommentar, Zeit. |
| **Audit-Event** | Unveränderlicher Protokolleintrag zu jeder schreibenden Aktion. Bezieht sich auf genau einen Vorgang und eine Person. |
| **Nutzer / Rolle** | Person mit genau einer Hauptrolle und Bereichszuordnung; Basis jeder Verantwortlichkeit. |

## 4. Integrationsannahmen

> Annahme: Im MVP wird bewusst **nichts** integriert — keine Kasse (POS), keine Buchhaltung, keine Lieferanten-EDI, kein Bestellwesen. Bevero läuft als eigenständige Ebene; der einzige Datenausgang ist ein CSV-Export für Controlling/Steuerberater.

> Annahme: Perspektivisch andockbar (Vision, nicht zugesagt): Kassen-Abverkaufsdaten als Verbrauchssignal für bessere Auffülllisten-Vorschläge; Buchhaltungsexport; Lieferanten-Bestellschnittstellen. Führende Systeme bleiben führend — Bevero übernimmt nie Kassen- oder Buchhaltungsfunktion.

## 5. Nicht-Ziele (explizit)

- Keine Rezeptkalkulation, kein Wareneinsatz-Controlling im MVP.
- Keine Personaleinsatzplanung, kein Dienstplan.
- Kein Bestellwesen v1 (keine Bestellungen an Lieferanten aus Bevero heraus).
- Keine Kassenfunktion, keine Preise/Umsätze.
- Keine Inventur-Vollfunktion (Zählen ganzer Lager mit Bewertungslogik) — nur Korrekturen einzelner Differenzen. `Out of MVP`
- Keine Lieferscheins-OCR (Foto ja, automatische Positionserkennung nein). `Out of MVP`
- Keine Mehrstandort-Verwaltung im MVP (ein Standort = eine Instanz).

## 6. MVP-Grenzen: In / Out

| In (MVP) | Out (Pilot-Erweiterung oder Vision) |
|---|---|
| Warenannahme mit Positionen, Abweichungen, Lieferschein-Foto | Lieferschein-OCR, Lieferanten-EDI |
| Lagerorte + Umlagerungen mit vollständiger Bewegungshistorie | Bestandsbewertung in Euro, Inventurmodul |
| Auffüllliste Bar/Küche, vorbefüllt aus Historie (heuristisch) → per Scope-Lock: Pilot v1.5 | Verbrauchsprognosen aus Kassendaten |
| Schichtübergabe mit Auto-Entwurf + aktiver Bestätigung | Aufgaben-/Wartungsmanagement über Übergabe hinaus |
| Freigabe-/Korrekturprozess mit unveränderlichem Audit-Trail | Konfigurierbare mehrstufige Freigabe-Workflows |
| Rollen & Rechte (6 Rollen, fest definiert) | Frei konfigurierbare Rollen, Mandantenfähigkeit |
| CSV-Export (read-only) → per Scope-Lock: Pilot v1 | Buchhaltungs-/Kassenintegration |
| Anomalie-Hinweise auf eigenen Bewegungsdaten → per Scope-Lock: Pilot v1.5 | Standortübergreifende Auswertungen, Company-Brain-Funktionen |

## 7. Technische Leitplanken (ohne Implementierungsdetails)

- **Mobile-first:** Der primäre Bildschirm ist ein Smartphone an der Rampe, im Keller, hinter der Bar. Desktop ist Zweitsicht für Betriebsleitung/Controlling.
- **Offlinetolerant:** Kühlhaus und Keller haben Funklöcher. Erfassung muss offline möglich sein und synchronisieren, sobald Netz da ist — ohne Datenverlust, mit klarer Anzeige des Sync-Status.
- **Bedienbar unter Betriebsbedingungen:** Große Touchziele, wenige Pflichtfelder, Abhaken statt Tippen — nutzbar mit nassen oder fettigen Händen und unter Zeitdruck.
- **Mehrsprachige Teams:** Oberfläche mindestens Deutsch/Englisch, Texte einfach gehalten; weitere Sprachen als Pilot-Feedback-Punkt.
- **DSGVO:** Personenbezug nur wo betrieblich nötig (Verantwortlichkeit), Auftragsverarbeitung, EU-Hosting, Löschkonzept für Personendaten bei Austritt — bei Erhalt der Audit-Integrität (Pseudonymisierung statt Löschung im Audit-Trail).
- **Audit-Trail als Grundprinzip:** Schreibende Aktionen sind append-only. Korrekturen referenzieren, ersetzen nie.
- **Mandantenfähigkeit:** Spätere Anforderung (mehrere Betriebe/Standorte); Architektur darf sie nicht verbauen, MVP liefert sie nicht.
