/**
 * Service-flow integration tests for the shift-planning backend slice.
 *
 * These tests exercise the TaskGenerationService, MatrixReadService, and
 * ShiftLeadSummaryService against in-memory DB fakes, verifying that the
 * core flow is correct without requiring a live database.
 */

import { describe, expect, it } from "vitest";
import { TaskGenerationService } from "../src/modules/shift-planning/task-generation.service.js";
import type {
  AssignmentRow,
  ChecklistTaskRow,
  MatrixRow,
  TaskGenerationDatabaseClient,
  TaskInstanceRow
} from "../src/modules/shift-planning/task-generation.service.js";
import { MatrixReadService } from "../src/modules/shift-planning/matrix-read.service.js";
import type { MatrixReadDatabaseClient } from "../src/modules/shift-planning/matrix-read.service.js";
import { ShiftLeadSummaryService } from "../src/modules/shift-planning/shift-lead-summary.service.js";
import type {
  ShiftLeadSummaryDatabaseClient,
  SummaryAssignmentRow
} from "../src/modules/shift-planning/shift-lead-summary.service.js";
import type { Actor } from "../src/modules/auth/actor.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ORG = "org-test";
const IMPORT_ID = "import-1";
const AREA_ID = "area-gardemanger";
const AREA2_ID = "area-saucier";
const TASK_ID = "task-mise-en-place";
const TASK2_ID = "task-sauce";
const ASSIGNMENT_ID = "assign-1";
const ASSIGNMENT2_ID = "assign-2";
const USER_ID = "profile-alice";
const USER2_ID = "profile-bob";
const AUTH_USER_ID = "auth-alice";
const DATE = new Date(Date.UTC(2026, 5, 19)); // 2026-06-19, Thursday (weekday index 3)

const managerActor: Actor = {
  userId: "auth-manager",
  organizationId: ORG,
  role: "admin",

};

const staffActor: Actor = {
  userId: AUTH_USER_ID,
  organizationId: ORG,
  role: "staff",

};

function makeImportRecord(status: string) {
  return { id: IMPORT_ID, organizationId: ORG, status };
}

function makeAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: ASSIGNMENT_ID,
    organizationId: ORG,
    date: DATE,
    weekday: 3, // Thursday
    userId: USER_ID,
    areaId: AREA_ID,
    shiftEndAt: new Date(Date.UTC(2026, 5, 19, 15, 0, 0)),
    area: { id: AREA_ID, slug: "gardemanger", name: "Gardemanger" },
    userProfile: { id: USER_ID, displayName: "Alice" },
    ...overrides
  };
}

function makeChecklistTask(overrides: Partial<ChecklistTaskRow> = {}): ChecklistTaskRow {
  return {
    id: TASK_ID,
    areaId: AREA_ID,
    title: "Mise en Place",
    sortOrder: 1,
    ...overrides
  };
}

function makeMatrixRow(overrides: Partial<MatrixRow> = {}): MatrixRow {
  return {
    taskId: TASK_ID,
    areaId: AREA_ID,
    mondayActive: true,
    tuesdayActive: true,
    wednesdayActive: true,
    thursdayActive: true,
    fridayActive: true,
    saturdayActive: false,
    sundayActive: false,
    ...overrides
  };
}

// ── TaskGenerationService ─────────────────────────────────────────────────────

