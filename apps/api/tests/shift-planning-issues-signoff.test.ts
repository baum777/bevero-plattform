/**
 * Phase G service tests: defect (Mängel) lifecycle and shift sign-off
 * (Schichtabschluss). Exercised against in-memory fakes — no live DB.
 */

import { describe, expect, it } from "vitest";
import { TaskGenerationService } from "../src/modules/shift-planning/task-generation.service.js";
import type { TaskGenerationDatabaseClient } from "../src/modules/shift-planning/task-generation.service.js";
import { IssueService } from "../src/modules/shift-planning/issue.service.js";
import type { IssueRow, IssueServiceDatabaseClient } from "../src/modules/shift-planning/issue.service.js";
import { SignoffService } from "../src/modules/shift-planning/signoff.service.js";
import type {
  SignoffServiceDatabaseClient,
  SignoffTaskRow,
  SignoffRecordRow
} from "../src/modules/shift-planning/signoff.service.js";
import type { Actor } from "../src/modules/auth/actor.js";

const ORG = "org-test";
const WG = "wg-kitchen";
const AUTH_USER_ID = "auth-alice";
const PROFILE_ID = "profile-alice";
const DATE = new Date(Date.UTC(2026, 5, 19)); // 2026-06-19
const NOW = new Date(Date.UTC(2026, 5, 19, 14, 0, 0));

const managerActor: Actor = { userId: AUTH_USER_ID, organizationId: ORG, role: "admin" };
const staffActor: Actor = { userId: "auth-bob", organizationId: ORG, role: "staff" };

// ── updateTaskStatus → task_issues ────────────────────────────────────────────

describe("TaskGenerationService.updateTaskStatus (issue)", () => {
  function buildIssueDb() {
    const instance = {
      id: "inst-1",
      organizationId: ORG,
      userId: PROFILE_ID,
      shiftAssignmentId: null,
      status: "open",
      taskId: "task-1",
      task: { title: "Saladette reinigen" }
    };
    const createdIssues: Array<Record<string, unknown>> = [];
    const openIssues: Array<{ id: string; taskInstanceId: string; status: string }> = [];

    const txClient = {
      taskInstance: {
        findUnique: async () => instance,
        update: async ({ data }: { where: { id: string }; data: Record<string, unknown> }) => {
          instance.status = data.status as string;
          return { id: instance.id, status: instance.status, completedAt: null };
        }
      },
      taskIssue: {
        findFirst: async () => openIssues.find((i) => i.status === "open") ?? null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdIssues.push(data);
          openIssues.push({ id: `issue-${createdIssues.length}`, taskInstanceId: "inst-1", status: "open" });
          return { id: `issue-${createdIssues.length}` };
        }
      }
    };

    const db = {
      taskInstance: {
        findUnique: async () => instance,
        update: txClient.taskInstance.update
      },
      taskIssue: txClient.taskIssue,
      userProfile: {
        findUnique: async ({ where }: { where: { authUserId: string } }) =>
          where.authUserId === AUTH_USER_ID ? { id: PROFILE_ID } : null
      },
      $transaction: async <T>(fn: (tx: TaskGenerationDatabaseClient) => Promise<T>) =>
        fn(txClient as unknown as TaskGenerationDatabaseClient)
    } as unknown as TaskGenerationDatabaseClient;

    return { db, createdIssues, instance };
  }

  it("creates exactly one task_issues row when a defect is reported", async () => {
    const { db, createdIssues, instance } = buildIssueDb();
    const svc = new TaskGenerationService({ db, now: () => NOW });

    await svc.updateTaskStatus("inst-1", "issue", "Kühlung defekt", managerActor);

    expect(instance.status).toBe("issue");
    expect(createdIssues).toHaveLength(1);
    expect(createdIssues[0]).toMatchObject({
      organizationId: ORG,
      taskInstanceId: "inst-1",
      reportedByUserId: PROFILE_ID,
      title: "Saladette reinigen",
      description: "Kühlung defekt",
      status: "open"
    });
  });

  it("does not create a duplicate issue when one is already open", async () => {
    const { db, createdIssues } = buildIssueDb();
    const svc = new TaskGenerationService({ db, now: () => NOW });

    await svc.updateTaskStatus("inst-1", "issue", "erste Meldung", managerActor);
    await svc.updateTaskStatus("inst-1", "issue", "zweite Meldung", managerActor);

    expect(createdIssues).toHaveLength(1);
  });
});

