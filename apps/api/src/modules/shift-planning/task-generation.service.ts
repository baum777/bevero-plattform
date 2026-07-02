import { randomUUID } from "node:crypto";
import type { Actor } from "../auth/actor.js";
import {
  ShiftPlanningError,
  matrixFieldForWeekday,
  type WeekdayMatrixField
} from "./shift-planning.types.js";

// ── DB port ──────────────────────────────────────────────────────────────────

export type AssignmentRow = {
  id: string;
  organizationId: string;
  date: Date;
  weekday: number;
  userId: string;
  areaId: string;
  shiftEndAt: Date;
  area: { id: string; slug: string; name: string };
  userProfile: { id: string; displayName: string | null };
};

export type ChecklistTaskRow = {
  id: string;
  areaId: string;
  title: string;
  sortOrder: number;
};

export type MatrixRow = {
  taskId: string;
  areaId: string;
  mondayActive: boolean;
  tuesdayActive: boolean;
  wednesdayActive: boolean;
  thursdayActive: boolean;
  fridayActive: boolean;
  saturdayActive: boolean;
  sundayActive: boolean;
};

export type TaskInstanceRow = {
  id: string;
  shiftAssignmentId: string | null;
  taskId: string;
  areaId: string;
  userId: string;
  status: string;
  date: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  verifiedAt: Date | null;
  task: { id: string; title: string; requiresPhoto: boolean; requiresComment: boolean };
  area: { slug: string; name: string };
};

