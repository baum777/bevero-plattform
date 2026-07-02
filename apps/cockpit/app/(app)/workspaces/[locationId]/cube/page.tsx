"use client";

import { useState } from "react";
import { useLocationContext } from "../../../../../lib/location-context";
import { useServiceSlots, useMenuCatalog, useEventInquiries } from "../../../../../lib/cube-hooks";
import { UnitCard } from "../../../../../components/bestand/UnitCard";
import { EventInquiryDrawer } from "../../../../../components/bestand/EventInquiryDrawer";
import type { EventInquiryHeader } from "../../../../../lib/cube-hooks";

const CUBE_UNIT_IDS_PLACEHOLDER: { id: string; name: string }[] = [];

type TabId = "slots" | "inquiries";

function CubeInquiryTab({ locationId }: { locationId: string }) {
  const { inquiries, loading, error } = useEventInquiries(locationId, undefined);
  const active = inquiries.filter((i) =>
    ["NEW", "NEEDS_REVIEW", "OFFER_DRAFT"].includes(i.status)
  );
  const [selected, setSelected] = useState<EventInquiryHeader | null>(null);

  if (loading) return <p>Lade Anfragen…</p>;
  if (error) return <p className="text-error">Fehler: {error}</p>;
  if (active.length === 0) return <p className="text-muted">Heute keine offenen Anfragen.</p>;

  return (
    <>
      <ul className="inquiry-list" role="list">
        {active.map((inq) => (
          <li key={inq.id} role="listitem">
            <button
              type="button"
              className="inquiry-row"
              onClick={() => setSelected(inq)}
            >
              <span className="inquiry-subject">{inq.subject}</span>
              {inq.guestCount != null && (
                <span className="badge">{inq.guestCount} Gäste</span>
              )}
              {inq.preferredDate && (
                <span className="inquiry-date">
                  {new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(
                    new Date(inq.preferredDate)
                  )}
                </span>
              )}
              <span className={`badge badge-${inq.status === "NEW" ? "info" : "warning"}`}>
                {inq.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <EventInquiryDrawer inquiry={selected} onClose={() => setSelected(null)} />
    </>
  );
}

type UnitSlotsCardProps = { unitId: string; unitName: string };

function UnitSlotsCard({ unitId, unitName }: UnitSlotsCardProps) {
  const { slots, loading } = useServiceSlots(unitId);
  const { menus, loading: menusLoading } = useMenuCatalog(unitId);

  if (loading || menusLoading) return <div className="card-ui">Lade {unitName}…</div>;

  return (
    <UnitCard
      unitId={unitId}
      name={unitName}
      slots={slots}
      activeMenuCount={menus.length}
      onViewMenus={() => {
        window.location.href = `menus?unitId=${unitId}`;
      }}
    />
  );
}

export default function CubeDashboardPage() {
  const { todayOverview, profile } = useLocationContext();
  const [tab, setTab] = useState<TabId>("slots");

  const locationId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/workspaces/")[1]?.split("/")[0] ?? ""
      : "";

  void todayOverview;
  const units = CUBE_UNIT_IDS_PLACEHOLDER;

  return (
    <main>
      <header>
        <h1>CUBE Service-Slot Dashboard</h1>
        {profile && (
          <span className="badge badge-info">{profile}</span>
        )}
      </header>

      <nav className="tab-nav" role="tablist" aria-label="Dashboard-Bereiche">
        <button
          role="tab"
          type="button"
          aria-selected={tab === "slots"}
          onClick={() => setTab("slots")}
        >
          Service-Slots
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={tab === "inquiries"}
          onClick={() => setTab("inquiries")}
        >
          Event-Anfragen
        </button>
      </nav>

      {tab === "slots" && (
        <section aria-label="Unit-Cards">
          {units.length === 0 && (
            <p className="text-muted">Keine Operational Units konfiguriert.</p>
          )}
          {units.map((unit: { id: string; name: string }) => (
            <UnitSlotsCard key={unit.id} unitId={unit.id} unitName={unit.name} />
          ))}
        </section>
      )}

      {tab === "inquiries" && (
        <section aria-label="Event-Anfragen">
          <CubeInquiryTab locationId={locationId} />
        </section>
      )}
    </main>
  );
}
