"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiJson } from "../../../../lib/backend/api-fetch";
import type { Role } from "../../../../lib/auth/rbac";
import { ROLE_LABELS } from "../../../../lib/auth/rbac";

type AssignableRole = Exclude<Role, "owner">;

const assignableRoles: AssignableRole[] = ["admin", "manager", "staff", "viewer"];

export type CreatedInvite = {
  id: string;
  token: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
};

type CreateInviteFormProps = {
  currentRole: Role;
  organizationId: string;
  onCreated: (invite: CreatedInvite) => void;
};

export function CreateInviteForm({ currentRole, organizationId, onCreated }: CreateInviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleOptions = useMemo<AssignableRole[]>(() => {
    if (currentRole === "owner") return assignableRoles;
    return assignableRoles.filter((r) => r !== "admin");
  }, [currentRole]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Keine aktive Session gefunden.");
      return;
    }

    startTransition(async () => {
      try {
        const body = await apiJson<{ invite: CreatedInvite }>("/admin/team/invites", {
          method: "POST",
          accessToken: token,
          organizationId,
          requireOrganization: true,
          body: { email, role }
        });

        setEmail("");
        onCreated(body.invite);
      } catch (error) {
        setError(apiErrorMessage(error, "Einladung konnte nicht erstellt werden."));
      }
    });
  }

  return (
    <form className="toolbar-row storage-toolbar" onSubmit={submit}>
      <input
        aria-label="E-Mail des einzuladenden Mitarbeiters"
        className="toolbar-input"
        name="email"
        onChange={(e) => setEmail(e.target.value)}
        placeholder="mitarbeiter@example.com"
        required
        type="email"
        value={email}
      />
      <select
        aria-label="Rolle"
        className="toolbar-input"
        name="role"
        onChange={(e) => setRole(e.target.value as AssignableRole)}
        value={role}
      >
        {roleOptions.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <button disabled={isPending} type="submit">
        {isPending ? "Erstellt..." : "Einladen"}
      </button>
      {error ? (
        <span aria-live="polite" className="state-desc state-panel-error">
          {error}
        </span>
      ) : null}
    </form>
  );
}
