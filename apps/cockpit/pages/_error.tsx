// Minimal Pages Router error page — prevents Next.js from auto-generating
// a /_error shim that uses React hooks and fails static prerendering.
import type { NextPageContext } from "next";

type ErrorProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <p style={{ padding: 24, fontFamily: "sans-serif" }}>
      {statusCode ? `Fehler ${statusCode}` : "Ein Fehler ist aufgetreten."}
    </p>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};

export default ErrorPage;
