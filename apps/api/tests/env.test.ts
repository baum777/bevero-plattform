import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config/env.js";

const exampleEnv = {
  NODE_ENV: "development",
  PORT: "4000",
  DATABASE_URL:
    "postgresql://postgres.your-project-ref:replace_me@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
  DIRECT_URL:
    "postgresql://postgres:replace_me@db.your-project-ref.supabase.co:5432/postgres?sslmode=require",
  REDIS_URL: "redis://localhost:6379",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  GASTRONOVI_API_BASE_URL: "",
  GASTRONOVI_API_KEY: "",
  GASTRONOVI_TENANT_ID: "",
  CORS_ALLOWED_ORIGINS: "",
  SUPABASE_JWT_SECRET: "replace_me",
  SYNC_DEFAULT_LOOKBACK_DAYS: "7",
  SYNC_ENABLE_SCHEDULED_JOBS: "false",
  LOG_LEVEL: "info"
};

describe("parseEnv", () => {
  it("accepts the .env.example development configuration", () => {
    expect(parseEnv(exampleEnv)).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      DATABASE_URL:
        "postgresql://postgres.your-project-ref:replace_me@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
      DIRECT_URL:
        "postgresql://postgres:replace_me@db.your-project-ref.supabase.co:5432/postgres?sslmode=require",
      REDIS_URL: "redis://localhost:6379",
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
      GASTRONOVI_API_BASE_URL: undefined,
      GASTRONOVI_API_KEY: undefined,
      GASTRONOVI_TENANT_ID: undefined,
      CORS_ALLOWED_ORIGINS: undefined,
      SUPABASE_JWT_SECRET: "replace_me",
      SYNC_DEFAULT_LOOKBACK_DAYS: 7,
      SYNC_ENABLE_SCHEDULED_JOBS: false,
      LOG_LEVEL: "info",
      DEMO_MODE: false,
      PROCUREMENT_ORGANIZATION_ID: undefined,
      MAIL_IMAP_HOST: undefined,
      MAIL_IMAP_PORT: 993,
      MAIL_IMAP_USER: undefined,
      MAIL_IMAP_PASSWORD: undefined,
      MAIL_IMAP_POLL_INTERVAL: 900000,
      MAIL_IMAP_BACKOFF_MAX: 1800000,
      MICROSOFT_TENANT_ID: undefined,
      MICROSOFT_CLIENT_ID: undefined,
      MICROSOFT_CLIENT_SECRET: undefined,
      FOODNOTIFY_MAILBOX: undefined,
      FOODNOTIFY_MAIL_FOLDER: "Inbox",
      FOODNOTIFY_IMPORTED_FOLDER: "FoodNotify/Imported",
      FOODNOTIFY_FAILED_FOLDER: "FoodNotify/Failed",
      FOODNOTIFY_IGNORED_FOLDER: "FoodNotify/Ignored",
      FOODNOTIFY_FROM_FILTER: undefined,
      FOODNOTIFY_IMPORT_MODE: "graph",
      FOODNOTIFY_IMPORT_ENABLED: false,
      FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: 300,
      FOODNOTIFY_PARSE_CONFIDENCE_MIN: 0.85,
      FOODNOTIFY_PARSE_FAILURE_ALERT_THRESHOLD: 0,
      FOODNOTIFY_RAW_MAIL_MAX_BYTES: 204800,
      FOODNOTIFY_TRUSTED_SENDER_DOMAINS: undefined
    });
  });

  it("accepts Microsoft Graph FoodNotify import configuration with safe defaults", () => {
    expect(
      parseEnv({
        ...exampleEnv,
        MICROSOFT_TENANT_ID: "tenant-id",
        MICROSOFT_CLIENT_ID: "client-id",
        MICROSOFT_CLIENT_SECRET: "client-secret",
        FOODNOTIFY_MAILBOX: "foodnotify-orders@example.com",
        FOODNOTIFY_FROM_FILTER: "foodnotify.com",
        FOODNOTIFY_IMPORT_ENABLED: "true",
        FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: "600"
      })
    ).toMatchObject({
      MICROSOFT_TENANT_ID: "tenant-id",
      MICROSOFT_CLIENT_ID: "client-id",
      MICROSOFT_CLIENT_SECRET: "client-secret",
      FOODNOTIFY_MAILBOX: "foodnotify-orders@example.com",
      FOODNOTIFY_MAIL_FOLDER: "Inbox",
      FOODNOTIFY_IMPORTED_FOLDER: "FoodNotify/Imported",
      FOODNOTIFY_FAILED_FOLDER: "FoodNotify/Failed",
      FOODNOTIFY_IGNORED_FOLDER: "FoodNotify/Ignored",
      FOODNOTIFY_FROM_FILTER: "foodnotify.com",
      FOODNOTIFY_IMPORT_MODE: "graph",
      FOODNOTIFY_IMPORT_ENABLED: true,
      FOODNOTIFY_IMPORT_LOCK_TTL_SECONDS: 600
    });
  });

  it("parses demo mode as an explicit boolean gate", () => {
    expect(parseEnv({ ...exampleEnv, DEMO_MODE: "true" })).toMatchObject({
      DEMO_MODE: true
    });
    expect(parseEnv({ ...exampleEnv, DEMO_MODE: "false" })).toMatchObject({
      DEMO_MODE: false
    });
    expect(() => parseEnv({ ...exampleEnv, DEMO_MODE: "yes" })).toThrow(/DEMO_MODE/);
  });

  it("refuses to start with demo mode enabled in production", () => {
    expect(() =>
      parseEnv({
        ...exampleEnv,
        NODE_ENV: "production",
        DEMO_MODE: "true"
      })
    ).toThrow(/DEMO_MODE cannot be enabled in production/);
  });

  it("allows demo mode outside production", () => {
    expect(
      parseEnv({
        ...exampleEnv,
        NODE_ENV: "development",
        DEMO_MODE: "true"
      })
    ).toMatchObject({ DEMO_MODE: true });
  });

  it("rejects an invalid port", () => {
    expect(() => parseEnv({ ...exampleEnv, PORT: "70000" })).toThrow(/PORT/);
  });

  it("rejects an invalid sync lookback window", () => {
    expect(() => parseEnv({ ...exampleEnv, SYNC_DEFAULT_LOOKBACK_DAYS: "0" })).toThrow(
      /SYNC_DEFAULT_LOOKBACK_DAYS/
    );
  });

  it("rejects non-boolean scheduled job values", () => {
    expect(() => parseEnv({ ...exampleEnv, SYNC_ENABLE_SCHEDULED_JOBS: "yes" })).toThrow(
      /SYNC_ENABLE_SCHEDULED_JOBS/
    );
  });

  it("requires database and redis configuration in production", () => {
    expect(() =>
      parseEnv({
        ...exampleEnv,
        NODE_ENV: "production",
        DATABASE_URL: "",
        DIRECT_URL: "",
        REDIS_URL: ""
      })
    ).toThrow(/DATABASE_URL.*DIRECT_URL.*REDIS_URL/);
  });

  it("requires the supabase jwt secret", () => {
    expect(() =>
      parseEnv({
        ...exampleEnv,
        SUPABASE_JWT_SECRET: ""
      })
    ).toThrow(/SUPABASE_JWT_SECRET/);
  });

  it("accepts Upstash REST credentials as production redis configuration", () => {
    expect(
      parseEnv({
        ...exampleEnv,
        NODE_ENV: "production",
        REDIS_URL: "",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret-token"
      })
    ).toMatchObject({
      NODE_ENV: "production",
      REDIS_URL: undefined,
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "secret-token"
    });
  });

  it("accepts explicit CORS origins for the deployed backend", () => {
    expect(
      parseEnv({
        ...exampleEnv,
        CORS_ALLOWED_ORIGINS: "https://bevero.vercel.app"
      })
    ).toMatchObject({
      CORS_ALLOWED_ORIGINS: "https://bevero.vercel.app"
    });
  });

  it("requires database urls in development", () => {
    expect(() =>
      parseEnv({
        ...exampleEnv,
        DATABASE_URL: "",
        DIRECT_URL: ""
      })
    ).toThrow(/DATABASE_URL.*DIRECT_URL/);
  });

  it("syncs explicit database urls into process.env for runtime clients", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousDirectUrl = process.env.DIRECT_URL;
    const previousRedisUrl = process.env.REDIS_URL;
    const previousSupabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

    try {
      process.env.NODE_ENV = "development";
      process.env.DATABASE_URL = exampleEnv.DATABASE_URL;
      process.env.DIRECT_URL = exampleEnv.DIRECT_URL;
      process.env.SUPABASE_JWT_SECRET = exampleEnv.SUPABASE_JWT_SECRET;
      delete process.env.REDIS_URL;

      const env = parseEnv();

      expect(process.env.DATABASE_URL).toBe(env.DATABASE_URL);
      expect(process.env.DIRECT_URL).toBe(env.DIRECT_URL);
      expect(process.env.REDIS_URL).toBe(env.REDIS_URL);
      expect(process.env.SUPABASE_JWT_SECRET).toBe(env.SUPABASE_JWT_SECRET);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }

      if (previousDirectUrl === undefined) {
        delete process.env.DIRECT_URL;
      } else {
        process.env.DIRECT_URL = previousDirectUrl;
      }

      if (previousRedisUrl === undefined) {
        delete process.env.REDIS_URL;
      } else {
        process.env.REDIS_URL = previousRedisUrl;
      }

      if (previousSupabaseJwtSecret === undefined) {
        delete process.env.SUPABASE_JWT_SECRET;
      } else {
        process.env.SUPABASE_JWT_SECRET = previousSupabaseJwtSecret;
      }
    }
  });
});
