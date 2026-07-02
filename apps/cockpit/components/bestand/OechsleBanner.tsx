"use client";

import type { ExceptionRuleItem } from "../../lib/motorworld-hooks";

type OechsleBannerProps = {
  rule: ExceptionRuleItem;
};

export function OechsleBanner({ rule }: OechsleBannerProps) {
  return (
    <div
      className="exception-banner exception-banner-oechsle"
      role="alert"
      aria-live="polite"
      style={{ background: "#fff3cd", border: "1px solid #ffc107", padding: "0.75rem 1rem", borderRadius: "4px" }}
    >
      <strong>Öchsle-Buffet-Override aktiv</strong>
      {rule.title && <span> — {rule.title}</span>}
      {rule.requiresConfirmation && (
        <span className="badge badge-warning" style={{ marginLeft: "0.5rem" }}>
          Manuelle Bestätigung erforderlich
        </span>
      )}
    </div>
  );
}
