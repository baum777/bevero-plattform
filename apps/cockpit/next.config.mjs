import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the monorepo root (two levels up from apps/cockpit-next)
const monorepoRoot = path.resolve(__dirname, "../..");

// bevero-api production URL — used for server-side rewrites.
// For preview branches, set BEVERO_API_BASE_URL in Vercel per-branch env.
const apiBase =
  process.env.BEVERO_API_BASE_URL?.trim().replace(/\/$/, "") ??
  "https://bevero-api.vercel.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Fix "workspace root inferred" warning in monorepo setups
  outputFileTracingRoot: monorepoRoot,

  // Proxy /admin/* and /inventory/* to bevero-api so client hooks can use
  // a relative base URL (empty string) and avoid CORS.
  async rewrites() {
    return [
      {
        source: "/admin/:path*",
        destination: `${apiBase}/admin/:path*`
      },
      {
        source: "/inventory/:path*",
        destination: `${apiBase}/inventory/:path*`
      }
    ];
  }
};

export default nextConfig;
