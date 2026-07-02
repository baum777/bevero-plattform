import { z } from "zod";

export const shiftHandoverDraftOpenItemsSchema = z
  .array(
    z.object({
      type: z.string().trim().min(1),
      itemId: z.string().trim().min(1).optional(),
      description: z.string().trim().min(1)
    })
  )
  .max(200);

export const shiftHandoverDraftAlertsSchema = z
  .array(
    z.object({
      type: z.string().trim().min(1),
      id: z.string().trim().min(1).optional()
    })
  )
  .max(200);

export const shiftHandoverDraftPatchSchema = z
  .object({
    summary: z.string().trim().max(10_000).nullable().optional(),
    openItems: shiftHandoverDraftOpenItemsSchema.optional(),
    alerts: shiftHandoverDraftAlertsSchema.optional(),
    notes: z.string().trim().max(10_000).nullable().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .nullable()
      .optional()
  })
  .strict();

export const shiftHandoverDraftConfirmSchema = z
  .object({
    archiveNote: z.string().trim().max(500).optional()
  })
  .strict();

export const shiftHandoverDraftQuerySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    workspaceId: z.string().trim().min(1).max(64).optional()
  })
  .strict();

export type ShiftHandoverDraftPatchInput = z.infer<typeof shiftHandoverDraftPatchSchema>;
export type ShiftHandoverDraftConfirmInput = z.infer<typeof shiftHandoverDraftConfirmSchema>;
export type ShiftHandoverDraftQueryInput = z.infer<typeof shiftHandoverDraftQuerySchema>;

export type ShiftHandoverDraftRecord = {
  id: string;
  organizationId: string;
  shiftLeadId: string;
  workspaceId: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  summary: string | null;
  openItems: unknown;
  alerts: unknown;
  notes: string | null;
  synthesizedHandover: string | null;
  synthesizedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShiftHandoverDraftPublicDTO = {
  id: string;
  organizationId: string;
  shiftLeadId: string;
  workspaceId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  summary: string | null;
  openItems: unknown;
  alerts: unknown;
  notes: string | null;
  synthesizedHandover: string | null;
  synthesizedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicDraft(record: ShiftHandoverDraftRecord): ShiftHandoverDraftPublicDTO {
  return {
    id: record.id,
    organizationId: record.organizationId,
    shiftLeadId: record.shiftLeadId,
    workspaceId: record.workspaceId,
    date: toIsoDate(record.date),
    startTime: record.startTime,
    endTime: record.endTime,
    summary: record.summary,
    openItems: record.openItems,
    alerts: record.alerts,
    notes: record.notes,
    synthesizedHandover: record.synthesizedHandover,
    synthesizedAt: record.synthesizedAt ? record.synthesizedAt.toISOString() : null,
    confirmedAt: record.confirmedAt ? record.confirmedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toIsoDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
