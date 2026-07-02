# Bevero Landing — Visueller Workflow-Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Bevero landing page from a screenshot gallery into a visual process narrative for Standortleitung, Küchenleitung, Chefkoch and internal IT.

**Architecture:** Single-file React app (Vite 5 + React 18) with one `App.jsx` and one `styles.css`. Keep the three-tab structure but rename tabs and completely rewrite Tab 1 content. Tabs 2 and 3 get simplified content rewrites. No backend/auth/API changes.

**Tech Stack:** React 18, Vite 5, JSX, plain CSS custom properties, `public/` static assets.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/landing/index.html` | Modify | Update `<title>`, `<meta name="description">`, add OG tags |
| `apps/landing/src/App.jsx` | Full rewrite | All new sections, components, data |
| `apps/landing/src/styles.css` | Extend | Add CSS for new components (≈300 lines appended) |
| `apps/landing/public/images/bevero/desktop/` | Create + copy | Desktop screenshots from `assets/Screenshots/01-tabs/` |
| `apps/landing/public/images/bevero/mobile/` | Create + copy | 4 new mobile screenshots with clean names |

---

## Task 1: Copy and Organize Images

**Files:**
- Create: `apps/landing/public/images/bevero/desktop/` (directory)
- Create: `apps/landing/public/images/bevero/mobile/` (directory)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p apps/landing/public/images/bevero/desktop
mkdir -p apps/landing/public/images/bevero/mobile
```

- [ ] **Step 2: Copy desktop screenshots from assets**

```bash
REPO=/home/baum/Schreibtisch/workspace/main_projects/OS-BASEMENT/rauschenberger-os
SRC="$REPO/assets/Screenshots/01-tabs"
DEST="$REPO/apps/landing/public/images/bevero/desktop"

cp "$SRC/01-dashboard.png"      "$DEST/01-dashboard.png"
cp "$SRC/03-heute.png"          "$DEST/03-heute.png"
cp "$SRC/04-inventory-items.png" "$DEST/04-inventory-items.png"
cp "$SRC/06-bar-refill.png"     "$DEST/06-bar-refill.png"
cp "$SRC/07-goods-receipt.png"  "$DEST/07-goods-receipt.png"
cp "$SRC/09-movements.png"      "$DEST/09-movements.png"
cp "$SRC/10-storage.png"        "$DEST/10-storage.png"
cp "$SRC/12-shift-handover.png" "$DEST/12-shift-handover.png"
cp "$SRC/13-workspaces.png"     "$DEST/13-workspaces.png"
cp "$SRC/16-alerts.png"         "$DEST/16-alerts.png"
cp "$SRC/21-settings-team.png"  "$DEST/21-settings-team.png"
```

- [ ] **Step 3: Copy and rename the 4 new mobile screenshots**

```bash
REPO=/home/baum/Schreibtisch/workspace/main_projects/OS-BASEMENT/rauschenberger-os
SRC="$REPO/assets/Screenshots/01-tabs"
DEST="$REPO/apps/landing/public/images/bevero/mobile"

cp "$SRC/Bildschirmfoto vom 2026-06-19 12-11-01.png" "$DEST/mobile-dashboard-overview.png"
cp "$SRC/Bildschirmfoto vom 2026-06-19 12-11-32.png" "$DEST/mobile-quick-actions.png"
cp "$SRC/Bildschirmfoto vom 2026-06-19 12-11-55.png" "$DEST/mobile-bar-refill.png"
cp "$SRC/Bildschirmfoto vom 2026-06-19 12-12-31.png" "$DEST/mobile-approvals.png"
```

- [ ] **Step 4: Verify all images are in place**

```bash
ls apps/landing/public/images/bevero/desktop/
# Expected: 11 .png files (01-dashboard.png through 21-settings-team.png)

ls apps/landing/public/images/bevero/mobile/
# Expected: mobile-dashboard-overview.png mobile-quick-actions.png mobile-bar-refill.png mobile-approvals.png
```

- [ ] **Step 5: Commit**

```bash
git add apps/landing/public/images/
git commit -m "chore(landing): add bevero desktop and mobile image assets"
```

---

## Task 2: Update index.html Metadata

**Files:**
- Modify: `apps/landing/index.html`

- [ ] **Step 1: Replace the full `<head>` content**

Replace current `index.html` with:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Bevero zeigt Warenfluss, Auffülllisten, Wareneingang, Bestände, Freigaben und Rollenlogik als visuellen Workflow für Küche, Bar, Lager und Standortleitung." />
    <meta property="og:title" content="Bevero — Vom Zettel zur steuerbaren Tageslogik" />
    <meta property="og:description" content="Visuelle Prozessübersicht für Warenfluss, Auffülllisten, Wareneingang, Freigaben und Standortsteuerung." />
    <meta property="og:type" content="website" />
    <title>Bevero — Visueller Workflow für Warenfluss, Küche & Standortleitung</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add apps/landing/index.html
git commit -m "chore(landing): update metadata title and description"
```

---

## Task 3: Write New App.jsx — Data Constants and Imports

**Files:**
- Modify: `apps/landing/src/App.jsx`

This task replaces the entire file. We do it in parts (Tasks 3–10) that build up the new file. Start with the data layer and helper constants.

- [ ] **Step 1: Write the top of the new App.jsx with all data constants**

Create `apps/landing/src/App.jsx` beginning (up to but not including any component definitions):

```jsx
import React, { useState } from "react";

// ─── Image paths ──────────────────────────────────────────────────────────────
const D = "/images/bevero/desktop/";
const M = "/images/bevero/mobile/";

// ─── Workflow Stepper Data ────────────────────────────────────────────────────
const workflowSteps = [
  { num: 1, title: "Überblick",       src: `${D}01-dashboard.png`,      caption: "Leitung sieht kritische Artikel, Alerts, Bestände und Standorte." },
  { num: 2, title: "Schichtstart",    src: `${D}03-heute.png`,           caption: "Der Tag startet mit offenen Punkten, Fehlbestand und klaren Aktionen." },
  { num: 3, title: "Auffüllliste",    src: `${D}06-bar-refill.png`,      caption: "Team arbeitet Soll/Ist-Mengen statt Zuruf ab." },
  { num: 4, title: "Schnellerfassung",src: `${M}mobile-quick-actions.png`, caption: "Notiz, Checkliste, Verbrauch, Wareneingang und Auffüllliste sind mobil erreichbar." },
  { num: 5, title: "Mobile Auffüllung",src:`${M}mobile-bar-refill.png`, caption: "Der Bar-Workflow funktioniert direkt auf dem Smartphone." },
  { num: 6, title: "Wareneingang",    src: `${D}07-goods-receipt.png`,   caption: "Lieferungen und Bestandsbewegungen werden strukturiert erfasst." },
  { num: 7, title: "Bewegungen",      src: `${D}09-movements.png`,       caption: "Entnahmen, Korrekturen und Verbrauch bleiben nachvollziehbar." },
  { num: 8, title: "Freigaben",       src: `${M}mobile-approvals.png`,   caption: "Kritische Abweichungen werden sichtbar und prüfbar." },
  { num: 9, title: "Schichtübergabe", src: `${D}12-shift-handover.png`,  caption: "Offene Punkte werden priorisiert und für die nächste Schicht abgesichert." },
];

