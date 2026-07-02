"use client";

import { use } from "react";
import Link from "next/link";
import { useLocationContext } from "../../../../lib/location-context";
import { getTilesForProfile } from "../../../../lib/location-tiles";
import { LocationTile } from "../../../../components/bestand/LocationTile";
import { ExceptionRuleBanner } from "../../../../components/bestand/ExceptionRuleBanner";

export default function LocationLandingPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = use(params);
  const { profile, todayOverview, loading, error } = useLocationContext();

  if (loading) return <p>Lade Standort-Daten…</p>;
  if (error) return <p className="error-state">{error}</p>;

  const tiles = profile ? getTilesForProfile(profile) : [];
  const openInquiries = todayOverview?.openInquiries.count ?? 0;
  const activeExceptions = todayOverview?.activeExceptionRules ?? [];
  const confirmationRequired = activeExceptions.filter((e) => e.requiresConfirmation);

  return (
    <main>
      <h1>Standort-Dashboard</h1>

      {todayOverview?.weatherSensitive && (
        <div className="banner banner-info">
          Outdoor-Bereich wettersensitiv — aktuelle Bedingungen prüfen.
        </div>
      )}

      {confirmationRequired.map((rule) => (
        <ExceptionRuleBanner
          key={rule.id}
          title={rule.title}
          type={rule.type}
          requiresConfirmation={rule.requiresConfirmation}
        />
      ))}

      <div className="grid-2">
        {tiles.map((tile) => (
          <LocationTile
            key={tile.id}
            id={tile.id}
            label={tile.label}
            value={tile.id === "open_inquiries" ? openInquiries : undefined}
          />
        ))}
      </div>

      <nav className="location-nav" aria-label="Standort-Navigation">
        <Link href={`/workspaces/${locationId}/today`}>Heute-Übersicht</Link>
        <Link href={`/workspaces/${locationId}/calendar`}>Ausnahme-Kalender</Link>
        <Link href={`/workspaces/${locationId}/event-spaces`}>Event-Räume</Link>
        <Link href={`/workspaces/${locationId}/connectors`}>Connectors</Link>
        {profile === "CUBE_PREMIUM" && (
          <Link href={`/workspaces/${locationId}/cube`}>CUBE-Dashboard</Link>
        )}
        {profile === "MOTORWORLD_STANDARD" && (
          <Link href={`/workspaces/${locationId}/event-ops`}>Event-Ops</Link>
        )}
      </nav>
    </main>
  );
}
