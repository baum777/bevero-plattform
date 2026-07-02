type PendingApprovalBannerProps = {
  submittedAt: string;
  correctionRequestId?: string;
};

export function PendingApprovalBanner({ submittedAt, correctionRequestId: _ }: PendingApprovalBannerProps) {
  return (
    <div aria-live="polite" className="pending-approval-banner" role="status">
      <span className="pending-approval-banner__icon" aria-hidden="true">⏳</span>
      <span>
        <strong>Wartet auf Freigabe</strong>
        {" — "}eingereicht {new Date(submittedAt).toLocaleString("de-DE")}
      </span>
    </div>
  );
}
