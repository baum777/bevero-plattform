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
  AutomationRuleWriteError,
  type AutomationRuleWriteServicePort,
  createAutomationRuleBodySchema,
  updateAutomationRuleBodySchema
} from "../modules/automation/automation-rule-write.service.js";

export type AutomationRuleWriteRouteDependencies = {
  automationRuleWriteService: AutomationRuleWriteServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const adminOnlyRoles = ["admin"] as const satisfies readonly Role[];

const ruleIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(64)
});

export async function automationRuleWriteRoute(
  app: FastifyInstance,
  dependencies: AutomationRuleWriteRouteDependencies
): Promise<void> {
  app.post("/admin/automation/rules", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) {
      return reply;
    }

    const bodyParse = createAutomationRuleBodySchema.safeParse(request.body ?? {});
    if (!bodyParse.success) {
      return reply.code(400).send({
        error: "Bad Request",
        message: "body validation failed",
        issues: bodyParse.error.issues
      });
    }

    try {
      const rule = await dependencies.automationRuleWriteService.createRule({
        actor,
        body: bodyParse.data
      });
      return reply.code(201).send({ rule });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.patch<{ Params: { id: string } }>(
    "/admin/automation/rules/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
      if (!actor) {
        return reply;
      }

      const idParse = ruleIdParamsSchema.safeParse(request.params);
      if (!idParse.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "rule id is required"
        });
      }

      const bodyParse = updateAutomationRuleBodySchema.safeParse(request.body ?? {});
      if (!bodyParse.success) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "body validation failed",
          issues: bodyParse.error.issues
        });
      }

      try {
        const rule = await dependencies.automationRuleWriteService.updateRule({
          actor,
          ruleId: idParse.data.id,
          body: bodyParse.data
        });
        return reply.code(200).send({ rule });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof AutomationRuleWriteError) {
    const errorName =
      error.statusCode === 404
        ? "Not Found"
        : error.statusCode === 409
          ? "Conflict"
          : error.statusCode === 422
            ? "Unprocessable Entity"
            : error.statusCode === 403
              ? "Forbidden"
              : "Bad Request";
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
  authDependencies?: AutomationRuleWriteRouteDependencies["auth"]
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
