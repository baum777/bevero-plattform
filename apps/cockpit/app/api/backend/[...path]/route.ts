import { type NextRequest, NextResponse } from "next/server";

type BackendRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FORWARDED_HEADERS = ["authorization", "content-type", "x-organization-id"] as const;

function getServerBackendApiBase() {
  const configured =
    process.env.BEVERO_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!configured) {
    return null;
  }

  return configured.replace(/\/$/, "");
}

function buildBackendUrl(request: NextRequest, path: string[]) {
  const baseUrl = getServerBackendApiBase();

  if (!baseUrl) {
    throw new Error("BACKEND_API_BASE_MISSING");
  }

  const targetUrl = new URL(`${baseUrl}/${path.map(encodeURIComponent).join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl;
}

function createForwardedHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  headers.set("accept", request.headers.get("accept") ?? "application/json");

  return headers;
}

function proxyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "BACKEND_API_BASE_MISSING") {
    return "Auffüllliste ist noch nicht mit der Backend-API verbunden. Bitte Backend-API-URL konfigurieren und erneut versuchen.";
  }

  return "Auffüllliste ist aktuell nicht erreichbar. Bitte Verbindung zur Backend-API prüfen und erneut versuchen.";
}

async function proxyBackend(request: NextRequest, context: BackendRouteContext) {
  try {
    const params = await context.params;
    const targetUrl = buildBackendUrl(request, params.path ?? []);
    const headers = createForwardedHeaders(request);
    const body = BODY_METHODS.has(request.method) ? await request.text() : undefined;

    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      cache: "no-store"
    });

    const responseHeaders = new Headers();
    const contentType = backendResponse.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "BackendUnavailable",
        message: proxyErrorMessage(error)
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, context: BackendRouteContext) {
  return proxyBackend(request, context);
}

export async function POST(request: NextRequest, context: BackendRouteContext) {
  return proxyBackend(request, context);
}

export async function PATCH(request: NextRequest, context: BackendRouteContext) {
  return proxyBackend(request, context);
}
