"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Drawer } from "../../../components/ui/drawer";
import { ConfirmDangerDialog } from "../../../components/ui/confirm-dialog";
import { EmptyState } from "../../../components/ui/empty-state";
import { useAuth } from "../../../providers/auth-provider";
import { createClient } from "../../../../lib/supabase/client";
import { apiErrorMessage, apiFetch } from "../../../../lib/backend/api-fetch";
import { Toast } from "../../../components/toast";
import { useToast } from "../../../../hooks/use-toast";

type ItemRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  defaultUnit: string;
  minStock: number | null;
  isActive: boolean;
};

type ItemFormState = {
  name: string;
  sku: string;
  category: string;
  defaultUnit: string;
  minStock: string;
};

const EMPTY_FORM: ItemFormState = { name: "", sku: "", category: "", defaultUnit: "", minStock: "" };

async function readAccessToken() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Keine aktive Session gefunden.");
  return data.session.access_token;
}

export function ItemsClient({ initialRows }: { initialRows: ItemRow[] }) {
  const { hasRole, organizationId } = useAuth();
  const router = useRouter();
  const canEdit = hasRole(["owner", "admin", "manager"]);

  const [rows, setRows] = useState<ItemRow[]>(initialRows);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemRow | null>(null);
  const [deactivateItem, setDeactivateItem] = useState<ItemRow | null>(null);
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function openEdit(item: ItemRow) {
    setForm({
      name: item.name,
      sku: item.sku ?? "",
      category: item.category ?? "",
      defaultUnit: item.defaultUnit,
      minStock: item.minStock != null ? String(item.minStock) : "",
    });
    setEditItem(item);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  function closeEdit() {
    setEditItem(null);
  }

  function patchForm(field: keyof ItemFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload(f: ItemFormState) {
    return {
      name: f.name.trim(),
      sku: f.sku.trim() || undefined,
      category: f.category.trim() || undefined,
      defaultUnit: f.defaultUnit.trim(),
      minStock: f.minStock.trim() ? Number(f.minStock) : undefined,
    };
  }

  function validateForm(f: ItemFormState): string | null {
    if (!f.name.trim()) return "Name ist ein Pflichtfeld.";
    if (!f.defaultUnit.trim()) return "Einheit ist ein Pflichtfeld.";
    if (f.minStock.trim() && Number.isNaN(Number(f.minStock))) return "Mindestbestand muss eine Zahl sein.";
    return null;
  }

  async function handleCreate() {
    const err = validateForm(form);
    if (err) { showToast({ kind: "error", message: err }); return; }
    setSubmitting(true);
    try {
      const token = await readAccessToken();
      await apiFetch("/admin/inventory/items", {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: buildPayload(form),
      });
      showToast({ kind: "ok", message: `Artikel „${form.name.trim()}" wurde angelegt.` });
      closeCreate();
      router.refresh();
    } catch (e) {
      showToast({ kind: "error", message: apiErrorMessage(e, "Unbekannter Fehler.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editItem) return;
    const err = validateForm(form);
    if (err) { showToast({ kind: "error", message: err }); return; }
    setSubmitting(true);
    try {
      const token = await readAccessToken();
      await apiFetch(`/admin/inventory/items/${editItem.id}`, {
        method: "PATCH",
        accessToken: token,
        organizationId,
        requireOrganization: true,
        body: buildPayload(form),
      });
      showToast({ kind: "ok", message: `Artikel „${form.name.trim()}" wurde aktualisiert.` });
      closeEdit();
      router.refresh();
    } catch (e) {
      showToast({ kind: "error", message: apiErrorMessage(e, "Unbekannter Fehler.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateItem) return;
    setSubmitting(true);
    try {
      const token = await readAccessToken();
      await apiFetch(`/admin/inventory/items/${deactivateItem.id}/deactivate`, {
        method: "POST",
        accessToken: token,
        organizationId,
        requireOrganization: true,
      });
      showToast({ kind: "ok", message: `Artikel „${deactivateItem.name}" wurde deaktiviert.` });
      setRows((current) => current.map((r) => r.id === deactivateItem.id ? { ...r, isActive: false } : r));
      setDeactivateItem(null);
    } catch (e) {
      showToast({ kind: "error", message: apiErrorMessage(e, "Unbekannter Fehler.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {canEdit ? (
        <div style={{ marginBottom: "var(--sp-3)" }}>
          <Button onClick={openCreate} variant="primary">Artikel anlegen</Button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="table-ui">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Kategorie</th>
                <th>Einheit</th>
                <th>Mindestbestand</th>
                <th>Status</th>
                {canEdit ? <th>Aktionen</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td className="mono">{row.sku ?? "—"}</td>
                  <td>{row.category ?? "—"}</td>
                  <td>{row.defaultUnit}</td>
                  <td className="mono">{row.minStock ?? "—"}</td>
                  <td>
                    <Badge variant={row.isActive ? "ok" : "neutral"}>
                      {row.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                  {canEdit ? (
                    <td>
                      <div style={{ display: "flex", gap: "var(--sp-1)" }}>
                        <Button onClick={() => openEdit(row)} size="sm" variant="outline">
                          Bearbeiten
                        </Button>
                        {row.isActive ? (
                          <Button onClick={() => setDeactivateItem(row)} size="sm" variant="danger">
                            Deaktivieren
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          action={canEdit ? <Button onClick={openCreate} variant="primary">Artikel anlegen</Button> : undefined}
          description="Keine Artikel gefunden. Passe Filter an oder lege einen neuen Artikel an."
          title="Keine Artikel vorhanden"
        />
      )}

      {/* Create drawer */}
      <Drawer onClose={closeCreate} open={createOpen} title="Artikel anlegen">
        <ItemForm
          form={form}
          onPatch={patchForm}
          onSubmit={() => void handleCreate()}
          submitLabel="Anlegen"
          submitting={submitting}
          onCancel={closeCreate}
        />
      </Drawer>

      {/* Edit drawer */}
      <Drawer onClose={closeEdit} open={editItem !== null} title={`Bearbeiten: ${editItem?.name ?? ""}`}>
        <ItemForm
          form={form}
          onPatch={patchForm}
          onSubmit={() => void handleEdit()}
          submitLabel="Speichern"
          submitting={submitting}
          onCancel={closeEdit}
        />
      </Drawer>

      {/* Deactivate confirm */}
      <ConfirmDangerDialog
        cancelLabel="Abbrechen"
        confirmLabel="Deaktivieren"
        description={`„${deactivateItem?.name}" wird deaktiviert und erscheint nicht mehr in Buchungsmasken. Der Artikel bleibt im System erhalten.`}
        loading={submitting}
        onCancel={() => setDeactivateItem(null)}
        onConfirm={() => void handleDeactivate()}
        open={deactivateItem !== null}
        title="Artikel deaktivieren?"
      />

      {/* Toast */}
      <Toast toast={toast} />
    </>
  );
}

function ItemForm({
  form,
  onPatch,
  onSubmit,
  submitLabel,
  submitting,
  onCancel,
}: {
  form: ItemFormState;
  onPatch: (field: keyof ItemFormState, value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="field-stack">
      <label htmlFor="item-name">Name <span aria-hidden="true">*</span></label>
      <input
        className="toolbar-input"
        id="item-name"
        onChange={(e) => onPatch("name", e.currentTarget.value)}
        placeholder="z. B. Tomatensauce"
        required
        value={form.name}
      />

      <label htmlFor="item-unit">Einheit <span aria-hidden="true">*</span></label>
      <input
        className="toolbar-input"
        id="item-unit"
        onChange={(e) => onPatch("defaultUnit", e.currentTarget.value)}
        placeholder="z. B. Stück, kg, Liter"
        required
        value={form.defaultUnit}
      />

      <label htmlFor="item-sku">SKU</label>
      <input
        className="toolbar-input"
        id="item-sku"
        onChange={(e) => onPatch("sku", e.currentTarget.value)}
        placeholder="Optional"
        value={form.sku}
      />

      <label htmlFor="item-category">Kategorie</label>
      <input
        className="toolbar-input"
        id="item-category"
        onChange={(e) => onPatch("category", e.currentTarget.value)}
        placeholder="z. B. Getränke, Lebensmittel"
        value={form.category}
      />

      <label htmlFor="item-min-stock">Mindestbestand</label>
      <input
        className="toolbar-input mono"
        id="item-min-stock"
        inputMode="numeric"
        onChange={(e) => onPatch("minStock", e.currentTarget.value)}
        placeholder="z. B. 10"
        value={form.minStock}
      />

      <div className="drawer-actions">
        <Button
          disabled={submitting}
          loading={submitting}
          onClick={onSubmit}
          variant="primary"
        >
          {submitLabel}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
