"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, readApiJson } from "./backend/api-fetch";
import type { LocationProfile } from "./location-tiles";

export type TodayOverviewData = {
  locationId: string;
  date: string;
  activeServiceSlots: Array<{ id: string; name: string; slotKind: string; startTimeLocal: string; endTimeLocal: string }>;
  activeExceptionRules: Array<{ id: string; type: string; title: string; requiresConfirmation: boolean; startsAt: string | null; endsAt: string | null }>;
  openInquiries: { count: number; items: Array<{ id: string; subject: string; guestCount: number | null; status: string }> };
  reservationConnectors: Array<{ id: string; provider: string; externalUrl: string | null }>;
  externalSystemLinks: Array<{ id: string; kind: string; url: string }>;
  signatureAssets: string[];
  weatherSensitive: boolean;
};

export type LocationContextValue = {
  locationId: string;
  profile: LocationProfile | null;
  todayOverview: TodayOverviewData | null;
  loading: boolean;
  error: string | null;
};

const LocationContext = createContext<LocationContextValue | null>(null);

const CACHE_TTL_MS = 5 * 60 * 1000;

export function LocationContextProvider({
  locationId,
  accessToken,
  organizationId,
  children
}: {
  locationId: string;
  accessToken: string;
  organizationId: string;
  children: React.ReactNode;
}) {
  const [todayOverview, setTodayOverview] = useState<TodayOverviewData | null>(null);
  const [profile, setProfile] = useState<LocationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cachedAt = useRef<number | null>(null);

  const fetchOverview = useCallback(async () => {
    if (cachedAt.current && Date.now() - cachedAt.current < CACHE_TTL_MS) return;
    if (!accessToken || !organizationId) {
      setLoading(false);
      setError("Standort-Daten konnten ohne Organisationskontext nicht geladen werden");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, profileRes] = await Promise.all([
        apiFetch(`/admin/location/locations/${locationId}/today-overview`, {
          accessToken,
          organizationId,
          requireOrganization: true,
          throwOnError: false
        }),
        apiFetch(`/admin/location/locations/${locationId}/profile`, {
          accessToken,
          organizationId,
          requireOrganization: true,
          throwOnError: false
        })
      ]);
      if (!overviewRes.ok) throw new Error(`today-overview: ${overviewRes.status}`);
      if (!profileRes.ok) throw new Error(`profile: ${profileRes.status}`);
      const { overview } = await readApiJson(overviewRes) as { overview: TodayOverviewData };
      const { profile: p } = await readApiJson(profileRes) as { profile: { profile: LocationProfile } };
      setTodayOverview(overview);
      setProfile(p.profile);
      cachedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Standort-Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [locationId, accessToken, organizationId]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const value = useMemo(
    () => ({ locationId, profile, todayOverview, loading, error }),
    [locationId, profile, todayOverview, loading, error]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used inside LocationContextProvider");
  return ctx;
}

export function useLocationProfile(): LocationProfile | null {
  return useLocationContext().profile;
}

export function useTodayOverview(): TodayOverviewData | null {
  return useLocationContext().todayOverview;
}
