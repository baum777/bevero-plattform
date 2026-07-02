import Link from "next/link";
import { getAuthErrorMessage } from "../../../lib/auth/errors";
import { SignUpForm } from "./sign-up-form";

type SignUpPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = (await searchParams) ?? {};
  const error = getAuthErrorMessage(params.error, "Registrierung fehlgeschlagen.");

  return (
    <article className="auth-card">
      <h1 className="page-title">Registrieren</h1>
      <p className="page-desc">Erstelle dein Cockpit-Konto.</p>
      {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}
      <SignUpForm />
      <p className="page-desc auth-footnote">
        Bereits registriert? <Link href="/sign-in">Anmelden</Link>
      </p>
    </article>
  );
}
