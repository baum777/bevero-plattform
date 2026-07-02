"use client";

import { useLocationContext } from "../../../../../lib/location-context";
import { ExceptionRuleBanner } from "../../../../../components/bestand/ExceptionRuleBanner";

export default function TodayOverviewPage() {
  const { todayOverview, loading, error } = useLocationContext();

  if (loading) return <p>Lade Heute-Übersicht…</p>;
  if (error) return <p className="error-state">{error}</p>;
  if (!todayOverview) return <p>Keine Daten verfügbar.</p>;

  const { activeServiceSlots, activeExceptionRules, openInquiries, reservationConnectors, externalSystemLinks, signatureAssets } = todayOverview;

  return (
    <main>
      <h1>Heute-Übersicht</h1>

      {activeExceptionRules.map((rule) => (
        <ExceptionRuleBanner
          key={rule.id}
          title={rule.title}
          type={rule.type}
          requiresConfirmation={rule.requiresConfirmation}
        />
      ))}

      <section aria-labelledby="slots-heading">
        <h2 id="slots-heading">Aktive Service-Slots</h2>
        {activeServiceSlots.length === 0 ? (
          <p>Derzeit keine aktiven Slots.</p>
        ) : (
          <ul>
            {activeServiceSlots.map((slot) => (
              <li key={slot.id}>{slot.name} ({slot.startTimeLocal}–{slot.endTimeLocal})</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="inquiries-heading">
        <h2 id="inquiries-heading">Offene Anfragen ({openInquiries.count})</h2>
        {openInquiries.items.length === 0 ? (
          <p>Keine offenen Anfragen.</p>
        ) : (
          <ul>
            {openInquiries.items.map((inq) => (
              <li key={inq.id}>{inq.subject} — {inq.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="connectors-heading">
        <h2 id="connectors-heading">Reservation-Connectors</h2>
        <ul>
          {reservationConnectors.map((rc) => (
            <li key={rc.id}>
              {rc.provider}
              {rc.externalUrl && (
                <> — <a href={rc.externalUrl} target="_blank" rel="noopener noreferrer">Öffnen</a></>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="links-heading">
        <h2 id="links-heading">Externe Systeme</h2>
        <ul>
          {externalSystemLinks.map((esl) => (
            <li key={esl.id}>
              {esl.kind} — <a href={esl.url} target="_blank" rel="noopener noreferrer">Öffnen</a>
            </li>
          ))}
        </ul>
      </section>

      {signatureAssets.length > 0 && (
        <section aria-labelledby="assets-heading">
          <h2 id="assets-heading">Standort-Highlights</h2>
          <ul>
            {signatureAssets.map((asset) => <li key={asset}>{asset}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
