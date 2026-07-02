type RouteProgressProps = {
  current: number;
  total: number;
  label?: string;
};

export function RouteProgress({ current, total, label }: RouteProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="route-progress" aria-label={label ?? `Lagerort ${current} von ${total}`}>
      <div className="route-progress__bar" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
        <div className="route-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="route-progress__label">
        Lagerort <strong>{current}</strong> von {total}
      </span>
    </div>
  );
}
