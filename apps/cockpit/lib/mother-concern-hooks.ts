"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../app/providers/auth-provider";
import { apiErrorMessage, apiFetch, readApiJson } from "./backend/api-fetch";
import type { BusinessUnitNameValue } from "./business-unit-constants";
import { buildInquiryQs as _buildInquiryQs, type InquiryFilters } from "./inquiry-utils";
import { createClient } from "./supabase/client";

export type { BusinessUnitNameValue };
export { buildInquiryQs, type InquiryFilters } from "./inquiry-utils";

// ============================================================================
// DTOs (mirror src/modules/organization/organization.types.ts)
// ============================================================================

export type BusinessUnitDto = {
  id: string;
  organizationId: string;
  name: BusinessUnitNameValue;
  slug: string;
  description: string | null;
  defaultWorkflowKey: string;
  requiredInquiryFields: unknown;
  createdAt: string;
  updatedAt: string;
};

export type EventConceptDto = {
  id: string;
  organizationId: string;
  name: string;
  customName: string | null;
  description: string | null;
  themeTags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExternalCatalogEntryDto = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  city: string;
  region: string;
  type: string;
  capacityMin: number | null;
  capacityMax: number | null;
  cateringMode: string;
  isActive: boolean;
};

export type CompatibleLocationRow = {
  compatibilityId: string;
  compatibilityScore: number | null;
  notes: string | null;
  location:
    | {
        id: string;
        name: string;
        city: string | null;
        profile: string;
        brandId: string;
        isExternal: false;
      }
    | {
        id: string;
        name: string;
        city: string;
        type: string;
        capacityMin: number | null;
        capacityMax: number | null;
        cateringMode: string;
        isExternal: true;
      };
};

export type OrganizationOverview = {
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  businessUnitCounts: Record<BusinessUnitNameValue, number>;
  locationCount: number;
  externalLocationCount: number;
  signatureAssetCount: number;
  inquiryStats: {
    total: number;
    byStatus: Record<string, number>;
    byBusinessUnit: Record<string, number>;
    last7Days: number;
    last30Days: number;
  };
  criticalStockLocations: Array<{
    locationId: string;
    locationName: string;
    criticalStockAlerts: number;
  }>;
  activeExceptionRules: Array<{
    id: string;
    type: string;
    title: string;
    locationId: string;
    locationName: string;
    startsAt: string | null;
    endsAt: string | null;
  }>;
  upcomingEvents: Array<{
    id: string;
    subject: string;
    guestCount: number | null;
    preferredDate: string | null;
    businessUnitHint: BusinessUnitNameValue | null;
    status: string;
    source: string;
    contactNameInitials: string;
  }>;
  locationComparison: Array<{
    locationId: string;
    locationName: string;
    isExternal: boolean;
    brandId: string | null;
    city: string | null;
    criticalStockAlerts: number;
    activeExceptionRules: number;
    openInquiries: number;
    signatureAssetCount: number;
  }>;
};

export type InquiryListItem = {
  id: string;
  organizationId: string;
  businessUnitHint: BusinessUnitNameValue | null;
  source: string;
  subject: string;
  guestCount: number | null;
  preferredDate: string | null;
  status: string;
  assignedToUserId: string | null;
  hasRawMessage: boolean;
  hasContactEmail: boolean;
  hasContactPhone: boolean;
  hasContactAddress: boolean;
  contactNameInitials: string;
  routingRuleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InquiryDetailHeader = InquiryListItem & {
  externalRef: string | null;
  preferredLocationId: string | null;
  preferredExternalCatalogEntryId: string | null;
};

export type ClassificationResult = {
  matchedRuleId: string | null;
  businessUnitHint: BusinessUnitNameValue | null;
  confidence: number;
  matchedKeywords: string[];
};

export type InquiryAuditEntry = {
  id: string;
  inquiryId: string | null;
  matchedRuleId: string | null;
  matchedKeywords: string[];
  confidence: number;
  businessUnitHint: BusinessUnitNameValue | null;
  callerUserId: string | null;
  createdAt: string;
};

// ============================================================================
// Hooks
// ============================================================================

function useFetch<T>(path: string, deps: ReadonlyArray<unknown>): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { organizationId } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cockpitFetch(path, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const body = (await readApiJson(res)) as Record<string, T>;
      const firstKey = Object.keys(body)[0];
      setData(firstKey ? body[firstKey] : null);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, organizationId, ...deps]);

  useEffect(() => {
    void fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useOrganizationOverview() {
  return useFetch<OrganizationOverview>("/admin/organization/overview", []);
}

export function useBusinessUnits() {
  return useFetch<BusinessUnitDto[]>("/admin/organization/business-units", []);
}

export function useEventConcepts(businessUnitId?: string) {
  const qs = businessUnitId ? `?businessUnitId=${encodeURIComponent(businessUnitId)}` : "";
  return useFetch<EventConceptDto[]>(`/admin/organization/event-concepts${qs}`, [businessUnitId]);
}

export function useCompatibleLocations(eventConceptId: string | null) {
  return useFetch<CompatibleLocationRow[]>(
    eventConceptId
      ? `/admin/organization/event-concepts/${eventConceptId}/compatible-locations`
      : "",
    [eventConceptId]
  );
}

export function useExternalCatalogEntries() {
  return useFetch<ExternalCatalogEntryDto[]>(
    "/admin/organization/external-catalog-entries",
    []
  );
}

export function useInquiries(filters?: InquiryFilters) {
  return useFetch<InquiryListItem[]>(`/admin/inquiries${_buildInquiryQs(filters)}`, [
    filters?.status,
    filters?.businessUnitHint,
    filters?.source,
    filters?.dateFrom,
    filters?.dateTo,
    filters?.limit,
    filters?.offset
  ]);
}

export const BUSINESS_UNIT_LABELS: Record<BusinessUnitNameValue, string> = {
  CORPORATE_EVENTS: "Corporate Events",
  PRIVATE_EVENTS: "Private Events",
  RESTAURANTS: "Restaurants",
  BOOK_THE_CONCEPT: "Buchbare Konzepte",
  LOCATIONS: "Standorte"
};

export function useInquiry(id: string | null) {
  return useFetch<InquiryDetailHeader>(id ? `/admin/inquiries/${id}` : "", [id]);
}

export function useInquiryAudit(id: string | null) {
  return useFetch<InquiryAuditEntry[]>(id ? `/admin/inquiries/${id}/audit` : "", [id]);
}

export type ClassifyInput = {
  rawMessage: string;
  subject?: string;
  guestCount?: number;
  inquiryId?: string;
  commit?: boolean;
};

export function useClassifyInquiry() {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classify = useCallback(
    async (input: ClassifyInput): Promise<ClassificationResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await cockpitFetch("/admin/inquiries/classify", organizationId, {
          method: "POST",
          body: input
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const body = (await readApiJson(res)) as { classification: ClassificationResult };
        return body.classification;
      } catch (err) {
        setError(apiErrorMessage(err, "Klassifizierung fehlgeschlagen"));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  return { classify, loading, error };
}

async function cockpitFetch(
  path: string,
  organizationId: string | null,
  init: Partial<Parameters<typeof apiFetch>[1]> = {}
): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Keine aktive Session gefunden.");
  return apiFetch(path, {
    ...init,
    accessToken: token,
    organizationId,
    requireOrganization: true,
    throwOnError: false
  });
}
