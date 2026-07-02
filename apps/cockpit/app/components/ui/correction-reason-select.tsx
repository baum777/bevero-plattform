"use client";

export const CORRECTION_REASONS = [
  { value: "consumption_not_booked", label: "Verbrauch nicht gebucht" },
  { value: "delivery_missing", label: "Lieferung fehlt" },
  { value: "spoilage", label: "Verderb / Schwund" },
  { value: "other", label: "Sonstiges" }
] as const;

export type CorrectionReason = typeof CORRECTION_REASONS[number]["value"];

type CorrectionReasonSelectProps = {
  value: CorrectionReason | "";
  onChange: (value: CorrectionReason) => void;
  id?: string;
  required?: boolean;
};

export function CorrectionReasonSelect({ value, onChange, id = "correction-reason", required }: CorrectionReasonSelectProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        Grund {required ? <span aria-label="Pflichtfeld">*</span> : null}
      </label>
      <select
        className="field__select"
        id={id}
        onChange={(e) => onChange(e.target.value as CorrectionReason)}
        required={required}
        value={value}
      >
        <option disabled value="">Bitte auswählen…</option>
        {CORRECTION_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}
