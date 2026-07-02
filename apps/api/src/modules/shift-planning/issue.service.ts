import type { Actor } from "../auth/actor.js";
import { ShiftPlanningError } from "./shift-planning.types.js";

// ── Area ordering (operative Reihenfolge) ─────────────────────────────────────
// Gardemanger → Entremetier → Saucier → Production; unknown areas sort last,
// then alphabetically by label as a stable tie-breaker.
const AREA_ORDER: Record<string, number> = {
  gardemanger: 0,
  entremetier: 1,
  saucier: 2,
  production: 3
};

function areaRank(slug: string): number {
  return AREA_ORDER[slug] ?? 99;
}

// ── DB port ──────────────────────────────────────────────────────────────────

export type IssueRow = {
  id: string;
  organizationId: string;
  taskInstanceId: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  severity: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  reportedBy: { id: string; displayName: string | null } | null;
  resolvedBy: { id: string; displayName: string | null } | null;
  taskInstance: {
    id: string;
    status: string;
    area: { id: string; slug: string; name: string };
    task: { id: string; title: string };
  };
};

export type IssueServiceDatabaseClient = {
  taskIssue: {
    findMany(args: {
      where: {
        organizationId: string;
        taskInstance: { date: Date; area?: { workspaceGroupId: string } };
      };
      include: {
        reportedBy: { select: { id: true; displayName: true } };
        resolvedBy: { select: { id: true; displayName: true } };
        taskInstance: {
          select: {
            id: true;
            status: true;
            area: { select: { id: true; slug: true; name: true } };
            task: { select: { id: true; title: true } };
          };
        };
      };
    }): Promise<IssueRow[]>;
    findUnique(args: {
      where: { id: string };
      select: { id: true; organizationId: true; taskInstanceId: true; status: true };
    }): Promise<{ id: string; organizationId: string; taskInstanceId: string; status: string } | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string; status: string }>;
  };
  taskInstance: {
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  userProfile: {
    findUnique(args: {
      where: { authUserId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  $transaction<T>(fn: (tx: IssueServiceDatabaseClient) => Promise<T>): Promise<T>;
};

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type IssueDto = {
  id: string;
  taskInstanceId: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  taskId: string;
  taskTitle: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  severity: string;
  status: string;
  reportedByUserId: string | null;
  reportedByName: string | null;
  reportedAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
};

export type IssuesResponseDto = {
  date: string;
  workspaceGroupId: string | null;
  openCount: number;
  issues: IssueDto[];
};

export type ResolveIssueResultDto = {
  id: string;
  status: string;
  taskInstanceId: string;
};

// ── Service ──────────────────────────────────────────────────────────────────

export type IssueServicePort = {
  listIssues(date: Date, workspaceGroupId: string | undefined, actor: Actor): Promise<IssuesResponseDto>;
  resolveIssue(
    issueId: string,
    input: { status: "resolved" | "accepted"; resolutionNotes: string },
    actor: Actor
  ): Promise<ResolveIssueResultDto>;
};

export class IssueService implements IssueServicePort {
  public constructor(
    private readonly options: { db: IssueServiceDatabaseClient; now?: () => Date }
  ) {}

  public async listIssues(
    date: Date,
    workspaceGroupId: string | undefined,
    actor: Actor
  ): Promise<IssuesResponseDto> {
    const organizationId = this.requireOrg(actor);

    const taskInstanceFilter: { date: Date; area?: { workspaceGroupId: string } } = { date };
    if (workspaceGroupId !== undefined) {
      taskInstanceFilter.area = { workspaceGroupId };
    }

    const rows = await this.options.db.taskIssue.findMany({
      where: { organizationId, taskInstance: taskInstanceFilter },
      include: {
        reportedBy: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
        taskInstance: {
          select: {
            id: true,
            status: true,
            area: { select: { id: true, slug: true, name: true } },
            task: { select: { id: true, title: true } }
          }
        }
      }
    });

    const issues: IssueDto[] = rows
      .map((row) => ({
        id: row.id,
        taskInstanceId: row.taskInstanceId,
        areaId: row.taskInstance.area.id,
        areaSlug: row.taskInstance.area.slug,
        areaLabel: row.taskInstance.area.name,
        taskId: row.taskInstance.task.id,
        taskTitle: row.taskInstance.task.title,
        title: row.title,
        description: row.description,
        photoUrl: row.photoUrl,
        severity: row.severity,
        status: row.status,
        reportedByUserId: row.reportedBy?.id ?? null,
        reportedByName: row.reportedBy?.displayName ?? null,
        reportedAt: row.createdAt.toISOString(),
        resolvedByName: row.resolvedBy?.displayName ?? null,
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
        resolutionNotes: row.resolutionNotes
      }))
      .sort((a, b) => {
        // Open issues first, then by operative area order, then newest first.
        if (a.status === "open" && b.status !== "open") return -1;
        if (a.status !== "open" && b.status === "open") return 1;
        const rank = areaRank(a.areaSlug) - areaRank(b.areaSlug);
        if (rank !== 0) return rank;
        return b.reportedAt.localeCompare(a.reportedAt);
      });

    const openCount = issues.filter((i) => i.status === "open").length;

    return {
      date: date.toISOString().slice(0, 10),
      workspaceGroupId: workspaceGroupId ?? null,
      openCount,
      issues
    };
  }

  public async resolveIssue(
    issueId: string,
    input: { status: "resolved" | "accepted"; resolutionNotes: string },
    actor: Actor
  ): Promise<ResolveIssueResultDto> {
    const organizationId = this.requireOrg(actor);
    const profile = await this.options.db.userProfile.findUnique({
      where: { authUserId: actor.userId },
      select: { id: true }
    });
    if (!profile) {
      throw new ShiftPlanningError("user profile not found", 403);
    }

    const issue = await this.options.db.taskIssue.findUnique({
      where: { id: issueId },
      select: { id: true, organizationId: true, taskInstanceId: true, status: true }
    });
    if (!issue || issue.organizationId !== organizationId) {
      throw new ShiftPlanningError("issue not found", 404);
    }
    if (issue.status !== "open") {
      throw new ShiftPlanningError("issue is already resolved", 409);
    }

    const now = this.now();

    // Resolving or accepting a defect is a shift-lead decision that closes the
    // loop: the issue is finalised AND the underlying task instance becomes
    // `verified` so the shift sign-off is no longer blocked by it. Both writes
    // run in one transaction to keep issue and instance state consistent.
    const updated = await this.options.db.$transaction(async (tx) => {
      const row = await tx.taskIssue.update({
        where: { id: issueId },
        data: {
          status: input.status,
          resolvedByUserId: profile.id,
          resolvedAt: now,
          resolutionNotes: input.resolutionNotes,
          updatedAt: now
        }
      });

      await tx.taskInstance.update({
        where: { id: issue.taskInstanceId },
        data: {
          status: "verified",
          verifiedAt: now,
          verifiedByUserId: profile.id,
          updatedAt: now
        }
      });

      return row;
    });

    return { id: updated.id, status: updated.status, taskInstanceId: issue.taskInstanceId };
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private requireOrg(actor: Actor): string {
    if (!actor.organizationId) {
      throw new ShiftPlanningError("organization context required", 403);
    }
    return actor.organizationId;
  }
}
