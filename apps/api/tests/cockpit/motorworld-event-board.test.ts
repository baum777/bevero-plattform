import { describe, it, expect } from "vitest";
import { getTilesForProfile, getTileIds } from "../../../cockpit/lib/location-tiles.js";

describe("motorworld-event-board tile composition (ADR-0054)", () => {
  it("MOTORWORLD_STANDARD profile includes base tiles only", () => {
    const ids = getTileIds("MOTORWORLD_STANDARD");
    expect(ids).not.toContain("event_inquiry_detail");
    expect(ids).not.toContain("group_rule_badge");
    expect(ids).toMatchSnapshot();
  });

  it("EVENT_BANKETT_FUTURE profile includes event_pipeline and event_space_utilization tiles", () => {
    const ids = getTileIds("EVENT_BANKETT_FUTURE");
    expect(ids).toContain("event_pipeline");
    expect(ids).toContain("event_space_utilization");
    expect(ids).toMatchSnapshot();
  });
});
