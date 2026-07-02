import { randomUUID } from "node:crypto";
import type { Actor, OrganizationRole } from "../auth/actor.js";

const INVITE_TTL_DAYS = 7;

export type InviteStatus = "pending" | "accepted" | "revoked";

export type OrganizationInviteRow = {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  status: InviteStatus;
  invitedByUserId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InviteDatabaseClient = {
  organizationInvite: {
    create(args: {
      data: {
        id: string;
        organizationId: string;
        email: string;
        role: string;
        token: string;
        invitedByUserId: string;
        expiresAt: Date;
      };
      select: {
        id: true;
        organizationId: true;
        email: true;
        role: true;
        token: true;
        status: true;
        invitedByUserId: true;
        expiresAt: true;
        createdAt: true;
      };
    }): Promise<OrganizationInviteRow>;
    findMany(args: {
      where: { organizationId: string; status?: InviteStatus };
      select: {
        id: true;
        organizationId: true;
        email: true;
        role: true;
        token: true;
        status: true;
        invitedByUserId: true;
        expiresAt: true;
        createdAt: true;
      };
      orderBy: { createdAt: "desc" };
    }): Promise<OrganizationInviteRow[]>;
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        organizationId: true;
        role: true;
        status: true;
        invitedByUserId: true;
      };
    }): Promise<Pick<
      OrganizationInviteRow,
      "id" | "organizationId" | "role" | "status" | "invitedByUserId"
    > | null>;
    update(args: {
      where: { id: string };
      data: { status: InviteStatus; revokedAt?: Date; updatedAt?: Date };
    }): Promise<OrganizationInviteRow>;
  };
};

export type CreatedInvite = {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export class InviteError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409;
  public constructor(message: string, statusCode: 400 | 403 | 404 | 409) {
    super(message);
    this.name = "InviteError";
    this.statusCode = statusCode;
  }
}

export type InviteServicePort = {
  createInvite(input: {
    actor: Actor;
    email: string;
    role: OrganizationRole;
  }): Promise<CreatedInvite>;
  listPendingInvites(input: { actor: Actor }): Promise<PendingInvite[]>;
  revokeInvite(input: { actor: Actor; inviteId: string }): Promise<void>;
};

export class InviteService implements InviteServicePort {
  private readonly db: InviteDatabaseClient;

  public constructor(options: { db: InviteDatabaseClient }) {
    this.db = options.db;
  }

  public async createInvite(input: {
    actor: Actor;
    email: string;
    role: OrganizationRole;
  }): Promise<CreatedInvite> {
    const { actor, role } = input;
    const email = input.email.trim().toLowerCase();

    if (!actor.organizationId || !actor.organizationRole) {
      throw new InviteError("actor has no organization context", 403);
    }
    const actorRole = actor.organizationRole;
    if (actorRole !== "owner" && actorRole !== "admin") {
      throw new InviteError("only owner or admin can create invites", 403);
    }
    if (role === "owner") {
      throw new InviteError("owner role cannot be assigned via invite", 400);
    }
    if (role === "admin" && actorRole !== "owner") {
      throw new InviteError("only owners can invite admins", 403);
    }
    if (!email) {
      throw new InviteError("email is required", 400);
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await this.db.organizationInvite.create({
      data: {
        id: randomUUID(),
        organizationId: actor.organizationId,
        email,
        role,
        token,
        invitedByUserId: actor.userId,
        expiresAt
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        token: true,
        status: true,
        invitedByUserId: true,
        expiresAt: true,
        createdAt: true
      }
    });

    return {
      id: invite.id,
      organizationId: invite.organizationId,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString()
    };
  }

  public async listPendingInvites(input: { actor: Actor }): Promise<PendingInvite[]> {
    const { actor } = input;

    if (!actor.organizationId || !actor.organizationRole) {
      throw new InviteError("actor has no organization context", 403);
    }
    if (actor.organizationRole !== "owner" && actor.organizationRole !== "admin") {
      throw new InviteError("only owner or admin can list invites", 403);
    }

    const invites = await this.db.organizationInvite.findMany({
      where: { organizationId: actor.organizationId, status: "pending" },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        token: true,
        status: true,
        invitedByUserId: true,
        expiresAt: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString()
    }));
  }

  public async revokeInvite(input: { actor: Actor; inviteId: string }): Promise<void> {
    const { actor, inviteId } = input;

    if (!actor.organizationId || !actor.organizationRole) {
      throw new InviteError("actor has no organization context", 403);
    }
    if (actor.organizationRole !== "owner" && actor.organizationRole !== "admin") {
      throw new InviteError("only owner or admin can revoke invites", 403);
    }

    const invite = await this.db.organizationInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        status: true,
        invitedByUserId: true
      }
    });

    if (!invite) {
      throw new InviteError("invite not found", 404);
    }
    if (invite.organizationId !== actor.organizationId) {
      throw new InviteError("invite does not belong to your organization", 403);
    }
    if (invite.status !== "pending") {
      throw new InviteError("only pending invites can be revoked", 409);
    }

    await this.db.organizationInvite.update({
      where: { id: inviteId },
      data: { status: "revoked", revokedAt: new Date(), updatedAt: new Date() }
    });
  }
}
