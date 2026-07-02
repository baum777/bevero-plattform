import type { Actor } from "../auth/actor.js";
import { ShiftPlanningError } from "./shift-planning.types.js";

const DE_WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
function germanWeekday(date: Date): string {
  return DE_WEEKDAYS[(date.getUTCDay() + 6) % 7] ?? "";
}

// ── DB port ──────────────────────────────────────────────────────────────────

export type SummaryAreaRow = {
  id: string;
  slug: string;
  name: string;
  workspaceGroupId: string | null;
};

export type SummaryUserRow = {
  id: string;
  displayName: string | null;
};

export type SummaryAssignmentRow = {
  id: string;
  userId: string;
  areaId: string;
  area: SummaryAreaRow;
  userProfile: SummaryUserRow;
  shiftStartAt: Date;
  shiftEndAt: Date;
};

export type SummarySessionRow = {
  id: string;
  shiftAssignmentId: string;
  sessionStatus: string;
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
  startDeltaMinutes: number | null;
  endDeltaMinutes: number | null;
  startStatus: string | null;
  endStatus: string | null;
};

export type SummaryTaskRow = {
  id: string;
  areaId: string;
  shiftAssignmentId: string | null;
  userId: string;
  status: string;
};

export type ShiftLeadSummaryDatabaseClient = {
  shiftAssignment: {
    findMany(args: {
      where: {
        organizationId: string;
        date: Date;
        workspaceGroupId?: string;
        status?: string;
      };
      include: {
        area: { select: { id: true; slug: true; name: true; workspaceGroupId: true } };
        userProfile: { select: { id: true; displayName: true } };
      };
    }): Promise<SummaryAssignmentRow[]>;
  };
  taskInstance: {
    findMany(args: {
      where: {
        organizationId: string;
        date: Date;
        shiftAssignmentId?: { in: string[] };
      };
      select: {
        id: true;
        areaId: true;
        shiftAssignmentId: true;
        userId: true;
        status: true;
      };
    }): Promise<SummaryTaskRow[]>;
  };
  shiftSession: {
    findMany(args: { where: { organizationId: string; shiftAssignmentId: { in: string[] } }; select: {
      shiftAssignmentId: true; sessionStatus: true; actualStartedAt: true; actualEndedAt: true;
      id: true;
      startDeltaMinutes: true; endDeltaMinutes: true; startStatus: true; endStatus: true;
    } }): Promise<SummarySessionRow[]>;
  };
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type SummaryUserDto = {
  userId: string;
  displayName: string | null;
};

export type AreaSummaryDto = {
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  assignedUsers: string[];
  totalTasks: number;
  openTasks: number;
  doneTasks: number;
  issueTasks: number;
  skippedTasks: number;
  verifiedTasks: number;
  openIssues: number;
  assignments: Array<{
    assignmentId: string;
    userId: string;
    displayName: string | null;
    plannedStartAt: string;
    plannedEndAt: string;
    session: {
      sessionStatus: string;
      id: string;
      actualStartedAt: string | null;
      actualEndedAt: string | null;
      startDeltaMinutes: number | null;
      endDeltaMinutes: number | null;
      startStatus: string | null;
      endStatus: string | null;
    } | null;
  }>;
};

export type ShiftLeadSummaryDto = {
  date: string;
  weekday: string;
  organizationId: string;
  workspaceGroupId: string | null;
  areas: AreaSummaryDto[];
  totals: {
    totalTasks: number;
    openTasks: number;
    doneTasks: number;
    issueTasks: number;
    skippedTasks: number;
    verifiedTasks: number;
  };
};

// ── Service ──────────────────────────────────────────────────────────────────

export type ShiftLeadSummaryServicePort = {
  getSummary(
    date: Date,
    workspaceGroupId: string | undefined,
    actor: Actor
  ): Promise<ShiftLeadSummaryDto>;
};

export class ShiftLeadSummaryService implements ShiftLeadSummaryServicePort {
  public constructor(private readonly options: { db: ShiftLeadSummaryDatabaseClient }) {}

  public async getSummary(
    date: Date,
    workspaceGroupId: string | undefined,
    actor: Actor
  ): Promise<ShiftLeadSummaryDto> {
    const organizationId = this.requireOrg(actor);

    const assignmentWhere: Parameters<
      ShiftLeadSummaryDatabaseClient["shiftAssignment"]["findMany"]
    >[0]["where"] = {
      organizationId,
      date,
      status: "active"
    };
    if (workspaceGroupId !== undefined) {
      assignmentWhere.workspaceGroupId = workspaceGroupId;
    }

    const assignments = await this.options.db.shiftAssignment.findMany({
      where: assignmentWhere,
      include: {
        area: { select: { id: true, slug: true, name: true, workspaceGroupId: true } },
        userProfile: { select: { id: true, displayName: true } }
      }
    });

    const assignmentIds = assignments.map((a) => a.id);

    const tasks =
      assignmentIds.length > 0
        ? await this.options.db.taskInstance.findMany({
            where: {
              organizationId,
              date,
              shiftAssignmentId: { in: assignmentIds }
            },
            select: {
              id: true,
              areaId: true,
              shiftAssignmentId: true,
              userId: true,
              status: true
            }
          })
        : [];
    const sessions = assignmentIds.length > 0
      ? await this.options.db.shiftSession.findMany({
          where: { organizationId, shiftAssignmentId: { in: assignmentIds } },
          select: {
            id: true, shiftAssignmentId: true, sessionStatus: true, actualStartedAt: true, actualEndedAt: true,
            startDeltaMinutes: true, endDeltaMinutes: true, startStatus: true, endStatus: true
          }
        })
      : [];
    const sessionByAssignment = new Map(sessions.map((session) => [session.shiftAssignmentId, session]));

    // Group assignments by area
    const areaMap = new Map<
      string,
      { area: SummaryAreaRow; users: Map<string, SummaryUserDto> }
    >();
    for (const a of assignments) {
      if (!areaMap.has(a.areaId)) {
        areaMap.set(a.areaId, { area: a.area, users: new Map() });
      }
      const entry = areaMap.get(a.areaId)!;
      if (!entry.users.has(a.userId)) {
        entry.users.set(a.userId, {
          userId: a.userId,
          displayName: a.userProfile.displayName
        });
      }
    }

    // Count tasks by area
    type Counts = { total: number; open: number; done: number; issue: number; skipped: number; verified: number };
    const taskCounts = new Map<string, Counts>();
    for (const task of tasks) {
      const counts = taskCounts.get(task.areaId) ?? {
        total: 0, open: 0, done: 0, issue: 0, skipped: 0, verified: 0
      };
      counts.total += 1;
      switch (task.status) {
        case "open": counts.open += 1; break;
        case "done": counts.done += 1; break;
        case "issue": counts.issue += 1; break;
        case "skipped": counts.skipped += 1; break;
        case "verified": counts.verified += 1; break;
      }
      taskCounts.set(task.areaId, counts);
    }

    const areas: AreaSummaryDto[] = [...areaMap.entries()]
      .sort(([, a], [, b]) => a.area.name.localeCompare(b.area.name))
      .map(([areaId, { area, users }]) => {
        const counts = taskCounts.get(areaId) ?? {
          total: 0, open: 0, done: 0, issue: 0, skipped: 0, verified: 0
        };
        return {
          areaId,
          areaSlug: area.slug,
          areaLabel: area.name,
          assignedUsers: [...users.values()].map((u) => u.displayName ?? u.userId),
          totalTasks: counts.total,
          openTasks: counts.open,
          doneTasks: counts.done,
          issueTasks: counts.issue,
          skippedTasks: counts.skipped,
          verifiedTasks: counts.verified,
          openIssues: counts.issue
          ,assignments: assignments
            .filter((assignment) => assignment.areaId === areaId)
            .sort((a, b) => a.shiftStartAt.getTime() - b.shiftStartAt.getTime())
            .map((assignment) => {
              const session = sessionByAssignment.get(assignment.id);
              return {
                assignmentId: assignment.id,
                userId: assignment.userId,
                displayName: assignment.userProfile.displayName,
                plannedStartAt: assignment.shiftStartAt.toISOString(),
                plannedEndAt: assignment.shiftEndAt.toISOString(),
                session: session
                  ? {
                    sessionStatus: session.sessionStatus,
                      id: session.id,
                      actualStartedAt: session.actualStartedAt?.toISOString() ?? null,
                      actualEndedAt: session.actualEndedAt?.toISOString() ?? null,
                      startDeltaMinutes: session.startDeltaMinutes,
                      endDeltaMinutes: session.endDeltaMinutes,
                      startStatus: session.startStatus,
                      endStatus: session.endStatus
                    }
                  : null
              };
            })
        };
      });

    const totals = areas.reduce(
      (acc, a) => ({
        totalTasks: acc.totalTasks + a.totalTasks,
        openTasks: acc.openTasks + a.openTasks,
        doneTasks: acc.doneTasks + a.doneTasks,
        issueTasks: acc.issueTasks + a.issueTasks,
        skippedTasks: acc.skippedTasks + a.skippedTasks,
        verifiedTasks: acc.verifiedTasks + a.verifiedTasks
      }),
      { totalTasks: 0, openTasks: 0, doneTasks: 0, issueTasks: 0, skippedTasks: 0, verifiedTasks: 0 }
    );

    const isoDate = date.toISOString().slice(0, 10);

    return {
      date: isoDate,
      weekday: germanWeekday(date),
      organizationId,
      workspaceGroupId: workspaceGroupId ?? null,
      areas,
      totals
    };
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}
