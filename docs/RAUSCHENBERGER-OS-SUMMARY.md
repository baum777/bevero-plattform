# Bevero — Repo-Audit Summary (historisch)

**Stand:** 20. Juni 2026 · lokaler Repo-Audit auf Commit `40de03d`
**Adressaten:** Fachseite und interne IT
**Evidenzgrenze:** Diese Summary beschreibt den lokal prüfbaren Repository-Stand. Deployment- und Laufzeitstatus wurden nicht gegen externe Systeme geprüft.

> **Historischer Kontext:** Dieses Dokument ist ein datierter Repo-Audit aus der
> Pilot-Phase (Hospitality-Pilot Rauschenberger Gruppe). Es wird als Historie/Case
> Study geführt. Für die aktuelle Produktidentität siehe
> [`productization/bevero-product-identity-v0.md`](productization/bevero-product-identity-v0.md)
> und [`VISION.md`](VISION.md).

---

## Für Fachseite und Betrieb

### Was die Webapp heute leistet

Bevero bündelt eine kontrollierte Arbeitsoberfläche für operative Standortprozesse. Sie unterstützt Bestände, Wareneingang, Beschaffung, Standorte, Schichtübergaben, Hinweise und standortbezogene Arbeitsbereiche.

Die Anwendung unterstützt Entscheidungen und operative Ausführung innerhalb ihres eigenen Datenmodells. Sie ersetzt weder FoodNotify, Microsoft Dynamics 365 noch DATEV. Diese Systeme bleiben in ihren jeweiligen Domänen führend.

### Governance und Grenzen

Jede Aktion wird nach L0 bis L4 eingeordnet: von frei ausführbaren Analysen bis zu blockierten oder explizit freizugebenden Handlungen. Höhere Risikostufen folgen dem Prinzip **Draft vor Commitment**; relevante Aktionen benötigen Evidence und Audit-Nachweise.

Die lokale Produkt- und Governance-Dokumentation setzt klare Grenzen:

- Keine automatische Bestellung, Zahlung oder externe Kommunikation.
- Kein automatischer Writeback nach FoodNotify, Dynamics 365 oder DATEV.
- Keine LLM-basierte Freigabe, Bestellung oder Bestandsmutation.
- Kein Einsatz von Service-Role-Credentials in nutzerseitigen Request-Pfaden.

### Schichtplanung und Küchenchecklisten: belegter Ist-Zustand

Die Schichtplanung ist als Anwendungsslice in Cockpit und API implementiert. Ein Schichtplan kann als CSV- oder Excel-Datei importiert, auf nicht zuordenbare Personen und Bereiche geprüft, bestätigt und zur Aufgabenfreigabe vorbereitet werden. Die API führt dazu Import-, Bestätigungs-, Vorschau- und Freigabe-Endpunkte.

Aus einem bestätigten Plan werden Aufgaben für Datum, Küchenbereich und zugeordnete Person abgeleitet. Mitarbeitende sehen ihre Tagesaufgaben, markieren sie als erledigt oder melden einen Mangel. Schichtleitungen erhalten eine Bereichsübersicht mit Aufgabenstatus und Mängeln; eine schreibgeschützte Matrix zeigt die Checklisten-Konfiguration pro Bereich und Wochentag. Rollen beschränken die jeweiligen Ansichten und Aktionen.

### Getränke, Bestände und Auffüllliste

Für den Getränkebestand führt die Webapp einen nachvollziehbaren Auffüllprozess: Bestand prüfen, Auffülllauf starten, Sollmenge und tatsächliche Differenz je Position erfassen und die Position bestätigen. Die bestätigte Position erzeugt eine Bestandsbewegung; der Lauf und sein Fortschritt bleiben dabei sichtbar.

Der Plus-Button **„Schnellaktionen“** steht Mitarbeitenden in der mobilen Navigation zur Verfügung. Er bietet den direkten Einstieg zu Notiz, Checkliste, Verbrauch buchen, Wareneingang erfassen, Schichtübergabe und Auffüllliste.

> ## Zielbild — noch nicht als Gesamtprozess belegt
>
> Personalplanung, Küchenbereiche, Checklisten, Übergaben, Bestände und Eventbedarf sollen zu einem durchgängigen, freigabegesteuerten Betriebsbild verbunden werden. Der lokale Code belegt jedoch weder eine automatisch erzeugte Personalplanung noch eine aktive Verbindung oder Schreibzugriffe zu FoodNotify, Dynamics 365 oder DATEV.

