import React, { useEffect, useRef, useState } from "react";

import { screensFor } from "./screenshotRegistry.js";
import "./styles.css";

const CONTACT_EMAIL = "twim.baum@proton.me";
const KAM_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Bevero Ops - kurze Einschätzung zum operativen Hub",
)}&body=${encodeURIComponent(`Hallo,

ich habe mir die Bevero-Landing angesehen.

Meine kurze Einschätzung:

1. Ist der Hub-Gedanke zwischen Planungs-/POS-System (z. B. FoodNotify, Gastronovi) und Standortrealität grundsätzlich relevant?
2. Wo wäre aus Key-Account- oder Standort-Sicht der stärkste wirtschaftliche Hebel?
3. Welche Daten oder Adapter wären für einen kleinen Pilotrahmen am wichtigsten?
4. Wer wäre intern die richtige Person, um diesen Ansatz einzuordnen?

Viele Grüße`)}`;

const KAM_SCREENS = screensFor("kam");
const WORKFLOW_SCREEN = screensFor("workflow")[0];
const VISION_SCREEN = screensFor("vision")[0];
const IT_SCREEN = screensFor("it")[0];
const KITCHEN_SCREEN = screensFor("kitchen")[0];

const summaryCards = [
  {
    title: "Kein Systemersatz",
    text: "Planungssystem und POS-System bleiben führend. Bevero ergänzt die operative Standortschicht.",
  },
  {
    title: "Operativer Hub",
    text: "Bevero verbindet Systemdaten mit Standortaktionen: Warenfluss, Freigaben, Übergaben und offene Punkte.",
  },
  {
    title: "Prüfbarer ROI",
    text: "Nutzen entsteht durch weniger Suchzeit, Nacharbeit, Fehlbestände, Eskalationen und Übergabeverlust.",
  },
  {
    title: "Kleiner Pilot",
    text: "Ein Standort, ein Prozess, klare Messpunkte — ohne großen Rollout und ohne überzogene Versprechen.",
  },
  {
    title: "Gesucht",
    text: "Eine ehrliche Einschätzung, ob dieser operative Hebel für Ihren Standortverbund relevant ist.",
  },
];

const roiPoints = [
  {
    title: "Zeit zurückholen",
    text: "Weniger Suchen, Nachfragen, Kontrollieren und Rekonstruieren. Teams sehen schneller, was fehlt, was offen ist und was erledigt wurde.",
  },
  {
    title: "Fehlbestände früher sehen",
    text: "Kritische Artikel, offene Auffüllungen und Soll/Ist-Abweichungen werden sichtbar, bevor sie Schicht, Event oder Kunde stören.",
  },
  {
    title: "Nacharbeit reduzieren",
    text: "Bewegungen, Korrekturen, Freigaben und Übergaben bleiben nachvollziehbar. Weniger Rätselraten nach der Schicht.",
  },
  {
    title: "Qualitätsrisiken senken",
    text: "Kundenversprechen hängen an operativer Ausführung. Bevero zeigt früher, ob Standort, Lager, Team und Übergabe auf Kurs sind.",
  },
  {
    title: "Standorte wiederholbarer machen",
    text: "Gute Abläufe bleiben nicht nur Erfahrungswissen einzelner Personen, sondern werden als Workflow sichtbar und vergleichbar.",
  },
  {
    title: "Systemdaten operativ nutzbar machen",
    text: "Planungssystem und POS-System liefern wertvolle Systemlogik. Bevero übersetzt diese Anbindung in operative Standortfragen.",
  },
];

const gapRows = [
  {
    gap: "Systemdaten liegen getrennt",
    hub: "Adapterlogik + Standortdatenbank",
    result: "Standortaktion wird sichtbar",
  },
  {
    gap: "Warenfluss ist fragmentiert",
    hub: "Lieferung -> Lager -> Entnahme -> Auffüllung",
    result: "Kette wird nachvollziehbar",
  },
  {
    gap: "Übergaben hängen an Personen",
    hub: "Schichtlogik + offene Punkte",
    result: "Wissen geht nicht verloren",
  },
  {
    gap: "Abweichungen sind Bauchentscheidung",
    hub: "Freigabe + Auditpfad",
    result: "Entscheidung wird prüfbar",
  },
];

const measurementPoints = [
  { metric: "Zeit pro Auffüllrunde", question: "Wie lange dauert es, bis klar ist, was fehlt?" },
  { metric: "Offene Punkte pro Übergabe", question: "Was bleibt ungeklärt liegen?" },
  { metric: "Korrekturen pro Woche", question: "Wie oft muss nachträglich bereinigt werden?" },
  { metric: "Kritische Fehlbestände", question: "Welche Artikel fallen zu spät auf?" },
  { metric: "Wareneingang bis Sichtbarkeit", question: "Wie schnell ist eine Lieferung operativ nutzbar?" },
  { metric: "Eskalationen vor Events", question: "Welche Probleme erreichen Leitung oder Kunde zu spät?" },
];

const trustColumns = [
  {
    tone: "now",
    label: "Heute sichtbar",
    items: [
      "Dashboard mit standortgekoppelter Datenbank",
      "integrierte Adapterlogik für externe Planungs- und POS-Systeme (z. B. FoodNotify, Gastronovi)",
      "operative Verbindung von Bestand, Bewegungen, Freigaben und Übergaben",
      "Rollen und nachvollziehbare Verantwortlichkeiten",
    ],
  },
  {
    tone: "not",
    label: "Noch nicht behauptet",
    items: [
      "kein offizielles Projekt eines bestimmten Kunden",
      "kein offizieller Konzern-Rollout",
      "kein ungeprüfter produktiver Writeback",
      "keine automatische Bestellung ohne Freigabe",
      "keine Ersetzung von Planungs- oder POS-System",
      "keine garantierte ROI-Zahl ohne Pilotmessung",
    ],
  },
  {
    tone: "want",
    label: "Gesucht",
    items: [
      "Einschätzung, ob der vorhandene Hub-Ansatz die richtigen operativen Lücken adressiert",
      "Einschätzung, welche Adapter- und Systemdaten aus KAM-Sicht den größten Nutzen hätten",
      "kleiner Pilotrahmen mit messbaren operativen Kennzahlen",
      "passender interner Ansprechpartner",
    ],
  },
];

const visionPhases = [
  {
    phase: "Phase 1",
    title: "Sichtbarer Tagesworkflow",
    text: "Bestand, Auffüllung, Bewegungen, Freigaben und Übergaben werden an einem Standort prüfbar.",
  },
  {
    phase: "Phase 2",
    title: "Systeme verbinden, ohne sie zu ersetzen",
    text: "Planungssystem und POS-System bleiben führend. Die integrierte Adapterlogik macht ihre Daten für operative Standortaktionen technisch anschlussfähig.",
  },
  {
    phase: "Phase 3",
    title: "Standortvergleich und Managementsicht",
    text: "Wiederholbare Abläufe, Risiken und offene Punkte werden über Standorte hinweg vergleichbar.",
  },
];

const itCards = [
  {
    title: "Bestehende Systeme bleiben führend",
    text: "Planungssystem und POS-System werden nicht ersetzt. Bevero nutzt die Adapterlogik, um operative Standortaktionen sichtbar zu machen.",
  },
  {
    title: "Standortdaten statt Bauchgefühl",
    text: "Das Dashboard ist mit einer standortgekoppelten Datenbank verbunden. Bestände, Bewegungen und offene Punkte werden nicht nur beschrieben, sondern als Standortlogik abbildbar.",
  },
  {
    title: "Kein unkontrollierter Writeback",
    text: "Adapter bedeuten nicht automatisch Schreibzugriff. Produktive Rückschreibungen, Bestellungen oder externe Aktionen bleiben freigabe- und prüfpflichtig.",
  },
  {
    title: "Rollen und Rechte",
    text: "Staff, Shift Lead, Admin und Leitung erhalten unterschiedliche Sicht- und Aktionsrechte.",
  },
  {
    title: "Auditierbare Bewegungen",
    text: "Entnahmen, Korrekturen, Wareneingänge und Freigaben bleiben nachvollziehbar.",
  },
  {
    title: "Pilotierbar statt Big Bang",
    text: "Ein kleiner Standort-Scope kann Nutzen und Grenzen prüfen, bevor über Erweiterung gesprochen wird.",
  },
];

const screenNarratives = {
  Dashboard: {
    operative: "Was ist kritisch?",
    lever: "Weniger Blindflug, frühere Eskalation.",
    kam: "Standortqualität wird sichtbar, bevor Kunden betroffen sind.",
  },
  "Auffüllliste Bar": {
    operative: "Was fehlt?",
    lever: "Weniger Suchzeit und Zuruf.",
    kam: "Operative Vorbereitung wird verlässlicher.",
  },
  Wareneingang: {
    operative: "Was kam rein?",
    lever: "Lieferung wird schneller operativ nutzbar.",
    kam: "Verfügbarkeit wird früher einschätzbar.",
  },
  Bewegungen: {
    operative: "Was wurde verändert?",
    lever: "Weniger Nacharbeit und Rekonstruktion.",
    kam: "Abweichungen bleiben nachvollziehbar.",
  },
  Schichtübergabe: {
    operative: "Was bleibt offen?",
    lever: "Weniger Übergabeverlust.",
    kam: "Qualität hängt weniger an Einzelpersonen.",
  },
  "Mobile Freigabe": {
    operative: "Was braucht Entscheidung?",
    lever: "Abweichungen werden prüfbar statt Bauchentscheidung.",
    kam: "Kritische Punkte können kontrolliert eskaliert werden.",
  },
};

function getScreenNarrative(screen) {
  return (
    screenNarratives[screen.caption] ?? {
      operative: screen.desc,
      lever: "Operative Reibung wird sichtbarer.",
      kam: "Die Ansicht macht den Hebel für den Standort greifbar.",
    }
  );
}

function SectionHead({ eyebrow, title, lead }) {
  return (
    <div className="section-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="section-title">{title}</h2>
      {lead ? <p className="section-lead">{lead}</p> : null}
    </div>
  );
}

function HubDiagram() {
  return (
    <div className="hero-hub-visual">
      <div
        className="hub-diagram"
        role="img"
        aria-label="Planungssystem, POS-System und die Standortdatenbank fließen in den Bevero Hub und werden zu Warenfluss, Freigabe, Übergabe und Standortqualität."
      >
        <div className="hub-sources">
          <span className="hub-node hub-node--source">Planungssystem</span>
          <span className="hub-node hub-node--source">POS-System</span>
          <span className="hub-node hub-node--source">Standortdatenbank</span>
        </div>
        <svg className="hub-line" viewBox="0 0 600 130" preserveAspectRatio="none" aria-hidden="true">
          <path d="M86 0 L300 112" />
          <path d="M300 0 L300 112" />
          <path d="M514 0 L300 112" />
        </svg>
        <div className="hub-node hub-node--center">
          <span>Bevero</span>
          <strong>Operativer Hub</strong>
        </div>
        <span className="hub-flow" aria-hidden="true">↓</span>
        <div className="hub-results">
          {["Warenfluss", "Freigabe", "Übergabe", "Standortqualität"].map((result) => (
            <span key={result} className="hub-node hub-node--result">
              {result}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenshotModal({ screen, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!screen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [screen, onClose]);

  if (!screen) return null;

  const narrative = getScreenNarrative(screen);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-content ${screen.src.includes("/mobile/") ? "modal-content--mobile" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={screen.caption}
      >
        <button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <img src={screen.src} alt={screen.alt} className="modal-image" />
        <div className="modal-copy">
          <p className="eyebrow">Screenshot</p>
          <h3>{screen.caption}</h3>
          <p className="modal-lead">{screen.desc}</p>
          <p>
            <strong>Frage:</strong> {narrative.operative}
          </p>
          <p>
            <strong>Hebel:</strong> {narrative.lever}
          </p>
          <p>
            <strong>KAM-Relevanz:</strong> {narrative.kam}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [modalScreen, setModalScreen] = useState(null);

  return (
    <main className="page">
      <nav className="topbar" aria-label="Bevero Navigation">
        <a className="brand" href="#top">
          <span className="brandMark" aria-hidden="true" />
          <strong>bevero</strong>
        </a>

        <div className="anchorNav" aria-label="Seitennavigation">
          <a href="#nutzen">Nutzen</a>
          <a href="#hub">Hub</a>
          <a href="#screens">Screens</a>
          <a href="#pilot">Pilot</a>
          <a href="#vertrauen">Vertrauen</a>
          <a href="#vision">Vision</a>
          <a href="#it">IT</a>
        </div>

        <a className="navCta" href="#einschaetzung">
          Einschätzung geben
        </a>
      </nav>

      <section id="top" className="hero-section section-anchor">
        <div className="hero-copy">
          <p className="eyebrow">Pilot von innen - operativer Standort-Hub - KAM-Relevanz</p>
          <h1 className="hero-h1">Der Hub zwischen Systemen und Standortrealität.</h1>
          <p className="hero-lead">
            Bevero verbindet Standortdatenbank, Planungs-/POS-Anbindung und operative
            Tagesaktionen — nicht als Ersatz bestehender Systeme, sondern als Hub für Warenfluss,
            Freigaben, Übergaben und Standortqualität.
          </p>
          <p className="hero-subtext">
            Der Nutzen entsteht dort, wo operative Reibung sichtbar wird: weniger Suchzeit,
            weniger Nacharbeit, früher sichtbare Fehlbestände und klarere Übergaben.
          </p>
          <div className="hero-ctas">
            <a href="#nutzen" className="btn btn-primary">
              ROI-Hebel verstehen
            </a>
            <a href="#screens" className="btn btn-secondary">
              Screens ansehen
            </a>
            <a href="#einschaetzung" className="btn btn-tertiary">
              Einschätzung geben
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <HubDiagram />
        </div>
      </section>

      <section id="kurzfassung" className="section-anchor container">
        <SectionHead
          eyebrow="Executive Summary"
          title="In 3 Minuten verstehen"
          lead="Bevero ist kein Ersatz für bestehende Systeme, sondern ein operativer Hub: Er verbindet Systemdaten, Standortdatenbank und Tagesaktionen so, dass Nutzen, Grenzen und ein möglicher Pilot schnell prüfbar werden."
        />
        <div className="summary-grid">
          {summaryCards.map((card, index) => (
            <article
              key={card.title}
              className={`summary-card ${index === summaryCards.length - 1 ? "summary-card--highlight" : ""}`}
            >
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="nutzen" className="section-anchor container">
        <SectionHead
          eyebrow="Prüfbare Nutzenlogik"
          title="Wo Bevero wirtschaftlich wirkt"
          lead="Nicht jede operative Reibung steht direkt auf einer Rechnung. Trotzdem kostet sie Zeit, Marge, Qualität und Vertrauen. Bevero macht diese Reibung sichtbar und damit prüfbar reduzierbar."
        />
        <div className="roi-grid--bento">
          {roiPoints.map((point, index) => (
            <article key={point.title} className={`roi-card ${index === 0 ? "roi-card--large" : ""}`}>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
        <div className="pilot-prueffrage">
          <h4>Pilot-Prüffrage</h4>
          <ul>
            <li>Spart ein Standort pro Schicht 30 Minuten Suchzeit oder Nacharbeit?</li>
            <li>Werden kritische Fehlbestände früher sichtbar?</li>
            <li>Sinkt die Zahl ungeklärter Übergaben?</li>
          </ul>
        </div>
      </section>

      <section id="hub" className="section-anchor container">
        <SectionHead
          eyebrow="Operativer Hub statt Systemersatz"
          title="Welche Lücken Bevero schließt"
          lead="Ihr Betrieb arbeitet bereits mit starken Systemen. Der offene Hebel liegt nicht in einem weiteren Einzelsystem, sondern darin, Systemdaten mit Standortaktionen, Aufgaben, Freigaben und Übergaben zu verbinden."
        />
        <div className="gap-matrix">
          <div className="gap-row gap-header">
            <span>Gap</span>
            <span>Bevero-Hub</span>
            <span>Ergebnis</span>
          </div>
          {gapRows.map((row) => (
            <div key={row.gap} className="gap-row">
              <span className="gap-cell">{row.gap}</span>
              <span className="hub-cell">{row.hub}</span>
              <span className="result-cell">{row.result}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="screens" className="section-anchor container">
        <SectionHead
          eyebrow="Schnellverständnis - wirtschaftliche Hebel"
          title="Sechs Ansichten, die den Nutzen greifbar machen"
          lead="Die Screens zeigen nicht nur Funktionen, sondern wirtschaftliche Hebel: Was ist kritisch? Was fehlt? Was wurde bewegt? Was braucht Freigabe? Was bleibt offen?"
        />
        <div className="proof-timeline">
          {KAM_SCREENS.map((screen) => {
            const narrative = getScreenNarrative(screen);

            return (
              <button
                key={screen.src}
                type="button"
                className="proof-item"
                onClick={() => setModalScreen(screen)}
              >
                <div className="proof-screenshot">
                  <img src={screen.src} alt={screen.alt} loading="lazy" />
                </div>
                <div className="proof-info">
                  <p className="proof-kicker">{screen.caption}</p>
                  <dl className="proof-facts">
                    <div>
                      <dt>Frage</dt>
                      <dd>{narrative.operative}</dd>
                    </div>
                    <div>
                      <dt>Hebel</dt>
                      <dd>{narrative.lever}</dd>
                    </div>
                    <div>
                      <dt>KAM-Relevanz</dt>
                      <dd>{narrative.kam}</dd>
                    </div>
                  </dl>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="pilot" className="section-anchor container">
        <SectionHead
          eyebrow="Pilot-Messpunkte"
          title="Woran man den Nutzen im Pilot prüfen kann"
          lead="Bevero muss keinen theoretischen ROI versprechen. Ein kleiner Pilot kann zeigen, ob operative Reibung messbar sinkt."
        />
        <div className="pilot-layout">
          <div className="pilot-scorecard">
            {measurementPoints.map((point) => (
              <article key={point.metric} className="scorecard-item">
                <span className="scorecard-badge">☐</span>
                <h3>{point.metric}</h3>
                <p>{point.question}</p>
              </article>
            ))}
          </div>

          <article className="pilot-proof">
            <img src={WORKFLOW_SCREEN.src} alt={WORKFLOW_SCREEN.alt} loading="lazy" />
            <div className="proof-sidecopy">
              <p className="proof-kicker">Exemplarische Tagesansicht</p>
              <h3>{WORKFLOW_SCREEN.caption}</h3>
              <p>{WORKFLOW_SCREEN.desc}</p>
              <p>Ein sinnvoller Pilot ist kein Rollout, sondern ein begrenzter Prüfrahmen.</p>
            </div>
          </article>
        </div>
      </section>

      <section id="standort" className="section-anchor container">
        <SectionHead
          eyebrow="Operative Räume"
          title="Nicht nur Bar: Standortbereiche als operative Räume"
          lead="Die Landing denkt Standort nicht als abstrakte Linie, sondern als reale Arbeitsräume mit unterschiedlichen Reibungspunkten."
        />
        <div className="location-layout">
          <div className="standort-grid">
            {["Küche", "Bar / Service", "Lagerorte", "Wareneingang", "Transferpunkte", "Schichtübergabe"].map(
              (area) => (
                <article key={area} className="standort-card">
                  {area}
                </article>
              ),
            )}
          </div>
          <article className="location-proof">
            <img src={KITCHEN_SCREEN.src} alt={KITCHEN_SCREEN.alt} loading="lazy" />
            <div className="proof-sidecopy">
              <p className="proof-kicker">Raumlogik sichtbar gemacht</p>
              <h3>{KITCHEN_SCREEN.caption}</h3>
              <p>{KITCHEN_SCREEN.desc}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="vertrauen" className="section-anchor trust-section--contrast">
        <div className="container">
          <SectionHead
            eyebrow="Grenzen und Vertrauen"
            title="Was heute sichtbar ist - und was Bevero ausdrücklich nicht behauptet"
            lead="Bevero ergänzt bestehende Systeme, ohne deren Rolle größer oder kleiner zu reden. Sichtbar bleibt, was der Hub heute zeigt, welche Grenzen gelten und was erst ein kleiner Pilot aus KAM- und Standort-Sicht prüfen müsste."
          />
          <div className="trust-grid">
            {trustColumns.map((column) => (
              <div key={column.tone} className={`trust-col trust-col--${column.tone}`}>
                <h3>{column.label}</h3>
                <ul>
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="vision" className="section-anchor container">
        <SectionHead
          eyebrow="Vom Pilot zum Standortmodell"
          title="Wie der Hub wachsen könnte"
          lead="Die Vision ist kein weiteres All-in-One-System, sondern ein Hub, der vorhandene Systeme respektiert und operative Standortgaps schließt. Erst im kleinen Pilot wird geprüft, welche Workflows messbar Nutzen schaffen."
        />
        <div className="vision-layout">
          <div className="phase-grid">
            {visionPhases.map((phase) => (
              <article key={phase.phase} className="phase-card">
                <span>{phase.phase}</span>
                <h3>{phase.title}</h3>
                <p>{phase.text}</p>
              </article>
            ))}
          </div>
          <article className="vision-proof">
            <img src={VISION_SCREEN.src} alt={VISION_SCREEN.alt} loading="lazy" />
            <div className="proof-sidecopy">
              <p className="proof-kicker">Bereits sichtbar</p>
              <h3>{VISION_SCREEN.caption}</h3>
              <p>{VISION_SCREEN.desc}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="it" className="section-anchor container">
        <SectionHead
          eyebrow="Kontrollierbar für interne IT"
          title="Warum der Hub technisch kontrollierbar bleibt"
          lead="Bevero ist technisch als Hub angelegt: Standortdatenbank, Rollen- und Freigabelogik sowie Adapter zu bestehenden Systemen. Bestehende Systeme bleiben führend; produktive Schreibzugriffe, Rollout und Freigaben bleiben kontrolliert."
        />
        <div className="it-layout">
          <div className="it-grid">
            {itCards.map((card) => (
              <article key={card.title} className="it-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
          <article className="it-proof">
            <img src={IT_SCREEN.src} alt={IT_SCREEN.alt} loading="lazy" />
            <div className="proof-sidecopy">
              <p className="proof-kicker">Sichtbar in der Webapp</p>
              <h3>{IT_SCREEN.caption}</h3>
              <p>{IT_SCREEN.desc}</p>
            </div>
          </article>
        </div>
      </section>

      <section id="einschaetzung" className="section-anchor final-cta-section">
        <div className="container final-cta-shell">
          <h2 className="cta-h2">Sagen Sie mir bitte, ob ich damit am richtigen Hebel ansetze.</h2>
          <p className="cta-text">
            Ich suche keine schnelle Freigabe und keinen großen Rollout. Ich suche eine ehrliche
            Einschätzung: Ist ein operativer Hub, der Standortdatenbank, Planungs-/POS-
            Anbindung und Tagesaktionen verbindet, für Key Accounts, Standortqualität oder
            wiederkehrende Kundenprozesse in Ihrem Konzern relevant?
          </p>
          <div className="cta-buttons">
            <a href={KAM_MAILTO} className="btn btn-primary">
              Einschätzung per Mail geben
            </a>
            <a href="#screens" className="btn btn-secondary">
              Screens ansehen
            </a>
            <a href="#pilot" className="btn btn-tertiary">
              Pilot-Messpunkte prüfen
            </a>
          </div>
        </div>
      </section>

      <ScreenshotModal screen={modalScreen} onClose={() => setModalScreen(null)} />
    </main>
  );
}
