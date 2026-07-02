/**
 * Pure inquiry query-string helpers — no React dependency.
 * Safe to import from backend tests and server code.
 */

export type InquiryFilters = {
  status?: string;
  businessUnitHint?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export function buildInquiryQs(filters?: InquiryFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.businessUnitHint) params.set("businessUnitHint", filters.businessUnitHint);
  if (filters.source) params.set("source", filters.source);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
