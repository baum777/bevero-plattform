import { apiFetch, readApiJson } from "../../backend/api-fetch";
import { createClient } from "../server";

type LocationListItem = {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  type: string | null;
  profile: string;
  precisionLevel: string;
  signatureAssets: string[];
  weatherSensitive: boolean;
  cinemaAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type OrganizationMemberRow = {
  organizationId: string;
};

export async function listLocationsForCurrentUser(): Promise<{ locations: LocationListItem[] }> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { locations: [] };

  const { data: memberships } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", session.user.id)
    .limit(1)
    .returns<OrganizationMemberRow[]>();
  const organizationId = memberships?.[0]?.organizationId ?? null;

  const res = await apiFetch("/admin/location/locations", {
    accessToken: session.access_token,
    organizationId,
    requireOrganization: true,
    throwOnError: false,
    transportMode: "direct"
  });

  if (!res.ok) return { locations: [] };
  return readApiJson<{ locations: LocationListItem[] }>(res);
}