---

## Für interne IT

### Monorepo und technischer Stand

| Oberfläche | Lokaler Stand |
|---|---|
| `apps/api` | Fastify-API mit TypeScript, Prisma, Zod und Vitest |
| `apps/cockpit` | Next.js-App-Router-Cockpit mit React und Supabase-Auth-Integration |
| `apps/landing` | Vite-/React-Landing für Präsentation und Architekturkommunikation |
| Datenbank | Supabase Postgres als kanonische Datenbank; Prisma-Schema und Migrationen im API-Projekt |

Der Audit auf Commit `40de03d` zählt **87 Prisma-Modelle**, **61 Migrationen**, **20 API-Module**, **81 API-Testdateien mit 21.888 Testzeilen** und **44 Cockpit-Seiten**. Diese Werte sind Repository-Metriken, keine Laufzeit- oder Abdeckungskennzahlen.

Die API führt unter anderem Module für Authentifizierung, Organisationen, Teams, Bestand, Beschaffung, Standorte, Schichtübergaben, Notizen, Ingestion, Automatisierung, Mother Concern und Schichtplanung. Die Cockpit-Routen enthalten die vier Schichtplanoberflächen Import, Heute, Übersicht und Matrix.

### Auffüllläufe und Bestandsbewegungen

Die Auffülllogik ist im Datenmodell über vier miteinander verknüpfte Objekte abgebildet:

| Datenobjekt | Zweck |
|---|---|
| `BarRefillTemplateItem` | Definiert Produkt, Einheit, Sollmenge und Reihenfolge einer Auffüllposition. |
| `BarRefillRun` | Hält den Auffülllauf pro Organisation und lokalem Datum einschließlich Status und Ersteller fest. |
| `BarRefillRunItem` | Speichert den Positions-Snapshot, Soll- und angeforderte Menge, Bestätigung sowie die Verknüpfung zur resultierenden Bewegung. |
| `InventoryMovement` | Hält die nachvollziehbare Bestandsbewegung mit Akteur, Menge, Einheit und Idempotency-Key fest. |

Bei der Bestätigung einer gültigen Auffüllposition legt die API eine Bewegung vom Typ `item_removed` an und aktualisiert den Bestands-Snapshot. Der Schlüssel `inventory.bar_refill.confirmed:<runItemId>` und die eindeutige Positionsverknüpfung verhindern doppelte Buchungen bei Wiederholung derselben Bestätigung.

### Daten- und Sicherheitsgrenzen

Die Architektur trennt externe Eingänge von interner Workflow-Logik: Rohdaten können gespeichert und normalisiert werden, bevor sie als interne Ereignisse und Folgeprozesse behandelt werden. Für nutzerseitige Zugriffe ist Supabase Auth mit einem serverseitig durchgesetzten Rollenmodell vorgesehen. Die lokale API-Dokumentation nennt Supabase Postgres als kanonische Datenbank und RLS als Autoritätsgrenze.

Die Implementierung und die aktiven Spezifikationen behandeln externe Integrationen als read-only bzw. ausstehend. Insbesondere sind Live-Ingestion und automatische Rückschreibungen nicht durch diesen lokalen Audit als aktiv nachgewiesen.

### Deployment-Angaben mit Evidenzgrenze

Die Deployment-SOT benennt drei autorisierte Vercel-Ziele: `bevero-api`, `bevero-ui` und `landing`; Deployments erfolgen jeweils aus dem zugehörigen App-Verzeichnis. Die SOT weist zugleich darauf hin, dass für API und Cockpit ein Production-Deployment wiederhergestellt werden muss. Daher wird hier kein aktuell laufender Produktionsstatus behauptet.

### Nächster belastbarer Gate

Für einen belastbaren Betriebsnachweis müssen eine gültige Supabase-gestützte Laufzeitumgebung sowie die betroffenen API- und Cockpit-Flows ausgeführt und dokumentiert werden. Bis dahin beschreibt diese Summary ausschließlich die lokal vorhandene Implementierung und die dokumentierte Zielarchitektur.
