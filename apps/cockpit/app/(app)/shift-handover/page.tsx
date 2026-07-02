import { PageScaffold } from "../../components/page-scaffold";
import { getShiftHandoverDraft } from "../../../lib/backend/shift-handover";
import { ShiftHandoverClient } from "./shift-handover-client";

import type { ShiftHandoverDraftPublicDTO } from "../../../lib/types/shift-handover";

export default async function ShiftHandoverPage() {
  const result = await getShiftHandoverDraft({});
  const initialDraft: ShiftHandoverDraftPublicDTO | null = result.data;
  const loadError =
    result.error && result.error.status !== 403
      ? result.error.message
      : null;

  return (
    <PageScaffold
      title="Schichtübergabe"
      description="Was war, was ist offen, was muss die nächste Schicht wissen."
    >
      <ShiftHandoverClient initialDraft={initialDraft} loadError={loadError} />
    </PageScaffold>
  );
}
