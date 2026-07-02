export function getBackendApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for backend API calls.");
}

export function getConfiguredBackendApiBaseLabel() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "not configured";
}
