import type { Actor } from "../auth/actor.js";
import { ShiftPlanningError } from "./shift-planning.types.js";

// ── DB port ──────────────────────────────────────────────────────────────────

export type MatrixAreaRow = {
  id: string;
  slug: string;
  name: string;
  workspaceGroupId: string | null;
  active: boolean;
};

export type MatrixTaskRow = {
  id: string;
  areaId: string;
  title: string;
  sortOrder: number;
  requiresPhoto: boolean;
  requiresComment: boolean;
  active: boolean;
};

export type MatrixDayRow = {
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

export type MatrixReadDatabaseClient = {
  kitchenArea: {
    findMany(args: {
      where: { organizationId: string; workspaceGroupId?: string | null; active?: boolean };
      orderBy?: { name: "asc" | "desc" };
    }): Promise<MatrixAreaRow[]>;
  };
  checklistTask: {
    findMany(args: {
      where: { organizationId: string; areaId?: { in: string[] }; active?: boolean };
      select: {
        id: true;
        areaId: true;
        title: true;
        sortOrder: true;
        requiresPhoto: true;
        requiresComment: true;
        active: true;
      };
      orderBy?: { sortOrder: "asc" | "desc" };
    }): Promise<MatrixTaskRow[]>;
  };
  taskDayMatrix: {
    findMany(args: {
      where: { organizationId: string; areaId?: { in: string[] } };
    }): Promise<MatrixDayRow[]>;
  };
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Mo", tuesday: "Di", wednesday: "Mi", thursday: "Do",
  friday: "Fr", saturday: "Sa", sunday: "So"
};

export type MatrixDayDto = {
  key: string;
  label: string;
  active: boolean;
};

export type MatrixTaskDto = {
  taskId: string;
  taskTitle: string;
  sortOrder: number;
  requiresPhoto: boolean;
  requiresComment: boolean;
  days: MatrixDayDto[];
  matrixStatus: "explicit" | "default_all_days";
  confidence: "high";
  requiresManualReview: boolean;
};

export type MatrixAreaDto = {
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  tasks: MatrixTaskDto[];
};

export type MatrixDto = {
  version: "1.0";
  organizationId: string;
  workspaceGroupId: string | null;
  areas: MatrixAreaDto[];
};

// ── Service ──────────────────────────────────────────────────────────────────

export type MatrixReadServicePort = {
  getMatrix(workspaceGroupId: string | undefined, actor: Actor): Promise<MatrixDto>;
};

export class MatrixReadService implements MatrixReadServicePort {
  public constructor(private readonly options: { db: MatrixReadDatabaseClient }) {}

  public async getMatrix(workspaceGroupId: string | undefined, actor: Actor): Promise<MatrixDto> {
    const organizationId = this.requireOrg(actor);

    const areaWhere: Parameters<MatrixReadDatabaseClient["kitchenArea"]["findMany"]>[0]["where"] = {
      organizationId,
      active: true
    };
    if (workspaceGroupId !== undefined) {
      areaWhere.workspaceGroupId = workspaceGroupId;
    }

    const areas = await this.options.db.kitchenArea.findMany({
      where: areaWhere,
      orderBy: { name: "asc" }
    });

    if (areas.length === 0) {
      return {
        version: "1.0",
        organizationId,
        workspaceGroupId: workspaceGroupId ?? null,
        areas: []
      };
    }

    const areaIds = areas.map((a) => a.id);

    const [tasks, matrixRows] = await Promise.all([
      this.options.db.checklistTask.findMany({
        where: { organizationId, areaId: { in: areaIds }, active: true },
        select: {
          id: true,
          areaId: true,
          title: true,
          sortOrder: true,
          requiresPhoto: true,
          requiresComment: true,
          active: true
        },
        orderBy: { sortOrder: "asc" }
      }),
      this.options.db.taskDayMatrix.findMany({
        where: { organizationId, areaId: { in: areaIds } }
      })
    ]);

    const matrixByTaskId = new Map<string, MatrixDayRow>();
    for (const row of matrixRows) {
      matrixByTaskId.set(row.taskId, row);
    }

    const tasksByArea = new Map<string, MatrixTaskRow[]>();
    for (const task of tasks) {
      const list = tasksByArea.get(task.areaId) ?? [];
      list.push(task);
      tasksByArea.set(task.areaId, list);
    }

    const DAY_FIELDS: Array<[string, keyof MatrixDayRow]> = [
      ["monday", "mondayActive"],
      ["tuesday", "tuesdayActive"],
      ["wednesday", "wednesdayActive"],
      ["thursday", "thursdayActive"],
      ["friday", "fridayActive"],
      ["saturday", "saturdayActive"],
      ["sunday", "sundayActive"]
    ];

    const areaDtos: MatrixAreaDto[] = areas.map((area) => {
      const areaTasks = tasksByArea.get(area.id) ?? [];
      return {
        areaId: area.id,
        areaSlug: area.slug,
        areaLabel: area.name,
        tasks: areaTasks.map((task) => {
          const matrix = matrixByTaskId.get(task.id);
          const isExplicit = matrix !== undefined;
          const days: MatrixDayDto[] = DAY_FIELDS.map(([key, field]) => ({
            key,
            label: WEEKDAY_LABELS[key] ?? key,
            active: matrix ? Boolean(matrix[field]) : true
          }));
          return {
            taskId: task.id,
            taskTitle: task.title,
            sortOrder: task.sortOrder,
            requiresPhoto: task.requiresPhoto,
            requiresComment: task.requiresComment,
            days,
            matrixStatus: isExplicit ? "explicit" : "default_all_days",
            confidence: "high",
            requiresManualReview: !isExplicit
          };
        })
      };
    });

    return {
      version: "1.0",
      organizationId,
      workspaceGroupId: workspaceGroupId ?? null,
      areas: areaDtos
    };
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}