// ── IssueService.resolveIssue ─────────────────────────────────────────────────

describe("IssueService.resolveIssue", () => {
  function buildDb(issueStatus = "open") {
    const issue = { id: "issue-1", organizationId: ORG, taskInstanceId: "inst-1", status: issueStatus };
    const instanceUpdates: Array<Record<string, unknown>> = [];
    const issueUpdates: Array<Record<string, unknown>> = [];

    const client = {
      taskIssue: {
        findMany: async () => [],
        findUnique: async () => issue,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          issueUpdates.push(data);
          return { id: issue.id, status: data.status as string };
        }
      },
      taskInstance: {
        update: async ({ data }: { data: Record<string, unknown> }) => {
          instanceUpdates.push(data);
          return {};
        }
      },
      userProfile: {
        findUnique: async ({ where }: { where: { authUserId: string } }) =>
          where.authUserId === AUTH_USER_ID ? { id: PROFILE_ID } : null
      },
      $transaction: async <T>(fn: (tx: IssueServiceDatabaseClient) => Promise<T>) =>
        fn(client as unknown as IssueServiceDatabaseClient)
    } as unknown as IssueServiceDatabaseClient;

    return { db: client, instanceUpdates, issueUpdates };
  }

  it("resolved → sets task_instance.status = verified", async () => {
    const { db, instanceUpdates, issueUpdates } = buildDb();
    const svc = new IssueService({ db, now: () => NOW });

    const result = await svc.resolveIssue("issue-1", { status: "resolved", resolutionNotes: "behoben" }, managerActor);

    expect(result.status).toBe("resolved");
    expect(issueUpdates[0]).toMatchObject({ status: "resolved", resolvedByUserId: PROFILE_ID, resolutionNotes: "behoben" });
    expect(instanceUpdates[0]).toMatchObject({ status: "verified", verifiedByUserId: PROFILE_ID });
  });

  it("accepted → sets task_instance.status = verified", async () => {
    const { db, instanceUpdates } = buildDb();
    const svc = new IssueService({ db, now: () => NOW });

    await svc.resolveIssue("issue-1", { status: "accepted", resolutionNotes: "akzeptiert" }, managerActor);

    expect(instanceUpdates[0]).toMatchObject({ status: "verified" });
  });
});

// ── IssueService.listIssues isolation ─────────────────────────────────────────

describe("IssueService.listIssues", () => {
  it("filters strictly by organization in the query", async () => {
    let capturedOrg: string | undefined;
    const db = {
      taskIssue: {
        findMany: async ({ where }: { where: { organizationId: string } }) => {
          capturedOrg = where.organizationId;
          return [] as IssueRow[];
        },
        findUnique: async () => null,
        update: async () => ({ id: "x", status: "resolved" })
      },
      taskInstance: { update: async () => ({}) },
      userProfile: { findUnique: async () => ({ id: PROFILE_ID }) },
      $transaction: async <T>(fn: (tx: IssueServiceDatabaseClient) => Promise<T>) =>
        fn({} as IssueServiceDatabaseClient)
    } as unknown as IssueServiceDatabaseClient;

    const svc = new IssueService({ db });
    const result = await svc.listIssues(DATE, WG, managerActor);

    expect(capturedOrg).toBe(ORG);
    expect(result.openCount).toBe(0);
  });
});

// ── SignoffService ────────────────────────────────────────────────────────────

