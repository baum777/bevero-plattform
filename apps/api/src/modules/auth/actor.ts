import type { IncomingHttpHeaders } from "node:http";
import { createHmac, createPublicKey, verify, timingSafeEqual } from "node:crypto";

export const roles = ["viewer", "staff", "shift_lead", "admin", "system"] as const;
export const organizationRoles = ["owner", "admin", "manager", "staff", "viewer"] as const;

export type Role = (typeof roles)[number];
export type OrganizationRole = (typeof organizationRoles)[number];

export type Actor = {
  userId: string;
  role: Role;
  organizationId?: string;
  organizationRole?: OrganizationRole;
};

export class ActorAuthError extends Error {
  public readonly statusCode: 401 | 403 | 409;

  public constructor(message: string, statusCode: 401 | 403 | 409) {
    super(message);
    this.name = "ActorAuthError";
    this.statusCode = statusCode;
  }
}

export type OrganizationMembership = {
  organizationId: string;
  role: OrganizationRole;
  createdAt: Date;
};

export type ActorAuthDatabaseClient = {
  organizationMember: {
    findMany(args: {
      where: {
        userId: string;
      };
      select: {
        organizationId: true;
        role: true;
        createdAt: true;
      };
      orderBy: Array<{
        createdAt?: "asc" | "desc";
        organizationId?: "asc" | "desc";
      }>;
      take?: number;
    }): Promise<OrganizationMembership[]>;
  };
  $executeRawUnsafe?(query: string, ...values: unknown[]): Promise<unknown>;
  $transaction?<T>(callback: (tx: ActorAuthDatabaseClient) => Promise<T>): Promise<T>;
};

export async function parseActorFromHeaders(
  headers: IncomingHttpHeaders,
  options: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  }
): Promise<Actor> {
  const token = readBearerToken(headers);
  const claims = await verifySupabaseJwt(token, {
    jwtSecret: options.jwtSecret,
    supabaseUrl: options.supabaseUrl
  });

  if (!claims.sub) {
    throw new ActorAuthError("authorization token is missing subject claim", 401);
  }

  const memberships = await findMembershipsForUser(options.db, claims.sub);

  if (memberships.length === 0) {
    throw new ActorAuthError("actor has no organization membership", 403);
  }

  const requestedOrganizationId = readHeader(headers, "x-organization-id")?.trim();
  const activeMembership = selectActiveMembership(memberships, requestedOrganizationId);

  return {
    userId: claims.sub,
    role: mapOrganizationRoleToRouteRole(activeMembership.role),
    organizationId: activeMembership.organizationId,
    organizationRole: activeMembership.role
  };
}

function selectActiveMembership(
  memberships: OrganizationMembership[],
  requestedOrganizationId: string | undefined
): OrganizationMembership {
  if (requestedOrganizationId) {
    const selected = memberships.find(
      (membership) => membership.organizationId === requestedOrganizationId
    );
    if (!selected) {
      throw new ActorAuthError("actor is not a member of the requested organization", 403);
    }
    return selected;
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  throw new ActorAuthError(
    "organization must be selected via the X-Organization-Id header",
    409
  );
}

async function findMembershipsForUser(
  db: ActorAuthDatabaseClient,
  userId: string
): Promise<OrganizationMembership[]> {
  if (db.$transaction && db.$executeRawUnsafe) {
    return db.$transaction(async (tx) => {
      await setSupabaseJwtClaims(tx, userId);
      return findMembershipRows(tx, userId);
    });
  }

  return findMembershipRows(db, userId);
}

async function findMembershipRows(
  db: ActorAuthDatabaseClient,
  userId: string
): Promise<OrganizationMembership[]> {
  return db.organizationMember.findMany({
    where: {
      userId
    },
    select: {
      organizationId: true,
      role: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "asc" }, { organizationId: "asc" }]
  });
}

async function setSupabaseJwtClaims(db: ActorAuthDatabaseClient, userId: string): Promise<void> {
  if (!db.$executeRawUnsafe) {
    return;
  }

  // Bind values as query parameters ($1) so the JWT subject can never be
  // interpreted as SQL, regardless of the token contents.
  await db.$executeRawUnsafe("select set_config('request.jwt.claim.sub', $1, true)", userId);
  await db.$executeRawUnsafe(
    "select set_config('request.jwt.claims', $1, true)",
    JSON.stringify({ sub: userId })
  );
}

export function requireActorRole(actor: Actor, allowedRoles: readonly Role[]): Actor {
  if (!allowedRoles.includes(actor.role)) {
    throw new ActorAuthError("actor role is not permitted", 403);
  }

  return actor;
}

function readHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isRole(value: string): value is Role {
  return roles.includes(value as Role);
}

function isOrganizationRole(value: string): value is OrganizationRole {
  return organizationRoles.includes(value as OrganizationRole);
}

function readBearerToken(headers: IncomingHttpHeaders): string {
  const authorization = readHeader(headers, "authorization")?.trim();
  if (!authorization) {
    throw new ActorAuthError("authorization header is required", 401);
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new ActorAuthError("authorization header must use bearer token", 401);
  }

  return token;
}

type JwtClaims = {
  aud?: string;
  iss?: string;
  sub?: string;
  role?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
};

type JwksResponse = {
  keys?: Array<Record<string, unknown>>;
};

const jwksCache = new Map<string, Promise<JwksResponse>>();

