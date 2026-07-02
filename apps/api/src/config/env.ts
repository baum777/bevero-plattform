import { config } from "dotenv";
import { z } from "zod";

config();

const developmentRedisUrl = "redis://localhost:6379";

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const integerEnv = (name: string, min: number, max: number, defaultValue: number) =>
  z.preprocess(
    (value) => (value === undefined ? String(defaultValue) : value),
    z
      .string()
      .trim()
      .regex(/^\d+$/, `${name} must be an integer`)
      .transform(Number)
      .refine((value) => value >= min && value <= max, {
        message: `${name} must be between ${min} and ${max}`
      })
  );

const floatEnv = (name: string, min: number, max: number, defaultValue: number) =>
  z.preprocess(
    (value) => (value === undefined ? String(defaultValue) : value),
    z
      .string()
      .trim()
      .regex(/^\d+(\.\d+)?$/, `${name} must be a number`)
      .transform(Number)
      .refine((value) => value >= min && value <= max, {
        message: `${name} must be between ${min} and ${max}`
      })
  );

const booleanEnv = (name: string, defaultValue: boolean) =>
  z.preprocess(
    (value) => (value === undefined ? String(defaultValue) : value),
    z.enum(["true", "false"], {
      errorMap: () => ({
        message: `${name} must be "true" or "false"`
      })
    }).transform((value) => value === "true")
  );

const optionalNonEmptyString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional()
);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().trim().url().optional());

const rawEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: integerEnv("PORT", 1, 65535, 4000),
    DATABASE_URL: optionalNonEmptyString,
    DIRECT_URL: optionalNonEmptyString,
    REDIS_URL: optionalNonEmptyString,
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalNonEmptyString,
    GASTRONOVI_API_BASE_URL: optionalUrl,
    GASTRONOVI_API_KEY: optionalNonEmptyString,
    GASTRONOVI_TENANT_ID: optionalNonEmptyString,
    CORS_ALLOWED_ORIGINS: optionalNonEmptyString,
    SUPABASE_JWT_SECRET: optionalNonEmptyString,
    SYNC_DEFAULT_LOOKBACK_DAYS: integerEnv("SYNC_DEFAULT_LOOKBACK_DAYS", 1, 365, 7),
    SYNC_ENABLE_SCHEDULED_JOBS: booleanEnv("SYNC_ENABLE_SCHEDULED_JOBS", false),
    DEMO_MODE: booleanEnv("DEMO_MODE", false),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    PROCUREMENT_ORGANIZATION_ID: optionalNonEmptyString,
    MAIL_IMAP_HOST: optionalNonEmptyString,
    MAIL_IMAP_PORT: integerEnv("MAIL_IMAP_PORT", 1, 65535, 993),
    MAIL_IMAP_USER: optionalNonEmptyString,
    MAIL_IMAP_PASSWORD: optionalNonEmptyString,
    MAIL_IMAP_POLL_INTERVAL: integerEnv("MAIL_IMAP_POLL_INTERVAL", 60000, 86400000, 900000),
    MAIL_IMAP_BACKOFF_MAX: integerEnv("MAIL_IMAP_BACKOFF_MAX", 60000, 86400000, 1800000),
    MICROSOFT_TENANT_ID: optionalNonEmptyString,
    MICROSOFT_CLIENT_ID: optionalNonEmptyString,
    MICROSOFT_CLIENT_SECRET: optionalNonEmptyString,
    FOODNOTIFY_MAILBOX: optionalNonEmptyString,
    FOODNOTIFY_MAIL_FOLDER: z.preprocess(
      (value) => (value === undefined || value === "" ? "Inbox" : value),
      z.string().trim().min(1)
    ),
    FOODNOTIFY_IMPORTED_FOLDER: z.preprocess(
      (value) => (value === undefined || value === "" ? "FoodNotify/Imported" : value),
      z.string().trim().min(1)
    ),
    FOODNOTIFY_FAILED_FOLDER: z.preprocess(
      (value) => (value === undefined || value === "" ? "FoodNotify/Failed" : value),
      z.string().trim().min(1)
    ),
    FOODNOTIFY_IGNORED_FOLDER: z.preprocess(
      (value) => (value === undefined || value === "" ? "FoodNotify/Ignored" : value),
      z.string().trim().min(1)
    ),
    FOODNOTIFY_FROM_FILTER: optionalNonEmptyString,
    FOODNOTIFY_IMPORT_MODE: z.preprocess(
      (value) => (value === undefined || value === "" ? "graph" : value),
      z.enum(["graph"])
    ),
    FOODNOTIFY_IMPORT_ENABLED: booleanEnv("FOODNOTIFY_IMPORT_ENABLED", false),
    FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: integerEnv(
      "FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS",
      30,
      3600,
      300
    ),
    FOODNOTIFY_PARSE_CONFIDENCE_MIN: floatEnv("FOODNOTIFY_PARSE_CONFIDENCE_MIN", 0, 1, 0.85),
    FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD: integerEnv(
      "FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD",
      0,
      1000,
      0
    ),
    FOODNOTIFY_RAW_MAIL_MAX_BYTES: integerEnv("FOODNOTIFY_RAW_MAIL_MAX_BYTES", 1024, 10485760, 204800),
    FOODNOTIFY_TRUSTED_SENDER_DOMAINS: optionalNonEmptyString
  })
  .passthrough();

