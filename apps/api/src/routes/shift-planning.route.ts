import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  ShiftPlanningError,
  columnMappingSchema,
  createSignoffBodySchema,
  correctShiftStartBodySchema,
  endShiftBodySchema,
  issuesQuerySchema,
  mapColumnsBodySchema,
  matrixQuerySchema,
  releaseTasksBodySchema,
  resolveIssueBodySchema,
  signoffQuerySchema,
  summaryQuerySchema,
  updateMappingBodySchema,
  uploadImportBodySchema,
  userTasksQuerySchema,
  taskStatusUpdateSchema
  ,startShiftBodySchema
  ,markShiftMissedBodySchema
} from "../modules/shift-planning/shift-planning.types.js";
import type { ShiftPlanImportServicePort } from "../modules/shift-planning/shift-plan-import.service.js";
import type { TaskGenerationServicePort } from "../modules/shift-planning/task-generation.service.js";
import type { MatrixReadServicePort } from "../modules/shift-planning/matrix-read.service.js";
import type { ShiftLeadSummaryServicePort } from "../modules/shift-planning/shift-lead-summary.service.js";
import type { IssueServicePort } from "../modules/shift-planning/issue.service.js";
import type { SignoffServicePort } from "../modules/shift-planning/signoff.service.js";
import type { ShiftSessionService } from "../modules/shift-planning/shift-session.service.js";

