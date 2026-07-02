"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="de">
      <body style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 16, padding: 24, fontFamily: "sans-serif" }}>
        <strong style={{ fontSize: "2rem" }}>500</strong>
        <p>Ein unerwarteter Fehler ist aufgetreten.</p>
        <button onClick={reset} style={{ padding: "8px 16px", cursor: "pointer" }} type="button">
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
