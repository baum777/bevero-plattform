export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-root">
      <section className="auth-brand">
        <h1>Cockpit</h1>
        <p>Operational precision for hospitality inventory teams.</p>
      </section>
      <section className="auth-form-wrap">{children}</section>
    </main>
  );
}
