import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="state-panel">
      {icon ? <div className="state-icon">{icon}</div> : null}
      <h4 className="state-title">{title}</h4>
      <p className="state-desc">{description}</p>
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}
