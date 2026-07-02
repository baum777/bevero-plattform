import Link from "next/link";
import { signInAction } from "../actions";
import { AuthSubmitButton } from "../components/auth-submit-button";
import { getAuthErrorMessage } from "../../../lib/auth/errors";
import { sanitizeInternalRedirect } from "../../../lib/auth/redirect";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

function infoLabel(message?: string) {
  if (message === "check_email") {
    return "Bitte prüfe dein E-Mail-Postfach und bestätige den Link.";
  }
  return null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const error = getAuthErrorMessage(params.error, "Anmeldung fehlgeschlagen.");
  const info = infoLabel(params.message);
  const next = sanitizeInternalRedirect(params.next ?? null);

  // A failed credential check can't safely point at a single field (revealing
  // which of email/password was wrong is an info leak), so both fields are
  // marked invalid and tied to the shared message.
  const credentialError = params.error === "invalid_credentials" || params.error === "missing_fields";
  const fieldErrorId = error ? "auth-error" : undefined;

  return (
    <article className="auth-card">
      <h1 className="page-title">Anmelden</h1>
      <p className="page-desc">Melde dich mit deinem Teamkonto an.</p>
      {error ? (
        <p className="auth-feedback auth-feedback-error" id="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      {info ? <p className="auth-feedback auth-feedback-info">{info}</p> : null}
      <form action={signInAction} style={{ marginTop: 20 }}>
        <input name="next" type="hidden" value={next} />
        <div className="field-stack">
          <label htmlFor="email">E-Mail</label>
          <input
            aria-describedby={credentialError ? fieldErrorId : undefined}
            aria-invalid={credentialError || undefined}
            autoComplete="email"
            autoFocus
            className={credentialError ? "field-error" : undefined}
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
        <div className="field-stack">
          <label htmlFor="password">Passwort</label>
          <input
            aria-describedby={credentialError ? fieldErrorId : undefined}
            aria-invalid={credentialError || undefined}
            autoComplete="current-password"
            className={credentialError ? "field-error" : undefined}
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
        <AuthSubmitButton idleLabel="Anmelden" pendingLabel="Anmeldung läuft..." />
      </form>
      <p className="page-desc auth-footnote">
        Noch kein Account? <Link href="/sign-up">Registrieren</Link>
      </p>
    </article>
  );
}
