import { describe, expect, it } from "vitest";

import { getTileIds, getTilesForProfile } from "../../../cockpit/lib/location-tiles.js";

describe("location-tiles (ADR-0052 Task 07)", () => {
  it("MOTORWORLD_STANDARD includes base tiles and not CUBE-specific tiles", () => {
    const ids = getTileIds("MOTORWORLD_STANDARD");
    expect(ids).toContain("refill_runs");
    expect(ids).toContain("critical_stock");
    expect(ids).toContain("open_inquiries");
    expect(ids).not.toContain("service_preparation");
    expect(ids).not.toContain("group_rule_badge");
    expect(ids).not.toContain("event_pipeline");
    expect(ids).toMatchSnapshot();
  });

  it("CUBE_PREMIUM includes base tiles plus service-preparation and group_rule_badge", () => {
    const ids = getTileIds("CUBE_PREMIUM");
    expect(ids).toContain("refill_runs");
    expect(ids).toContain("service_preparation");
    expect(ids).toContain("group_rule_badge");
    expect(ids).toContain("menu_active");
    expect(ids).not.toContain("event_pipeline");
    expect(ids).toMatchSnapshot();
  });

  it("EVENT_BANKETT_FUTURE includes event_pipeline and event_space_utilization", () => {
    const ids = getTileIds("EVENT_BANKETT_FUTURE");
    expect(ids).toContain("event_pipeline");
    expect(ids).toContain("event_space_utilization");
    expect(ids).not.toContain("service_preparation");
    expect(ids).not.toContain("group_rule_badge");
    expect(ids).toMatchSnapshot();
  });
});
