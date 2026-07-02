import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
};

type CardHeaderProps = {
  action?: ReactNode;
  children: ReactNode;
};

type CardTitleProps = {
  children: ReactNode;
};

type CardContentProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  return <article className="card-ui">{children}</article>;
}

export function CardHeader({ action, children }: CardHeaderProps) {
  return (
    <header className="card-ui-header">
      <div>{children}</div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}

export function CardTitle({ children }: CardTitleProps) {
  return <h3 className="card-ui-title">{children}</h3>;
}

export function CardContent({ children }: CardContentProps) {
  return <div className="card-ui-content">{children}</div>;
}
