import { getBackendApiBase } from "./api-base";

export type ApiFetchMode = "proxy" | "direct";

export type ApiFetchOptions = Omit<RequestInit, "body" | "headers"> & {
  accessToken: string;
  organizationId?: string | null;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
  requireOrganization?: boolean;
  throwOnError?: boolean;
  transportMode?: ApiFetchMode;
};

export class ApiFetchError extends Error {
  public readonly status: number;
  public readonly error?: string;

  public constructor(message: string, status: number, error?: string) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
    this.error = error;
  }
}

type ErrorBody = {
  error?: string;
  message?: string;
};

export async function apiFetch(path: string, options: ApiFetchOptions): Promise<Response> {
  const {
    accessToken,
    organizationId: rawOrganizationId,
    body: rawBody,
    headers: rawHeaders,
    requireOrganization,
    throwOnError,
    transportMode,
    ...fetchOptions
  } = options;
  const organizationId = rawOrganizationId?.trim() || null;

  if (requireOrganization && !organizationId) {
    throw new ApiFetchError("Organisationskontext fehlt. Bitte Workspace neu laden.", 403, "Forbidden");
  }

  const headers = new Headers(rawHeaders);
  headers.set("Accept", headers.get("Accept") ?? "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (organizationId) {
    headers.set("X-Organization-Id", organizationId);
  }

  const body = normalizeBody(rawBody);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path, transportMode ?? "proxy"), {
    ...fetchOptions,
    body,
    headers,
    cache: fetchOptions.cache ?? "no-store"
  });

  if (throwOnError !== false && !response.ok) {
    throw await normalizeApiError(response);
  }

  return response;
}

export async function readApiJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export async function apiJson<T>(path: string, options: ApiFetchOptions): Promise<T> {
  return readApiJson<T>(await apiFetch(path, options));
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiFetchError && error.message) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function apiUrl(path: string, mode: ApiFetchMode): string {
  if (!path.startsWith("/")) {
    throw new ApiFetchError("Backend path must start with '/'.", 500, "InvalidBackendPath");
  }

  if (mode === "direct") {
    return `${getBackendApiBase()}${path}`;
  }

  return `/api/backend${path}`;
}

function normalizeBody(body: ApiFetchOptions["body"]): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  ) {
    return body;
  }

  return JSON.stringify(body);
}

async function normalizeApiError(response: Response): Promise<ApiFetchError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  const fallback = fallbackMessage(response.status);
  return new ApiFetchError(body.message || fallback, response.status, body.error);
}

function fallbackMessage(status: number): string {
  if (status === 401) return "Bitte neu anmelden.";
  if (status === 403) return "Aktion nicht erlaubt oder Organisationskontext fehlt.";
  if (status === 404) return "Backend-Route nicht gefunden.";
  if (status === 409) return "Bitte Organisation auswählen und erneut versuchen.";
  if (status >= 500) return "Backend ist aktuell nicht erreichbar.";
  return "Backend-Anfrage fehlgeschlagen.";
}
