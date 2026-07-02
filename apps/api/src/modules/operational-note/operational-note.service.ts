import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor, OrganizationRole } from "../auth/actor.js";

// ── Error ────────────────────────────────────────────────────────────────────

export class OperationalNoteError extends Error {
  public readonly statusCode: 400 | 403 | 404 | 409 | 422;

  public constructor(message: string, statusCode: 400 | 403 | 404 | 409 | 422) {
    super(message);
    this.name = "OperationalNoteError";
    this.statusCode = statusCode;
  }
}

// ── Value types ──────────────────────────────────────────────────────────────

export type OperationalNoteVisibility = "private" | "team" | "manager_only";
export type OperationalNoteType =
  | "general"
  | "stock_issue"
  | "delivery_issue"
  | "handover"
  | "maintenance"
  | "incident"
  | "refill_context";
export type OperationalNoteEntityType =
  | "inventory_item"
  | "movement"
  | "bar_refill_run"
  | "review_task"
  | "shift_handover"
  | "storage_location";
export type OperationalNotePriority = "normal" | "important" | "critical";
export type OperationalNoteStatus = "open" | "resolved" | "archived";
export type OperationalNoteAuditAction =
  | "created"
  | "updated"
  | "resolved"
  | "archived"
  | "linked";

// ── DB port ──────────────────────────────────────────────────────────────────

export type OperationalNoteRecord = {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  storageLocationId: string | null;
  authorUserId: string;
  authorRole: OrganizationRole;
  title: string | null;
  body: string;
  visibility: OperationalNoteVisibility;
  noteType: OperationalNoteType;
  relatedEntityType: OperationalNoteEntityType | null;
  relatedEntityId: string | null;
  priority: OperationalNotePriority;
  status: OperationalNoteStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
};

export type OperationalNoteAuditRecord = {
  id: string;
  noteId: string;
  action: OperationalNoteAuditAction;
  actorUserId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
};

