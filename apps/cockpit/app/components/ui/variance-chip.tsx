type VarianceLevel = "ok" | "check" | "critical";

type VarianceChipProps = {
  level: VarianceLevel;
  delta?: number;
  unit?: string;
};

const CONFIG: Record<VarianceLevel, { label: string; icon: string }> = {
  ok: { label: "OK", icon: "✓" },
  check: { label: "Prüfen", icon: "!" },
  critical: { label: "KRITISCH", icon: "✕" }
};

export function VarianceChip({ level, delta, unit }: VarianceChipProps) {
  const { label, icon } = CONFIG[level];
  const deltaText = delta !== undefined ? ` (${delta > 0 ? "+" : ""}${delta}${unit ? " " + unit : ""})` : "";

  return (
    <span className={`variance-chip variance-chip--${level}`}>
      <span aria-hidden="true">{icon}</span>
      {label}{deltaText}
    </span>
  );
}
