type SkeletonCardProps = {
  lines?: number;
};

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div aria-busy="true" aria-label="Lädt…" className="skeleton-card">
      {Array.from({ length: lines }).map((_, i) => (
        <div className={`skeleton-line skeleton-line--${i === 0 ? "title" : "body"}`} key={i} />
      ))}
    </div>
  );
}