export type ShiftPlanningRouteDependencies = {
  importService: ShiftPlanImportServicePort;
  taskGenerationService: TaskGenerationServicePort;
  matrixReadService: MatrixReadServicePort;
  summaryService: ShiftLeadSummaryServicePort;
  issueService: IssueServicePort;
  signoffService: SignoffServicePort;
  shiftSessionService: ShiftSessionService;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const STAFF_UP: readonly Role[] = ["staff", "shift_lead", "admin"];
const MANAGER_UP: readonly Role[] = ["shift_lead", "admin"];

export async function shiftPlanningRoute(
  app: FastifyInstance,
  deps: ShiftPlanningRouteDependencies
): Promise<void> {
  // POST /shift-planning/imports — upload + column detection
  app.post("/shift-planning/imports", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = uploadImportBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const preview = await deps.importService.createImport(parsed.data, actor);
      return reply.code(201).send(preview);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/imports/:id — status + details
  app.get("/shift-planning/imports/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    try {
      const record = await deps.importService.getImport(id, actor);
      return reply.code(200).send({
        id: record.id,
        status: record.status,
        fileName: record.fileName,
        importedRowCount: record.importedRowCount,
        matchedUserCount: record.matchedUserCount,
        unmatchedUserNames: record.unmatchedUserNames ?? [],
        areaDetectionIssues: record.areaDetectionIssues ?? [],
        confirmedAt: record.confirmedAt?.toISOString() ?? null,
        releasedAt: record.releasedAt?.toISOString() ?? null
      });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /shift-planning/imports/:id/map-columns — apply column mapping + parse
  app.post("/shift-planning/imports/:id/map-columns", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    const parsed = mapColumnsBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }
    // columnMappingSchema applies its own defaults (headerRow) via parse.
    const mapping = columnMappingSchema.parse(parsed.data.columnMapping);

    try {
      const review = await deps.importService.mapColumns(id, mapping, actor);
      return reply.code(200).send(review);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // PATCH /shift-planning/imports/:id/mapping — manual user/area overrides
  app.patch("/shift-planning/imports/:id/mapping", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    const parsed = updateMappingBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const review = await deps.importService.updateMapping(id, parsed.data, actor);
      return reply.code(200).send(review);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /shift-planning/imports/:id/confirm — create shift_assignments
  app.post("/shift-planning/imports/:id/confirm", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    try {
      const result = await deps.importService.confirm(id, actor);
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/imports/:id/preview-tasks — tasks that would be generated
  app.get("/shift-planning/imports/:id/preview-tasks", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    try {
      const preview = await deps.taskGenerationService.preview(id, actor);
      return reply.code(200).send(preview);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /shift-planning/imports/:id/release-tasks — create task_instances
  app.post("/shift-planning/imports/:id/release-tasks", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    const parsed = releaseTasksBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const result = await deps.taskGenerationService.release(id, parsed.data.excludeTaskIds, actor);
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/matrix?workspaceGroupId=... — read task matrix (manager/shift_lead)
  app.get("/shift-planning/matrix", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = matrixQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const matrix = await deps.matrixReadService.getMatrix(parsed.data.workspaceGroupId, actor);
      return reply.code(200).send(matrix);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/summary?date=YYYY-MM-DD&workspaceGroupId=... — shift lead area summary
  app.get("/shift-planning/summary", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = summaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    const [year, month, day] = parsed.data.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    try {
      const summary = await deps.summaryService.getSummary(date, parsed.data.workspaceGroupId, actor);
      return reply.code(200).send(summary);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/tasks?date=YYYY-MM-DD — staff: my tasks for a day
  const listUserTasks = async (request: FastifyRequest, reply: FastifyReply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;

    const parsed = userTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }
    const date = parsed.data.date ? parseUtcDate(parsed.data.date) : todayUtc();

    try {
      const tasks = await deps.taskGenerationService.getUserTasks(date, actor);
      const isoDate = parsed.data.date ?? toIsoDate(date);
      const assignedArea = tasks[0]?.areaSlug ?? null;
      const assignedAreaLabel = tasks[0]?.areaLabel ?? null;
      return reply.code(200).send({
        date: isoDate,
        weekday: germanWeekday(date),
        assignedArea,
        assignedAreaLabel,
        shiftStart: null,
        shiftEnd: null,
        tasks
      });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  };

  app.get("/shift-planning/tasks", listUserTasks);
  app.get("/shift-planning/tasks/me", listUserTasks);

  app.get("/shift-planning/shifts/today", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    const parsed = userTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    const date = parsed.data.date ? parseUtcDate(parsed.data.date) : todayUtc();
    try {
      return reply.code(200).send({ date: toIsoDate(date), shifts: await deps.shiftSessionService.getToday(date, actor) });
    } catch (error) { return handleServiceError(error, reply); }
  });

  app.post("/shift-planning/assignments/:id/start", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    const parsed = startShiftBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    try {
      return reply.code(200).send(await deps.shiftSessionService.start((request.params as { id: string }).id, parsed.data, actor));
    } catch (error) { return handleServiceError(error, reply); }
  });

  app.post("/shift-planning/assignments/:id/end", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    const parsed = endShiftBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    try {
      return reply.code(200).send(await deps.shiftSessionService.end((request.params as { id: string }).id, parsed.data, actor));
    } catch (error) { return handleServiceError(error, reply); }
  });

  app.patch("/shift-planning/sessions/:id/start", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const parsed = correctShiftStartBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    try {
      return reply.code(200).send(await deps.shiftSessionService.correctStart((request.params as { id: string }).id, parsed.data, actor));
    } catch (error) { return handleServiceError(error, reply); }
  });

  app.post("/shift-planning/assignments/:id/mark-missed", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const parsed = markShiftMissedBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    try {
      return reply.code(200).send(await deps.shiftSessionService.markMissed((request.params as { id: string }).id, parsed.data.reason, actor));
    } catch (error) { return handleServiceError(error, reply); }
  });

  // PATCH /shift-planning/tasks/:id — staff: update task status (done / issue / skipped)
  app.patch("/shift-planning/tasks/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    const parsed = taskStatusUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const result = await deps.taskGenerationService.updateTaskStatus(id, parsed.data.status, parsed.data.note, actor);
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/issues?date=YYYY-MM-DD&workspaceGroupId=... — central Mängel view
  app.get("/shift-planning/issues", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = issuesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }
    const date = parseUtcDate(parsed.data.date);

    try {
      const result = await deps.issueService.listIssues(date, parsed.data.workspaceGroupId, actor);
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // PATCH /shift-planning/issues/:id — resolve / accept a Mangel (shift lead)
  app.patch("/shift-planning/issues/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };

    const parsed = resolveIssueBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const result = await deps.issueService.resolveIssue(id, parsed.data, actor);
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /shift-planning/signoff?date=YYYY-MM-DD&workspaceGroupId=... — Schichtabschluss-Status
  app.get("/shift-planning/signoff", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = signoffQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }
    const date = parseUtcDate(parsed.data.date);

    try {
      const result = await deps.signoffService.getSignoffStatus(
        date,
        parsed.data.workspaceGroupId,
        "kitchen",
        actor
      );
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /shift-planning/signoff — auditierbarer Schichtabschluss (shift lead)
  app.post("/shift-planning/signoff", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;

    const parsed = createSignoffBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const result = await deps.signoffService.createSignoff(
        {
          date: parseUtcDate(parsed.data.date),
          workspaceGroupId: parsed.data.workspaceGroupId,
          department: parsed.data.department,
          summary: parsed.data.summary,
          notes: parsed.data.notes
        },
        actor
      );
      return reply.code(201).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // URL aliases used by the frontend import flow
  app.get("/shift-planning/imports/:id/task-preview", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };
    try {
      const preview = await deps.taskGenerationService.preview(id, actor);
      return reply.code(200).send(preview);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.post("/shift-planning/imports/:id/release", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    const { id } = request.params as { id: string };
    const parsed = releaseTasksBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }
    try {
      const result = await deps.taskGenerationService.release(id, parsed.data.excludeTaskIds, actor);
      return reply.code(200).send({
        importId: result.importId,
        status: result.status,
        tasksCreated: result.createdCount,
        tasksSkipped: result.skippedCount
      });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof ShiftPlanningError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 403
          ? "Forbidden"
          : error.statusCode === 404
            ? "Not Found"
            : error.statusCode === 409
              ? "Conflict"
              : "Unprocessable Entity";
    return reply.code(error.statusCode).send({ error: errorName, message: error.message });
  }
  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: ShiftPlanningRouteDependencies["auth"]
) {
  try {
    if (!authDependencies) {
      throw new ActorAuthError("authorization boundary is not configured", 401);
    }
    const actor = await parseActorFromHeaders(request.headers, authDependencies);
    return requireActorRole(actor, allowedRoles);
  } catch (error) {
    if (error instanceof ActorAuthError) {
      const errorName =
        error.statusCode === 401
          ? "Unauthorized"
          : error.statusCode === 409
            ? "Conflict"
            : "Forbidden";
      reply.code(error.statusCode).send({ error: errorName, message: error.message });
      return undefined;
    }
    throw error;
  }
}

const DE_WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
function germanWeekday(date: Date): string {
  return DE_WEEKDAYS[(date.getUTCDay() + 6) % 7] ?? "";
}

function parseUtcDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
