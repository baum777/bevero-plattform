import React from "react";

const workflowCards = [
  {
    title: "Warenannahme",
    description: "Lieferung prüfen, Abweichung markieren, Demo-Beleg erzeugen.",
  },
  {
    title: "Umlagerung",
    description: "Bestände zwischen Lager, Küche und Bar nachvollziehbar bewegen.",
  },
  {
    title: "Auffüllung",
    description: "Offene Artikel sehen, Soll-Mengen prüfen, Entnahme dokumentieren.",
  },
  {
    title: "Übergabe",
    description: "Erledigte Aufgaben, offene Punkte und Zuständigkeiten sichtbar machen.",
  },
  {
    title: "Korrektur/Freigabe",
    description: "Abweichungen begründen und als Demo-Manager genehmigen oder ablehnen.",
  },
];

export default function DemoSandboxTeaser() {
  return (
    <section id="demo-sandbox" className="section-anchor container">
      <div className="demo-head">
        <p className="eyebrow">INTERAKTIVE DEMO</p>
        <h2 className="section-title">Übernehmen Sie die nächste Schicht — als Demo.</h2>
        <p className="demo-claim">Von „Hat dir das jemand gesagt?" zu „Steht im Verlauf."</p>
        <p className="demo-description">
          Spielen Sie in 90 Sekunden durch, wie Bevero Warenannahme, Fehlmenge, Auffüllliste
          und offene Punkte zu einer klaren Schichtübergabe verbindet.
        </p>
      </div>

      <div className="demo-layout">
        <div className="demo-cockpit">
          <div className="demo-cockpit__header">
            <p className="demo-cockpit__title">Schichtübergabe · Dienstag · 15:55 Uhr</p>
          </div>
          <ul className="demo-cockpit__status">
            <li className="demo-status--done">
              <span className="demo-status-icon" aria-hidden="true">✓</span>
              Warenannahme abgeschlossen
            </li>
            <li className="demo-status--done">
              <span className="demo-status-icon" aria-hidden="true">✓</span>
              Fehlmenge dokumentiert
            </li>
            <li className="demo-status--partial">
              <span className="demo-status-icon" aria-hidden="true">◐</span>
              Auffüllliste 80 % erledigt
            </li>
            <li className="demo-status--open">
              <span className="demo-status-icon" aria-hidden="true">!</span>
              Offener Punkt: Limettenbestand für Frühschicht prüfen
            </li>
          </ul>
          <div className="demo-cockpit__timeline">
            <p className="demo-cockpit__timeline-label">Verlauf heute</p>
            <ol className="demo-cockpit__events">
              <li><span className="demo-time">14:20</span> Lieferung geprüft</li>
              <li><span className="demo-time">14:34</span> Fehlmenge markiert</li>
              <li><span className="demo-time">15:10</span> Bar-Auffüllung gestartet</li>
              <li><span className="demo-time">15:48</span> Übergabe vorbereitet</li>
            </ol>
          </div>
          <p className="demo-cockpit__result">
            Die nächste Schicht sieht, was erledigt ist, was fehlt und wer sich kümmert.
          </p>
        </div>

        <div className="demo-workflows">
          <p className="demo-workflows__label">Was Sie durchspielen:</p>
          <div className="demo-workflows__grid">
            {workflowCards.map((card, i) => (
              <article key={card.title} className="demo-card">
                <span className="demo-card__index">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="demo-card__title">{card.title}</h3>
                  <p className="demo-card__desc">{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="demo-cta-row">
        <a href="#sandbox" className="btn btn-primary btn--demo">
          Schicht übernehmen — Demo starten
        </a>
        <a href="#screens" className="btn btn-secondary">
          Erst die fünf Prozesse ansehen
        </a>
      </div>
      <p className="demo-disclaimer">Lokale Demo · keine echten Daten · keine Anmeldung</p>
    </section>
  );
}
