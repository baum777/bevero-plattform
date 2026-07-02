import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  ActorAuthError,
  parseActorFromHeaders,
  requireActorRole,
  type ActorAuthDatabaseClient,
  type Role,
} from "../modules/auth/actor.js";
import {
  InquiryError,
  type InquiryServicePort,
} from "../modules/inquiry/inquiry.service.js";
import type { BusinessUnitNameValue, InquirySourceValue, InquiryStatusValue, InquirySubjectValue } from "../modules/inquiry/inquiry.types.js";

export type InquiryRouteDependencies = {
  inquiryService: InquiryServicePort;
  auth?: {
    db: ActorAuthDatabaseClient;
    jwtSecret: string;
    supabaseUrl?: string;
  };
};

const operationalRoles = ["admin", "shift_lead", "staff"] as const satisfies readonly Role[];

export async function inquiryRoute(
  app: FastifyInstance,
  dependencies: InquiryRouteDependencies
): Promise<void> {
  app.get<{
    Querystring: {
      status?: string;
      businessUnitHint?: string;
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/admin/inquiries",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const { status, businessUnitHint, source, dateFrom, dateTo, limit, offset } = request.query;
        const inquiries = await dependencies.inquiryService.listInquiries(actor, {
          status: status as InquiryStatusValue | undefined,
          businessUnitHint: businessUnitHint as BusinessUnitNameValue | undefined,
          source: source as InquirySourceValue | undefined,
          dateFrom,
          dateTo,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });
        return reply.code(200).send({ inquiries });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/admin/inquiries/:id",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const inquiry = await dependencies.inquiryService.getInquiry(actor, request.params.id);
        if (!inquiry) {
          return reply.code(404).send({ error: "Not Found", message: "inquiry not found" });
        }
        return reply.code(200).send({ inquiry });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /admin/inquiries/:id/audit — PII-sanitized classification history.
  app.get<{ Params: { id: string } }>(
    "/admin/inquiries/:id/audit",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const auditEntries = await dependencies.inquiryService.listClassificationAudit(
          actor,
          request.params.id
        );
        return reply.code(200).send({ auditEntries });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // POST /admin/inquiries/classify — read-only operation, no side-effects on Inquiry row.
  // Writes only to InquiryClassificationAudit (ADR-0021 §3 exception: audit-log write).
  app.post<{
    Body: {
      rawMessage?: string;
      subject?: string;
      guestCount?: number;
      inquiryId?: string;
      commit?: boolean;
    };
  }>(
    "/admin/inquiries/classify",
    async (request, reply) => {
      const actor = await authenticate(request, reply, operationalRoles, dependencies.auth);
      if (!actor) return reply;
      try {
        const { rawMessage, subject, guestCount, inquiryId, commit } = request.body ?? {};
        const result = await dependencies.inquiryService.classifyInquiry(actor, {
          rawMessage,
          subject: subject as InquirySubjectValue | undefined,
          guestCount,
          inquiryId,
          commitAudit: commit === true
        });
        return reply.code(200).send({ classification: result });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}

function handleServiceError(error: unknown, reply: FastifyReply) {
  if (error instanceof InquiryError) {
    const errorName =
      error.statusCode === 400 ? "Bad Request" :
      error.statusCode === 404 ? "Not Found" :
      error.statusCode === 422 ? "Unprocessable Entity" : "Forbidden";
    return reply.code(error.statusCode).send({ error: errorName, message: error.message });
  }
  throw error;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles: readonly Role[],
  authDependencies?: InquiryRouteDependencies["auth"]
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
        error.statusCode === 401 ? "Unauthorized" :
        error.statusCode === 409 ? "Conflict" : "Forbidden";
      reply.code(error.statusCode).send({ error: errorName, message: error.message });
      return undefined;
    }
    throw error;
  }
}
