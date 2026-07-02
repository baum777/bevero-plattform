"use client";

import { useState } from "react";
import { signUpAction } from "../actions";
import { AuthSubmitButton } from "../components/auth-submit-button";
import { PasswordRuleChecklist } from "../components/password-rule-checklist";

export function SignUpForm() {
  const [password, setPassword] = useState("");

  return (
    <form action={signUpAction} style={{ marginTop: 20 }}>
      <div className="field-stack">
        <label htmlFor="name">Vollständiger Name</label>
        <input autoComplete="name" id="name" name="name" required type="text" />
      </div>
      <div className="field-stack">
        <label htmlFor="email">E-Mail</label>
        <input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="field-stack">
        <label htmlFor="password">Passwort</label>
        <input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
        <PasswordRuleChecklist password={password} />
      </div>
      <div className="field-stack">
        <label htmlFor="password-confirm">Passwort bestätigen</label>
        <input id="password-confirm" name="passwordConfirm" required type="password" />
      </div>
      <AuthSubmitButton idleLabel="Account erstellen" pendingLabel="Registrierung läuft..." />
    </form>
  );
}
