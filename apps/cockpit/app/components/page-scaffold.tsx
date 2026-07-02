import type { ReactNode } from "react";

type PageScaffoldProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <div className="page-wrap">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </header>
      <section className="surface">{children}</section>
    </div>
  );
}
