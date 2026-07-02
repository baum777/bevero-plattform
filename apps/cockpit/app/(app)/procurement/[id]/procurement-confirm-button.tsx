"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../providers/auth-provider";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";
import { createClient } from "../../../../lib/supabase/client";

type ConfirmItem = {
  id: string;
  orderedQty: number;
};

type ProcurementConfirmButtonProps = {
  orderId: string;
  items: ConfirmItem[];
  disabled?: boolean;
};

export function ProcurementConfirmButton({
  orderId,
  items,
  disabled = false
}: ProcurementConfirmButtonProps) {
  const router = useRouter();
  const { organizationId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleConfirm() {
    setError(null);

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setError("Keine aktive Session. Bitte neu einloggen.");
      return;
    }

    try {
      await apiFetch(`/procurement/orders/${encodeURIComponent(orderId)}/receive`, {
        accessToken: token,
        organizationId,
        requireOrganization: true,
        method: "POST",
        body: {
          items: items.map((item) => ({
            item_id: item.id,
            accepted_qty: item.orderedQty
          }))
        }
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Bestätigung fehlgeschlagen."));
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="stack-sm">
      <Button
        disabled={disabled || isPending}
        loading={isPending}
        onClick={() => void handleConfirm()}
        variant="primary"
      >
        {disabled ? "Mapping fehlt" : "Wareneingang bestätigen"}
      </Button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
