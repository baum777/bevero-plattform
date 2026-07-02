import { Prisma } from "@prisma/client";
import type { Actor } from "../auth/actor.js";
import { ShiftPlanningError, weekdayFromDate } from "./shift-planning.types.js";

const DE_WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
function germanWeekday(weekday: number): string {
  return DE_WEEKDAYS[weekday] ?? "";
}

// Task statuses that count as "closed" for the purpose of a shift sign-off.
const FINAL_TASK_STATUSES = new Set(["done", "verified", "skipped"]);

// ── DB port ──────────────────────────────────────────────────────────────────

export type SignoffTaskRow = {
  id: string;
  status: string;
};

export type SignoffRecordRow = {
  id: string;
  signedAt: Date;
  completedTaskCount: number;
  totalTaskCount: number;
  openIssueCount: number;
  summary: string | null;
  notes: string | null;
  signedBy: { id: string; displayName: string | null } | null;
};

export type SignoffServiceDatabaseClient = {
  taskInstance: {
    findMany(args: {
      where: {
        organizationId: string;
        date: Date;
        area?: { workspaceGroupId: string };
      };
      select: { id: true; status: true };
    }): Promise<SignoffTaskRow[]>;
  };
  taskIssue: {
    count(args: {
      where: {
        organizationId: string;
        status: string;
        taskInstance: { date: Date; area?: { workspaceGroupId: string } };
      };
    }): Promise<number>;
  };
  shiftSignoff: {
    findFirst(args: {
      where: { organizationId: string; date: Date; workspaceGroupId: string; department: string };
      include?: { signedBy: { select: { id: true; displayName: true } } };
    }): Promise<SignoffRecordRow | null>;
    create(args: {
      data: Record<string, unknown>;
      include?: { signedBy: { select: { id: true; displayName: true } } };
    }): Promise<SignoffRecordRow>;
  };
  userProfile: {
    findUnique(args: {
      where: { authUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type SignoffRecordDto = {
  id: string;
  signedAt: string;
  signedByName: string | null;
  completedTaskCount: number;
  totalTaskCount: number;
  openIssueCount: number;
  summary: string | null;
  notes: string | null;
};

export type SignoffStatusDto = {
  date: string;
  weekday: string;
  workspaceGroupId: string | null;
  department: string;
  totalTaskCount: number;
  completedTaskCount: number;
  openTaskCount: number;
  blockingTaskCount: number;
  openIssueCount: number;
  canSignOff: boolean;
  blockingReasons: string[];
  existingSignoff: SignoffRecordDto | null;
};

// ── Service ──────────────────────────────────────────────────────────────────

export type SignoffServicePort = {
  getSignoffStatus(
    date: Date,
    workspaceGroupId: string | undefined,
    department: string,
    actor: Actor
  ): Promise<SignoffStatusDto>;
  createSignoff(
    input: {
      date: Date;
      workspaceGroupId: string;
      department: string;
      summary?: string;
      notes?: string;
    },
    actor: Actor
  ): Promise<SignoffRecordDto>;
};

export class SignoffService implements SignoffServicePort {
  public constructor(
    private readonly options: { db: SignoffServiceDatabaseClient; now?: () => Date }
  ) {}

  public async getSignoffStatus(
    date: Date,
    workspaceGroupId: string | undefined,
    department: string,
    actor: Actor
  ): Promise<SignoffStatusDto> {
    const organizationId = this.requireOrg(actor);

    const taskWhere: { organizationId: string; date: Date; area?: { workspaceGroupId: string } } = {
      organizationId,
      date
    };
    if (workspaceGroupId !== undefined) {
      taskWhere.area = { workspaceGroupId };
    }

    const tasks = await this.options.db.taskInstance.findMany({
      where: taskWhere,
      select: { id: true, status: true }
    });

    const openIssueCount = await this.options.db.taskIssue.count({
      where: {
        organizationId,
        status: "open",
        taskInstance:
          workspaceGroupId !== undefined ? { date, area: { workspaceGroupId } } : { date }
      }
    });

    const existing =
      workspaceGroupId !== undefined
        ? await this.options.db.shiftSignoff.findFirst({
            where: { organizationId, date, workspaceGroupId, department },
            include: { signedBy: { select: { id: true, displayName: true } } }
          })
        : null;

    return this.buildStatus(date, workspaceGroupId, department, tasks, openIssueCount, existing);
  }

  public async createSignoff(
    input: {
      date: Date;
      workspaceGroupId: string;
      department: string;
      summary?: string;
      notes?: string;
    },
    actor: Actor
  ): Promise<SignoffRecordDto> {
    const organizationId = this.requireOrg(actor);
    const profile = await this.options.db.userProfile.findUnique({
      where: { authUserId: actor.userId },
      select: { id: true }
    });
    if (!profile) {
      throw new ShiftPlanningError("user profile not found", 403);
    }

    const tasks = await this.options.db.taskInstance.findMany({
      where: { organizationId, date: input.date, area: { workspaceGroupId: input.workspaceGroupId } },
      select: { id: true, status: true }
    });
    const openIssueCount = await this.options.db.taskIssue.count({
      where: {
        organizationId,
        status: "open",
        taskInstance: { date: input.date, area: { workspaceGroupId: input.workspaceGroupId } }
      }
    });
    const existing = await this.options.db.shiftSignoff.findFirst({
      where: {
        organizationId,
        date: input.date,
        workspaceGroupId: input.workspaceGroupId,
        department: input.department
      }
    });

    const status = this.buildStatus(
      input.date,
      input.workspaceGroupId,
      input.department,
      tasks,
      openIssueCount,
      existing
    );

    if (existing) {
      throw new ShiftPlanningError("Schichtabschluss existiert bereits", 409);
    }
    if (!status.canSignOff) {
      throw new ShiftPlanningError(
        `Schichtabschluss nicht möglich: ${status.blockingReasons.join("; ")}`,
        409
      );
    }

    const now = this.now();
    const weekday = weekdayFromDate(input.date);
    let created;
    try {
      created = await this.options.db.shiftSignoff.create({
        data: {
          organizationId,
          date: input.date,
          weekday,
          workspaceGroupId: input.workspaceGroupId,
          department: input.department,
          signedByUserId: profile.id,
          completedTaskCount: status.completedTaskCount,
          totalTaskCount: status.totalTaskCount,
          openIssueCount: status.openIssueCount,
          summary: input.summary ?? null,
          notes: input.notes ?? null,
          signedAt: now
        },
        include: { signedBy: { select: { id: true, displayName: true } } }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ShiftPlanningError("Schichtabschluss existiert bereits", 409);
      }
      throw err;
    }

    return this.toRecordDto(created);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildStatus(
    date: Date,
    workspaceGroupId: string | undefined,
    department: string,
    tasks: SignoffTaskRow[],
    openIssueCount: number,
    existing: SignoffRecordRow | null
  ): SignoffStatusDto {
    const totalTaskCount = tasks.length;
    const completedTaskCount = tasks.filter((t) => FINAL_TASK_STATUSES.has(t.status)).length;
    const openTaskCount = tasks.filter((t) => t.status === "open").length;
    // Any non-final status blocks: open, issue, or anything unexpected.
    const blockingTaskCount = tasks.filter((t) => !FINAL_TASK_STATUSES.has(t.status)).length;

    const blockingReasons: string[] = [];
    if (totalTaskCount === 0) {
      blockingReasons.push("keine Aufgaben für diesen Tag");
    }
    if (blockingTaskCount > 0) {
      blockingReasons.push(`${blockingTaskCount} nicht abgeschlossene Aufgabe(n)`);
    }
    if (openIssueCount > 0) {
      blockingReasons.push(`${openIssueCount} offene(r) Mangel`);
    }
    if (existing) {
      blockingReasons.push("Schichtabschluss existiert bereits");
    }

    const weekday = weekdayFromDate(date);

    return {
      date: date.toISOString().slice(0, 10),
      weekday: germanWeekday(weekday),
      workspaceGroupId: workspaceGroupId ?? null,
      department,
      totalTaskCount,
      completedTaskCount,
      openTaskCount,
      blockingTaskCount,
      openIssueCount,
      canSignOff: blockingReasons.length === 0,
      blockingReasons,
      existingSignoff: existing ? this.toRecordDto(existing) : null
    };
  }

  private toRecordDto(row: SignoffRecordRow): SignoffRecordDto {
    return {
      id: row.id,
      signedAt: row.signedAt.toISOString(),
      signedByName: row.signedBy?.displayName ?? null,
      completedTaskCount: row.completedTaskCount,
      totalTaskCount: row.totalTaskCount,
      openIssueCount: row.openIssueCount,
      summary: row.summary,
      notes: row.notes
    };
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}
