import { z } from "zod";

const requiredId = z.string().min(1, "Bitte eine Auswahl treffen.");
const positiveQuantity = z.coerce.number().positive("Die Menge muss größer als 0 sein.");

function parse(schema, value) {
  const result = schema.safeParse(value);
  return result.success
    ? { success: true, error: null }
    : { success: false, error: result.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
}

export function validateWorkflowStep(workflowId, step, draft, state) {
  if (workflowId === "goodsReceipt") {
    if (step === 0) return parse(z.object({ supplierId: requiredId }), draft);
    if (step === 1) {
      const positions = z.array(z.object({ actual: z.coerce.number().nonnegative(), checked: z.literal(true) })).min(1);
      return parse(z.object({ positions }), draft);
    }
    return { success: true, error: null };
  }

  if (workflowId === "transfer") {
    const base = parse(z.object({
      sourceId: requiredId,
      targetId: requiredId,
      itemId: requiredId,
      quantity: positiveQuantity,
    }), draft);
    if (!base.success) return base;
    if (draft.sourceId === draft.targetId) {
      return { success: false, error: "Quell- und Zielbereich müssen sich unterscheiden." };
    }
    if (step >= 1 && Number(draft.quantity) > (state.inventory[draft.itemId]?.locations[draft.sourceId] ?? 0)) {
      return { success: false, error: "Die Menge überschreitet den verfügbaren Bestand." };
    }
    return base;
  }

  if (workflowId === "refill") {
    const result = parse(z.object({ areaId: requiredId, itemId: requiredId, quantity: positiveQuantity }), draft);
    if (!result.success) return result;
    if (Number(draft.quantity) > (state.inventory[draft.itemId]?.locations[draft.sourceId] ?? 0)) {
      return { success: false, error: "Die Menge überschreitet den verfügbaren Bestand." };
    }
    return result;
  }

  if (workflowId === "handover") {
    if (step === 0) {
      return parse(z.object({
        shiftType: requiredId,
        outgoingName: z.string().trim().min(2, "Name der abgebenden Schicht fehlt."),
        incomingName: z.string().trim().min(2, "Name der übernehmenden Schicht fehlt."),
        areaId: requiredId,
      }), draft);
    }
    if (step >= 1 && Object.values(draft.checklist).some((status) => status === "open")) {
      return { success: false, error: "Alle Checklistenpunkte müssen aufgelöst sein." };
    }
    if (step >= 2 && (!draft.outgoingSignature || !draft.incomingSignature)) {
      return { success: false, error: "Beide Demo-Bestätigungen sind erforderlich." };
    }
    return { success: true, error: null };
  }

  if (workflowId === "correction") {
    if (step === 0) return parse(z.object({ itemId: requiredId, locationId: requiredId }), draft);
    if (step === 1) {
      const result = parse(z.object({
        delta: z.coerce.number().refine((value) => value !== 0, "Das Korrekturdelta darf nicht 0 sein."),
        reason: z.string().trim().min(3, "Bitte einen Korrekturgrund angeben."),
      }), draft);
      return result;
    }
    if (step >= 2 && !["approved", "rejected"].includes(draft.decision)) {
      return { success: false, error: "Eine Demo-Entscheidung ist erforderlich." };
    }
  }
  return { success: true, error: null };
}
