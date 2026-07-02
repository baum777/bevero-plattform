# UX-Optimierungskonzept — Cockpit WebApp

**Grundlage:** UX/UI Evaluation Report (Juni 2026) — 50+ Screenshots, systematische Analyse  
**Zielzustand:** Gesamtbewertung von "Befriedigend" → "Gut"  
**Scope:** `apps/cockpit` (Next.js 15.3 · React 19 · Supabase Auth)  
**Erstellt:** 2026-06-29

---

## Gesamtbewertung (Ist-Zustand)

| Kriterium | Score | Gewicht |
|---|---|---|
| Intuitivität | 7/10 | Hoch |
| Usability | 6/10 | Hoch |
| Informationsarchitektur | 7/10 | Mittel |
| Visuelle Konsistenz | 6/10 | Mittel |
| Responsive Design | 8/10 | Hoch |
| CTA-Flows | 5/10 | Hoch |
| Performance (visuell) | 8/10 | Mittel |
| **Accessibility** | **4/10** | **Hoch** |

Stärken: Rollenspezifische UI (Bar/Küche), Dark Mode, Responsive Design, Touch-Targets.  
Hauptschwächen: Kein Action-Feedback, schwache Accessibility, Sprachmischung.

---

## Sprint 1 — Kritische Fixes (Prio: Hoch)

### P1 · Login-Fehlerbehandlung
**Problem:** Kein klares Feedback bei falschen Credentials — Button zeigt nur "Anmeldung läuft..."  
**Datei:** `app/(auth)/sign-in/page.tsx`, `app/(auth)/actions.ts`  
**Status quo:** `getAuthErrorMessage` vorhanden, aber Feldmarkierung fehlt  

**Maßnahmen:**
- Inline-Fehlermeldungen pro Feld (E-Mail ungültig / Passwort falsch / Server-Error)
- Rote `border`-Klasse auf fehlerhafte Inputs via `aria-invalid="true"`
- Passwort-vergessen-Link ergänzen (→ `/reset-password` Route anlegen)
- Auto-Focus auf erstes leeres Feld nach Fehler