export type OperationalNoteDatabaseClient = {
  operationalNote: {
    create(args: {
      data: Omit<OperationalNoteRecord, "createdAt" | "updatedAt">;
    }): Promise<OperationalNoteRecord>;
    findUnique(args: {
      where: { id: string };
    }): Promise<OperationalNoteRecord | null>;
    findMany(args: {
      where: {
        organizationId: string;
        status?: OperationalNoteStatus | { in: OperationalNoteStatus[] };
        priority?: OperationalNotePriority;
        visibility?: { in: OperationalNoteVisibility[] };
        workspaceId?: string | null;
        storageLocationId?: string | null;
        noteType?: OperationalNoteType;
      };
      orderBy?: { createdAt: "desc" };
      take?: number;
      skip?: number;
    }): Promise<OperationalNoteRecord[]>;
    count(args: {
      where: {
        organizationId: string;
        status?: OperationalNoteStatus | { in: OperationalNoteStatus[] };
        priority?: OperationalNotePriority;
        visibility?: { in: OperationalNoteVisibility[] };
      };
    }): Promise<number>;
    update(args: {
      where: { id: string };
      data: Partial<
        Pick<
          OperationalNoteRecord,
          | "title"
          | "body"
          | "visibility"
          | "noteType"
          | "relatedEntityType"
          | "relatedEntityId"
          | "priority"
          | "status"
          | "resolvedAt"
          | "resolvedByUserId"
          | "updatedAt"
        >
      >;
    }): Promise<OperationalNoteRecord>;
  };
  operationalNoteAuditEvent: {
    create(args: {
      data: Omit<OperationalNoteAuditRecord, "createdAt">;
    }): Promise<OperationalNoteAuditRecord>;
    findMany(args: {
      where: { noteId: string };
      orderBy?: { createdAt: "desc" };
    }): Promise<OperationalNoteAuditRecord[]>;
  };
  $transaction<T>(fn: (tx: OperationalNoteDatabaseClient) => Promise<T>): Promise<T>;
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const NOTE_VISIBILITIES = ["private", "team", "manager_only"] as const;
const NOTE_TYPES = [
  "general",
  "stock_issue",
  "delivery_issue",
  "handover",
  "maintenance",
  "incident",
  "refill_context",
] as const;
const NOTE_ENTITY_TYPES = [
  "inventory_item",
  "movement",
  "bar_refill_run",
  "review_task",
  "shift_handover",
  "storage_location",
] as const;
const NOTE_PRIORITIES = ["normal", "important", "critical"] as const;
const NOTE_STATUSES = ["open", "resolved", "archived"] as const;

export const createNoteBodySchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    body: z.string().trim().min(1, "body is required").max(5000),
    visibility: z.enum(NOTE_VISIBILITIES).default("team"),
    noteType: z.enum(NOTE_TYPES).default("general"),
    priority: z.enum(NOTE_PRIORITIES).default("normal"),
    workspaceId: z.string().trim().min(1).max(64).optional(),
    storageLocationId: z.string().trim().min(1).max(64).optional(),
    relatedEntityType: z.enum(NOTE_ENTITY_TYPES).optional(),
    relatedEntityId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const updateNoteBodySchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    body: z.string().trim().min(1).max(5000).optional(),
    visibility: z.enum(NOTE_VISIBILITIES).optional(),
    noteType: z.enum(NOTE_TYPES).optional(),
    priority: z.enum(NOTE_PRIORITIES).optional(),
    relatedEntityType: z.enum(NOTE_ENTITY_TYPES).nullable().optional(),
    relatedEntityId: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .strict();

export const listNotesQuerySchema = z.object({
  status: z
    .union([z.enum(NOTE_STATUSES), z.array(z.enum(NOTE_STATUSES)).min(1)])
    .optional()
    .default("open"),
  priority: z.enum(NOTE_PRIORITIES).optional(),
  noteType: z.enum(NOTE_TYPES).optional(),
  workspaceId: z.string().trim().min(1).max(64).optional(),
  storageLocationId: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateNoteInput = z.infer<typeof createNoteBodySchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteBodySchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

// ── DTO ──────────────────────────────────────────────────────────────────────

export type OperationalNoteDto = {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  storageLocationId: string | null;
  authorUserId: string;
  authorRole: OrganizationRole;
  title: string | null;
  body: string;
  visibility: OperationalNoteVisibility;
  noteType: OperationalNoteType;
  relatedEntityType: OperationalNoteEntityType | null;
  relatedEntityId: string | null;
  priority: OperationalNotePriority;
  status: OperationalNoteStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
};

function toDto(record: OperationalNoteRecord): OperationalNoteDto {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
  };
}

// ── Service port ─────────────────────────────────────────────────────────────

export type OperationalNoteServicePort = {
  create(input: CreateNoteInput, actor: Actor): Promise<OperationalNoteDto>;
  list(
    organizationId: string,
    query: ListNotesQuery,
    actor: Actor
  ): Promise<{ notes: OperationalNoteDto[]; total: number }>;
  get(id: string, organizationId: string, actor: Actor): Promise<OperationalNoteDto>;
  update(id: string, organizationId: string, input: UpdateNoteInput, actor: Actor): Promise<OperationalNoteDto>;
  resolve(id: string, organizationId: string, actor: Actor): Promise<OperationalNoteDto>;
  archive(id: string, organizationId: string, actor: Actor): Promise<OperationalNoteDto>;
  auditHistory(id: string, organizationId: string, actor: Actor): Promise<OperationalNoteAuditRecord[]>;
};

// ── Implementation ───────────────────────────────────────────────────────────

const MANAGER_UP_ORG_ROLES: OrganizationRole[] = ["owner", "admin", "manager"];

export class OperationalNoteService implements OperationalNoteServicePort {
  public constructor(
    private readonly options: {
      db: OperationalNoteDatabaseClient;
      now?: () => Date;
    }
  ) {}

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  public async create(input: CreateNoteInput, actor: Actor): Promise<OperationalNoteDto> {
    this.requireOrganizationContext(actor);
    const organizationId = actor.organizationId!;
    const authorRole = this.resolveAuthorRole(actor);

    // private notes only allowed for the author
    if (input.visibility === "manager_only" && !MANAGER_UP_ORG_ROLES.includes(authorRole)) {
      throw new OperationalNoteError(
        "manager_only visibility requires manager role or higher",
        403
      );
    }

    const id = randomUUID();
    const note = await this.options.db.$transaction(async (tx) => {
      const created = await tx.operationalNote.create({
        data: {
          id,
          organizationId,
          workspaceId: input.workspaceId ?? null,
          storageLocationId: input.storageLocationId ?? null,
          authorUserId: actor.userId,
          authorRole,
          title: input.title ?? null,
          body: input.body,
          visibility: input.visibility ?? "team",
          noteType: input.noteType ?? "general",
          relatedEntityType: input.relatedEntityType ?? null,
          relatedEntityId: input.relatedEntityId ?? null,
          priority: input.priority ?? "normal",
          status: "open",
          resolvedAt: null,
          resolvedByUserId: null,
        },
      });

      await tx.operationalNoteAuditEvent.create({
        data: {
          id: randomUUID(),
          noteId: id,
          action: "created",
          actorUserId: actor.userId,
          before: null,
          after: { body: created.body, priority: created.priority, noteType: created.noteType },
        },
      });

      return created;
    });

    return toDto(note);
  }

  public async list(
    organizationId: string,
    query: ListNotesQuery,
    actor: Actor
  ): Promise<{ notes: OperationalNoteDto[]; total: number }> {
    const visibilityFilter = this.buildVisibilityFilter(actor);
    const statusFilter = Array.isArray(query.status)
      ? { in: query.status }
      : query.status;

    const where = {
      organizationId,
      status: statusFilter,
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.noteType ? { noteType: query.noteType } : {}),
      ...(query.workspaceId !== undefined ? { workspaceId: query.workspaceId } : {}),
      ...(query.storageLocationId !== undefined ? { storageLocationId: query.storageLocationId } : {}),
      visibility: visibilityFilter,
    };

    const [records, total] = await Promise.all([
      this.options.db.operationalNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      this.options.db.operationalNote.count({ where }),
    ]);

    return { notes: records.map(toDto), total };
  }

  public async get(
    id: string,
    organizationId: string,
    actor: Actor
  ): Promise<OperationalNoteDto> {
    const note = await this.findAndGuard(id, organizationId, actor);
    return toDto(note);
  }

  public async update(
    id: string,
    organizationId: string,
    input: UpdateNoteInput,
    actor: Actor
  ): Promise<OperationalNoteDto> {
    const note = await this.findAndGuard(id, organizationId, actor);

    if (note.status === "archived") {
      throw new OperationalNoteError("archived notes cannot be edited", 409);
    }

    const before = { body: note.body, priority: note.priority, noteType: note.noteType };
    const now = this.now();

    const updated = await this.options.db.$transaction(async (tx) => {
      const result = await tx.operationalNote.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.noteType !== undefined ? { noteType: input.noteType } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.relatedEntityType !== undefined
            ? { relatedEntityType: input.relatedEntityType }
            : {}),
          ...(input.relatedEntityId !== undefined
            ? { relatedEntityId: input.relatedEntityId }
            : {}),
          updatedAt: now,
        },
      });

      await tx.operationalNoteAuditEvent.create({
        data: {
          id: randomUUID(),
          noteId: id,
          action: "updated",
          actorUserId: actor.userId,
          before,
          after: { body: result.body, priority: result.priority, noteType: result.noteType },
        },
      });

      return result;
    });

    return toDto(updated);
  }

  public async resolve(
    id: string,
    organizationId: string,
    actor: Actor
  ): Promise<OperationalNoteDto> {
    const note = await this.findAndGuard(id, organizationId, actor);

    if (note.status !== "open") {
      throw new OperationalNoteError(
        `note is already ${note.status}, cannot resolve`,
        409
      );
    }

    const now = this.now();

    const updated = await this.options.db.$transaction(async (tx) => {
      const result = await tx.operationalNote.update({
        where: { id },
        data: { status: "resolved", resolvedAt: now, resolvedByUserId: actor.userId, updatedAt: now },
      });

      await tx.operationalNoteAuditEvent.create({
        data: {
          id: randomUUID(),
          noteId: id,
          action: "resolved",
          actorUserId: actor.userId,
          before: { status: "open" },
          after: { status: "resolved" },
        },
      });

      return result;
    });

    return toDto(updated);
  }

  public async archive(
    id: string,
    organizationId: string,
    actor: Actor
  ): Promise<OperationalNoteDto> {
    const note = await this.findAndGuard(id, organizationId, actor);
    this.requireManagerOrAuthor(note, actor);

    if (note.status === "archived") {
      throw new OperationalNoteError("note is already archived", 409);
    }

    const now = this.now();

    const updated = await this.options.db.$transaction(async (tx) => {
      const result = await tx.operationalNote.update({
        where: { id },
        data: { status: "archived", updatedAt: now },
      });

      await tx.operationalNoteAuditEvent.create({
        data: {
          id: randomUUID(),
          noteId: id,
          action: "archived",
          actorUserId: actor.userId,
          before: { status: note.status },
          after: { status: "archived" },
        },
      });

      return result;
    });

    return toDto(updated);
  }

  public async auditHistory(
    id: string,
    organizationId: string,
    actor: Actor
  ): Promise<OperationalNoteAuditRecord[]> {
    this.requireManagerRole(actor);
    await this.findAndGuard(id, organizationId, actor);

    return this.options.db.operationalNoteAuditEvent.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private requireOrganizationContext(actor: Actor): void {
    if (!actor.organizationId) {
      throw new OperationalNoteError("organization context required", 403);
    }
  }

  private resolveAuthorRole(actor: Actor): OrganizationRole {
    return (actor.organizationRole as OrganizationRole | undefined) ?? "staff";
  }

  private buildVisibilityFilter(
    actor: Actor
  ): { in: OperationalNoteVisibility[] } {
    const orgRole = (actor.organizationRole as OrganizationRole | undefined) ?? "staff";
    if (MANAGER_UP_ORG_ROLES.includes(orgRole)) {
      return { in: ["private", "team", "manager_only"] };
    }
    // staff and viewer see private (own) and team notes — private filtering to own
    // notes is a best-effort; full enforcement happens in the route layer via authorUserId check.
    return { in: ["team"] };
  }

  private async findAndGuard(
    id: string,
    organizationId: string,
    actor: Actor
  ): Promise<OperationalNoteRecord> {
    const note = await this.options.db.operationalNote.findUnique({ where: { id } });
    if (!note || note.organizationId !== organizationId) {
      throw new OperationalNoteError("note not found", 404);
    }
    // private notes: only visible to author
    if (note.visibility === "private" && note.authorUserId !== actor.userId) {
      throw new OperationalNoteError("note not found", 404);
    }
    // manager_only notes: only accessible by manager+
    const orgRole = (actor.organizationRole as OrganizationRole | undefined) ?? "staff";
    if (note.visibility === "manager_only" && !MANAGER_UP_ORG_ROLES.includes(orgRole)) {
      throw new OperationalNoteError("note not found", 404);
    }
    return note;
  }

  private requireManagerOrAuthor(note: OperationalNoteRecord, actor: Actor): void {
    const orgRole = (actor.organizationRole as OrganizationRole | undefined) ?? "staff";
    const isManager = MANAGER_UP_ORG_ROLES.includes(orgRole);
    const isAuthor = note.authorUserId === actor.userId;
    if (!isManager && !isAuthor) {
      throw new OperationalNoteError("only the author or a manager can perform this action", 403);
    }
  }

  private requireManagerRole(actor: Actor): void {
    const orgRole = (actor.organizationRole as OrganizationRole | undefined) ?? "staff";
    if (!MANAGER_UP_ORG_ROLES.includes(orgRole)) {
      throw new OperationalNoteError("manager role or higher required", 403);
    }
  }
}
