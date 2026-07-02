"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch, apiJson } from "../../../../lib/backend/api-fetch";
import { Badge } from "../../../components/ui/badge";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { CreateInviteForm, type CreatedInvite } from "./create-invite-form";
import type { Role } from "../../../../lib/auth/rbac";
import { ROLE_LABELS } from "../../../../lib/auth/rbac";

type PendingInvite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
  createdAt: string;
};

type InviteListProps = {
  currentRole: Role;
  organizationId: string;
};

function formatDate(value: string) {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return value;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(ts));
}

function isExpired(expiresAt: string) {
  return Date.parse(expiresAt) < Date.now();
}

export function InviteList({ currentRole, organizationId }: InviteListProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Keine aktive Session.");
      setLoading(false);
      return;
    }
    try {
      const body = await apiJson<{ invites: PendingInvite[] }>("/admin/team/invites", {
        accessToken: token,
        organizationId,
        requireOrganization: true
      });
      setInvites(body.invites ?? []);
    } catch (error) {
      setError(apiErrorMessage(error, "Einladungen konnten nicht geladen werden."));
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  function handleCreated(invite: CreatedInvite) {
    setInvites((prev) => [invite as PendingInvite, ...prev]);
  }

  function copyLink(invite: PendingInvite) {
    const url = `${window.location.origin}/invite/${invite.token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId((prev) => (prev === invite.id ? null : prev)), 2000);
    });
  }

  async function revokeInvite(inviteId: string) {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    startTransition(async () => {
      const res = await apiFetch(`/admin/team/invites/${inviteId}`, {
        method: "DELETE",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        throwOnError: false
      });
      if (res.ok || res.status === 204) {
        setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      }
    });
  }

  return (
    <div className="stack-sm">
      <CreateInviteForm
        currentRole={currentRole}
        onCreated={handleCreated}
        organizationId={organizationId}
      />

      {loading ? (
        <p className="state-desc">Lade Einladungen…</p>
      ) : error ? (
        <ErrorState description={error} title="Einladungen konnten nicht geladen werden" />
      ) : invites.length === 0 ? (
        <EmptyState
          description="Erstelle eine Einladung, um Teammitglieder einzuladen."
          title="Keine ausstehenden Einladungen"
        />
      ) : (
        <div className="table-wrap">
          <table className="table-ui">
            <thead>
              <tr>
                <th>E-Mail</th>
                <th>Rolle</th>
                <th>Läuft ab</th>
                <th>Erstellt</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td className="mono">{invite.email}</td>
                  <td>
                    <Badge variant="info">{ROLE_LABELS[invite.role] ?? invite.role}</Badge>
                  </td>
                  <td>
                    <Badge variant={isExpired(invite.expiresAt) ? "warning" : "neutral"}>
                      {formatDate(invite.expiresAt)}
                    </Badge>
                  </td>
                  <td className="mono">{formatDate(invite.createdAt)}</td>
                  <td>
                    <span className="stack-row" style={{ gap: "0.5rem" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => copyLink(invite)}
                        type="button"
                      >
                        {copiedId === invite.id ? "Kopiert!" : "Link kopieren"}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={isPending}
                        onClick={() => void revokeInvite(invite.id)}
                        type="button"
                      >
                        Widerrufen
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
