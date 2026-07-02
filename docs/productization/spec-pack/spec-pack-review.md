# spec-pack-review.md — Annahmen, Selbstbewertung, offene Entscheidungen

## Sammelübersicht aller Annahmen

1. **Referenzbetrieb** (`product-vision.md`): Hotel mit Restaurant, Bar, Veranstaltungsgeschäft, ca. 40–60 operative Mitarbeitende, 5–8 Lagerorte — Typ „Motorworld Inn", ohne reale Daten.
2. **Geräte-Sharing** (`prd.md`): Service teilt sich ggf. ein Schichtgerät; Personenzuordnung per persönlichem PIN-Wechsel.
3. **Keine MVP-Integrationen** (`prd.md`): Kasse, Buchhaltung, Lieferanten-EDI, Bestellwesen bewusst nicht integriert; einziger Datenausgang CSV-Export.
4. **Perspektivische Integrationen** (`prd.md`): Kassendaten als Verbrauchssignal, Buchhaltungsexport, Bestellschnittstellen — Vision, nicht zugesagt; führende Systeme bleiben führend.
5. **Infrastruktur beim Piloten** (`pilot-offer.md`): Betrieb stellt WLAN in Hauptbereichen; Offline-Erfassung deckt Funklöcher; keine neue Pflicht-Hardware außer ggf. Bar-Tablet.
6. **Preise** (`pilot-offer.md`): Alle Preisangaben sind Vorschlags-Spannen zur Verhandlung (Setup 2.000–4.000 €, Pilot 300–500 €/Monat, Regelbetrieb 500–900 €/Monat je Standort), keine Festpreise.

## Selbstbewertung gegen die 8 Review-Kriterien

1. **Operative Glaubwürdigkeit — erfüllt.** Abläufe sind an reale Uhrzeiten, Rollen und Reibungspunkte gebunden (Rampe 7:30 Uhr, Übergabe 16:00 Uhr, PIN-Wechsel am Schichtgerät, Funkloch im Kühlhaus); eine erfahrene Schichtleitung findet ihre Realität wieder.
2. **Scope-Disziplin — erfüllt.** MVP ist auf die fünf erlaubten Kernbereiche begrenzt, `Out of MVP` explizit markiert (OCR, Inventurmodul), In/Out-Tabelle vorhanden; Vision überall als Zukunft gekennzeichnet. Nachgeschärft durch `mvp-scope-lock.md`.
3. **Konsistenz — erfüllt.** Sechs Rollen, identische Begriffe (Auffüllliste, Warenannahme, Übergabeprotokoll, Audit-Trail) und identische Prozessgrenzen in allen sechs Dateien; Use Cases referenzieren dieselben Freigaberegeln wie das PRD.
4. **Verkaufbarkeit — erfüllt.** `pilot-offer.md` enthält Lieferumfang, Preislogik mit Begründung, faire Abbruchkriterien und nummerierte nächste Schritte; Einwandbehandlung in `target-customer.md` ist gesprächsfertig.
5. **Ableitbarkeit — teilweise.** PRD + Roadmap reichen für einen MVP-Start (Prozesse, Objekte, Leitplanken, Done-Kriterien); ein Entwicklerteam bräuchte dennoch Detailentscheidungen zu Offline-Sync-Konflikten und zur Vorbefüllungs-Heuristik. Adressiert durch `technical-build-spec-outline.md`, `implementation-slices.md`, `acceptance-tests.md`, `delivery-task-queue.md`.
6. **Kein Generik-SaaS — erfüllt.** Jede Nutzenaussage hängt an einem konkreten Vorgang (Fehlmenge, Lieferschein-Foto, Übergabebestätigung); verbotene Buzzwords stehen im Sprachleitfaden auf der Vermeiden-Liste und werden im Text nicht verwendet.
7. **Annahmen-Transparenz — erfüllt.** Sechs Annahmen inline mit `> Annahme:` markiert und in der Sammelübersicht gelistet.
8. **Compliance — erfüllt.** Keine Code-/DB-/Commit-/Deploy-Aktionen bei Erstellung; keine echten Personen-, Preis- oder Lieferantendaten; alle Beispiele generisch („Lieferant A", „Küchenchef").

## Offene Entscheidungen für den Product Owner (Stand nach Hardening-Patch)

Ursprünglich fünf; zwei per `mvp-scope-lock.md` als Default gelöst (Freigabe-Schwellen → MVP: jede Abweichung, mit Wächter in `risk-register.md` Nr. 3; Zweitsprache → Pilot-v1.5-Entscheidung). Verbleibend, formalisiert als D1–D15 in `delivery-task-queue.md` (Abschnitt decision-lock-before-build):

1. **Offline-Konfliktstrategie im Detail** (D12–D15) — Kollisionskriterien, Warteschlangenmodell, Gerätezeit-Regel, Offline-Go-Live-Kriterium.
2. **Pilotkandidat & Exklusivität** — wird der Pilot mit dem bekannten Referenzbetrieb gefahren, und bekommt dieser Exklusivität/Sonderkonditionen?
3. **Vorbefüllungs-Heuristik v1** — Wochentags-Durchschnitt (einfach, erklärbar) vs. gleitendes Muster mit Saisonkomponente (Pilot v1.5, Kaltstart-Stufe 2).
