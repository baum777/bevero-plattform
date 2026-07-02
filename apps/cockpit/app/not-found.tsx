/* Keep this component entirely dependency-free so that Next.js can
   statically prerender /_not-found without pulling in server-only chunks. */
export default function NotFound() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: "1rem", padding: "1.5rem", fontFamily: "sans-serif" }}>
      <strong style={{ fontSize: "2rem" }}>404</strong>
      <p>Diese Seite wurde nicht gefunden.</p>
      {/* Plain anchor — next/link is intentionally avoided here */}
      <a href="/">Zurück zur Startseite</a>
    </div>
  );
}