export type Env = {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL: string;
  DIRECT_URL: string;
  REDIS_URL?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  GASTRONOVI_API_BASE_URL?: string;
  GASTRONOVI_API_KEY?: string;
  GASTRONOVI_TENANT_ID?: string;
  CORS_ALLOWED_ORIGINS?: string;
  SUPABASE_JWT_SECRET: string;
  SYNC_DEFAULT_LOOKBACK_DAYS: number;
  SYNC_ENABLE_SCHEDULED_JOBS: boolean;
  DEMO_MODE: boolean;
  LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  PROCUREMENT_ORGANIZATION_ID?: string;
  MAIL_IMAP_HOST?: string;
  MAIL_IMAP_PORT: number;
  MAIL_IMAP_USER?: string;
  MAIL_IMAP_PASSWORD?: string;
  MAIL_IMAP_POLL_INTERVAL: number;
  MAIL_IMAP_BACKOFF_MAX: number;
  MICROSOFT_TENANT_ID?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  FOODNOTIFY_MAILBOX?: string;
  FOODNOTIFY_MAIL_FOLDER: string;
  FOODNOTIFY_IMPORTED_FOLDER: string;
  FOODNOTIFY_FAILED_FOLDER: string;
  FOODNOTIFY_IGNORED_FOLDER: string;
  FOODNOTIFY_FROM_FILTER?: string;
  FOODNOTIFY_IMPORT_MODE: "graph";
  FOODNOTIFY_IMPORT_ENABLED: boolean;
  FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: number;
  FOODNOTIFY_PARSE_CONFIDENCE_MIN: number;
  FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD: number;
  FOODNOTIFY_RAW_MAIL_MAX_BYTES: number;
  FOODNOTIFY_TRUSTED_SENDER_DOMAINS?: string;
};

