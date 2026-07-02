"use client";

type PasswordRule = {
  id: string;
  label: string;
  valid: boolean;
};

type PasswordRuleChecklistProps = {
  password: string;
};

export function PasswordRuleChecklist({ password }: PasswordRuleChecklistProps) {
  const rules: PasswordRule[] = [
    { id: "length", label: "Mindestens 8 Zeichen", valid: password.length >= 8 },
    { id: "uppercase", label: "Ein Großbuchstabe", valid: /[A-Z]/.test(password) },
    { id: "number", label: "Eine Zahl", valid: /\d/.test(password) },
  ];

  if (password.length === 0) return null;

  return (
    <ul className="password-rules" aria-label="Passwortanforderungen">
      {rules.map((rule) => (
        <li
          className={`password-rule password-rule--${rule.valid ? "ok" : "fail"}`}
          key={rule.id}
        >
          <span aria-hidden="true">{rule.valid ? "✓" : "✗"}</span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
