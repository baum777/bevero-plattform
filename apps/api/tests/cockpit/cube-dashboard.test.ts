import { describe, it, expect } from "vitest";
import { getTilesForProfile, getTileIds } from "../../../cockpit/lib/location-tiles.js";

describe("cube-dashboard tile composition (ADR-0053)", () => {
  it("CUBE_PREMIUM profile includes event-inquiry-detail tile", () => {
    const ids = getTileIds("CUBE_PREMIUM");
    expect(ids).toContain("event_inquiry_detail");
    expect(ids).toMatchSnapshot();
  });

  it("MOTORWORLD_STANDARD profile does not include event-inquiry-detail tile", () => {
    const ids = getTileIds("MOTORWORLD_STANDARD");
    expect(ids).not.toContain("event_inquiry_detail");
    expect(ids).toMatchSnapshot();
  });
});