export function parseEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const parsed = rawEnvSchema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const data = parsed.data;

  if (data.NODE_ENV === "production" && data.DEMO_MODE) {
    throw new Error(
      "Invalid environment configuration: DEMO_MODE cannot be enabled in production"
    );
  }

  const hasProductionRedis =
    Boolean(data.REDIS_URL) ||
    Boolean(data.UPSTASH_REDIS_REST_URL && data.UPSTASH_REDIS_REST_TOKEN);
  const redisUrl = data.REDIS_URL ?? (data.NODE_ENV === "production" ? undefined : developmentRedisUrl);

  const missingRequiredValues = [
    data.DATABASE_URL ? undefined : "DATABASE_URL",
    data.DIRECT_URL ? undefined : "DIRECT_URL",
    data.SUPABASE_JWT_SECRET ? undefined : "SUPABASE_JWT_SECRET",
    data.NODE_ENV === "production" && !hasProductionRedis ? "REDIS_URL or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN" : undefined
  ].filter((value): value is string => Boolean(value));

  if (missingRequiredValues.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${missingRequiredValues.join(
        " and "
      )} required`
    );
  }

  const env = {
    NODE_ENV: data.NODE_ENV,
    PORT: data.PORT,
    DATABASE_URL: data.DATABASE_URL!,
    DIRECT_URL: data.DIRECT_URL!,
    REDIS_URL: redisUrl,
    UPSTASH_REDIS_REST_URL: data.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: data.UPSTASH_REDIS_REST_TOKEN,
    GASTRONOVI_API_BASE_URL: data.GASTRONOVI_API_BASE_URL,
    GASTRONOVI_API_KEY: data.GASTRONOVI_API_KEY,
    GASTRONOVI_TENANT_ID: data.GASTRONOVI_TENANT_ID,
    CORS_ALLOWED_ORIGINS: data.CORS_ALLOWED_ORIGINS,
    SUPABASE_JWT_SECRET: data.SUPABASE_JWT_SECRET!,
    SYNC_DEFAULT_LOOKBACK_DAYS: data.SYNC_DEFAULT_LOOKBACK_DAYS,
    SYNC_ENABLE_SCHEDULED_JOBS: data.SYNC_ENABLE_SCHEDULED_JOBS,
    DEMO_MODE: data.DEMO_MODE,
    LOG_LEVEL: data.LOG_LEVEL,
    PROCUREMENT_ORGANIZATION_ID: data.PROCUREMENT_ORGANIZATION_ID,
    MAIL_IMAP_HOST: data.MAIL_IMAP_HOST,
    MAIL_IMAP_PORT: data.MAIL_IMAP_PORT,
    MAIL_IMAP_USER: data.MAIL_IMAP_USER,
    MAIL_IMAP_PASSWORD: data.MAIL_IMAP_PASSWORD,
    MAIL_IMAP_POLL_INTERVAL: data.MAIL_IMAP_POLL_INTERVAL,
    MAIL_IMAP_BACKOFF_MAX: data.MAIL_IMAP_BACKOFF_MAX,
    MICROSOFT_TENANT_ID: data.MICROSOFT_TENANT_ID,
    MICROSOFT_CLIENT_ID: data.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: data.MICROSOFT_CLIENT_SECRET,
    FOODNOTIFY_MAILBOX: data.FOODNOTIFY_MAILBOX,
    FOODNOTIFY_MAIL_FOLDER: data.FOODNOTIFY_MAIL_FOLDER,
    FOODNOTIFY_IMPORTED_FOLDER: data.FOODNOTIFY_IMPORTED_FOLDER,
    FOODNOTIFY_FAILED_FOLDER: data.FOODNOTIFY_FAILED_FOLDER,
    FOODNOTIFY_IGNORED_FOLDER: data.FOODNOTIFY_IGNORED_FOLDER,
    FOODNOTIFY_FROM_FILTER: data.FOODNOTIFY_FROM_FILTER,
    FOODNOTIFY_IMPORT_MODE: data.FOODNOTIFY_IMPORT_MODE,
    FOODNOTIFY_IMPORT_ENABLED: data.FOODNOTIFY_IMPORT_ENABLED,
    FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: data.FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS,
    FOODNOTIFY_PARSE_CONFIDENCE_MIN: data.FOODNOTIFY_PARSE_CONFIDENCE_MIN,
    FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD: data.FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD,
    FOODNOTIFY_RAW_MAIL_MAX_BYTES: data.FOODNOTIFY_RAW_MAIL_MAX_BYTES,
    FOODNOTIFY_TRUSTED_SENDER_DOMAINS: data.FOODNOTIFY_TRUSTED_SENDER_DOMAINS
  };

  if (input === process.env) {
    process.env.DATABASE_URL ??= env.DATABASE_URL;
    process.env.DIRECT_URL ??= env.DIRECT_URL;
    if (env.REDIS_URL) {
      process.env.REDIS_URL ??= env.REDIS_URL;
    }
    if (env.UPSTASH_REDIS_REST_URL) {
      process.env.UPSTASH_REDIS_REST_URL ??= env.UPSTASH_REDIS_REST_URL;
    }
    if (env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.UPSTASH_REDIS_REST_TOKEN ??= env.UPSTASH_REDIS_REST_TOKEN;
    }
    process.env.SUPABASE_JWT_SECRET ??= env.SUPABASE_JWT_SECRET;
  }

  return env;
}
