import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  AutomationRuleError,
  type AutomationRuleServicePort
} from "../modules/automation/automation-rule.service.js";

export type AutomationRouteDependencies = {
  automationRuleService: AutomationRuleServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const adminOnlyRoles = ["admin"] as const satisfies readonly Role[];

export async function automationRoute(
  app: FastifyInstance,
  dependencies: AutomationRouteDependencies
): Promise<void> {
  app.get("/admin/automation/rules", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

    if (!actor) {
      return reply;
    }

    try {
      const rules = await dependencies.automationRuleService.listRules({ actor });
      return reply.code(200).send({ rules });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/admin/automation/rules/:id/dry-run",
    async (request, reply) => {
      const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);

      if (!actor) {
        return reply;
      }

      const ruleId = request.params.id?.trim();
      if (!ruleId) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "rule id is required"
        });
      }

      try {
        const result = await dependencies.automationRuleService.dryRunRule({ actor, ruleId });
        return reply.code(200).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof AutomationRuleError) {
    const errorName =
      error.statusCode === 400
        ? "Bad Request"
        : error.statusCode === 404
          ? "Not Found"
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
  authDependencies?: AutomationRouteDependencies["auth"]
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
      reply.code(error.statusCode).send({
        error: errorName,
        message: error.message
      });
      return undefined;
    }

    throw error;
  }
}
