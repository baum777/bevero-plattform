import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role
} from "../modules/auth/actor.js";
import {
  assignableOrganizationRoles,
  TeamAdminError,
  type TeamAdminServicePort
} from "../modules/team/team-admin.service.js";
import {
  InviteError,
  type InviteServicePort
} from "../modules/team/invite.service.js";

export type TeamRouteDependencies = {
  teamAdminService: TeamAdminServicePort;
  inviteService?: InviteServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const adminOnlyRoles = ["admin"] as const satisfies readonly Role[];

const confirmRegisteredMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(assignableOrganizationRoles)
});

const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(assignableOrganizationRoles)
});

export async function teamRoute(
  app: FastifyInstance,
  dependencies: TeamRouteDependencies
): Promise<void> {
  app.post("/admin/team/members/confirm", async (request, reply) => {
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) return reply;

    const input = parseBody(confirmRegisteredMemberSchema.safeParse(request.body), reply);
    if (!input) return reply;

    try {
      const member = await dependencies.teamAdminService.confirmRegisteredMember({
        actor,
        email: input.email,
        role: input.role
      });
      return reply.code(200).send({ member });
    } catch (error) {
      if (error instanceof TeamAdminError) {
        return reply.code(error.statusCode).send(teamAdminErrorBody(error));
      }
      throw error;
    }
  });

  // ── Invite routes ───────────────────────────────────────────────────────────

  app.get("/admin/team/invites", async (request, reply) => {
    if (!dependencies.inviteService) {
      return reply.code(501).send({ error: "Not Implemented", message: "invite service not configured" });
    }
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) return reply;

    try {
      const invites = await dependencies.inviteService.listPendingInvites({ actor });
      return reply.code(200).send({ invites });
    } catch (error) {
      if (error instanceof InviteError) {
        return reply.code(error.statusCode).send(inviteErrorBody(error));
      }
      throw error;
    }
  });

  app.post("/admin/team/invites", async (request, reply) => {
    if (!dependencies.inviteService) {
      return reply.code(501).send({ error: "Not Implemented", message: "invite service not configured" });
    }
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) return reply;

    const input = parseBody(createInviteSchema.safeParse(request.body), reply);
    if (!input) return reply;

    try {
      const invite = await dependencies.inviteService.createInvite({
        actor,
        email: input.email,
        role: input.role
      });
      return reply.code(201).send({ invite });
    } catch (error) {
      if (error instanceof InviteError) {
        return reply.code(error.statusCode).send(inviteErrorBody(error));
      }
      throw error;
    }
  });

  app.delete("/admin/team/invites/:inviteId", async (request, reply) => {
    if (!dependencies.inviteService) {
      return reply.code(501).send({ error: "Not Implemented", message: "invite service not configured" });
    }
    const actor = await authenticate(request, reply, adminOnlyRoles, dependencies.auth);
    if (!actor) return reply;

    const { inviteId } = request.params as { inviteId: string };

    try {
      await dependencies.inviteService.revokeInvite({ actor, inviteId });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof InviteError) {
        return reply.code(error.statusCode).send(inviteErrorBody(error));
      }
      throw error;
    }
  });
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: TeamRouteDependencies["auth"]
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

function parseBody<T>(
  result: { success: true; data: T } | { success: false; error: { issues: unknown[] } },
  reply: FastifyReply
): T | undefined {
  if (result.success) {
    return result.data;
  }

  reply.code(400).send({
    error: "Bad Request",
    message: "request body validation failed",
    issues: result.error.issues
  });

  return undefined;
}

function teamAdminErrorBody(error: TeamAdminError) {
  const names: Record<number, string> = { 400: "Bad Request", 403: "Forbidden", 404: "Not Found", 409: "Conflict" };
  return { error: names[error.statusCode] ?? "Error", message: error.message };
}

function inviteErrorBody(error: InviteError) {
  const names: Record<number, string> = { 400: "Bad Request", 403: "Forbidden", 404: "Not Found", 409: "Conflict" };
  return { error: names[error.statusCode] ?? "Error", message: error.message };
}