describe("TaskGenerationService", () => {
  function buildDb(overrides: Partial<{
    importRecord: ReturnType<typeof makeImportRecord> | null;
    assignments: AssignmentRow[];
    tasks: ChecklistTaskRow[];
    matrix: MatrixRow[];
    existingInstances: TaskInstanceRow[];
    profileId: string | null;
  }> = {}): TaskGenerationDatabaseClient {
    const importRecord = overrides.importRecord ?? makeImportRecord("confirmed");
    const assignments = overrides.assignments ?? [makeAssignment()];
    const tasks = overrides.tasks ?? [makeChecklistTask()];
    const matrix = overrides.matrix ?? [makeMatrixRow()];
    const existingInstances = overrides.existingInstances ?? [];
    const profileId = overrides.profileId ?? USER_ID;

    const created: TaskInstanceRow[] = [];

    return {
      shiftPlanImport: {
        findUnique: async ({ where }) =>
          where.id === IMPORT_ID ? importRecord : null,
        update: async () => ({})
      },
      shiftAssignment: {
        findMany: async () => assignments
      },
      checklistTask: {
        findMany: async () => tasks
      },
      taskDayMatrix: {
        findMany: async () => matrix
      },
      taskInstance: {
        findMany: async ({ where }) => {
          let rows = [...existingInstances, ...created];
          if (where.shiftAssignmentId && "in" in where.shiftAssignmentId) {
            const ids = where.shiftAssignmentId.in;
            rows = rows.filter((r) => r.shiftAssignmentId && ids.includes(r.shiftAssignmentId));
          }
          if (where.userId) {
            rows = rows.filter((r) => r.userId === where.userId);
          }
          if (where.date) {
            rows = rows.filter(
              (r) => r.date.toISOString().slice(0, 10) === where.date!.toISOString().slice(0, 10)
            );
          }
          return rows;
        },
        create: async ({ data }) => {
          const row: TaskInstanceRow = {
            id: data.id as string,
            shiftAssignmentId: (data.shiftAssignmentId as string) ?? null,
            taskId: data.taskId as string,
            areaId: data.areaId as string,
            userId: data.userId as string,
            status: data.status as string,
            date: data.date as Date,
            dueAt: (data.dueAt as Date) ?? null,
            completedAt: null,
            verifiedAt: null,
            task: { id: data.taskId as string, title: "Mise en Place", requiresPhoto: false, requiresComment: false },
            area: { slug: "gardemanger", name: "Gardemanger" }
          };
          created.push(row);
          return { id: row.id };
        },
        findUnique: async ({ where }) => {
          const row = [...existingInstances, ...created].find((r) => r.id === where.id);
          if (!row) return null;
          return {
            id: row.id,
            organizationId: ORG,
            userId: row.userId,
            shiftAssignmentId: row.shiftAssignmentId,
            status: row.status,
            taskId: row.taskId,
            task: { title: row.task.title }
          };
        },
        update: async ({ where, data }) => ({
          id: where.id,
          status: data.status as string,
          completedAt: (data.completedAt as Date | undefined) ?? null
        })
      },
      taskIssue: {
        findFirst: async () => null,
        create: async () => ({ id: "issue-created" })
      },
      shiftSession: { findUnique: async () => ({ sessionStatus: "active", userId: USER_ID }) },
      userProfile: {
        findUnique: async ({ where }) =>
          profileId && where.authUserId === AUTH_USER_ID ? { id: profileId } : null
      },
      $transaction: async (fn) => fn({
        shiftPlanImport: {
          findUnique: async ({ where }) =>
            where.id === IMPORT_ID ? importRecord : null,
          update: async () => ({})
        },
        shiftAssignment: { findMany: async () => assignments },
        checklistTask: { findMany: async () => tasks },
        taskDayMatrix: { findMany: async () => matrix },
        taskInstance: {
          findMany: async ({ where }) => {
            let rows = [...existingInstances, ...created];
            if (where.shiftAssignmentId && "in" in where.shiftAssignmentId) {
              const ids = where.shiftAssignmentId.in;
              rows = rows.filter((r) => r.shiftAssignmentId && ids.includes(r.shiftAssignmentId));
            }
            return rows;
          },
          create: async ({ data }) => {
            const row: TaskInstanceRow = {
              id: data.id as string,
              shiftAssignmentId: (data.shiftAssignmentId as string) ?? null,
              taskId: data.taskId as string,
              areaId: data.areaId as string,
              userId: data.userId as string,
              status: data.status as string,
              date: data.date as Date,
              dueAt: (data.dueAt as Date) ?? null,
              completedAt: null,
              verifiedAt: null,
              task: { id: data.taskId as string, title: "Mise en Place", requiresPhoto: false, requiresComment: false },
              area: { slug: "gardemanger", name: "Gardemanger" }
            };
            created.push(row);
            return { id: row.id };
          },
          findUnique: async ({ where }) => {
            const row = [...existingInstances, ...created].find((r) => r.id === where.id);
            if (!row) return null;
            return {
              id: row.id,
              organizationId: ORG,
              userId: row.userId,
              shiftAssignmentId: row.shiftAssignmentId,
              status: row.status,
              taskId: row.taskId,
              task: { title: row.task.title }
            };
          },
          update: async ({ where, data }) => ({
            id: where.id,
            status: data.status as string,
            completedAt: (data.completedAt as Date | undefined) ?? null
          })
        },
        taskIssue: {
          findFirst: async () => null,
          create: async () => ({ id: "issue-created" })
        },
        shiftSession: { findUnique: async () => ({ sessionStatus: "active", userId: USER_ID }) },
        userProfile: {
          findUnique: async ({ where }) =>
            profileId && where.authUserId === AUTH_USER_ID ? { id: profileId } : null
        },
        $transaction: async (fn2) => fn2({} as TaskGenerationDatabaseClient)
      } as TaskGenerationDatabaseClient)
    };
  }

  describe("preview", () => {
    it("returns tasks grouped by area", async () => {
      const svc = new TaskGenerationService({ db: buildDb() });
      const result = await svc.preview(IMPORT_ID, managerActor);

      expect(result.importId).toBe(IMPORT_ID);
      expect(result.totalTasks).toBe(1);
      expect(result.byArea["gardemanger"]).toBe(1);
      expect(result.tasks[0]).toMatchObject({
        areaSlug: "gardemanger",
        taskTitle: "Mise en Place"
      });
    });

    it("filters tasks inactive on the assignment weekday (Saturday)", async () => {
      const saturdayAssignment = makeAssignment({ weekday: 5 }); // Saturday
      const db = buildDb({ assignments: [saturdayAssignment] });
      const svc = new TaskGenerationService({ db });
      const result = await svc.preview(IMPORT_ID, managerActor);

      // Matrix has saturdayActive: false → task should be excluded
      expect(result.totalTasks).toBe(0);
    });

    it("includes task when no matrix row exists (default active)", async () => {
      const db = buildDb({ matrix: [] }); // no matrix row → default to active
      const svc = new TaskGenerationService({ db });
      const result = await svc.preview(IMPORT_ID, managerActor);
      expect(result.totalTasks).toBe(1);
    });
  });

  describe("release", () => {
    it("creates task instances and returns count", async () => {
      const db = buildDb();
      const svc = new TaskGenerationService({ db });
      const result = await svc.release(IMPORT_ID, undefined, managerActor);

      expect(result.status).toBe("released");
      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(0);
    });

    it("is idempotent: skips already-existing instances on second release", async () => {
      const alreadyCreated: TaskInstanceRow[] = [
        {
          id: "instance-existing",
          shiftAssignmentId: ASSIGNMENT_ID,
          taskId: TASK_ID,
          areaId: AREA_ID,
          userId: USER_ID,
          status: "open",
          date: DATE,
          dueAt: null,
          completedAt: null,
          verifiedAt: null,
          task: { id: TASK_ID, title: "Mise en Place", requiresPhoto: false, requiresComment: false },
          area: { slug: "gardemanger", name: "Gardemanger" }
        }
      ];

      const db = buildDb({ existingInstances: alreadyCreated });
      const svc = new TaskGenerationService({ db });
      const result = await svc.release(IMPORT_ID, undefined, managerActor);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it("excludes tasks by excludeTaskIds", async () => {
      const db = buildDb();
      const svc = new TaskGenerationService({ db });
      const result = await svc.release(IMPORT_ID, [TASK_ID], managerActor);

      expect(result.createdCount).toBe(0);
    });

    it("rejects release if import is not confirmed", async () => {
      const db = buildDb({ importRecord: makeImportRecord("parsed") });
      const svc = new TaskGenerationService({ db });

      await expect(svc.release(IMPORT_ID, undefined, managerActor)).rejects.toMatchObject({
        statusCode: 409
      });
    });
  });

  describe("getUserTasks", () => {
    it("returns tasks only for the authenticated user's profile", async () => {
      const myInstance: TaskInstanceRow = {
        id: "inst-mine",
        shiftAssignmentId: ASSIGNMENT_ID,
        taskId: TASK_ID,
        areaId: AREA_ID,
        userId: USER_ID,
        status: "open",
        date: DATE,
        dueAt: null,
        completedAt: null,
        verifiedAt: null,
        task: { id: TASK_ID, title: "Mise en Place", requiresPhoto: false, requiresComment: false },
        area: { slug: "gardemanger", name: "Gardemanger" }
      };
      const otherInstance: TaskInstanceRow = {
        id: "inst-other",
        shiftAssignmentId: ASSIGNMENT2_ID,
        taskId: TASK2_ID,
        areaId: AREA2_ID,
        userId: USER2_ID,
        status: "open",
        date: DATE,
        dueAt: null,
        completedAt: null,
        verifiedAt: null,
        task: { id: TASK2_ID, title: "Other Task", requiresPhoto: false, requiresComment: false },
        area: { slug: "saucier", name: "Saucier" }
      };

      const db = buildDb({ existingInstances: [myInstance, otherInstance] });
      const svc = new TaskGenerationService({ db });
      const tasks = await svc.getUserTasks(DATE, staffActor);

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe("inst-mine");
    });

    it("returns empty array when user has no profile", async () => {
      const db = buildDb({ profileId: null });
      const svc = new TaskGenerationService({ db });
      const tasks = await svc.getUserTasks(DATE, staffActor);
      expect(tasks).toEqual([]);
    });
  });
});

// ── MatrixReadService ─────────────────────────────────────────────────────────

describe("MatrixReadService", () => {
  function buildMatrixDb(): MatrixReadDatabaseClient {
    return {
      kitchenArea: {
        findMany: async ({ where }) => {
          const areas = [
            { id: AREA_ID, slug: "gardemanger", name: "Gardemanger", workspaceGroupId: "wg-kitchen", active: true },
            { id: AREA2_ID, slug: "saucier", name: "Saucier", workspaceGroupId: "wg-kitchen", active: true }
          ];
          return areas.filter((a) => {
            if (where.workspaceGroupId !== undefined && a.workspaceGroupId !== where.workspaceGroupId) return false;
            if (where.active !== undefined && a.active !== where.active) return false;
            return true;
          });
        }
      },
      checklistTask: {
        findMany: async ({ where }) => {
          const tasks = [
            { id: TASK_ID, areaId: AREA_ID, title: "Mise en Place", sortOrder: 1, requiresPhoto: false, requiresComment: false, active: true },
            { id: TASK2_ID, areaId: AREA2_ID, title: "Saucenansatz", sortOrder: 1, requiresPhoto: false, requiresComment: false, active: true }
          ];
          return tasks.filter((t) => {
            const areaIds = where.areaId && "in" in where.areaId ? where.areaId.in : null;
            if (areaIds && !areaIds.includes(t.areaId)) return false;
            return true;
          });
        }
      },
      taskDayMatrix: {
        findMany: async () => [makeMatrixRow(), { ...makeMatrixRow(), taskId: TASK2_ID, areaId: AREA2_ID }]
      }
    };
  }

  it("returns areas with tasks and active-day flags", async () => {
    const svc = new MatrixReadService({ db: buildMatrixDb() });
    const result = await svc.getMatrix(undefined, managerActor);

    expect(result.organizationId).toBe(ORG);
    expect(result.areas.length).toBe(2);

    const gardemanger = result.areas.find((a) => a.areaSlug === "gardemanger");
    expect(gardemanger).toBeDefined();
    expect(gardemanger!.tasks.length).toBe(1);
    expect(gardemanger!.tasks[0].days.find((day) => day.key === "thursday")?.active).toBe(true);
    expect(gardemanger!.tasks[0].days.find((day) => day.key === "saturday")?.active).toBe(false);
  });

  it("filters by workspaceGroupId", async () => {
    const db: MatrixReadDatabaseClient = {
      kitchenArea: {
        findMany: async ({ where }) => {
          if (where.workspaceGroupId === "wg-other") return [];
          return [{ id: AREA_ID, slug: "gardemanger", name: "Gardemanger", workspaceGroupId: "wg-kitchen", active: true }];
        }
      },
      checklistTask: { findMany: async () => [] },
      taskDayMatrix: { findMany: async () => [] }
    };

    const svc = new MatrixReadService({ db });
    const result = await svc.getMatrix("wg-other", managerActor);
    expect(result.areas).toEqual([]);
  });

  it("defaults all days to active when no matrix row exists", async () => {
    const db: MatrixReadDatabaseClient = {
      kitchenArea: {
        findMany: async () => [{ id: AREA_ID, slug: "gardemanger", name: "Gardemanger", workspaceGroupId: null, active: true }]
      },
      checklistTask: {
        findMany: async () => [{ id: TASK_ID, areaId: AREA_ID, title: "Mise en Place", sortOrder: 1, requiresPhoto: false, requiresComment: false, active: true }]
      },
      taskDayMatrix: { findMany: async () => [] }
    };

    const svc = new MatrixReadService({ db });
    const result = await svc.getMatrix(undefined, managerActor);
    const days = result.areas[0].tasks[0].days;
    expect(days.find((day) => day.key === "saturday")?.active).toBe(true);
    expect(days.find((day) => day.key === "sunday")?.active).toBe(true);
  });
});

// ── ShiftLeadSummaryService ───────────────────────────────────────────────────

describe("ShiftLeadSummaryService", () => {
  function buildSummaryDb(taskStatuses: string[] = []): ShiftLeadSummaryDatabaseClient {
    const assignments: SummaryAssignmentRow[] = [
      {
        id: ASSIGNMENT_ID,
        userId: USER_ID,
        areaId: AREA_ID,
        area: { id: AREA_ID, slug: "gardemanger", name: "Gardemanger", workspaceGroupId: null },
        userProfile: { id: USER_ID, displayName: "Alice" },
        shiftStartAt: DATE,
        shiftEndAt: new Date(DATE.getTime() + 8 * 60 * 60 * 1000)
      },
      {
        id: ASSIGNMENT2_ID,
        userId: USER2_ID,
        areaId: AREA2_ID,
        area: { id: AREA2_ID, slug: "saucier", name: "Saucier", workspaceGroupId: null },
        userProfile: { id: USER2_ID, displayName: "Bob" },
        shiftStartAt: DATE,
        shiftEndAt: new Date(DATE.getTime() + 8 * 60 * 60 * 1000)
      }
    ];

    const tasks = taskStatuses.map((status, i) => ({
      id: `task-inst-${i}`,
      areaId: i === 0 ? AREA_ID : AREA2_ID,
      shiftAssignmentId: i === 0 ? ASSIGNMENT_ID : ASSIGNMENT2_ID,
      userId: i === 0 ? USER_ID : USER2_ID,
      status,
      notes: null
    }));

    return {
      shiftAssignment: {
        findMany: async () => assignments
      },
      taskInstance: {
        findMany: async () => tasks
      },
      shiftSession: { findMany: async () => [] }
    };
  }

  it("groups tasks by area with correct counts", async () => {
    const svc = new ShiftLeadSummaryService({
      db: buildSummaryDb(["done", "issue"])
    });
    const result = await svc.getSummary(DATE, undefined, managerActor);

    expect(result.areas.length).toBe(2);

    const gardemanger = result.areas.find((a) => a.areaSlug === "gardemanger");
    expect(gardemanger).toBeDefined();
    expect(gardemanger!.totalTasks).toBe(1);
    expect(gardemanger!.doneTasks).toBe(1);
    expect(gardemanger!.issueTasks).toBe(0);

    const saucier = result.areas.find((a) => a.areaSlug === "saucier");
    expect(saucier!.issueTasks).toBe(1);
  });

  it("lists assigned users per area", async () => {
    const svc = new ShiftLeadSummaryService({ db: buildSummaryDb() });
    const result = await svc.getSummary(DATE, undefined, managerActor);

    const gardemanger = result.areas.find((a) => a.areaSlug === "gardemanger");
    expect(gardemanger!.assignedUsers.length).toBe(1);
    expect(gardemanger!.assignedUsers[0]).toBe("Alice");
  });

  it("computes totals across all areas", async () => {
    const svc = new ShiftLeadSummaryService({
      db: buildSummaryDb(["open", "done"])
    });
    const result = await svc.getSummary(DATE, undefined, managerActor);

    expect(result.totals.totalTasks).toBe(2);
    expect(result.totals.openTasks).toBe(1);
    expect(result.totals.doneTasks).toBe(1);
  });

  it("returns the correct ISO date string", async () => {
    const svc = new ShiftLeadSummaryService({ db: buildSummaryDb() });
    const result = await svc.getSummary(DATE, undefined, managerActor);
    expect(result.date).toBe("2026-06-19");
  });

  it("includes workspaceGroupId in response when provided", async () => {
    const db: ShiftLeadSummaryDatabaseClient = {
      shiftAssignment: { findMany: async () => [] },
      taskInstance: { findMany: async () => [] },
      shiftSession: { findMany: async () => [] }
    };
    const svc = new ShiftLeadSummaryService({ db });
    const result = await svc.getSummary(DATE, "wg-kitchen", managerActor);
    expect(result.workspaceGroupId).toBe("wg-kitchen");
  });
});
