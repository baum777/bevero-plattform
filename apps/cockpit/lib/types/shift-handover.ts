export type ShiftHandoverDraftPublicDTO = {
  id: string;
  organizationId: string;
  shiftLeadId: string;
  workspaceId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  summary: string | null;
  openItems: Array<{ type: string; itemId?: string; description: string }>;
  alerts: Array<{ type: string; id?: string }>;
  notes: string | null;
  synthesizedHandover: string | null;
  synthesizedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShiftHandoverGetResult = {
  draft: ShiftHandoverDraftPublicDTO;
};

export type ShiftHandoverPatchResult = {
  draft: ShiftHandoverDraftPublicDTO;
};

export type ShiftHandoverConfirmResult = {
  draft: ShiftHandoverDraftPublicDTO;
  archiveId: string;
};

export type ShiftHandoverPatchBody = {
  summary?: string | null;
  notes?: string | null;
  openItems?: ShiftHandoverDraftPublicDTO["openItems"];
  alerts?: ShiftHandoverDraftPublicDTO["alerts"];
  startTime?: string | null;
  endTime?: string | null;
};

export type ShiftHandoverConfirmBody = {
  archiveNote?: string;
};

export type ShiftHandoverErrorBody = {
  error?: string;
  message?: string;
};

export const SHIFT_HANDOVER_PATCH_DEBOUNCE_MS = 2_000;
export const SHIFT_HANDOVER_MAX_RECENT_RECORDS = 10;
