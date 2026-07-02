import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

describe("CORS preflight", () => {
  it("allows the local web app to call protected inventory routes", async () => {
    const app = buildApp();

    try {
      await app.ready();

      const response = await app.inject({
        method: "OPTIONS",
        url: "/admin/inventory/items",
        headers: {
          origin: "http://127.0.0.1:4173",
          "access-control-request-method": "GET",
          "access-control-request-headers": "content-type,authorization"
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4173");
      expect(response.headers["access-control-allow-methods"]).toContain("GET");
      expect(response.headers["access-control-allow-headers"]).toContain("authorization");
      expect(response.headers["access-control-allow-headers"]).toContain("x-organization-id");
      expect(response.headers["access-control-max-age"]).toBe("600");
      expect(response.body).toBe("");
    } finally {
      await app.close();
    }
  });

  it("allows a configured production Cockpit origin", async () => {
    const app = buildApp({
      env: {
        CORS_ALLOWED_ORIGINS: "https://bevero.vercel.app"
      }
    });

    try {
      await app.ready();

      const response = await app.inject({
        method: "OPTIONS",
        url: "/admin/inventory/items",
        headers: {
          origin: "https://bevero.vercel.app",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,authorization"
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://bevero.vercel.app"
      );
    } finally {
      await app.close();
    }
  });

  it("does not expose CORS headers for unconfigured origins", async () => {
    const app = buildApp({
      env: {
        CORS_ALLOWED_ORIGINS: "https://bevero.vercel.app"
      }
    });

    try {
      await app.ready();

      const response = await app.inject({
        method: "OPTIONS",
        url: "/admin/inventory/items",
        headers: {
          origin: "https://example.invalid",
          "access-control-request-method": "GET"
        }
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