async function verifySupabaseJwt(
  token: string,
  options: {
    jwtSecret: string;
    supabaseUrl?: string;
  }
): Promise<JwtClaims> {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new ActorAuthError("authorization token is malformed", 401);
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = parseJwtJson<Record<string, unknown>>(headerSegment);
  const claims = parseJwtJson<JwtClaims>(payloadSegment);
  const algorithm = typeof header.alg === "string" ? header.alg : undefined;

  const body = `${headerSegment}.${payloadSegment}`;
  const actual = decodeJwtBase64url(signatureSegment);

  if (algorithm === "HS256") {
    const expected = createHmac("sha256", options.jwtSecret).update(body).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new ActorAuthError("authorization token signature is invalid", 401);
    }
  } else if (algorithm === "ES256") {
    await verifyEs256Jwt({
      body,
      claims,
      header,
      signature: actual,
      supabaseUrl: options.supabaseUrl
    });
  } else {
    throw new ActorAuthError("authorization token algorithm is not supported", 401);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof claims.exp === "number" && claims.exp <= nowSeconds) {
    throw new ActorAuthError("authorization token is expired", 401);
  }
  if (typeof claims.nbf === "number" && claims.nbf > nowSeconds) {
    throw new ActorAuthError("authorization token is not active yet", 401);
  }

  return claims;
}

async function verifyEs256Jwt(input: {
  body: string;
  claims: JwtClaims;
  header: Record<string, unknown>;
  signature: Buffer;
  supabaseUrl?: string;
}): Promise<void> {
  const kid = typeof input.header.kid === "string" ? input.header.kid : "";
  if (!kid) {
    throw new ActorAuthError("authorization token key id is missing", 401);
  }

  const jwksUrl = resolveSupabaseJwksUrl(input.claims.iss, input.supabaseUrl);
  const jwks = await loadJwks(jwksUrl);
  const key = jwks.keys?.find((candidate) => candidate.kid === kid);
  if (!key) {
    throw new ActorAuthError("authorization token key id is not trusted", 401);
  }
  if (key.kty !== "EC" || key.crv !== "P-256") {
    throw new ActorAuthError("authorization token key type is not supported", 401);
  }

  const publicKey = createPublicKey({
    key,
    format: "jwk"
  });
  const valid = verify(
    "sha256",
    Buffer.from(input.body),
    {
      key: publicKey,
      dsaEncoding: "ieee-p1363"
    },
    input.signature
  );

  if (!valid) {
    throw new ActorAuthError("authorization token signature is invalid", 401);
  }
}

function resolveSupabaseJwksUrl(issuer: string | undefined, supabaseUrl: string | undefined): string {
  if (!issuer) {
    throw new ActorAuthError("authorization token issuer is missing", 401);
  }

  let issuerUrl: URL;
  try {
    issuerUrl = new URL(issuer);
  } catch {
    throw new ActorAuthError("authorization token issuer is invalid", 401);
  }

  if (supabaseUrl) {
    const expectedIssuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
    if (issuerUrl.href.replace(/\/$/, "") !== expectedIssuer) {
      throw new ActorAuthError("authorization token issuer is not trusted", 401);
    }
  } else if (issuerUrl.protocol !== "https:" || !issuerUrl.hostname.endsWith(".supabase.co")) {
    throw new ActorAuthError("authorization token issuer is not trusted", 401);
  }

  return `${issuerUrl.href.replace(/\/$/, "")}/.well-known/jwks.json`;
}

async function loadJwks(jwksUrl: string): Promise<JwksResponse> {
  let cached = jwksCache.get(jwksUrl);
  if (!cached) {
    cached = fetch(jwksUrl).then(async (response) => {
      if (!response.ok) {
        throw new ActorAuthError("authorization token keys could not be loaded", 401);
      }
      return response.json() as Promise<JwksResponse>;
    });
    jwksCache.set(jwksUrl, cached);
  }

  try {
    return await cached;
  } catch (error) {
    jwksCache.delete(jwksUrl);
    if (error instanceof ActorAuthError) {
      throw error;
    }
    throw new ActorAuthError("authorization token keys could not be loaded", 401);
  }
}

function decodeJwtBase64url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const normalized = remainder === 0 ? padded : `${padded}${"=".repeat(4 - remainder)}`;

  try {
    return Buffer.from(normalized, "base64");
  } catch {
    throw new ActorAuthError("authorization token encoding is invalid", 401);
  }
}

function parseJwtJson<T>(segment: string): T {
  const decoded = decodeJwtBase64url(segment).toString("utf8");
  try {
    return JSON.parse(decoded) as T;
  } catch {
    throw new ActorAuthError("authorization token payload is invalid", 401);
  }
}

function mapOrganizationRoleToRouteRole(role: OrganizationRole): Role {
  switch (role) {
    case "owner":
    case "admin":
      return "admin";
    case "manager":
      return "shift_lead";
    case "staff":
      return "staff";
    case "viewer":
      return "viewer";
  }
}

const organizationRoleRank: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  staff: 2,
  viewer: 1
};

export function canGrantOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  return organizationRoleRank[targetRole] <= organizationRoleRank[actorRole];
}

export function assertCanGrantOrganizationRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole
): void {
  if (!isOrganizationRole(actorRole) || !isOrganizationRole(targetRole)) {
    throw new ActorAuthError("organization role is not allowed", 403);
  }

  if (!canGrantOrganizationRole(actorRole, targetRole)) {
    throw new ActorAuthError("actor cannot grant a higher organization role", 403);
  }
}
