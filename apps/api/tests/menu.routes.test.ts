import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { MenuService } from "../src/modules/menu/menu.service.js";
import type {
  MenuDatabaseClient,
  MenuItemAllergenRecord,
  MenuItemIngredientRecord,
  MenuItemRecord,
  MenuRecord,
} from "../src/modules/menu/menu.types.js";

const testJwtSecret = "test-supabase-jwt-secret";
const testOrganizationId = "org-test";
const otherOrganizationId = "org-other";

function authHeaders(userId: string): Record<string, string> {
  return { authorization: `Bearer ${createTestToken(userId)}` };
}

function createTestToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(
    Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 }))
  );
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", testJwtSecret).update(body).digest();
  return `${body}.${toBase64Url(sig)}`;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function orgRole(userId: string): "owner" | "admin" | "manager" | "staff" | "viewer" | null {
  if (userId.startsWith("owner-")) return "owner";
  if (userId.startsWith("admin-")) return "admin";
  if (userId.startsWith("shift-")) return "manager";
  if (userId.startsWith("staff-")) return "staff";
  if (userId.startsWith("viewer-")) return "viewer";
  return null;
}

function buildMenu(overrides: Partial<MenuRecord> = {}): MenuRecord {
  return {
    id: "menu-1",
    organizationId: testOrganizationId,
    operationalUnitId: "ou-1",
    name: "CUBE Lunch",
    slotKind: "lunch",
    courseCount: 3,
    priceMode: "gross_including_vat",
    scope: "restaurant_lunch",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    isActive: true,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildMenuItem(overrides: Partial<MenuItemRecord> = {}): MenuItemRecord {
  return {
    id: "mi-1",
    organizationId: testOrganizationId,
    menuId: "menu-1",
    name: "Lachs auf Blattspinat",
    position: 1,
    category: "FISH_MEAT",
    pricePerPersonCents: 2890,
    isVeganPossible: false,
    isVegetarian: false,
    description: "Atlantischer Lachs",
    imageUrl: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildIngredient(overrides: Partial<MenuItemIngredientRecord> = {}): MenuItemIngredientRecord {
  return {
    id: "ing-1",
    organizationId: testOrganizationId,
    menuItemId: "mi-1",
    inventoryItemId: "inv-lachs",
    quantityPerPerson: 0.2,
    unit: "kg",
    isPremium: false,
    notes: null,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function buildAllergen(overrides: Partial<MenuItemAllergenRecord> = {}): MenuItemAllergenRecord {
  return {
    id: "all-1",
    organizationId: testOrganizationId,
    menuItemId: "mi-1",
    allergenCode: "D",
    isTrace: false,
    createdAt: new Date("2026-06-09T10:00:00.000Z"),
    updatedAt: new Date("2026-06-09T10:00:00.000Z"),
    ...overrides
  };
}

function createFakeDb(input: {
  menus?: MenuRecord[];
  items?: MenuItemRecord[];
  ingredients?: MenuItemIngredientRecord[];
  allergens?: MenuItemAllergenRecord[];
  units?: { id: string }[];
}): MenuDatabaseClient {
  return {
    operationalUnit: {
      async findFirst(args) {
        return (input.units ?? []).find((u) => u.id === args.where.id) ?? null;
      }
    },
    menu: {
      async findMany(args) {
        return (input.menus ?? []).filter(
          (m) =>
            m.operationalUnitId === args.where.operationalUnitId &&
            m.organizationId === args.where.organizationId &&
            (args.where.isActive === undefined || m.isActive === args.where.isActive) &&
            (args.where.slotKind === undefined || m.slotKind === args.where.slotKind)
        );
      },
      async findFirst(args) {
        const m = (input.menus ?? []).find(
          (m) => m.id === args.where.id && m.organizationId === args.where.organizationId
        );
        if (!m) return null;
        return { ...m, items: args.include?.items ? (input.items ?? []).filter((i) => i.menuId === m.id) : undefined };
      }
    },
    menuItem: {
      async findMany(args) {
        return (input.items ?? []).filter(
          (i) => i.menuId === args.where.menuId && i.organizationId === args.where.organizationId
        );
      },
      async findFirst(args) {
        const i = (input.items ?? []).find(
          (i) => i.id === args.where.id && i.organizationId === args.where.organizationId
        );
        if (!i) return null;
        return {
          ...i,
          ingredients: args.include?.ingredients
            ? (input.ingredients ?? []).filter((ing) => ing.menuItemId === i.id)
            : undefined,
          allergens: args.include?.allergens
            ? (input.allergens ?? []).filter((a) => a.menuItemId === i.id)
            : undefined
        };
      }
    }
  };
}

function buildTestApp(input: {
  menus?: MenuRecord[];
  items?: MenuItemRecord[];
  ingredients?: MenuItemIngredientRecord[];
  allergens?: MenuItemAllergenRecord[];
  units?: { id: string }[];
}) {
  return buildApp({
    env: { NODE_ENV: "development", DEMO_MODE: false },
    menu: {
      menuService: new MenuService({ db: createFakeDb(input) }),
      auth: {
        jwtSecret: testJwtSecret,
        db: {
          organizationMember: {
            async findMany(args: { where: { userId: string } }) {
              const role = orgRole(args.where.userId);
              if (!role) return [];
              return [{ organizationId: testOrganizationId, role, createdAt: new Date() }];
            }
          }
        } as never
      }
    }
  });
}

describe("menu API routes (ADR-0029-A2 Task 02)", () => {
  describe("GET /admin/menu/operational-units/:unitId/menus", () => {
    it("returns active menus for a unit in sort order", async () => {
      const app = buildTestApp({
        units: [{ id: "ou-1" }],
        menus: [
          buildMenu({ id: "menu-lunch", slotKind: "lunch", validFrom: new Date("2026-01-01") }),
          buildMenu({ id: "menu-dinner", slotKind: "dinner", validFrom: new Date("2026-03-01") }),
          buildMenu({ id: "menu-old", slotKind: "lunch", isActive: false })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/operational-units/ou-1/menus",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { menus: Array<{ id: string }> };
        expect(body.menus.map((m) => m.id)).not.toContain("menu-old");
        expect(body.menus.length).toBe(2);
      } finally {
        await app.close();
      }
    });

    it("filters by slotKind query param", async () => {
      const app = buildTestApp({
        units: [{ id: "ou-1" }],
        menus: [
          buildMenu({ id: "menu-lunch", slotKind: "lunch" }),
          buildMenu({ id: "menu-dinner", slotKind: "dinner" })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/operational-units/ou-1/menus?slotKind=lunch",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { menus: Array<{ id: string }> };
        expect(body.menus.map((m) => m.id)).toEqual(["menu-lunch"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/menu/:id", () => {
    it("returns menu detail with items", async () => {
      const app = buildTestApp({
        units: [{ id: "ou-1" }],
        menus: [buildMenu({ id: "menu-1" })],
        items: [
          buildMenuItem({ id: "mi-1", position: 1 }),
          buildMenuItem({ id: "mi-2", name: "Crème brûlée", position: 2, category: "DESSERT" })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/menu-1",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { menu: { id: string; priceMode: string; scope: string; items: unknown[] } };
        expect(body.menu.id).toBe("menu-1");
        expect(body.menu.priceMode).toBe("gross_including_vat");
        expect(body.menu.scope).toBe("restaurant_lunch");
        expect(body.menu.items.length).toBe(2);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for a cross-org menu", async () => {
      const app = buildTestApp({
        menus: [buildMenu({ id: "menu-foreign", organizationId: otherOrganizationId })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/menu-foreign",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("GET /admin/menu/items/:id", () => {
    it("returns item detail with ingredients and allergens", async () => {
      const app = buildTestApp({
        items: [buildMenuItem({ id: "mi-1", imageUrl: "https://cdn.example.com/lachs.jpg" })],
        ingredients: [buildIngredient({ id: "ing-1" })],
        allergens: [
          buildAllergen({ id: "all-D", allergenCode: "D" }),
          buildAllergen({ id: "all-A", allergenCode: "A", isTrace: true })
        ]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/items/mi-1",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as {
          item: {
            id: string;
            imageUrl: string | null;
            ingredients: Array<{ allergenCode?: string }>;
            allergens: Array<{ allergenCode: string; isTrace: boolean }>;
          };
        };
        expect(body.item.id).toBe("mi-1");
        expect(body.item.imageUrl).toBe("https://cdn.example.com/lachs.jpg");
        expect(body.item.allergens.length).toBe(2);
        const trace = body.item.allergens.find((a) => a.allergenCode === "A");
        expect(trace?.isTrace).toBe(true);
      } finally {
        await app.close();
      }
    });

    it("returns 404 for an unknown item", async () => {
      const app = buildTestApp({ items: [] });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/items/mi-missing",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });
  });

  describe("Brutto/Netto invariant (service-layer scope check)", () => {
    it("menu with restaurant_lunch scope has gross_including_vat priceMode", async () => {
      const app = buildTestApp({
        units: [{ id: "ou-1" }],
        menus: [buildMenu({ id: "menu-1", scope: "restaurant_lunch", priceMode: "gross_including_vat" })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/menu-1",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { menu: { priceMode: string } };
        expect(body.menu.priceMode).toBe("gross_including_vat");
      } finally {
        await app.close();
      }
    });
  });

  describe("auth + role gates", () => {
    it("rejects unauthenticated with 401", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/operational-units/ou-1/menus"
        });
        expect(res.statusCode).toBe(401);
      } finally {
        await app.close();
      }
    });

    it("rejects viewer with 403", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/operational-units/ou-1/menus",
          headers: authHeaders("viewer-1")
        });
        expect(res.statusCode).toBe(403);
      } finally {
        await app.close();
      }
    });

    it("returns 400 for blank item id", async () => {
      const app = buildTestApp({});
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/items/%20",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await app.close();
      }
    });
  });

  describe("RLS scope", () => {
    it("does not return menus from another org", async () => {
      const app = buildTestApp({
        units: [{ id: "ou-1" }],
        menus: [buildMenu({ id: "menu-other", organizationId: otherOrganizationId })]
      });
      try {
        await app.ready();
        const res = await app.inject({
          method: "GET",
          url: "/admin/menu/operational-units/ou-1/menus",
          headers: authHeaders("staff-1")
        });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { menus: unknown[] };
        expect(body.menus).toEqual([]);
      } finally {
        await app.close();
      }
    });
  });
});