export type TaskGenerationDatabaseClient = {
  shiftPlanImport: {
    findUnique(args: {
      where: { id: string };
    }): Promise<{ id: string; organizationId: string; status: string } | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  shiftAssignment: {
    findMany(args: {
      where: { importId: string; status?: string };
      include: {
        area: { select: { id: true; slug: true; name: true } };
        userProfile: { select: { id: true; displayName: true } };
      };
    }): Promise<AssignmentRow[]>;
  };
  checklistTask: {
    findMany(args: {
      where: { areaId: { in: string[] }; active: boolean };
      select: { id: true; areaId: true; title: true; sortOrder: true };
    }): Promise<ChecklistTaskRow[]>;
  };
  taskDayMatrix: {
    findMany(args: { where: { areaId: { in: string[] } } }): Promise<MatrixRow[]>;
  };
  taskInstance: {
    findMany(args: {
      where: {
        shiftAssignmentId?: { in: string[] };
        userId?: string;
        date?: Date;
      };
      include?: {
        task: { select: { id: true; title: true; requiresPhoto: true; requiresComment: true } };
        area: { select: { slug: true; name: true } };
      };
    }): Promise<TaskInstanceRow[]>;
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        organizationId: true;
        userId: true;
        shiftAssignmentId: true;
        status: true;
        taskId: true;
        task: { select: { title: true } };
      };
    }): Promise<{
      id: string;
      organizationId: string;
      userId: string;
      shiftAssignmentId: string | null;
      status: string;
      taskId: string;
      task: { title: string };
    } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<{ id: string; status: string; completedAt: Date | null }>;
  };
  taskIssue: {
    findFirst(args: {
      where: { taskInstanceId: string; status: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  shiftSession: {
    findUnique(args: { where: { shiftAssignmentId: string }; select: { sessionStatus: true; userId: true } }): Promise<{ sessionStatus: string; userId: string } | null>;
  };
  userProfile: {
    findUnique(args: {
      where: { authUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  $transaction<T>(fn: (tx: TaskGenerationDatabaseClient) => Promise<T>): Promise<T>;
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type PreviewTaskDto = {
  assignmentId: string;
  userId: string;
  userName: string | null;
  areaSlug: string;
  areaName: string;
  taskId: string;
  taskTitle: string;
};

export type PreviewDto = {
  importId: string;
  totalTasks: number;
  byArea: Record<string, number>;
  tasks: PreviewTaskDto[];
};

export type ReleaseResultDto = {
  importId: string;
  status: string;
  createdCount: number;
  skippedCount: number;
};

export type UserTaskDto = {
  id: string;
  date: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  shiftAssignmentId: string | null;
  taskId: string;
  taskTitle: string;
  status: string;
  assignedUserId: string;
  assignedUserName: string | null;
  issueStatus: null;
  issueNote: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  requiresPhoto: boolean;
  requiresComment: boolean;
  dueAt: string | null;
};

export type UpdateTaskResultDto = {
  id: string;
  status: string;
  completedAt: string | null;
};

// ── Service ──────────────────────────────────────────────────────────────────

export type TaskGenerationServicePort = {
  preview(importId: string, actor: Actor): Promise<PreviewDto>;
  release(importId: string, excludeTaskIds: string[] | undefined, actor: Actor): Promise<ReleaseResultDto>;
  getUserTasks(date: Date, actor: Actor): Promise<UserTaskDto[]>;
  updateTaskStatus(taskId: string, status: string, note: string | undefined, actor: Actor): Promise<UpdateTaskResultDto>;
};

export class TaskGenerationService implements TaskGenerationServicePort {
  public constructor(
    private readonly options: {
      db: TaskGenerationDatabaseClient;
      now?: () => Date;
    }
  ) {}

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  public async preview(importId: string, actor: Actor): Promise<PreviewDto> {
    const organizationId = this.requireOrg(actor);
    await this.guardImport(importId, organizationId);
    const plan = await this.computePlannedTasks(importId);

    const byArea: Record<string, number> = {};
    for (const task of plan) {
      byArea[task.areaSlug] = (byArea[task.areaSlug] ?? 0) + 1;
    }

    return { importId, totalTasks: plan.length, byArea, tasks: plan };
  }

  public async release(
    importId: string,
    excludeTaskIds: string[] | undefined,
    actor: Actor
  ): Promise<ReleaseResultDto> {
    const organizationId = this.requireOrg(actor);
    const record = await this.guardImport(importId, organizationId);

    if (record.status !== "confirmed" && record.status !== "released") {
      throw new ShiftPlanningError(
        `import must be confirmed before releasing tasks (current: ${record.status})`,
        409
      );
    }

    const exclude = new Set(excludeTaskIds ?? []);
    const planned = (await this.computePlannedTasksRaw(importId)).filter(
      (entry) => !exclude.has(entry.taskId)
    );

    // Idempotency: skip (assignmentId, taskId) pairs that already exist.
    const assignmentIds = [...new Set(planned.map((entry) => entry.assignmentId))];
    const existing =
      assignmentIds.length > 0
        ? await this.options.db.taskInstance.findMany({
            where: { shiftAssignmentId: { in: assignmentIds } }
          })
        : [];
    const existingKeys = new Set(
      existing.map((row) => `${row.shiftAssignmentId}:${row.taskId}`)
    );

    const now = this.now();
    const result = await this.options.db.$transaction(async (tx) => {
      let created = 0;
      let skipped = 0;
      for (const entry of planned) {
        const key = `${entry.assignmentId}:${entry.taskId}`;
        if (existingKeys.has(key)) {
          skipped += 1;
          continue;
        }
        await tx.taskInstance.create({
          data: {
            id: randomUUID(),
            organizationId,
            date: entry.date,
            weekday: entry.weekday,
            importId,
            shiftAssignmentId: entry.assignmentId,
            userId: entry.userId,
            areaId: entry.areaId,
            taskId: entry.taskId,
            status: "open",
            dueAt: entry.dueAt
          }
        });
        existingKeys.add(key);
        created += 1;
      }

      await tx.shiftPlanImport.update({
        where: { id: importId },
        data: { status: "released", releasedAt: now, releasedByUserId: actor.userId, updatedAt: now }
      });

      return { created, skipped };
    });

    return {
      importId,
      status: "released",
      createdCount: result.created,
      skippedCount: result.skipped
    };
  }

  public async getUserTasks(date: Date, actor: Actor): Promise<UserTaskDto[]> {
    this.requireOrg(actor);
    const profile = await this.options.db.userProfile.findUnique({
      where: { authUserId: actor.userId },
      select: { id: true }
    });
    if (!profile) {
      return [];
    }

    const instances = await this.options.db.taskInstance.findMany({
      where: { userId: profile.id, date },
      include: {
        task: { select: { id: true, title: true, requiresPhoto: true, requiresComment: true } },
        area: { select: { slug: true, name: true } }
      }
    });

    const isoDate = date.toISOString().slice(0, 10);

    return instances.map((row) => ({
      id: row.id,
      date: isoDate,
      areaId: row.areaId,
      areaSlug: row.area.slug,
      areaLabel: row.area.name,
      shiftAssignmentId: row.shiftAssignmentId,
      taskId: row.taskId,
      taskTitle: row.task.title,
      status: row.status,
      assignedUserId: row.userId,
      assignedUserName: null,
      issueStatus: null,
      issueNote: null,
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      requiresPhoto: row.task.requiresPhoto,
      requiresComment: row.task.requiresComment,
      dueAt: row.dueAt ? row.dueAt.toISOString() : null
    }));
  }

  public async updateTaskStatus(
    taskId: string,
    status: string,
    note: string | undefined,
    actor: Actor
  ): Promise<UpdateTaskResultDto> {
    const organizationId = this.requireOrg(actor);
    const profile = await this.options.db.userProfile.findUnique({
      where: { authUserId: actor.userId },
      select: { id: true }
    });
    if (!profile) {
      throw new ShiftPlanningError("user profile not found", 403);
    }

    const instance = await this.options.db.taskInstance.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        shiftAssignmentId: true,
        status: true,
        taskId: true,
        task: { select: { title: true } }
      }
    });
    if (!instance || instance.organizationId !== organizationId) {
      throw new ShiftPlanningError("task instance not found", 404);
    }
    if (instance.userId !== profile.id) {
      throw new ShiftPlanningError("task instance belongs to another user", 403);
    }
    // Legacy task rows without a shiftAssignmentId predate shift sessions and
    // remain usable. Every assignment-bound task must have an active session.
    if (instance.shiftAssignmentId) {
      const session = await this.options.db.shiftSession.findUnique({
        where: { shiftAssignmentId: instance.shiftAssignmentId },
        select: { sessionStatus: true, userId: true }
      });
      if (!session || session.userId !== profile.id || session.sessionStatus !== "active") {
        throw new ShiftPlanningError("start your shift before updating assigned tasks", 409);
      }
    }

    const now = this.now();

    // Reporting a defect is a coupled write: flip the instance to `issue` AND
    // record an auditable task_issues row. Run both inside one transaction so a
    // partial failure can never leave the instance in `issue` without a defect
    // record (or vice versa). Idempotent: a second report while an open issue
    // already exists does not create a duplicate.
    if (status === "issue") {
      const updated = await this.options.db.$transaction(async (tx) => {
        // Lock the task instance row first so concurrent defect reports
        // serialise here; the existingOpen check then always sees the
        // committed state of the winner before deciding whether to insert.
        const row = await tx.taskInstance.update({
          where: { id: taskId },
          data: { status: "issue", updatedAt: now }
        });

        const existingOpen = await tx.taskIssue.findFirst({
          where: { taskInstanceId: taskId, status: "open" },
          select: { id: true }
        });

        if (!existingOpen) {
          await tx.taskIssue.create({
            data: {
              organizationId,
              taskInstanceId: taskId,
              reportedByUserId: profile.id,
              title: instance.task.title,
              description: note ?? null,
              severity: "medium",
              status: "open",
              createdAt: now,
              updatedAt: now
            }
          });
        }

        return row;
      });

      return {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt ? updated.completedAt.toISOString() : null
      };
    }

    const data: Record<string, unknown> = { status, updatedAt: now };
    if (status === "done") {
      data.completedAt = now;
      data.completedByUserId = profile.id;
    }

    const updated = await this.options.db.taskInstance.update({
      where: { id: taskId },
      data
    });

    return {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async computePlannedTasks(importId: string): Promise<PreviewTaskDto[]> {
    const raw = await this.computePlannedTasksRaw(importId);
    return raw.map((entry) => ({
      assignmentId: entry.assignmentId,
      userId: entry.userId,
      userName: entry.userName,
      areaSlug: entry.areaSlug,
      areaName: entry.areaName,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle
    }));
  }

  private async computePlannedTasksRaw(importId: string): Promise<PlannedTask[]> {
    const assignments = await this.options.db.shiftAssignment.findMany({
      where: { importId, status: "active" },
      include: {
        area: { select: { id: true, slug: true, name: true } },
        userProfile: { select: { id: true, displayName: true } }
      }
    });

    if (assignments.length === 0) {
      return [];
    }

    const areaIds = [...new Set(assignments.map((a) => a.areaId))];
    const [tasks, matrix] = await Promise.all([
      this.options.db.checklistTask.findMany({
        where: { areaId: { in: areaIds }, active: true },
        select: { id: true, areaId: true, title: true, sortOrder: true }
      }),
      this.options.db.taskDayMatrix.findMany({ where: { areaId: { in: areaIds } } })
    ]);

    const tasksByArea = new Map<string, ChecklistTaskRow[]>();
    for (const task of tasks) {
      const list = tasksByArea.get(task.areaId) ?? [];
      list.push(task);
      tasksByArea.set(task.areaId, list);
    }
    for (const list of tasksByArea.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const matrixByKey = new Map<string, MatrixRow>();
    for (const row of matrix) {
      matrixByKey.set(`${row.taskId}:${row.areaId}`, row);
    }

    const planned: PlannedTask[] = [];
    for (const assignment of assignments) {
      const field = matrixFieldForWeekday(assignment.weekday);
      const areaTasks = tasksByArea.get(assignment.areaId) ?? [];
      for (const task of areaTasks) {
        const matrixRow = matrixByKey.get(`${task.id}:${assignment.areaId}`);
        // No matrix row → default active (matrix not yet configured).
        if (matrixRow && !isActiveOnDay(matrixRow, field)) {
          continue;
        }
        planned.push({
          assignmentId: assignment.id,
          date: assignment.date,
          weekday: assignment.weekday,
          dueAt: assignment.shiftEndAt,
          userId: assignment.userId,
          userName: assignment.userProfile.displayName,
          areaId: assignment.areaId,
          areaSlug: assignment.area.slug,
          areaName: assignment.area.name,
          taskId: task.id,
          taskTitle: task.title
        });
      }
    }

    return planned;
  }

  private async guardImport(
    importId: string,
    organizationId: string
  ): Promise<{ id: string; organizationId: string; status: string }> {
    const record = await this.options.db.shiftPlanImport.findUnique({ where: { id: importId } });
    if (!record || record.organizationId !== organizationId) {
      throw new ShiftPlanningError("import not found", 404);
    }
    return record;
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}

type PlannedTask = {
  assignmentId: string;
  date: Date;
  weekday: number;
  dueAt: Date;
  userId: string;
  userName: string | null;
  areaId: string;
  areaSlug: string;
  areaName: string;
  taskId: string;
  taskTitle: string;
};

function isActiveOnDay(row: MatrixRow, field: WeekdayMatrixField): boolean {
  return row[field];
}
