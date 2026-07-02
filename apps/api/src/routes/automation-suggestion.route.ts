import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type Actor,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  AutomationSuggestionError,
  type AutomationSuggestionServicePort,
  approveSuggestionBodySchema,
  listAutomationSuggestionsQuerySchema,
  rejectSuggestionBodySchema
} from "../modules/automation/automation-suggestion.service.js";

export type AutomationSuggestionRouteDependencies = {
  automationSuggestionService: AutomationSuggestionServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const leadRoles = ["admin", "shift_lead"] as const satisfies readonly Role[];
const suggestionReadRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

const suggestionIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64)
});

export async function automationSuggestionRoute(
  app: FastifyInstance,
  dependencies: AutomationSuggestionRouteDependencies
): Promise<void> {
  app.get("/admin/automation/suggestions", async (request, reply) => {
    const actor = await authenticate(request, reply, suggestionReadRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const parsed = listAutomationSuggestionsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "query validation failed",
        issues: parsed.error.issues
      });
    }

    try {
      const result = await dependencies.automationSuggestionService.listSuggestions({
        actor,
        query: parsed.data
      });
      return reply.code(200).send(result);
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/admin/automation/suggestions/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, suggestionReadRoles, dependencies.auth);
      if (!actor) {
        return reply;
      }

      const idParse = suggestionIdParamsSchema.safeParse(request.params);
      if (!idParse.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "suggestion id is required"
        });
      }

      try {
        const suggestion = await dependencies.automationSuggestionService.getSuggestion({
          actor,
          suggestionId: idParse.data.id
        });
        return reply.code(200).send({ suggestion });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/automation/suggestions/:id/approve",
    async (request, reply) => {
      const actor = await authenticate(request, reply, leadRoles, dependencies.auth);
      if (!actor) {
        return reply;
      }

      const idParse = suggestionIdParamsSchema.safeParse(request.params);
      if (!idParse.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "suggestion id is required"
        });
      }

      const bodyParse = approveSuggestionBodySchema.safeParse(request.body ?? {});
      if (!bodyParse.success) {
        return reply.code(422).send({
          error: "Unprocessable Entity",
          message: "body validation failed",
          issues: bodyParse.error.issues
        });
      }

      try {
        const result = await dependencies.automationSuggestionService.approve({
          actor,
          suggestionId: idParse.data.id,
          body: bodyParse.data
        });
        return reply.code(200).send({
          suggestion: result.suggestion,
          decision: result.decision,
          workflowTask: result.workflowTask
        });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/admin/automation/suggestions/:id/reject",
    async (request, reply) => {
      const actor = await authenticate(request, reply, leadRoles, dependencies.auth);
      if (!actor) {
        return reply;
      }

      const idParse = suggestionIdParamsSchema.safeParse(request.params);
      if (!idParse.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "suggestion id is required"
        });
      }

      const bodyParse = rejectSuggestionBodySchema.safeParse(request.body ?? {});
      if (!bodyParse.success) {
        return reply.code(422).send({
          error: "Unprocessable Entity",
          message: "body validation failed",
          issues: bodyParse.error.issues
        });
      }

      try {
        const result = await dependencies.automationSuggestionService.reject({
          actor,
          suggestionId: idParse.data.id,
          body: bodyParse.data
        });
        return reply.code(200).send({
          suggestion: result.suggestion,
          decision: result.decision
        });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof AutomationSuggestionError) {
    const errorName =
      error.statusCode === 404
        ? "Not Found"
        : error.statusCode === 409
          ? "Conflict"
          : error.statusCode === 422
            ? "Unprocessable Entity"
            : "Forbidden";
    return reply.code(error.statusCode).send({
      error: errorName,
      message: error.message
    });
  }

  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: AutomationSuggestionRouteDependencies["auth"]
): Promise<Actor | undefined> {
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
      reply.code(error.statusCode).send({
        error: errorName,
        message: error.message
      });
      return undefined;
    }

    throw error;
  }
}
