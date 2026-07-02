"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../app/providers/auth-provider";
import { apiErrorMessage, apiFetch, readApiJson } from "./backend/api-fetch";
import { createClient } from "./supabase/client";

export type ServiceSlot = {
  id: string;
  name: string;
  slotKind: string;
  startTimeLocal: string;
  endTimeLocal: string;
  daysOfWeekMask: number;
  isActive: boolean;
};

export type MenuRecord = {
  id: string;
  name: string;
  slotKind: string;
  priceMode: string;
  scope: string;
  courseCount: number | null;
  validFrom: string | null;
  validUntil: string | null;
};

export type EventInquiryHeader = {
  id: string;
  subject: string;
  guestCount: number | null;
  preferredDate: string | null;
  status: string;
  assignedToUserId: string | null;
};

export function useServiceSlots(unitId: string | null, _date?: string) {
  const { organizationId } = useAuth();
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    try {
      const res = await cockpitGet(`/admin/location/units/${unitId}/service-slots`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { serviceSlots } = await readApiJson(res) as { serviceSlots: ServiceSlot[] };
      setSlots(serviceSlots);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Service-Slots"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, unitId]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { slots, loading, error };
}

export function useMenuCatalog(unitId: string | null, slotKind?: string, _date?: string) {
  const { organizationId } = useAuth();
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    const slotParam = slotKind ? `?slotKind=${encodeURIComponent(slotKind)}` : "";
    try {
      const res = await cockpitGet(`/admin/menu/operational-units/${unitId}/menus${slotParam}`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { menus: m } = await readApiJson(res) as { menus: MenuRecord[] };
      setMenus(m);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Menüs"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, unitId, slotKind]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { menus, loading, error };
}

export function useEventInquiries(unitId: string | null, status?: string) {
  const { organizationId } = useAuth();
  const [inquiries, setInquiries] = useState<EventInquiryHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    const params = new URLSearchParams({ unitId });
    if (status) params.set("status", status);
    try {
      const res = await cockpitGet(`/admin/cube/event-inquiries?${params}`, organizationId);
      if (!res.ok) throw new Error(`${res.status}`);
      const { inquiries: inq } = await readApiJson(res) as { inquiries: EventInquiryHeader[] };
      setInquiries(inq);
    } catch (err) {
      setError(apiErrorMessage(err, "Fehler beim Laden der Anfragen"));
    } finally {
      setLoading(false);
    }
  }, [organizationId, unitId, status]);

  useEffect(() => { void fetch_(); }, [fetch_]);
  return { inquiries, loading, error };
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
