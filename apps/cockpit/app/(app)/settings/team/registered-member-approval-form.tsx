"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";
type AssignableRole = "admin" | "manager" | "staff" | "viewer";

type RegisteredMemberApprovalFormProps = {
  currentRole: OrganizationRole;
  organizationId: string;
};

const roleLabels: Record<AssignableRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Mitarbeiter",
  viewer: "Viewer"
};

export function RegisteredMemberApprovalForm({
  currentRole,
  organizationId
}: RegisteredMemberApprovalFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>(currentRole === "owner" ? "admin" : "staff");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleOptions = useMemo<AssignableRole[]>(() => {
    if (currentRole === "owner") {
      return ["admin", "manager", "staff", "viewer"];
    }

    return ["manager", "staff", "viewer"];
  }, [currentRole]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setError("Keine aktive Session gefunden.");
      return;
    }

    try {
      await apiFetch("/admin/team/members/confirm", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: {
          email,
          role
        }
      });
    } catch (error) {
      setError(apiErrorMessage(error, "Mitarbeiter konnte nicht bestätigt werden."));
      return;
    }

    setEmail("");
    setSuccess("Mitarbeiter bestätigt.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="toolbar-row storage-toolbar" onSubmit={submit}>
      <input
        aria-label="E-Mail des registrierten Mitarbeiters"
        className="toolbar-input"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="mitarbeiter@example.com"
        required
        type="email"
        value={email}
      />
      <select
        aria-label="Rolle"
        className="toolbar-input"
        name="role"
        onChange={(event) => setRole(event.target.value as AssignableRole)}
        value={role}
      >
        {roleOptions.map((option) => (
          <option key={option} value={option}>
            {roleLabels[option]}
          </option>
        ))}
      </select>
      <button disabled={isPending} type="submit">
        Bestätigen
      </button>
      <span aria-live="polite" className={error ? "state-desc state-panel-error" : "state-desc"}>
        {error ?? success ?? ""}
      </span>
    </form>
  );
}
