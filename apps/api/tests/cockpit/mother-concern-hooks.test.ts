import { describe, expect, it } from "vitest";

import {
  buildInquiryQs,
  type InquiryFilters
} from "../../../cockpit/lib/inquiry-utils.js";

describe("mother-concern-hooks: buildInquiryQs (ADR-0057, ADR-0058)", () => {
  it("returns empty string when no filters are given", () => {
    expect(buildInquiryQs(undefined)).toBe("");
    expect(buildInquiryQs({})).toBe("");
  });

  it("encodes single status filter", () => {
    const qs = buildInquiryQs({ status: "NEW" });
    expect(qs).toBe("?status=NEW");
  });

  it("encodes all supported filter dimensions", () => {
    const filters: InquiryFilters = {
      status: "NEEDS_HUMAN_REVIEW",
      businessUnitHint: "CORPORATE_EVENTS",
      source: "RAUSCHENBERGER_WEBSITE",
      dateFrom: "2026-06-01T00:00:00Z",
      dateTo: "2026-06-30T23:59:59Z",
      limit: 25,
      offset: 50
    };
    const qs = buildInquiryQs(filters);
    expect(qs).toContain("status=NEEDS_HUMAN_REVIEW");
    expect(qs).toContain("businessUnitHint=CORPORATE_EVENTS");
    expect(qs).toContain("source=RAUSCHENBERGER_WEBSITE");
    expect(qs).toContain("dateFrom=2026-06-01T00%3A00%3A00Z");
    expect(qs).toContain("dateTo=2026-06-30T23%3A59%3A59Z");
    expect(qs).toContain("limit=25");
    expect(qs).toContain("offset=50");
  });

  it("omits empty filter values", () => {
    const qs = buildInquiryQs({ status: "NEW", businessUnitHint: "", source: undefined });
    expect(qs).toBe("?status=NEW");
  });
});
