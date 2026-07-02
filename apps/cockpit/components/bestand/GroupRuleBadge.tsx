"use client";

type GroupRuleBadgeProps = {
  alaCarteMaxGuests: number;
  groupMenuRequiredFrom: number;
  bankettInquiryFrom: number;
};

export function GroupRuleBadge({
  alaCarteMaxGuests,
  groupMenuRequiredFrom,
  bankettInquiryFrom
}: GroupRuleBadgeProps) {
  return (
    <div className="group-rule-badge" aria-label="Gruppenregel" role="status">
      <span className="badge badge-success">{`1–${alaCarteMaxGuests} à la carte`}</span>
      <span className="badge badge-warning">{`${groupMenuRequiredFrom}–${bankettInquiryFrom - 1} Menüpflicht`}</span>
      <span className="badge badge-error">{`${bankettInquiryFrom}+ Bankett-Anfrage`}</span>
    </div>
  );
}
