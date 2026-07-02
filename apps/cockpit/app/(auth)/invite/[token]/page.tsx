"use server";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { sanitizeInternalRedirect } from "../../../../lib/auth/redirect";

type AcceptInvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
};

type InviteRow = {
  email: string;
  role: string;
  expiresAt: string;
  status: string;
};

async function acceptInviteAction(token: string): Promise<{ error: string | null }> {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_organization_invite", { p_token: token });
  if (error) {
    const msg =
      error.message.includes("already a member")
        ? "Du bist bereits Mitglied dieser Organisation."
        : error.message.includes("expired")
          ? "Diese Einladung ist abgelaufen."
          : error.message.includes("no longer valid")
            ? "Diese Einladung wurde bereits verwendet oder widerrufen."
            : error.message.includes("not found")
              ? "Einladung nicht gefunden."
              : "Die Einladung konnte nicht angenommen werden.";
    return { error: msg };
  }
  return { error: null };
}

const roleLabels: Record<string, string> = {
  owner: "Inhaber",
  admin: "Admin",
  manager: "Schichtleitung",
  staff: "Mitarbeiter",
  viewer: "Lesender Zugriff"
};

export default async function AcceptInvitePage({ params, searchParams }: AcceptInvitePageProps) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    const next = sanitizeInternalRedirect(`/invite/${token}`);
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  // Load invite info (RLS allows any authenticated user to read pending invites)
  const { data: inviteRows, error: inviteLoadError } = await supabase
    .from("OrganizationInvite")
    .select("email,role,expiresAt,status")
    .eq("token", token)
    .returns<InviteRow[]>();

  const invite = inviteRows?.[0] ?? null;
  const isExpired = invite ? Date.parse(invite.expiresAt) < Date.now() : false;
  const isUsed = invite ? invite.status !== "pending" : false;

  async function handleAccept() {
    "use server";
    const result = await acceptInviteAction(token);
    if (result.error) {
      redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/dashboard");
  }

  return (
    <article className="auth-card">
      <h1 className="page-title">Einladung annehmen</h1>

      {sp.error ? (
        <p className="auth-feedback auth-feedback-error">{sp.error}</p>
      ) : null}

      {inviteLoadError || !invite ? (
        <p className="auth-feedback auth-feedback-error">
          Diese Einladung ist ungültig oder nicht mehr verfügbar.
        </p>
      ) : isExpired || isUsed ? (
        <p className="auth-feedback auth-feedback-error">
          {isExpired
            ? "Diese Einladung ist abgelaufen."
            : "Diese Einladung wurde bereits verwendet oder widerrufen."}
        </p>
      ) : (
        <>
          <p className="page-desc">
            Du wurdest eingeladen, dem Team beizutreten als{" "}
            <strong>{roleLabels[invite.role] ?? invite.role}</strong>.
          </p>
          <p className="page-desc" style={{ fontSize: "0.85em", color: "var(--text-secondary)" }}>
            Eingeloggt als: {userData.user.email}
          </p>
          <form action={handleAccept} style={{ marginTop: 20 }}>
            <button className="btn btn-primary" style={{ width: "100%" }} type="submit">
              Einladung annehmen
            </button>
          </form>
        </>
      )}

      <p className="page-desc auth-footnote">
        <Link href="/sign-in">Zurück zur Anmeldung</Link>
      </p>
    </article>
  );
}
