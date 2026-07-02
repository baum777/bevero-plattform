import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  OperationalNoteError,
  OperationalNoteService,
  createNoteBodySchema,
  updateNoteBodySchema,
  listNotesQuerySchema,
  type OperationalNoteDatabaseClient,
  type OperationalNoteServicePort,
} from "../modules/operational-note/operational-note.service.js";

export type OperationalNoteRouteDependencies = {
  operationalNoteService: OperationalNoteServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const STAFF_UP: readonly Role[] = ["staff", "shift_lead", "admin"];
const MANAGER_UP: readonly Role[] = ["shift_lead", "admin"];

export async function operationalNoteRoute(
  app: FastifyInstance,
  deps: OperationalNoteRouteDependencies
): Promise<void> {
  // POST /operational-notes — create
  app.post("/operational-notes", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const parsed = createNoteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const note = await deps.operationalNoteService.create(parsed.data, actor);
      return reply.code(201).send({ note });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /operational-notes — list
  app.get("/operational-notes", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const parsed = listNotesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const result = await deps.operationalNoteService.list(
        actor.organizationId,
        parsed.data,
        actor
      );
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /operational-notes/:id — single note
  app.get("/operational-notes/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const { id } = request.params as { id: string };

    try {
      const note = await deps.operationalNoteService.get(id, actor.organizationId, actor);
      return reply.code(200).send({ note });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // PATCH /operational-notes/:id — update
  app.patch("/operational-notes/:id", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const { id } = request.params as { id: string };
    const parsed = updateNoteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: "Unprocessable Entity", message: parsed.error.message });
    }

    try {
      const note = await deps.operationalNoteService.update(
        id,
        actor.organizationId,
        parsed.data,
        actor
      );
      return reply.code(200).send({ note });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /operational-notes/:id/resolve
  app.post("/operational-notes/:id/resolve", async (request, reply) => {
    const actor = await authenticate(request, reply, STAFF_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const { id } = request.params as { id: string };

    try {
      const note = await deps.operationalNoteService.resolve(id, actor.organizationId, actor);
      return reply.code(200).send({ note });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // POST /operational-notes/:id/archive
  app.post("/operational-notes/:id/archive", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const { id } = request.params as { id: string };

    try {
      const note = await deps.operationalNoteService.archive(id, actor.organizationId, actor);
      return reply.code(200).send({ note });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // GET /operational-notes/:id/audit — audit history (manager+)
  app.get("/operational-notes/:id/audit", async (request, reply) => {
    const actor = await authenticate(request, reply, MANAGER_UP, deps.auth);
    if (!actor) return reply;
    if (!actor.organizationId) {
      return reply.code(403).send({ error: "Forbidden", message: "organization context required" });
    }

    const { id } = request.params as { id: string };

    try {
      const events = await deps.operationalNoteService.auditHistory(
        id,
        actor.organizationId,
        actor
      );
      return reply.code(200).send({
        events: events.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof OperationalNoteError) {
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
  authDependencies?: OperationalNoteRouteDependencies["auth"]
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

export function buildOperationalNoteService(db: OperationalNoteDatabaseClient) {
  return new OperationalNoteService({ db });
}