```tsx
// Ziel-Pattern: sign-in/page.tsx
<input
  id="email"
  name="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
  className={error ? "field-error" : ""}
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

---

### P2 · Action-Feedback (Toast-System vereinheitlichen)
**Problem:** Nach Speichern/Schichtabschluss kein visuelles Feedback. Toast ist 3× als Custom-State implementiert.  
**Dateien:** `movements-client.tsx`, `refill-client.tsx`, `items-client.tsx`  

**Maßnahmen:**
- Einen einzigen `useToast` Hook extrahieren → `hooks/use-toast.ts`
- Toast-Komponente global in `app/(app)/layout.tsx` registrieren
- Alle Client-Komponenten migrieren auf den zentralen Hook
- Toast-Typen: `success` | `error` | `info` | `warning` mit konsistenter Farbgebung

```tsx
// hooks/use-toast.ts (zentraler Hook)
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, kind: ToastKind = "success") => {
    setToast({ message, kind });
  }, []);
  return { toast, show };
}
```

---

### P3 · Unsaved-Changes-Guard
**Problem:** Modal schließen ohne Speichern → Datenverlust, keine Warnung  
**Betroffene Flows:** Schnellnotiz-Modal, Schichtübergabe-Felder  

**Maßnahmen:**
- `useUnsavedChanges` Hook mit `isDirty`-State
- `beforeunload`-Event-Listener für Browser-Navigation
- Bestätigungs-Dialog: "Änderungen verwerfen?" mit Abbrechen/Verwerfen-Buttons
- Next.js Router-Guard für in-app Navigation

---

### P4 · Accessibility — WCAG 2.1 AA
**Problem:** Keine ARIA-Labels, Kontrastprobleme im Dark Mode, Score 4/10  

**Maßnahmen (Priorität nach Impact):**
1. **ARIA-Labels** auf alle Icon-only-Buttons (`aria-label="Menü öffnen"`)
2. **Kontrastprüfung** Dark Mode: Mindest-Ratio 4.5:1 (Text), 3:1 (UI-Elemente)
3. **Focus-Ring** für Keyboard-Navigation sichtbar machen (CSS `:focus-visible`)
4. **role="alert"** auf alle Fehlermeldungen und Toast-Notifications
5. **Skip-Link** "Zum Hauptinhalt springen" als erstes Element im Layout

**Audit-Tool:** `npx axe-core` als CI-Step oder in Playwright E2E einbinden

---

### P5 · Sprachkonsistenz
**Problem:** "Mother Concern" (EN) neben "Notizen", "Alerts", "Freigaben" (DE)  
**Problem:** "Alerts" doppelt in Navigation  

**Maßnahmen:**
- "Mother Concern" → "Konzernübersicht" (oder "Konzern")
- Duplikate in Navigation auflösen: "Alerts" nur einmal unter "Operative Ebene"
- "OK" vs. "Aktiv" als Status vereinheitlichen → einheitliches Token `status.active`
- Alle EN-Labels in einer i18n-Datei (`locales/de.json`) konsolidieren

---

## Sprint 2 — Usability-Verbesserungen (Prio: Mittel)

### M2 · Tab-Farben Warenbewegungen
**Datei:** `app/(app)/movements/movements-client.tsx`  
Aktiver Tab hat inkonsistente Hintergrundfarbe (gelb vs. orange je nach Kontext).  
→ CSS-Klasse `.tab-active` mit einem fixen Token (`--color-tab-active`) definieren.

### M3 · Dashboard-Konsistenz
**Dateien:** `app/(app)/dashboard/`  
Dashboard 2 (Küchen-Variante) fehlen Zeittrend-Diagramme.  
→ `dashboard-history-charts.tsx` als shared Component in beide Dashboard-Varianten einbinden.  
→ Alert-Labels vereinheitlichen: nur `grün = OK`, `gelb = Warnung`, `rot = Kritisch`.

### M4 · Navigation konsolidieren
Doppelte Navigation: Sidebar + Header-Dropdown für Standortwechsel.  
→ Header-Dropdown als primäres Control für Kontext (Bar/Küche/Verwaltung)  
→ Sidebar: nur Funktions-Navigation, kein Kontext-Switch  
→ Beide synchronisieren via `location-context.tsx` (bereits vorhanden)

### M5 · Filter-Hervorhebung
**Dateien:** Bestand-Ansicht, Inventar-Ansicht  
Aktiver Filter nicht erkennbar.  
→ `data-active="true"` Attribut + CSS `[data-active="true"] { ... }` mit klarer visueller Unterscheidung

### M6 · Abbruch-CTAs
Alle Formulare ohne "Abbrechen"-Button.  
→ Standard-Pattern: `<Button variant="ghost">Abbrechen</Button>` neben primärer Aktion  
→ Abbruch soll den Unsaved-Changes-Guard (P3) triggern

### M7 · Notizen-Archiv
Kein Suchen/Filtern bei gespeicherten Notizen.  
→ Suche via `input[type=search]` mit Client-side-Filter nach Titel/Datum  
→ Tags/Kategorien als Phase-2-Erweiterung

### M8 · Schichtabschluss-Protokollierung
**Datei:** `app/(app)/schichtplan/abschluss/abschluss-client.tsx`  
Kein Zeitstempel, kein User im Abschluss-Protokoll.  
→ `closed_at: timestamp`, `closed_by: user_id` auf Shift-Entity  
→ Bestätigungs-Message nach Abschluss (Toast P2)  
→ Warnung wenn offene Aufgaben existieren

---

## Sprint 3 — Optimierungen (Prio: Niedrig)

| ID | Maßnahme | Datei/Bereich |
|---|---|---|
| L1 | Platzhaltertexte in Schichtübergabe-Feldern | `shift-handover-client.tsx` |
| L2 | Direktes Eingabefeld für Differenz in Auffüllliste | `refill-client.tsx` |
| L3 | Tags für Notizen (Phase 2) | Notizen-Modul |
| L4 | Transition-Animation Notiz → Liste | CSS `transition` / Framer Motion |
| L5 | "N"-Button auf Login klären oder entfernen | `app/(auth)/sign-in/page.tsx` |
| L6 | Lagerorte: kollabierbare Spalten oder Detail-Drawer | Lagerorte-Tabelle |

---

## Implementierungsplan

```
Sprint 1 (Woche 1-2)  — Kritische Fixes
  ├── P1: Login-Fehlerbehandlung + Passwort-vergessen
  ├── P2: Toast-Hook zentralisieren
  ├── P3: Unsaved-Changes-Guard
  ├── P4: ARIA-Labels + Focus-Ring + Kontrast-Audit
  └── P5: Sprachkonsistenz + Navigation-Duplikat

Sprint 2 (Woche 3-4)  — Usability
  ├── M2: Tab-Farben
  ├── M3: Dashboard-Charts vereinheitlichen
  ├── M4: Navigation konsolidieren
  ├── M5: Filter-Hervorhebung
  ├── M6: Abbruch-CTAs
  └── M8: Schichtabschluss-Protokollierung

Sprint 3 (Woche 5)    — Feinschliff
  └── L1–L6
```

---

## Erwarteter Zielzustand nach Umsetzung

| Kriterium | Ist | Ziel |
|---|---|---|
| Usability | 6/10 | 8/10 |
| CTA-Flows | 5/10 | 8/10 |
| Accessibility | 4/10 | 7/10 |
| Visuelle Konsistenz | 6/10 | 8/10 |
| **Gesamt** | **~6.3** | **~8.0** |

---

## Quellen

- `UX_UI_Analyse_WebApp_Cockpit.pdf` (Juni 2026)
- `apps/cockpit/` Codebase-Audit 2026-06-29
- `context/current-state.md` — Technischer Stand
