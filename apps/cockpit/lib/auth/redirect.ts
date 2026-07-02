const ALLOWED_AUTH_REDIRECTS = [
  "/dashboard",
  "/inventory",
  "/movements",
  "/procurement",
  "/workspaces",
  "/storage",
  "/alerts",
  "/settings",
  "/onboarding",
];

export function sanitizeInternalRedirect(
  value: string | null,
  fallback = "/dashboard"
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  const url = new URL(value, "https://bevero.local");
  const allowed = ALLOWED_AUTH_REDIRECTS.some(
    (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
  );
  if (!allowed) return fallback;
  return `${url.pathname}${url.search}`;
}
