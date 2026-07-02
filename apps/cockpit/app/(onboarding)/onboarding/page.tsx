export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AuthSubmitButton } from "../../(auth)/components/auth-submit-button";
import { onboardingAction } from "../actions";
import { createClient } from "../../../lib/supabase/server";

type OnboardingPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function errorLabel(error?: string) {
  if (!error) return null;
  if (error === "missing_name") return "Bitte einen Organisationsnamen eingeben.";
  if (error === "create_failed") return "Organisation konnte nicht erstellt werden.";
  return "Onboarding fehlgeschlagen.";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = (await searchParams) ?? {};
  const error = errorLabel(params.error);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("OrganizationMember")
    .select("organizationId")
    .eq("userId", userId)
    .limit(1)
    .maybeSingle();

  if (membership?.organizationId) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-form-wrap" style={{ minHeight: "100dvh" }}>
      <article className="auth-card">
        <h1 className="page-title">Organisation einrichten</h1>
        <p className="page-desc">Richte dein Team für den ersten Start ein.</p>
        {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}
        <form action={onboardingAction} style={{ marginTop: 20 }}>
          <div className="field-stack">
            <label htmlFor="organization-name">Organisationsname</label>
            <input id="organization-name" name="organizationName" required type="text" />
          </div>
          <AuthSubmitButton
            idleLabel="Organisation erstellen"
            pendingLabel="Organisation wird erstellt..."
          />
        </form>
      </article>
    </main>
  );
}
