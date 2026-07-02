"use client";

import type { ServiceSlot } from "../../lib/cube-hooks";
import { GroupRuleBadge } from "./GroupRuleBadge";
import { ServiceSlotTimeline } from "./ServiceSlotTimeline";

type GroupRule = {
  alaCarteMaxGuests: number;
  groupMenuRequiredFrom: number;
  bankettInquiryFrom: number;
};

type UnitCardProps = {
  unitId: string;
  name: string;
  slots: ServiceSlot[];
  groupRule?: GroupRule | null;
  activeMenuCount?: number;
  onViewMenus?: () => void;
};

export function UnitCard({ name, slots, groupRule, activeMenuCount, onViewMenus }: UnitCardProps) {
  const now = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const activeSlot = slots.find(
    (s) => s.startTimeLocal <= now && s.endTimeLocal >= now
  );

  return (
    <article className="card-ui unit-card">
      <header className="card-ui-header">
        <h2 className="card-ui-title">{name}</h2>
        {activeSlot && (
          <span className="badge badge-success" aria-live="polite">
            {activeSlot.name} aktiv
          </span>
        )}
      </header>

      {groupRule && (
        <GroupRuleBadge
          alaCarteMaxGuests={groupRule.alaCarteMaxGuests}
          groupMenuRequiredFrom={groupRule.groupMenuRequiredFrom}
          bankettInquiryFrom={groupRule.bankettInquiryFrom}
        />
      )}

      <ServiceSlotTimeline slots={slots} />

      {activeMenuCount !== undefined && (
        <div>
          <span>{activeMenuCount} aktive Menü{activeMenuCount !== 1 ? "s" : ""}</span>
          {onViewMenus && (
            <button type="button" onClick={onViewMenus} className="btn btn-ghost">
              Menüs ansehen
            </button>
          )}
        </div>
      )}
    </article>
  );
}
