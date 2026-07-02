"use client";

import type { ServiceSlot } from "../../lib/cube-hooks";

type ServiceSlotTimelineProps = {
  slots: ServiceSlot[];
  currentTimeHHMM?: string;
};

function isActive(slot: ServiceSlot, currentHHMM: string): boolean {
  return slot.startTimeLocal <= currentHHMM && slot.endTimeLocal >= currentHHMM;
}

const SLOT_KIND_LABELS: Record<string, string> = {
  LUNCH: "Mittagsservice",
  KAFFEE_KUCHEN: "Kaffee & Kuchen",
  DINNER: "Abendservice",
  GRUPPEN_MENU: "Gruppenmenü",
  AFTER_WORK: "After Work",
  TAGESGESCHAEFT: "Tagesgeschäft",
  TERRASSE: "Terrasse",
  VORBEREITUNG: "Vorbereitung",
  DURCHFUEHRUNG: "Durchführung"
};

export function ServiceSlotTimeline({ slots, currentTimeHHMM }: ServiceSlotTimelineProps) {
  const now = currentTimeHHMM ?? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

  return (
    <div className="service-slot-timeline" role="list" aria-label="Service-Slot-Timeline">
      {slots.map((slot) => {
        const active = isActive(slot, now);
        return (
          <div
            key={slot.id}
            role="listitem"
            className={`slot-item ${active ? "slot-active" : ""}`}
            aria-current={active ? "true" : undefined}
          >
            <span className="slot-name">{SLOT_KIND_LABELS[slot.slotKind] ?? slot.name}</span>
            <span className="slot-time">{slot.startTimeLocal}–{slot.endTimeLocal}</span>
            {active && <span className="badge badge-success" aria-label="Aktiv">Aktiv</span>}
          </div>
        );
      })}
      {slots.length === 0 && <p>Keine Service-Slots konfiguriert.</p>}
    </div>
  );
}
