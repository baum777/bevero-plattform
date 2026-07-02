"use client";

import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage, apiFetch, readApiJson } from "./backend/api-fetch";
import { useAuth } from "../app/providers/auth-provider";
import { createClient } from "./supabase/client";

export type EventSpaceItem = {
  id: string;
  name: string;
  maxCapacity: number | null;
  minCapacity: number | null;
  supports: string[];
};

export type ConnectorItem = {
  id: string;
  provider: string;
  externalUrl: string | null;
  isActive: boolean;
};

export type ExternalLinkItem = {
  id: string;
  kind: string;
  url: string;
  label: string | null;
};

export type ExceptionRuleItem = {
  id: string;
  type: string;
  title: string;
  requiresConfirmation: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export function useEventSpaces(locationId: string | null) {
  const { organizationId } = useAuth();
  const [eventSpaces, setEventSpaces] = useState<EventSpaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await cockpitGet(`/admin/location/locations/${locationId}/event-spaces`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { eventSpaces: es } = await readApiJson(res) as { eventSpaces: EventSpaceItem[] };
      setEventSpaces(es);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Event-Spaces"));
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { eventSpaces, loading, error };
}

export function useReservationConnectors(locationId: string | null) {
  const { organizationId } = useAuth();
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await cockpitGet(`/admin/location/locations/${locationId}/reservation-connectors`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { connectors: c } = await readApiJson(res) as { connectors: ConnectorItem[] };
      setConnectors(c);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Connectors"));
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { connectors, loading, error };
}

export function useExternalSystemLinks(locationId: string | null) {
  const { organizationId } = useAuth();
  const [links, setLinks] = useState<ExternalLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await cockpitGet(`/admin/location/locations/${locationId}/external-system-links`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { links: l } = await readApiJson(res) as { links: ExternalLinkItem[] };
      setLinks(l);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der System-Links"));
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { links, loading, error };
}

export function useExceptionRules(
  locationId: string | null,
  opts?: { type?: string; dateFrom?: string; dateTo?: string }
) {
  const { organizationId } = useAuth();
  const [rules, setRules] = useState<ExceptionRuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = opts?.type;
  const dateFrom = opts?.dateFrom;
  const dateTo = opts?.dateTo;

  const fetch_ = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString() ? `?${params.toString()}` : "";
    try {
      const res = await cockpitGet(`/admin/location/locations/${locationId}/exception-rules${qs}`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { exceptionRules: er } = await readApiJson(res) as { exceptionRules: ExceptionRuleItem[] };
      setRules(er);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Ausnahmeregeln"));
    } finally {
      setLoading(false);
    }
  }, [locationId, organizationId, type, dateFrom, dateTo]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { rules, loading, error };
}

async function cockpitGet(path: string, organizationId: string | null): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Keine aktive Session gefunden.");
  return apiFetch(path, {
    accessToken: token,
    organizationId,
    requireOrganization: true,
    throwOnError: false
  });
}
