"use client";

type ExceptionRuleBannerProps = {
  title: string;
  type: string;
  requiresConfirmation: boolean;
};

export function ExceptionRuleBanner({ title, type, requiresConfirmation }: ExceptionRuleBannerProps) {
  const isOechsle = type === "OECHSLE_BUFFET_OVERRIDE";
  const bannerClass = isOechsle ? "banner banner-warning" : "banner banner-info";

  return (
    <div className={bannerClass} role="status" aria-live="polite">
      <strong>{title}</strong>
      {requiresConfirmation && (
        <span className="badge badge-warning" style={{ marginLeft: "0.5rem" }}>
          Manuelle Bestätigung erforderlich
        </span>
      )}
    </div>
  );
}
