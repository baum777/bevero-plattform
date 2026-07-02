import { z } from "zod";

const booleanEnv = (name: string, dflt: boolean) =>
  z.preprocess(
    (v) => (v === undefined || v === "" ? String(dflt) : v),
    z.enum(["true", "false"], {
      errorMap: () => ({ message: `${name} must be "true" or "false"` })
    }).transform((v) => v === "true")
  );

const intEnv = (name: string, dflt: number) =>
  z.preprocess(
    (v) => (v === undefined || v === "" ? String(dflt) : v),
    z.string().regex(/^\d+$/, `${name} must be a positive integer`).transform(Number)
  );

// Uses the three GASTRONOVI_* variables already present in apps/api/src/config/env.ts.
// Additional variables (GASTRONOVI_ENABLED, GASTRONOVI_TENANT_ALLOWLIST,
// GASTRONOVI_TLS_FINGERPRINT_REQUIRED) are optional with safe defaults and are NOT
// claimed to be reserved in .env.example.
const GastronoviEnvSchema = z.object({
  GASTRONOVI_API_BASE_URL: z.string().url("GASTRONOVI_API_BASE_URL must be a valid URL"),
  GASTRONOVI_API_KEY: z.string().min(1, "GASTRONOVI_API_KEY is required"),
  GASTRONOVI_TENANT_ID: z.string().min(1, "GASTRONOVI_TENANT_ID is required"),
  GASTRONOVI_ENABLED: booleanEnv("GASTRONOVI_ENABLED", false),
  GASTRONOVI_POLL_INTERVAL_SECONDS: intEnv("GASTRONOVI_POLL_INTERVAL_SECONDS", 900),
  GASTRONOVI_TLS_FINGERPRINT_REQUIRED: booleanEnv("GASTRONOVI_TLS_FINGERPRINT_REQUIRED", false),
  GASTRONOVI_TENANT_ALLOWLIST: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const list = v.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "GASTRONOVI_TENANT_ALLOWLIST must not be empty when set" });
        return z.NEVER;
      }
      return list;
    })
});

export class GastronoviConfigError extends Error {
  constructor(public readonly details: string) {
    super(`[gastronovi] Invalid configuration: ${details}`);
    this.name = "GastronoviConfigError";
  }
}

export type GastronoviConfig = {
  readonly apiBaseUrl: string;
  readonly apiKey: string;
  readonly tenantId: string;
  readonly enabled: boolean;
  readonly pollIntervalSeconds: number;
  readonly tlsFingerprintRequired: boolean;
  // When not set, defaults to [tenantId] — single-tenant safe default.
  readonly tenantAllowlist: readonly string[];
};

/**
 * Parses GASTRONOVI_* environment variables and returns a frozen config object.
 * Throws GastronoviConfigError (never calls process.exit) on invalid input —
 * exit behavior is the caller's responsibility (e.g. server bootstrap).
 */
export function parseGastronoviConfig(env: NodeJS.ProcessEnv = process.env): GastronoviConfig {
  const result = GastronoviEnvSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("; ");
    throw new GastronoviConfigError(details);
  }
  const d = result.data;
  return Object.freeze({
    apiBaseUrl: d.GASTRONOVI_API_BASE_URL,
    apiKey: d.GASTRONOVI_API_KEY,
    tenantId: d.GASTRONOVI_TENANT_ID,
    enabled: d.GASTRONOVI_ENABLED,
    pollIntervalSeconds: d.GASTRONOVI_POLL_INTERVAL_SECONDS,
    tlsFingerprintRequired: d.GASTRONOVI_TLS_FINGERPRINT_REQUIRED,
    tenantAllowlist: Object.freeze(d.GASTRONOVI_TENANT_ALLOWLIST ?? [d.GASTRONOVI_TENANT_ID])
  });
}
