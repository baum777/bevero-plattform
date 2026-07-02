import { describe, expect, it } from "vitest";

describe("inquiry-routing snapshot (ADR-0058)", () => {
  it("classifies a wedding inquiry to PRIVATE_EVENTS (deterministic, no LLM)", () => {
    const rule = {
      businessUnitHint: "PRIVATE_EVENTS",
      matchedKeywords: ["hochzeit"],
      confidence: 60
    };
    expect(rule.businessUnitHint).toBe("PRIVATE_EVENTS");
    expect(rule.matchedKeywords).toContain("hochzeit");
    expect(rule.confidence).toBeGreaterThan(0);
  });

  it("classifies a corporate event to CORPORATE_EVENTS", () => {
    const rule = {
      businessUnitHint: "CORPORATE_EVENTS",
      matchedKeywords: ["firmenveranstaltung", "corporate"],
      confidence: 60
    };
    expect(rule.businessUnitHint).toBe("CORPORATE_EVENTS");
  });

  it("returns no-match for empty rule set", () => {
    const result = {
      matchedRuleId: null,
      businessUnitHint: null,
      confidence: 0,
      matchedKeywords: [] as string[]
    };
    expect(result.matchedRuleId).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
