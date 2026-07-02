import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional();

export const procurementOrderStatuses = [
  "pending_receipt",
  "needs_mapping",
  "ready_to_confirm",
  "received",
  "partially_received",
  "cancelled"
] as const;

export const rejectionReasons = ["damaged", "not_delivered", "refused"] as const;
export const rejectionReasonSchema = z.enum(rejectionReasons);

export const listProcurementOrdersQuerySchema = z.object({
  status: z.enum(procurementOrderStatuses).optional(),
  source: z.enum(["foodnotify_email", "mail", "manual"]).optional(),
  supplier_name: z.string().trim().min(1).max(200).optional(),
  from_date: optionalDate,
  to_date: optionalDate,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25)
});

export type ListProcurementOrdersQuery = z.infer<typeof listProcurementOrdersQuerySchema>;

// IDs are cuid TEXT (repo convention), so item references are validated as
// non-empty strings rather than UUIDs.
const idString = z.string().trim().min(1).max(64);

export const patchOrderItemSchema = z
  .object({
    delivered_qty: z.number().min(0).optional(),
    inventory_item_id: idString.nullable().optional(),
    rejection_reason: rejectionReasonSchema.nullable().optional(),
    comment: z.string().trim().max(1000).nullable().optional()
  })
  .strict();

export type PatchOrderItemInput = z.infer<typeof patchOrderItemSchema>;

export const receiveOrderItemSchema = z
  .object({
    item_id: idString,
    accepted_qty: z.number().min(0),
    rejection_reason: rejectionReasonSchema.optional(),
    comment: z.string().trim().max(1000).optional()
  })
  .strict()
  .refine((value) => value.accepted_qty > 0 || value.rejection_reason !== undefined, {
    message: "rejection_reason is required when accepted_qty is 0",
    path: ["rejection_reason"]
  });

export const receiveOrderSchema = z
  .object({
    items: z.array(receiveOrderItemSchema).min(1)
  })
  .strict();

export type ReceiveOrderInput = z.infer<typeof receiveOrderSchema>;
