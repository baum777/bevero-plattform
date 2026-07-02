import { randomUUID } from "node:crypto";
import type { Actor } from "../auth/actor.js";
import { ShiftPlanningError } from "./shift-planning.types.js";

export const SHIFT_SESSION_STATUSES = ["scheduled", "active", "completed", "missed"] as const;
export type ShiftSessionStatus = (typeof SHIFT_SESSION_STATUSES)[number];
export const SHIFT_START_STATUSES = ["on_time", "early", "late"] as const;
export type ShiftStartStatus = (typeof SHIFT_START_STATUSES)[number];

export type ShiftAssignmentRow = {
  id: string;
  organizationId: string;
  userId: string;
  areaId: string;
  workspaceGroupId: string | null;
  shiftStartAt: Date;
  shiftEndAt: Date;
  status: string;
};

export type ShiftSessionRow = {
  id: string;
  organizationId: string;
  workspaceGroupId: string | null;
  shiftAssignmentId: string;
  userId: string;
  areaId: string;
  plannedStartAt: Date;
  plannedEndAt: Date;
  clientStartedAt: Date | null;
  serverStartedAt: Date | null;
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
  sessionStatus: string;
  startStatus: string | null;
  endStatus: string | null;
  startDeltaMinutes: number | null;
  endDeltaMinutes: number | null;
  startedByUserId: string | null;
  endedByUserId: string | null;
  timezone: string | null;
  clockSkewMs: number | null;
  startSource: string | null;
  endSource: string | null;
  startNote: string | null;
  endNote: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ShiftSessionDatabaseClient = {
  userProfile: {
    findUnique(args: { where: { authUserId: string }; select?: { id: true } }): Promise<{ id: string } | null>;
  };
  shiftAssignment: {
    findUnique(args: { where: { id: string } }): Promise<ShiftAssignmentRow | null>;
    findMany(args: { where: { organizationId: string; userId: string; date: Date; status: string }; include: { area: { select: { slug: true; name: true } } } }): Promise<Array<ShiftAssignmentRow & { area: { slug: string; name: string } }>>;
  };
  shiftSession: {
    findUnique(args: { where: { id?: string; shiftAssignmentId?: string } }): Promise<ShiftSessionRow | null>;
    findMany(args: { where: { shiftAssignmentId: { in: string[] } } }): Promise<ShiftSessionRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<ShiftSessionRow>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<ShiftSessionRow>;
  };
  shiftSessionEvent: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  $transaction<T>(fn: (tx: ShiftSessionDatabaseClient) => Promise<T>): Promise<T>;
};

export type StartShiftInput = {
  clientTimestamp?: string;
  timezone: string;
  note?: string;
};

export type CorrectStartInput = {
  actualStartedAt: string;
  reason: string;
};

export type EndShiftInput = {
  note?: string;
};

export type ShiftSessionDto = {
  id: string;
  assignmentId: string;
  sessionStatus: string;
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  serverStartedAt: string | null;
  startDeltaMinutes: number | null;
  endDeltaMinutes: number | null;
  startStatus: string | null;
  endStatus: string | null;
  startSource: string | null;
  endSource: string | null;
  startNote: string | null;
  endNote: string | null;
};

export type TodayShiftDto = {
  assignmentId: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  plannedStartAt: string;
  plannedEndAt: string;
  session: ShiftSessionDto | null;
};

const STAFF_ROLES = new Set(["staff", "shift_lead", "admin"]);
const LEAD_ROLES = new Set(["shift_lead", "admin"]);
const EARLY_OVERRIDE_MINUTES = 30;
const LATE_NOTE_MINUTES = 11;

export class ShiftSessionService {
  public constructor(
    private readonly options: { db: ShiftSessionDatabaseClient; now?: () => Date }
  ) {}

  public async start(assignmentId: string, input: StartShiftInput, actor: Actor): Promise<ShiftSessionDto> {
    const organizationId = this.requireOrganization(actor);
    const profile = await this.requireProfile(actor);
    const assignment = await this.requireAssignment(assignmentId, organizationId);
    this.requireAssignmentAccess(assignment, profile.id, actor);

    const existing = await this.options.db.shiftSession.findUnique({ where: { shiftAssignmentId: assignmentId } });
    if (existing) return this.toDto(existing);

    const now = this.now();
    const delta = deltaMinutes(now, assignment.shiftStartAt);
    if (!this.isLead(actor) && !isInStaffStartWindow(now, assignment)) {
      throw new ShiftPlanningError("shift start is outside the allowed window; shift lead override required", 409);
    }
    if (!this.isLead(actor) && delta >= LATE_NOTE_MINUTES && !input.note?.trim()) {
      throw new ShiftPlanningError("a note is required for a start more than 10 minutes late", 422);
    }

    const clientStartedAt = parseOptionalDate(input.clientTimestamp, "clientTimestamp");
    const session = await this.options.db.$transaction(async (tx) => {
      const created = await tx.shiftSession.create({
        data: {
          id: randomUUID(),
          organizationId,
          workspaceGroupId: assignment.workspaceGroupId,
          shiftAssignmentId: assignment.id,
          userId: assignment.userId,
          areaId: assignment.areaId,
          plannedStartAt: assignment.shiftStartAt,
          plannedEndAt: assignment.shiftEndAt,
          clientStartedAt,
          serverStartedAt: now,
          actualStartedAt: now,
          sessionStatus: "active",
          startStatus: startStatusForDelta(delta),
          startDeltaMinutes: delta,
          startedByUserId: profile.id,
          timezone: input.timezone,
          clockSkewMs: clientStartedAt ? now.getTime() - clientStartedAt.getTime() : null,
          startSource: this.isLead(actor) ? "lead_override" : "staff_cta",
          startNote: input.note?.trim() || null,
          createdAt: now,
          updatedAt: now
        }
      });
      await this.createEvent(tx, created, profile.id, "shift_started", now, null, snapshotStart(created));
      return created;
    });
    return this.toDto(session);
  }

  public async getToday(date: Date, actor: Actor): Promise<TodayShiftDto[]> {
    const organizationId = this.requireOrganization(actor);
    const profile = await this.requireProfile(actor);
    const assignments = await this.options.db.shiftAssignment.findMany({
      where: { organizationId, userId: profile.id, date, status: "active" },
      include: { area: { select: { slug: true, name: true } } }
    });
    const ids = assignments.map((assignment) => assignment.id);
    const sessions = ids.length ? await this.options.db.shiftSession.findMany({ where: { shiftAssignmentId: { in: ids } } }) : [];
    const sessionByAssignment = new Map(sessions.map((session) => [session.shiftAssignmentId, session]));
    return assignments.map((assignment) => ({
      assignmentId: assignment.id, areaId: assignment.areaId, areaSlug: assignment.area.slug, areaLabel: assignment.area.name,
      plannedStartAt: assignment.shiftStartAt.toISOString(), plannedEndAt: assignment.shiftEndAt.toISOString(),
      session: sessionByAssignment.get(assignment.id) ? this.toDto(sessionByAssignment.get(assignment.id)!) : null
    }));
  }

  public async end(assignmentId: string, input: EndShiftInput, actor: Actor): Promise<ShiftSessionDto> {
    const organizationId = this.requireOrganization(actor);
    const profile = await this.requireProfile(actor);
    const assignment = await this.requireAssignment(assignmentId, organizationId);
    this.requireAssignmentAccess(assignment, profile.id, actor);
    const session = await this.options.db.shiftSession.findUnique({ where: { shiftAssignmentId: assignmentId } });
    if (!session) throw new ShiftPlanningError("shift session not found", 404);
    if (session.sessionStatus === "completed") return this.toDto(session);
    if (session.sessionStatus !== "active") throw new ShiftPlanningError("only active sessions can be ended", 409);

    const now = this.now();
    if (!session.actualStartedAt || now < session.actualStartedAt) {
      throw new ShiftPlanningError("shift end cannot be before actual shift start", 409);
    }
    const endDelta = deltaMinutes(now, session.plannedEndAt);
    const updated = await this.options.db.$transaction(async (tx) => {
      const result = await tx.shiftSession.update({
        where: { id: session.id },
        data: {
          actualEndedAt: now,
          sessionStatus: "completed",
          endDeltaMinutes: endDelta,
          endStatus: startStatusForDelta(endDelta),
          endedByUserId: profile.id,
          endSource: this.isLead(actor) ? "lead_cta" : "staff_cta",
          endNote: input.note?.trim() || null,
          updatedAt: now
        }
      });
      await this.createEvent(tx, result, profile.id, "shift_ended", now, snapshotEnd(session), snapshotEnd(result));
      return result;
    });
    return this.toDto(updated);
  }

  public async correctStart(sessionId: string, input: CorrectStartInput, actor: Actor): Promise<ShiftSessionDto> {
    const organizationId = this.requireOrganization(actor);
    if (!this.isLead(actor)) throw new ShiftPlanningError("shift lead role required", 403);
    const profile = await this.requireProfile(actor);
    const session = await this.requireSession(sessionId, organizationId);
    const correctedStart = parseRequiredDate(input.actualStartedAt, "actualStartedAt");
    if (!input.reason.trim()) throw new ShiftPlanningError("correction reason is required", 422);
    if (session.actualEndedAt && correctedStart > session.actualEndedAt) {
      throw new ShiftPlanningError("corrected start cannot be after actual shift end", 422);
    }
    const now = this.now();
    const delta = deltaMinutes(correctedStart, session.plannedStartAt);
    const updated = await this.options.db.$transaction(async (tx) => {
      const result = await tx.shiftSession.update({
        where: { id: session.id },
        data: {
          actualStartedAt: correctedStart,
          startDeltaMinutes: delta,
          startStatus: startStatusForDelta(delta),
          startSource: "lead_correction",
          startNote: input.reason.trim(),
          updatedAt: now
        }
      });
      await this.createEvent(tx, result, profile.id, "shift_start_corrected", now, snapshotStart(session), snapshotStart(result), input.reason.trim());
      return result;
    });
    return this.toDto(updated);
  }

  public async markMissed(assignmentId: string, reason: string, actor: Actor): Promise<ShiftSessionDto> {
    const organizationId = this.requireOrganization(actor);
    if (!this.isLead(actor)) throw new ShiftPlanningError("shift lead role required", 403);
    if (!reason.trim()) throw new ShiftPlanningError("missed reason is required", 422);
    const profile = await this.requireProfile(actor);
    const assignment = await this.requireAssignment(assignmentId, organizationId);
    const existing = await this.options.db.shiftSession.findUnique({ where: { shiftAssignmentId: assignmentId } });
    if (existing?.sessionStatus === "missed") return this.toDto(existing);
    if (existing) throw new ShiftPlanningError("started or completed shifts cannot be marked missed", 409);
    const now = this.now();
    const session = await this.options.db.$transaction(async (tx) => {
      const created = await tx.shiftSession.create({
        data: {
          id: randomUUID(), organizationId, workspaceGroupId: assignment.workspaceGroupId,
          shiftAssignmentId: assignment.id, userId: assignment.userId, areaId: assignment.areaId,
          plannedStartAt: assignment.shiftStartAt, plannedEndAt: assignment.shiftEndAt,
          sessionStatus: "missed", startSource: "lead_marked_missed", startNote: reason.trim(),
          createdAt: now, updatedAt: now
        }
      });
      await this.createEvent(tx, created, profile.id, "shift_marked_missed", now, null, { sessionStatus: "missed" }, reason.trim());
      return created;
    });
    return this.toDto(session);
  }

  private async createEvent(
    tx: ShiftSessionDatabaseClient,
    session: ShiftSessionRow,
    actorUserId: string,
    eventType: string,
    occurredAt: Date,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown>,
    reason?: string
  ) {
    await tx.shiftSessionEvent.create({
      data: {
        id: randomUUID(), organizationId: session.organizationId, shiftSessionId: session.id,
        actorUserId, eventType, occurredAt, serverCreatedAt: occurredAt,
        payload: { oldValues, newValues, reason: reason ?? null }
      }
    });
  }

  private async requireAssignment(id: string, organizationId: string): Promise<ShiftAssignmentRow> {
    const assignment = await this.options.db.shiftAssignment.findUnique({ where: { id } });
    if (!assignment || assignment.organizationId !== organizationId) throw new ShiftPlanningError("shift assignment not found", 404);
    if (assignment.status !== "active") throw new ShiftPlanningError("shift assignment is not active", 409);
    return assignment;
  }

  private async requireSession(id: string, organizationId: string): Promise<ShiftSessionRow> {
    const session = await this.options.db.shiftSession.findUnique({ where: { id } });
    if (!session || session.organizationId !== organizationId) throw new ShiftPlanningError("shift session not found", 404);
    return session;
  }

  private async requireProfile(actor: Actor): Promise<{ id: string }> {
    const profile = await this.options.db.userProfile.findUnique({ where: { authUserId: actor.userId }, select: { id: true } });
    if (!profile) throw new ShiftPlanningError("user profile not found", 403);
    return profile;
  }

  private requireAssignmentAccess(assignment: ShiftAssignmentRow, profileId: string, actor: Actor) {
    if (!STAFF_ROLES.has(actor.role)) throw new ShiftPlanningError("staff role required", 403);
    if (assignment.userId !== profileId && !this.isLead(actor)) throw new ShiftPlanningError("shift assignment belongs to another user", 403);
  }

  private requireOrganization(actor: Actor): string {
    if (!actor.organizationId) throw new ShiftPlanningError("organization context required", 403);
    return actor.organizationId;
  }

  private isLead(actor: Actor): boolean { return LEAD_ROLES.has(actor.role); }
  private now(): Date { return this.options.now ? this.options.now() : new Date(); }

  private toDto(session: ShiftSessionRow): ShiftSessionDto {
    return {
      id: session.id, assignmentId: session.shiftAssignmentId, sessionStatus: session.sessionStatus,
      plannedStartAt: session.plannedStartAt.toISOString(), plannedEndAt: session.plannedEndAt.toISOString(),
      actualStartedAt: session.actualStartedAt?.toISOString() ?? null,
      actualEndedAt: session.actualEndedAt?.toISOString() ?? null,
      serverStartedAt: session.serverStartedAt?.toISOString() ?? null,
      startDeltaMinutes: session.startDeltaMinutes, endDeltaMinutes: session.endDeltaMinutes,
      startStatus: session.startStatus, endStatus: session.endStatus,
      startSource: session.startSource, endSource: session.endSource,
      startNote: session.startNote, endNote: session.endNote
    };
  }
}

export function startStatusForDelta(delta: number): ShiftStartStatus {
  if (delta < -15) return "early";
  if (delta > 5) return "late";
  return "on_time";
}

export function deltaMinutes(actual: Date, planned: Date): number {
  return Math.trunc((actual.getTime() - planned.getTime()) / 60_000);
}

function isInStaffStartWindow(now: Date, assignment: ShiftAssignmentRow): boolean {
  return now >= new Date(assignment.shiftStartAt.getTime() - EARLY_OVERRIDE_MINUTES * 60_000) && now <= assignment.shiftEndAt;
}

function parseOptionalDate(value: string | undefined, field: string): Date | null {
  return value === undefined ? null : parseRequiredDate(value, field);
}

function parseRequiredDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ShiftPlanningError(`${field} must be a valid ISO timestamp`, 422);
  return date;
}

function snapshotStart(session: ShiftSessionRow): Record<string, unknown> {
  return {
    actualStartedAt: session.actualStartedAt?.toISOString() ?? null,
    startDeltaMinutes: session.startDeltaMinutes,
    startStatus: session.startStatus,
    startSource: session.startSource,
    startNote: session.startNote
  };
}

function snapshotEnd(session: ShiftSessionRow): Record<string, unknown> {
  return {
    actualEndedAt: session.actualEndedAt?.toISOString() ?? null,
    endDeltaMinutes: session.endDeltaMinutes,
    endStatus: session.endStatus,
    endSource: session.endSource,
    endNote: session.endNote
  };
}
