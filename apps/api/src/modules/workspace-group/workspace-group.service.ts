import type { Actor } from "../auth/actor.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkspaceGroupType = "kitchen_storage" | "bar_service" | "admin";

export type WorkspaceGroupDto = {
  id: string;
  locationId: string;
  name: string;
  slug: string;
  type: WorkspaceGroupType;
  isActive: boolean;
};

export type WorkspaceGroupDatabaseClient = {
  workspaceGroup: {
    findMany(args: {
      where: {
        locationId: string;
        organizationId: string;
        isActive?: boolean;
      };
      orderBy?: { name: "asc" | "desc" }[];
      select: {
        id: true;
        locationId: true;
        name: true;
        slug: true;
        type: true;
        isActive: true;
      };
    }): Promise<
      Array<{
        id: string;
        locationId: string;
        name: string;
        slug: string;
        type: string;
        isActive: boolean;
      }>
    >;
  };
};

export type WorkspaceGroupServicePort = {
  listForLocation(actor: Actor, locationId: string): Promise<WorkspaceGroupDto[]>;
};

// ── Error ─────────────────────────────────────────────────────────────────────

export class WorkspaceGroupError extends Error {
  public readonly statusCode: number;
  public constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WorkspaceGroupError";
    this.statusCode = statusCode;
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class WorkspaceGroupService implements WorkspaceGroupServicePort {
  private readonly db: WorkspaceGroupDatabaseClient;

  public constructor(options: { db: WorkspaceGroupDatabaseClient }) {
    this.db = options.db;
  }

  public async listForLocation(
    actor: Actor,
    locationId: string
  ): Promise<WorkspaceGroupDto[]> {
    if (!actor.organizationId) {
      throw new WorkspaceGroupError("actor has no organization context", 403);
    }

    const rows = await this.db.workspaceGroup.findMany({
      where: {
        locationId,
        organizationId: actor.organizationId,
        isActive: true
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        locationId: true,
        name: true,
        slug: true,
        type: true,
        isActive: true
      }
    });

    return rows.map((r) => ({
      id: r.id,
      locationId: r.locationId,
      name: r.name,
      slug: r.slug,
      type: r.type as WorkspaceGroupType,
      isActive: r.isActive
    }));
  }
}
