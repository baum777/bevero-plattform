import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

const testJwtSecret = "test-supabase-jwt-secret";

describe("response compression", () => {
  it("compresses large API JSON responses when the client accepts gzip", async () => {
    const app = buildApp({
      inventory: {
        inventoryMasterDataService: {
          async list() {
            return {
              categories: Array.from({ length: 100 }, (_, index) => ({
                id: `category-${index}`,
                name: "Tomaten passiert 5kg"
              })),
              units: [],
              storageLocations: []
            };
          }
        },
        auth: {
          db: {
            organizationMember: {
              async findMany() {
                return [
                  {
                    organizationId: "org-test",
                    role: "staff",
                    createdAt: new Date("2026-05-25T17:00:00.000Z")
                  }
                ];
              }
            }
          },
          jwtSecret: testJwtSecret
        }
      } as never
    });

    try {
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/inventory/master-data",
        headers: {
          "accept-encoding": "gzip",
          authorization: `Bearer ${createTestToken("staff-1")}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-encoding"]).toBe("gzip");
    } finally {
      await app.close();
    }
  });
});

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(
    Buffer.from(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT"
      })
    )
  );
  const payload = toBase64Url(
    Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: now,
        exp: now + 60 * 60
      })
    )
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", testJwtSecret).update(body).digest();

  return `${body}.${toBase64Url(signature)}`;
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
