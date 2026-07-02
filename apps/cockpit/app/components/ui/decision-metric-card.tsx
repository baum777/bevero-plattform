type Severity = "ok" | "warning" | "critical" | "neutral";

type DecisionMetricCardProps = {
  label: string;
  value: number | string;
  severity?: Severity;
  href?: string;
};

export function DecisionMetricCard({ label, value, severity = "neutral", href }: DecisionMetricCardProps) {
  const content = (
    <div className={`decision-metric-card decision-metric-card--${severity}`}>
      <span className="decision-metric-card__value">{value}</span>
      <span className="decision-metric-card__label">{label}</span>
    </div>
  );

  if (href) {
    return <a className="decision-metric-card__link" href={href}>{content}</a>;
  }

  return content;
}