// ─── Mobile Strip Data ────────────────────────────────────────────────────────
const mobileStrip = [
  { src: `${M}mobile-dashboard-overview.png`, caption: "Überblick über kritische Bestände, Verbrauch und Alerts.", alt: "Mobile Dashboard Überblick mit kritischen Beständen und Alerts" },
  { src: `${M}mobile-quick-actions.png`,      caption: "Schnellaktionen für Notiz, Checkliste, Verbrauch, Wareneingang und Schichtübergabe.", alt: "Mobile Schnellaktionen: Notiz, Checkliste, Verbrauch, Wareneingang, Auffüllliste" },
  { src: `${M}mobile-bar-refill.png`,         caption: "Auffüllliste mit Sollmenge, Differenz, Mengenbuttons und Bestätigung.", alt: "Mobile Auffüllliste Bar mit Sollmenge, Differenz, Mengenbuttons und Bestätigung" },
  { src: `${M}mobile-approvals.png`,          caption: "Freigaben für kritische Abweichungen mit Grund, Quelle und Status.", alt: "Mobile Freigaben für kritische Bestandsabweichungen mit Prüfgrund und Status" },
];

// ─── Screenshot Gallery Groups ────────────────────────────────────────────────
const galleryGroups = [
  {
    id: "leitung",
    eyebrow: "Leitung & Überblick",
    title: "Was Leitung in Echtzeit sieht",
    screens: [
      { src: `${D}01-dashboard.png`,              alt: "Dashboard mit kritischen Artikeln, Artikelbestand, Standorten und offenen Alerts",     caption: "Dashboard",            desc: "Kritische Artikel, Bestand, Standorte, offene Alerts" },
      { src: `${D}16-alerts.png`,                 alt: "Alerts-Übersicht mit offenen Korrekturen und Bestandswarnungen",                       caption: "Alerts",               desc: "Offene Korrekturen und Warnungen" },
      { src: `${M}mobile-dashboard-overview.png`, alt: "Mobile Dashboard Überblick mit kritischen Beständen und Alerts",                       caption: "Mobile Dashboard",     desc: "Betriebssicht auf dem Smartphone" },
    ],
  },
  {
    id: "workflow",
    eyebrow: "Operativer Tagesworkflow",
    title: "Was das Team täglich nutzt",
    screens: [
      { src: `${D}03-heute.png`,              alt: "Heute-Ansicht mit Schichtstart, offenen Punkten und Fehlbestand",                     caption: "Schichtstart & Heute",  desc: "Offene Punkte, Fehlbestand, klare Aktionen" },
      { src: `${D}06-bar-refill.png`,         alt: "Auffüllliste Bar mit Soll/Ist-Mengen, Differenzen und Status",                       caption: "Auffüllliste Bar",      desc: "Soll/Ist, Differenzen, Status" },
      { src: `${M}mobile-quick-actions.png`,  alt: "Mobile Schnellaktionen für Notiz, Checkliste, Verbrauch, Wareneingang, Auffüllliste", caption: "Quick Actions Mobile",  desc: "Schnelle Aktionen im laufenden Betrieb" },
      { src: `${M}mobile-bar-refill.png`,     alt: "Mobile Auffüllliste Bar mit Sollmenge, Differenz und Mengenbuttons",                 caption: "Bar Refill Mobile",     desc: "Auffüllung direkt im Betrieb" },
    ],
  },
  {
    id: "warenfluss",
    eyebrow: "Warenfluss & Nachvollziehbarkeit",
    title: "Was auditierbar gespeichert wird",
    screens: [
      { src: `${D}07-goods-receipt.png`,      alt: "Wareneingang mit Lieferung, Korrektur und Umbuchung",                                caption: "Wareneingang",         desc: "Lieferung, Korrektur, Umbuchung" },
      { src: `${D}09-movements.png`,          alt: "Bewegungshistorie mit Entnahmen, Korrekturen und Verbrauch",                         caption: "Bewegungen",           desc: "Auditierbare Bewegungshistorie" },
      { src: `${D}04-inventory-items.png`,    alt: "Artikelstamm mit Einheit, Mindestbestand und Status",                               caption: "Artikel",              desc: "Stammdaten, Einheit, Mindestbestand, Status" },
    ],
  },
  {
    id: "kuelager",
    eyebrow: "Küche, Lager & Räume",
    title: "Lagerorte und operative Bereiche",
    screens: [
      { src: `${D}10-storage.png`,    alt: "Lagerorte mit Küchenbereichen, Froster, Kühlhaus, Keller und Live-Bestand",    caption: "Lagerorte",        desc: "Küche, Froster, Kühlhaus, Keller, Verbindungsgang" },
      { src: `${D}13-workspaces.png`, alt: "Arbeitsbereiche mit Standortmodell und operativen Räumen",                     caption: "Arbeitsbereiche",  desc: "Standortmodell und operative Räume" },
    ],
  },
  {
    id: "verantwortung",
    eyebrow: "Verantwortung, Freigaben & IT-Vertrauen",
    title: "Was kontrollierbar bleibt",
    screens: [
      { src: `${M}mobile-approvals.png`,   alt: "Mobile Freigaben mit kritischen Bestandsabweichungen und Prüfgrund",      caption: "Mobile Freigaben",     desc: "Kritische Abweichungen prüfen" },
      { src: `${D}12-shift-handover.png`,  alt: "Schichtübergabe mit offenen Punkten und Priorisierung",                   caption: "Schichtübergabe",      desc: "Offene Punkte sauber übergeben" },
      { src: `${D}21-settings-team.png`,   alt: "Teamverwaltung mit Rollen, Einladungen und Status",                       caption: "Team & Rollen",        desc: "Zugriff, Einladung, Status, Verantwortung" },
    ],
  },
];

// ─── Vision Phase Cards ───────────────────────────────────────────────────────
const visionPhases = [
  {
    phase: "Phase 1",
    title: "Sichtbarer Tagesworkflow",
    text: "Bestände, Auffülllisten, Bewegungen, Wareneingang, Freigaben und Rollen werden im Alltag nutzbar.",
  },
  {
    phase: "Phase 2",
    title: "Automatisierung und Integration",
    text: "Bestellmails, Wareneingänge und externe Datenquellen können schrittweise angebunden werden, ohne bestehende Systeme sofort zu ersetzen.",
  },
  {
    phase: "Phase 3",
    title: "Multi-Standort und Managementsicht",
    text: "Standorte erhalten eigene Profile, während Leitung und Management vergleichbare Kennzahlen, Risiken und Prozesse sehen.",
  },
];