describe("SignoffService", () => {
  function buildDb(opts: {
    tasks: SignoffTaskRow[];
    openIssues?: number;
    existing?: SignoffRecordRow | null;
  }): { db: SignoffServiceDatabaseClient; created: Array<Record<string, unknown>> } {
    const created: Array<Record<string, unknown>> = [];
    const db: SignoffServiceDatabaseClient = {
      taskInstance: {
        findMany: async () => opts.tasks
      },
      taskIssue: {
        count: async () => opts.openIssues ?? 0
      },
      shiftSignoff: {
        findFirst: async () => opts.existing ?? null,
        create: async ({ data }) => {
          created.push(data);
          return {
            id: "signoff-1",
            signedAt: NOW,
            completedTaskCount: data.completedTaskCount as number,
            totalTaskCount: data.totalTaskCount as number,
            openIssueCount: data.openIssueCount as number,
            summary: (data.summary as string | null) ?? null,
            notes: (data.notes as string | null) ?? null,
            signedBy: { id: PROFILE_ID, displayName: "Alice" }
          };
        }
      },
      userProfile: {
        findUnique: async ({ where }) => (where.authUserId === AUTH_USER_ID ? { id: PROFILE_ID } : null)
      }
    };
    return { db, created };
  }

  const input = { date: DATE, workspaceGroupId: WG, department: "kitchen" };

  it("blocks (409) when a task is still open", async () => {
    const { db } = buildDb({ tasks: [{ id: "t1", status: "open" }, { id: "t2", status: "done" }] });
    const svc = new SignoffService({ db, now: () => NOW });
    await expect(svc.createSignoff(input, managerActor)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks (409) when a task is status=issue, even without an open task_issue row", async () => {
    const { db } = buildDb({ tasks: [{ id: "t1", status: "issue" }], openIssues: 0 });
    const svc = new SignoffService({ db, now: () => NOW });
    await expect(svc.createSignoff(input, managerActor)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks (409) when an open task_issue exists", async () => {
    const { db } = buildDb({ tasks: [{ id: "t1", status: "verified" }], openIssues: 1 });
    const svc = new SignoffService({ db, now: () => NOW });
    await expect(svc.createSignoff(input, managerActor)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks (409) when a sign-off already exists", async () => {
    const existing: SignoffRecordRow = {
      id: "existing",
      signedAt: NOW,
      completedTaskCount: 1,
      totalTaskCount: 1,
      openIssueCount: 0,
      summary: null,
      notes: null,
      signedBy: { id: PROFILE_ID, displayName: "Alice" }
    };
    const { db } = buildDb({ tasks: [{ id: "t1", status: "done" }], existing });
    const svc = new SignoffService({ db, now: () => NOW });
    await expect(svc.createSignoff(input, managerActor)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks (409) when there are no tasks at all", async () => {
    const { db } = buildDb({ tasks: [] });
    const svc = new SignoffService({ db, now: () => NOW });
    await expect(svc.createSignoff(input, managerActor)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("succeeds when all tasks are final and no open issues", async () => {
    const { db, created } = buildDb({
      tasks: [{ id: "t1", status: "done" }, { id: "t2", status: "verified" }, { id: "t3", status: "skipped" }]
    });
    const svc = new SignoffService({ db, now: () => NOW });
    const result = await svc.createSignoff({ ...input, summary: "alles ok" }, managerActor);

    expect(created).toHaveLength(1);
    expect(result.totalTaskCount).toBe(3);
    expect(result.completedTaskCount).toBe(3);
    expect(result.openIssueCount).toBe(0);
    expect(result.signedByName).toBe("Alice");
  });

  it("getSignoffStatus reports canSignOff=false with blocking reasons", async () => {
    const { db } = buildDb({ tasks: [{ id: "t1", status: "open" }], openIssues: 1 });
    const svc = new SignoffService({ db, now: () => NOW });
    const status = await svc.getSignoffStatus(DATE, WG, "kitchen", managerActor);

    expect(status.canSignOff).toBe(false);
    expect(status.blockingReasons.length).toBeGreaterThan(0);
  });

  it("requires an organization context", async () => {
    const { db } = buildDb({ tasks: [] });
    const svc = new SignoffService({ db, now: () => NOW });
    const noOrg: Actor = { userId: AUTH_USER_ID, role: "admin" };
    await expect(svc.getSignoffStatus(DATE, WG, "kitchen", noOrg)).rejects.toMatchObject({ statusCode: 403 });
    // staff actor still has org → allowed at service layer (role gate is at route layer)
    void staffActor;
  });
});
