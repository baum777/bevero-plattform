import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

describe("GET /app-context", () => {
  it("is not registered in production", async () => {
    const app = buildApp({
      env: {
        NODE_ENV: "production",
        DEMO_MODE: false,
        SUPABASE_JWT_SECRET: "test-supabase-jwt-secret"
      }
    });

    try {
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/app-context"
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("returns public app context in development", async () => {
    const app = buildApp({
      env: {
        NODE_ENV: "development",
        DEMO_MODE: true
      },
      demoSeedService: {
        async ensure() {
          return undefined;
        }
      }
    });

    try {
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/app-context"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        demoMode: true,
        devPanelEnabled: true,
        defaultActor: {
          userId: "demo-admin",
          role: "admin"
        }
      });
    } finally {
      await app.close();
    }
  });

  it("requires an explicit JWT secret in production runtime context", () => {
    expect(() =>
      buildApp({
        env: {
          NODE_ENV: "production",
          DEMO_MODE: false,
          SUPABASE_JWT_SECRET: ""
        }
      })
    ).toThrow("SUPABASE_JWT_SECRET is required in production");
  });
});