// ─── IT Trust Cards ───────────────────────────────────────────────────────────
const itCards = [
  { title: "Bestehende Systeme bleiben führend",  text: "FoodNotify, Gastronovi, DATEV oder Dynamics werden nicht ungeplant ersetzt." },
  { title: "Rollen und Rechte",                   text: "Staff, Shift Lead, Admin und Leitung erhalten unterschiedliche Sicht- und Aktionsrechte." },
  { title: "Auditierbare Bewegungen",             text: "Entnahmen, Korrekturen, Wareneingänge und Freigaben bleiben nachvollziehbar." },
  { title: "Pilotierbar statt Big Bang",          text: "Start mit einem Standort oder Bereich möglich, spätere Erweiterung kontrolliert." },
  { title: "Saubere technische Grenze",           text: "Landing, Cockpit, API und Integrationen bleiben klar getrennt." },
];
```

Note: This is the DATA section only. Do not yet write the components or App function.

- [ ] **Step 2: Verify the file starts correctly**

```bash
head -10 apps/landing/src/App.jsx
# Expected: import React...
```

---

## Task 4: Write New Components — ProcessFlow, WorkflowStepper, MobileStrip

**Files:**
- Modify: `apps/landing/src/App.jsx` (append after data section)

- [ ] **Step 1: Append the ProcessFlow component (Ist-Zustand visual)**

```jsx
// ─── ProcessFlow: Before vs After HTML/CSS diagram ───────────────────────────
function ProcessFlow() {
  const before = ["Lieferung", "Lager", "Zuruf / Zettel / Erfahrung", "Bar / Küche", "Nachträgliche Kontrolle"];
  const after  = ["Dashboard", "Auffüllliste", "Buchung", "Freigabe", "Übergabe"];
  return (
    <div className="pflow-wrap">
      <div className="pflow-col pflow-before">
        <div className="pflow-label">Heute</div>
        {before.map((s, i) => (
          <React.Fragment key={i}>
            <div className="pflow-node pflow-node--before">{s}</div>
            {i < before.length - 1 && <div className="pflow-arrow">↓</div>}
          </React.Fragment>
        ))}
      </div>
      <div className="pflow-divider" aria-hidden="true">→</div>
      <div className="pflow-col pflow-after">
        <div className="pflow-label">Mit Bevero</div>
        {after.map((s, i) => (
          <React.Fragment key={i}>
            <div className="pflow-node pflow-node--after">{s}</div>
            {i < after.length - 1 && <div className="pflow-arrow">↓</div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append the WorkflowStepper component**

```jsx
// ─── WorkflowStepper ─────────────────────────────────────────────────────────
function WorkflowStepper() {
  const [active, setActive] = useState(0);
  const step = workflowSteps[active];
  return (
    <div className="wfstepper">
      <div className="wfstepper-tabs" role="tablist" aria-label="Tagesworkflow Schritte">
        {workflowSteps.map((s, i) => (
          <button
            key={s.num}
            role="tab"
            aria-selected={i === active}
            aria-controls={`wf-panel-${i}`}
            id={`wf-tab-${i}`}
            className={`wfstepper-tab ${i === active ? "wfstepper-tab--active" : ""}`}
            onClick={() => setActive(i)}
          >
            <span className="wfstep-num">{s.num}</span>
            <span className="wfstep-title">{s.title}</span>
          </button>
        ))}
      </div>
      <div
        className="wfstepper-panel"
        id={`wf-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`wf-tab-${active}`}
      >
        <div className="wfstepper-img-wrap">
          <img
            src={step.src}
            alt={`Schritt ${step.num}: ${step.title} — ${step.caption}`}
            className={step.src.includes("/mobile/") ? "wfstepper-img wfstepper-img--mobile" : "wfstepper-img wfstepper-img--desktop"}
          />
        </div>
        <p className="wfstepper-caption">
          <strong>{step.title}:</strong> {step.caption}
        </p>
      </div>
      <div className="wfstepper-nav" aria-label="Workflow Navigation">
        <button
          className="wfstepper-navbtn"
          onClick={() => setActive(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label="Vorheriger Schritt"
        >← Zurück</button>
        <span className="wfstepper-progress">{active + 1} / {workflowSteps.length}</span>
        <button
          className="wfstepper-navbtn"
          onClick={() => setActive(Math.min(workflowSteps.length - 1, active + 1))}
          disabled={active === workflowSteps.length - 1}
          aria-label="Nächster Schritt"
        >Weiter →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Append the MobileStrip component**

```jsx
// ─── MobileStrip ─────────────────────────────────────────────────────────────
function MobileStrip() {
  return (
    <div className="mstrip-wrap">
      <div className="mstrip-scroll" role="list" aria-label="Mobile Betriebsansichten">
        {mobileStrip.map((m, i) => (
          <div key={i} className="mstrip-item" role="listitem">
            <div className="mstrip-phone" aria-hidden="true">
              <div className="mstrip-notch" />
              <img
                src={m.src}
                alt={m.alt}
                className="mstrip-img"
              />
            </div>
            <p className="mstrip-caption">{m.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Append the KücheTree component**

```jsx
// ─── KücheTree: Bereichsstruktur ─────────────────────────────────────────────
function KücheTree() {
  const areas = [
    { name: "Küche", color: "var(--orange)", children: ["Kühlhaus", "Produktionsküche", "Froster", "Trockenlager", "Transferpunkt", "Wareneingang"] },
    { name: "Bar / Service", color: "var(--blue)", children: ["Barbestand", "Auffüllliste", "Getränkelager", "Tagesverbrauch"] },
  ];
  return (
    <div className="ktree-wrap">
      {areas.map((area) => (
        <div key={area.name} className="ktree-area">
          <div className="ktree-root" style={{ borderColor: area.color, color: area.color }}>{area.name}</div>
          <ul className="ktree-children">
            {area.children.map((c) => (
              <li key={c} className="ktree-child" style={{ "--ktree-color": area.color }}>{c}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Append the GalleryGroup and ScreenCard components**

```jsx
// ─── GalleryGroup / ScreenCard ───────────────────────────────────────────────
function ScreenCard({ screen, onOpen }) {
  const isMobile = screen.src.includes("/mobile/");
  return (
    <article className={`scrcard ${isMobile ? "scrcard--mobile" : "scrcard--desktop"}`}>
      <button
        className="scrcard-imgbtn"
        onClick={() => onOpen(screen)}
        aria-label={`${screen.caption} vergrößern`}
      >
        <img src={screen.src} alt={screen.alt} loading="lazy" />
      </button>
      <div className="scrcard-copy">
        <strong>{screen.caption}</strong>
        <span>{screen.desc}</span>
      </div>
    </article>
  );
}

function GalleryGroup({ group, onOpen }) {
  return (
    <section className="galgroup" id={group.id}>
      <div className="galgroup-head">
        <p className="eyebrow">{group.eyebrow}</p>
        <h3>{group.title}</h3>
      </div>
      <div className="galgroup-grid">
        {group.screens.map((s, i) => (
          <ScreenCard key={i} screen={s} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Append the SimpleModal component**

```jsx
// ─── SimpleModal ─────────────────────────────────────────────────────────────
function SimpleModal({ screen, onClose }) {
  if (!screen) return null;
  const isMobile = screen.src.includes("/mobile/");
  return (
    <div className="smodal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={screen.caption}>
      <div className={`smodal-content ${isMobile ? "smodal-content--mobile" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="smodal-close" onClick={onClose} aria-label="Schließen">×</button>
        <img src={screen.src} alt={screen.alt} />
        <div className="smodal-text">
          <strong>{screen.caption}</strong>
          <span>{screen.desc}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 5: Write Main App Component — Tab 1 (Ist-Zustand & Webapp heute)

**Files:**
- Modify: `apps/landing/src/App.jsx` (continue appending)

- [ ] **Step 1: Write the WebappTab component (full first tab)**

```jsx
// ─── WebappTab ────────────────────────────────────────────────────────────────
function WebappTab({ onOpenModal }) {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="hero2">
        <div className="hero2-copy">
          <p className="eyebrow">Pilot · Motorworld Inn Böblingen · Standortleitung · Küche · IT</p>
          <h1 className="hero2-h1">
            Vom Zettel zur<span> steuerbaren Tageslogik.</span>
          </h1>
          <p className="hero2-lead">
            Bevero visualisiert Warenfluss, Auffülllisten, Wareneingang, Freigaben und
            Bestände für Küche, Bar, Lager und Standortleitung — als Pilotworkflow für
            Motorworld Inn Böblingen und als skalierbares Modell für weitere
            Rauschenberger-Standorte.
          </p>
          <div className="hero2-ctas">
            <a href="#workflow" className="hero2-cta hero2-cta--primary">Workflow verstehen</a>
            <a href="#screens"  className="hero2-cta hero2-cta--secondary">Webapp heute ansehen</a>
            <a href="#it"       className="hero2-cta hero2-cta--ghost">IT-Architektur prüfen</a>
          </div>
        </div>
        <div className="hero2-visual">
          <div className="hero2-comparison">
            <div className="hero2-before">
              <span className="hero2-badge hero2-badge--before">Heute</span>
              <p>Zuruf · Zettel · Erfahrung · nachträgliche Kontrolle</p>
            </div>
            <div className="hero2-arrow" aria-hidden="true">→</div>
            <div className="hero2-after">
              <span className="hero2-badge hero2-badge--after">Mit Bevero</span>
              <p>Sichtbarer Workflow · Freigaben · Übergabe · Auditpfad</p>
            </div>
          </div>
          <div className="hero2-screens">
            <img
              src="/images/bevero/desktop/01-dashboard.png"
              alt="Dashboard mit kritischen Artikeln, Artikelbestand, Standorten und offenen Alerts"
              className="hero2-dashboard"
            />
            <div className="hero2-phone-wrap" aria-hidden="true">
              <div className="hero2-phone">
                <img
                  src="/images/bevero/mobile/mobile-dashboard-overview.png"
                  alt="Mobile Dashboard Überblick mit kritischen Beständen und Alerts"
                  className="hero2-phone-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ist-Zustand ──────────────────────────────── */}
      <section className="istzustand" id="ist-zustand">
        <div className="section-head">
          <p className="eyebrow">Ausgangslage</p>
          <h2>Was heute operativ verloren geht</h2>
          <p className="section-lead">
            Im Tagesgeschäft entstehen viele Warenbewegungen, Entscheidungen und Korrekturen,
            bevor sie sauber sichtbar werden. Genau hier setzt Bevero an: nicht als Ersatz
            bestehender Systeme, sondern als operative Sicht auf Bestand, Auffüllung,
            Wareneingang, Freigaben und Übergabe.
          </p>
        </div>
        <div className="istz-grid">
          {[
            { title: "Auffüllung per Zuruf",         text: "Mengen entstehen aus Erfahrung, nicht aus sauberem Soll/Ist-Abgleich." },
            { title: "Bestand wird zu spät sichtbar", text: "Engpässe fallen oft erst auf, wenn sie den Betrieb stören." },
            { title: "Lager und Verbrauch laufen auseinander", text: "Entnahmen, Korrekturen und Tagesverbrauch sind nicht immer nachvollziehbar verbunden." },
            { title: "Wareneingang ist nachgelagert", text: "Lieferungen werden häufig erst später sauber dokumentiert oder abgeglichen." },
            { title: "Verantwortung hängt an Einzelpersonen", text: "Wissen liegt bei erfahrenen Mitarbeitenden statt in einem gemeinsamen Workflow." },
          ].map((p) => (
            <article key={p.title} className="istz-card">
              <h4>{p.title}</h4>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
        <div className="istz-flow-wrap">
          <ProcessFlow />
        </div>
      </section>

      {/* ── Workflow Stepper ─────────────────────────── */}
      <section className="workflow-section" id="workflow">
        <div className="section-head">
          <p className="eyebrow">Tagesablauf</p>
          <h2>Ein Tagesablauf mit Bevero</h2>
          <p className="section-lead">
            Überblick, Schichtstart, Auffüllung, Buchung, Wareneingang, Freigaben, Übergabe
            und mobile Nutzung — als visuelle Abfolge statt abstrakte Beschreibung.
          </p>
        </div>
        <WorkflowStepper />
      </section>

      {/* ── Mobile Betrieb ───────────────────────────── */}
      <section className="mobile-section" id="mobile-betrieb">
        <div className="section-head">
          <p className="eyebrow">Mobile Betrieb</p>
          <h2>Im Betrieb nutzbar — nicht nur am Büro-PC</h2>
          <p className="section-lead">
            Die wichtigsten Aktionen müssen dort funktionieren, wo der Warenfluss passiert:
            im Lager, an der Bar, in der Küche und während der Schicht. Die Mobile-Ansichten
            zeigen Dashboard, Schnellaktionen, Auffüllliste und Freigaben als direkte
            Arbeitsoberfläche.
          </p>
        </div>
        <MobileStrip />
        <p className="mobile-section-note">
          Bevero ist nicht nur ein Dashboard für Leitung, sondern eine Arbeitsoberfläche
          für das Tagesgeschäft.
        </p>
      </section>

      {/* ── Webapp Screenshot Gallery ────────────────── */}
      <section className="screens-section" id="screens">
        <div className="section-head">
          <p className="eyebrow">Webapp heute</p>
          <h2>Was bereits sichtbar ist</h2>
          <p className="section-lead">
            Die aktuelle Webapp bildet bereits zentrale operative Bausteine ab: Dashboard,
            Auffülllisten, Bestände, Artikel, Lagerorte, Wareneingang, Bewegungen, Freigaben,
            Schichtübergabe, mobile Ansichten und Rollenlogik.
          </p>
        </div>
        {galleryGroups.map((g) => (
          <GalleryGroup key={g.id} group={g} onOpen={onOpenModal} />
        ))}
      </section>

      {/* ── Küche & Lager ────────────────────────────── */}
      <section className="kueche-section" id="kueche">
        <div className="section-head">
          <p className="eyebrow">Küche & Lager</p>
          <h2>Nicht nur Bar: Küche, Lager und Produktion als eigene operative Räume</h2>
          <p className="section-lead">
            Der Pilot beginnt mit klaren Bar- und Warenfluss-Workflows. Die gleiche Logik kann
            auf Küchenbereiche übertragen werden: Kühlhaus, Produktionsküche, Froster,
            Trockenlager, Transferpunkte und Wareneingang werden als Arbeitsbereiche mit
            eigenen Beständen, Bewegungen, Freigaben und Verantwortlichkeiten sichtbar.
          </p>
        </div>
        <div className="kueche-layout">
          <KücheTree />
          <div className="kueche-img-wrap">
            <img
              src="/images/bevero/desktop/10-storage.png"
              alt="Lagerorte mit Küchenbereichen, Froster, Kühlhaus, Keller und Live-Bestand"
              className="kueche-img"
            />
            <p className="kueche-img-caption">
              Lagerorte und Küchenbereiche werden als operative Räume sichtbar — inklusive
              Live-Bestand, Warnstatus und Bewegungslogik.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="cta2" id="naechster-schritt">
        <div className="cta2-copy">
          <p className="eyebrow">Nächster Schritt</p>
          <h2>Den Pilotworkflow gemeinsam prüfen</h2>
          <p>
            Die Landing Page soll als gemeinsamer Gesprächsanker dienen: Was ist heute
            Realität, welche Workflows sind bereits sichtbar, und welche Bereiche sollen
            als nächstes sauber abgebildet werden?
          </p>
        </div>
        <div className="cta2-btns">
          <a href="mailto:pilot@bevero.de?subject=Pilotworkflow besprechen" className="cta2-btn cta2-btn--primary">Pilotworkflow besprechen</a>
          <a href="#screens"   className="cta2-btn cta2-btn--secondary">Screens ansehen</a>
          <a href="#it"        className="cta2-btn cta2-btn--ghost">IT-Fragen klären</a>
        </div>
      </section>
    </>
  );
}
```

---

## Task 6: Write Vision Tab and IT Tab

**Files:**
- Modify: `apps/landing/src/App.jsx` (continue appending)

- [ ] **Step 1: Write the VisionTab component**

```jsx
// ─── VisionTab ────────────────────────────────────────────────────────────────
function VisionTab() {
  return (
    <div className="vision-tab">
      <section className="vision-hero">
        <p className="eyebrow">Vision · Vom Pilot zum Standortmodell</p>
        <h1 className="vision-h1">
          Vom Pilot zum<span> Standortmodell.</span>
        </h1>
        <p className="vision-lead">
          Bevero soll zunächst einen klaren Pilotworkflow sichtbar machen. Danach kann die
          Logik schrittweise erweitert werden: automatisiertere Wareneingänge, externe
          Datenquellen, standortspezifische Profile und eine Managementsicht über mehrere
          Betriebe.
        </p>
      </section>

      <section className="vision-phases">
        <div className="vision-phase-grid">
          {visionPhases.map((p) => (
            <article key={p.phase} className="vision-phase-card">
              <span className="vision-phase-badge">{p.phase}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vision-screens">
        <p className="eyebrow">Bereits sichtbar</p>
        <h2>Was Phase 1 heute schon zeigt</h2>
        <div className="vision-img-row">
          <div className="vision-img-card">
            <img
              src="/images/bevero/desktop/13-workspaces.png"
              alt="Arbeitsbereiche mit Standortmodell und operativen Räumen"
            />
            <p>Standortmodell und operative Räume</p>
          </div>
          <div className="vision-img-card">
            <img
              src="/images/bevero/desktop/01-dashboard.png"
              alt="Dashboard mit kritischen Artikeln, Artikelbestand, Standorten und offenen Alerts"
            />
            <p>Managementsicht auf Bestände und Alerts</p>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the ITTab component**

```jsx
// ─── ITTab ───────────────────────────────────────────────────────────────────
function ITTab() {
  return (
    <div className="it-tab" id="it">
      <section className="it-hero">
        <p className="eyebrow">IT-Sicherheit & Integration</p>
        <h1 className="it-h1">
          Kontrollierbar<span> für interne IT.</span>
        </h1>
        <p className="it-lead">
          Bevero ist als ergänzender operativer Layer gedacht. Bestehende Systeme bleiben
          führend, während Bevero die tägliche Arbeit sichtbar, rollenbasiert, auditierbar
          und nachvollziehbar macht.
        </p>
      </section>

      <section className="it-cards-section">
        <div className="it-cards-grid">
          {itCards.map((c) => (
            <article key={c.title} className="it-card">
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="it-screens">
        <p className="eyebrow">Sichtbar in der Webapp</p>
        <h2>Rollen, Freigaben und Bewegungen — alles auditierbar</h2>
        <div className="it-img-row">
          <div className="it-img-card">
            <img
              src="/images/bevero/desktop/21-settings-team.png"
              alt="Teamverwaltung mit Rollen, Einladungen und Status"
            />
            <p>Teamverwaltung mit Rollen, Einladungen und Status</p>
          </div>
          <div className="it-img-card">
            <img
              src="/images/bevero/mobile/mobile-approvals.png"
              alt="Mobile Freigaben mit kritischen Bestandsabweichungen und Prüfgrund"
              className="it-img-card--mobile"
            />
            <p>Mobile Freigaben mit Prüfgrund und Status</p>
          </div>
          <div className="it-img-card">
            <img
              src="/images/bevero/desktop/09-movements.png"
              alt="Bewegungshistorie mit Entnahmen, Korrekturen und Verbrauch"
            />
            <p>Auditierbare Bewegungshistorie</p>
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

## Task 7: Write the Main App Function

**Files:**
- Modify: `apps/landing/src/App.jsx` (continue appending)

- [ ] **Step 1: Write the App() function**

```jsx
// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("webapp");
  const [modalScreen, setModalScreen] = useState(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page">
      <nav className="topbar" aria-label="Bevero Navigation">
        <div className="brand">
          <span className="brandMark" aria-hidden="true" />
          <strong>bevero</strong>
        </div>

        <div className="tabSwitcher" role="tablist" aria-label="Seitenbereiche">
          <button
            role="tab"
            aria-selected={activeTab === "webapp"}
            className={`tabBtn ${activeTab === "webapp" ? "tabBtn--active" : ""}`}
            onClick={() => switchTab("webapp")}
          >
            Ist-Zustand &amp; Webapp heute
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "vision"}
            className={`tabBtn ${activeTab === "vision" ? "tabBtn--active" : ""}`}
            onClick={() => switchTab("vision")}
          >
            Vision: Pilot zum Standortmodell
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "it"}
            className={`tabBtn ${activeTab === "it" ? "tabBtn--active" : ""}`}
            onClick={() => switchTab("it")}
          >
            IT-Sicherheit &amp; Integration
          </button>
        </div>

        <button
          className="navCta"
          onClick={() => {
            if (activeTab === "webapp") {
              document.getElementById("screens")?.scrollIntoView({ behavior: "smooth" });
            } else {
              switchTab("webapp");
            }
          }}
        >
          Webapp ansehen
        </button>
      </nav>

      {activeTab === "webapp" && <WebappTab onOpenModal={setModalScreen} />}
      {activeTab === "vision" && <VisionTab />}
      {activeTab === "it"     && <ITTab />}

      <SimpleModal screen={modalScreen} onClose={() => setModalScreen(null)} />
    </main>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd apps/landing && npm run build 2>&1 | tail -20
```

Expected: build completes without errors. If there are JSX syntax errors, fix them before moving on.

- [ ] **Step 3: Commit App.jsx**

```bash
git add apps/landing/src/App.jsx
git commit -m "feat(landing): rewrite App.jsx with workflow narrative sections"
```

---

## Task 8: Add New CSS to styles.css

**Files:**
- Modify: `apps/landing/src/styles.css` (append at end)

- [ ] **Step 1: Append Hero2 styles**

Append to `apps/landing/src/styles.css`:

```css
/* ─── Hero 2 ────────────────────────────────────────────────────────────── */
.hero2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
  padding: 64px 0 56px;
  min-height: 70vh;
}

.hero2-h1 {
  font-size: clamp(36px, 5vw, 62px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  margin: 0 0 24px;
  color: var(--ink);
}
.hero2-h1 span { color: var(--green); }

.hero2-lead {
  font-size: 18px;
  line-height: 1.65;
  color: var(--muted);
  margin: 0 0 32px;
  max-width: 560px;
}

.hero2-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero2-cta {
  display: inline-block;
  padding: 12px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
}
.hero2-cta:hover { opacity: 0.85; transform: translateY(-1px); }
.hero2-cta--primary   { background: var(--green); color: white; }
.hero2-cta--secondary { background: rgba(20,107,63,0.1); color: var(--green); border: 1px solid var(--green); }
.hero2-cta--ghost     { background: transparent; color: var(--muted); border: 1px solid var(--border); }

.hero2-visual { display: flex; flex-direction: column; gap: 20px; }

.hero2-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  background: rgba(255,255,255,0.55);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}
.hero2-before, .hero2-after { padding: 12px; border-radius: 10px; }
.hero2-before { background: rgba(207,130,40,0.08); }
.hero2-after  { background: rgba(20,107,63,0.08); }
.hero2-badge  { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; }
.hero2-badge--before { background: rgba(207,130,40,0.15); color: var(--orange); }
.hero2-badge--after  { background: rgba(20,107,63,0.15); color: var(--green); }
.hero2-comparison p  { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.5; }
.hero2-arrow { font-size: 24px; color: var(--muted); opacity: 0.4; }

.hero2-screens {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.hero2-dashboard {
  flex: 1;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.hero2-phone-wrap { flex-shrink: 0; }

.hero2-phone {
  width: 100px;
  border-radius: 18px;
  border: 3px solid rgba(29,37,33,0.2);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(29,37,33,0.2);
  background: #111;
}
.hero2-phone-img { width: 100%; height: auto; display: block; }
```

- [ ] **Step 2: Append Ist-Zustand / ProcessFlow styles**

```css
/* ─── Ist-Zustand ───────────────────────────────────────────────────────── */
.istzustand {
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.section-head { margin-bottom: 40px; max-width: 740px; }
.section-lead { font-size: 17px; color: var(--muted); line-height: 1.7; margin: 12px 0 0; }

.istz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 48px;
}

.istz-card {
  background: rgba(255,255,255,0.6);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
}
.istz-card h4 { margin: 0 0 8px; font-size: 15px; font-weight: 800; color: var(--ink); }
.istz-card p  { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.55; }

.istz-flow-wrap { margin-top: 32px; }

/* ProcessFlow */
.pflow-wrap {
  display: flex;
  align-items: center;
  gap: 32px;
  background: rgba(255,255,255,0.5);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 36px;
  max-width: 620px;
}

.pflow-col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
.pflow-label { font-size: 11px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }

.pflow-node {
  width: 100%;
  text-align: center;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
.pflow-node--before { background: rgba(207,130,40,0.1); color: var(--orange); border: 1px solid rgba(207,130,40,0.25); }
.pflow-node--after  { background: rgba(20,107,63,0.1);  color: var(--green);  border: 1px solid rgba(20,107,63,0.25); }

.pflow-arrow { font-size: 16px; color: var(--muted); opacity: 0.5; }
.pflow-divider { font-size: 28px; color: var(--muted); opacity: 0.35; flex-shrink: 0; }
```

- [ ] **Step 3: Append WorkflowStepper styles**

```css
/* ─── Workflow Stepper ──────────────────────────────────────────────────── */
.workflow-section {
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.wfstepper {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255,255,255,0.45);
  box-shadow: 0 8px 40px rgba(29,37,33,0.07);
}

.wfstepper-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.6);
}
.wfstepper-tabs::-webkit-scrollbar { display: none; }

.wfstepper-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  border-bottom: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.wfstepper-tab:hover { background: rgba(20,107,63,0.05); }
.wfstepper-tab--active {
  border-bottom-color: var(--green);
  background: rgba(20,107,63,0.06);
}

.wfstep-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--border);
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.wfstepper-tab--active .wfstep-num { background: var(--green); color: white; }

.wfstep-title { font-size: 12px; font-weight: 700; color: var(--ink); white-space: nowrap; }

.wfstepper-panel {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  min-height: 420px;
}

.wfstepper-img-wrap {
  max-height: 500px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.wfstepper-img {
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(29,37,33,0.1);
  object-fit: contain;
}
.wfstepper-img--desktop { max-width: 100%; max-height: 400px; }
.wfstepper-img--mobile  { max-height: 440px; max-width: 260px; border-radius: 20px; }

.wfstepper-caption {
  font-size: 15px;
  color: var(--muted);
  text-align: center;
  max-width: 560px;
  margin: 0;
  line-height: 1.6;
}
.wfstepper-caption strong { color: var(--ink); }

.wfstepper-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: rgba(255,255,255,0.5);
}

.wfstepper-navbtn {
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.7);
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  transition: opacity 0.15s;
}
.wfstepper-navbtn:disabled { opacity: 0.35; cursor: default; }
.wfstepper-navbtn:not(:disabled):hover { background: rgba(20,107,63,0.08); }

.wfstepper-progress { font-size: 13px; font-weight: 700; color: var(--muted); }
```

- [ ] **Step 4: Append MobileStrip styles**

```css
/* ─── Mobile Strip ──────────────────────────────────────────────────────── */
.mobile-section {
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.mstrip-wrap { width: 100%; }

.mstrip-scroll {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 12px;
  scrollbar-width: thin;
}

.mstrip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.mstrip-phone {
  position: relative;
  border: 3px solid rgba(29,37,33,0.2);
  border-radius: 28px;
  overflow: hidden;
  background: #111;
  box-shadow: 0 12px 40px rgba(29,37,33,0.18);
  max-width: 220px;
  width: 100%;
}

.mstrip-notch {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  z-index: 2;
}

.mstrip-img {
  width: 100%;
  height: auto;
  max-height: 620px;
  object-fit: contain;
  display: block;
}

.mstrip-caption {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  line-height: 1.55;
  max-width: 200px;
  margin: 0;
}

.mobile-section-note {
  margin: 32px auto 0;
  max-width: 600px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--green);
  letter-spacing: -0.02em;
}
```

- [ ] **Step 5: Append Gallery Groups, Küche, CTA2, Vision, IT, Modal styles**

```css
/* ─── Gallery Groups ────────────────────────────────────────────────────── */
.screens-section { padding: 80px 0; border-top: 1px solid var(--border); }

.galgroup { margin-bottom: 60px; }
.galgroup:last-child { margin-bottom: 0; }

.galgroup-head {
  margin-bottom: 24px;
}
.galgroup-head h3 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 4px 0 0; }

.galgroup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.scrcard {
  background: rgba(255,255,255,0.6);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.scrcard:hover { box-shadow: 0 8px 32px rgba(29,37,33,0.1); }

.scrcard-imgbtn {
  border: none;
  background: none;
  padding: 0;
  width: 100%;
  cursor: zoom-in;
  display: block;
}
.scrcard-imgbtn img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  object-position: top;
  display: block;
}
.scrcard--mobile .scrcard-imgbtn img {
  height: 220px;
  object-fit: contain;
  background: #0a0a0a;
}

.scrcard-copy { padding: 14px 16px; }
.scrcard-copy strong { display: block; font-size: 14px; font-weight: 800; margin-bottom: 4px; color: var(--ink); }
.scrcard-copy span  { font-size: 13px; color: var(--muted); line-height: 1.4; }

/* ─── Küche Section ─────────────────────────────────────────────────────── */
.kueche-section { padding: 80px 0; border-top: 1px solid var(--border); }

.kueche-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
  margin-top: 40px;
}

.ktree-wrap {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ktree-area { }
.ktree-root {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 10px;
  border-left: 4px solid;
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 10px;
  background: rgba(255,255,255,0.6);
}

.ktree-children {
  list-style: none;
  margin: 0;
  padding: 0 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 2px solid var(--border);
}

.ktree-child {
  font-size: 14px;
  color: var(--muted);
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.45);
  position: relative;
}
.ktree-child::before {
  content: "";
  position: absolute;
  left: -14px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: var(--border);
}

.kueche-img-wrap { }
.kueche-img {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(29,37,33,0.08);
}
.kueche-img-caption {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

/* ─── CTA2 ──────────────────────────────────────────────────────────────── */
.cta2 {
  padding: 72px 0;
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 48px;
  align-items: center;
}

.cta2-copy h2 { font-size: 32px; font-weight: 900; letter-spacing: -0.04em; margin: 0 0 12px; }
.cta2-copy p  { font-size: 16px; color: var(--muted); max-width: 560px; line-height: 1.65; margin: 0; }

.cta2-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.cta2-btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  text-align: center;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.cta2-btn:hover { opacity: 0.82; }
.cta2-btn--primary   { background: var(--green); color: white; }
.cta2-btn--secondary { background: rgba(20,107,63,0.1); color: var(--green); border: 1px solid var(--green); }
.cta2-btn--ghost     { background: transparent; color: var(--muted); border: 1px solid var(--border); }

/* ─── Vision Tab ────────────────────────────────────────────────────────── */
.vision-tab { }
.vision-hero { padding: 64px 0 48px; }
.vision-h1 {
  font-size: clamp(32px, 4.5vw, 56px);
  font-weight: 900;
  letter-spacing: -0.04em;
  margin: 0 0 20px;
}
.vision-h1 span { color: var(--green); }
.vision-lead { font-size: 18px; color: var(--muted); max-width: 620px; line-height: 1.7; margin: 0; }

.vision-phases { padding: 48px 0; border-top: 1px solid var(--border); }
.vision-phase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.vision-phase-card {
  background: rgba(255,255,255,0.6);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
}
.vision-phase-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--green-soft);
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  margin-bottom: 14px;
}
.vision-phase-card h3 { margin: 0 0 10px; font-size: 18px; font-weight: 800; letter-spacing: -0.03em; }
.vision-phase-card p  { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.6; }

.vision-screens { padding: 48px 0; border-top: 1px solid var(--border); }
.vision-img-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 28px;
}
.vision-img-card { }
.vision-img-card img {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 16px rgba(29,37,33,0.08);
}
.vision-img-card p { font-size: 13px; color: var(--muted); margin: 10px 0 0; }

/* ─── IT Tab ────────────────────────────────────────────────────────────── */
.it-tab { }
.it-hero { padding: 64px 0 48px; }
.it-h1 {
  font-size: clamp(32px, 4.5vw, 56px);
  font-weight: 900;
  letter-spacing: -0.04em;
  margin: 0 0 20px;
}
.it-h1 span { color: var(--green); }
.it-lead { font-size: 18px; color: var(--muted); max-width: 620px; line-height: 1.7; margin: 0; }

.it-cards-section { padding: 48px 0; border-top: 1px solid var(--border); }
.it-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.it-card {
  background: rgba(255,255,255,0.6);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  border-left: 4px solid var(--green);
}
.it-card h3 { margin: 0 0 10px; font-size: 15px; font-weight: 800; color: var(--ink); }
.it-card p  { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.6; }

.it-screens { padding: 48px 0; border-top: 1px solid var(--border); }
.it-img-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 28px;
}
.it-img-card { }
.it-img-card img {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 16px rgba(29,37,33,0.08);
}
.it-img-card--mobile img {
  max-height: 300px;
  object-fit: contain;
  background: #0a0a0a;
}
.it-img-card p { font-size: 13px; color: var(--muted); margin: 10px 0 0; }

/* ─── SimpleModal ───────────────────────────────────────────────────────── */
.smodal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10,10,8,0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.smodal-content {
  position: relative;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  max-width: min(90vw, 1200px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.smodal-content img { max-height: 70vh; width: 100%; object-fit: contain; background: #0a0a0a; }
.smodal-content--mobile { max-width: 360px; }
.smodal-content--mobile img { object-fit: contain; background: #111; }

.smodal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.4);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.smodal-text {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.smodal-text strong { font-size: 15px; color: var(--ink); }
.smodal-text span   { font-size: 13px; color: var(--muted); }
```

- [ ] **Step 6: Append responsive breakpoints for new components**

```css
/* ─── Responsive: New Components ────────────────────────────────────────── */
@media (max-width: 1100px) {
  .hero2 { grid-template-columns: 1fr; gap: 32px; padding: 48px 0 40px; }
  .hero2-screens { flex-direction: column; }
  .hero2-phone-wrap { display: none; }
  .kueche-layout { grid-template-columns: 1fr; }
  .cta2 { grid-template-columns: 1fr; }
  .it-img-row { grid-template-columns: 1fr 1fr; }
  .vision-img-row { grid-template-columns: 1fr; }
}

@media (max-width: 860px) {
  .hero2 { padding: 32px 0 28px; }
  .hero2-h1 { font-size: 36px; }
  .mstrip-scroll { grid-template-columns: repeat(2, 1fr); }
  .galgroup-grid { grid-template-columns: 1fr 1fr; }
  .pflow-wrap { flex-direction: column; align-items: stretch; }
  .pflow-divider { display: none; }
  .it-img-row { grid-template-columns: 1fr; }
  .vision-img-row { grid-template-columns: 1fr; }
  .cta2 { padding: 48px 0; }
}

@media (max-width: 600px) {
  .mstrip-scroll { grid-template-columns: repeat(2, minmax(140px, 1fr)); overflow-x: auto; }
  .galgroup-grid { grid-template-columns: 1fr; }
  .hero2-ctas { flex-direction: column; align-items: flex-start; }
  .cta2-btns { flex-direction: row; flex-wrap: wrap; }
  .wfstepper-panel { padding: 20px 16px; }
}
```

- [ ] **Step 7: Build and check for CSS issues**

```bash
cd apps/landing && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/landing/src/styles.css
git commit -m "feat(landing): add CSS for workflow narrative components"
```

---

## Task 9: Build Verification and Final Commit

**Files:**
- No new files — verification only

- [ ] **Step 1: Run dev server and spot-check**

```bash
cd apps/landing && npm run dev &
# Wait for dev server to start, then open browser at http://localhost:5173
```

- [ ] **Step 2: Verify these things are true in the browser**

Checklist:
- [ ] First screen shows new headline "Vom Zettel zur steuerbaren Tageslogik."
- [ ] No red broken-image icons (all 11 desktop + 4 mobile images load)
- [ ] Ist-Zustand section with 5 painpoint cards visible below hero
- [ ] ProcessFlow before/after diagram renders
- [ ] Workflow Stepper shows 9 steps, clicking tabs switches image
- [ ] Mobile Strip shows 4 phone mockups
- [ ] Screenshot gallery shows 5 groups with their screen cards
- [ ] Küche section shows the tree structure
- [ ] Tab "Ist-Zustand & Webapp heute" is the label for tab 1
- [ ] Tab "Vision: Pilot zum Standortmodell" opens Vision tab
- [ ] Tab "IT-Sicherheit & Integration" opens IT tab with 5 trust cards
- [ ] `<title>` tag is "Bevero — Visueller Workflow für Warenfluss, Küche & Standortleitung"
- [ ] Modal opens when clicking any screenshot card and shows image + caption

- [ ] **Step 3: Stop dev server**

```bash
kill %1
```

- [ ] **Step 4: Final production build**

```bash
cd apps/landing && npm run build
```

Expected: builds to `dist/` without errors.

- [ ] **Step 5: Final commit**

```bash
git add apps/landing/
git commit -m "feat(landing): turn bevero page into visual workflow narrative"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Task Covering It | Status |
|---|---|---|
| 1. Hero rebuild with comparison + phone mockup | Task 5 `WebappTab` hero | ✓ |
| 2. Ist-Zustand section with 5 painpoints + ProcessFlow | Task 5 `WebappTab` + Task 4 `ProcessFlow` | ✓ |
| 3. Workflow Stepper (9 steps) | Task 4 `WorkflowStepper` | ✓ |
| 4. Mobile Betrieb strip (4 phones) | Task 4 `MobileStrip` | ✓ |
| 5. Screenshot gallery in 5 groups | Task 5 `GalleryGroup` + Task 3 data | ✓ |
| 6. Küche section with tree | Task 4 `KücheTree` + Task 5 | ✓ |
| 7. Vision Phase 1/2/3 cards | Task 6 `VisionTab` | ✓ |
| 8. IT-Sicherheit tab with 5 cards + 3 screenshots | Task 6 `ITTab` | ✓ |
| 9. CTA footer with 3 buttons | Task 5 `cta2` section | ✓ |
| 10. Image assets organized in `/images/bevero/` | Task 1 | ✓ |
| 11. Metadata: title, description, OG tags | Task 2 | ✓ |
| 12. Tab labels renamed | Task 7 `App()` topbar | ✓ |
| 13. Alt texts on all images | Tasks 3, 4, 5, 6 — all `alt=` filled | ✓ |
| 14. Keyboard accessible stepper | Task 4 — role=tablist/tab/tabpanel | ✓ |
| 15. Mobile responsive | Task 8 responsive CSS | ✓ |
| 16. No backend/auth/API changes | Architecture — only `App.jsx`, `styles.css`, `index.html`, images | ✓ |

### Placeholder Scan
No TBD/TODO/placeholders in any code block. All alt texts, captions, and data are filled in.

### Type / Name Consistency
- `workflowSteps` referenced in `WorkflowStepper` ✓
- `mobileStrip` referenced in `MobileStrip` ✓
- `galleryGroups` referenced in `WebappTab` ✓
- `visionPhases` referenced in `VisionTab` ✓
- `itCards` referenced in `ITTab` ✓
- `D` and `M` path prefixes used consistently throughout data ✓
- CSS class names used in JSX match appended CSS ✓
