import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import {
  shiftPlanningRoute,
  type ShiftPlanningRouteDependencies
} from "../src/routes/shift-planning.route.js";

describe("shift-planning task routes", () => {
  it("registers the staff task-list path used by Cockpit", async () => {
    const app = Fastify();
    app.register(shiftPlanningRoute, {} as ShiftPlanningRouteDependencies);

    try {
      await app.ready();
      const response = await app.inject({
        method: "GET",
        url: "/shift-planning/tasks?date=2026-06-19"
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
