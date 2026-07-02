import type { ReactNode } from "react";

type ErrorStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function ErrorState({ action, description, title }: ErrorStateProps) {
  return (
    <div className="state-panel state-panel-error">
      <h4 className="state-title">{title}</h4>
      <p className="state-desc">{description}</p>
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}
