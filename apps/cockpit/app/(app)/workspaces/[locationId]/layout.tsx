import { createClient } from "../../../../lib/supabase/server";
import { LocationContextProvider } from "../../../../lib/location-context";

export default async function LocationLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";
  let organizationId = "";

  if (session?.user.id) {
    const { data: membership } = await supabase
      .from("OrganizationMember")
      .select("organizationId")
      .eq("userId", session.user.id)
      .limit(1)
      .maybeSingle<{ organizationId: string }>();

    organizationId = membership?.organizationId ?? "";
  }

  return (
    <LocationContextProvider
      locationId={locationId}
      accessToken={accessToken}
      organizationId={organizationId}
    >
      {children}
    </LocationContextProvider>
  );
}
