-- Scope D: Operational Notes Layer
-- Auditierbare, kontextgebundene operative Notizen für Enterprise-Produktion.

CREATE TYPE public."OperationalNoteVisibility" AS ENUM ('private', 'team', 'manager_only');
CREATE TYPE public."OperationalNoteType"       AS ENUM (
  'general', 'stock_issue', 'delivery_issue', 'handover',
  'maintenance', 'incident', 'refill_context'
);
CREATE TYPE public."OperationalNoteEntityType" AS ENUM (
  'inventory_item', 'movement', 'bar_refill_run',
  'review_task', 'shift_handover', 'storage_location'
);
CREATE TYPE public."OperationalNotePriority"   AS ENUM ('normal', 'important', 'critical');
CREATE TYPE public."OperationalNoteStatus"     AS ENUM ('open', 'resolved', 'archived');
CREATE TYPE public."OperationalNoteAuditAction" AS ENUM (
  'created', 'updated', 'resolved', 'archived', 'linked'
);

CREATE TABLE public."OperationalNote" (
  "id"                TEXT                              NOT NULL,
  "organizationId"    TEXT                              NOT NULL,
  "workspaceId"       TEXT,
  "storageLocationId" TEXT,
  "authorUserId"      TEXT                              NOT NULL,
  "authorRole"        public."OrganizationRole"         NOT NULL,
  "title"             TEXT,
  "body"              TEXT                              NOT NULL,
  "visibility"        public."OperationalNoteVisibility" NOT NULL DEFAULT 'team',
  "noteType"          public."OperationalNoteType"       NOT NULL DEFAULT 'general',
  "relatedEntityType" public."OperationalNoteEntityType",
  "relatedEntityId"   TEXT,
  "priority"          public."OperationalNotePriority"   NOT NULL DEFAULT 'normal',
  "status"            public."OperationalNoteStatus"     NOT NULL DEFAULT 'open',
  "createdAt"         TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  "resolvedAt"        TIMESTAMPTZ,
  "resolvedByUserId"  TEXT,
  CONSTRAINT "OperationalNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalNote_storageLocationId_fkey"
    FOREIGN KEY ("storageLocationId") REFERENCES public."StorageLocation"("id") ON DELETE SET NULL
);

CREATE INDEX "OperationalNote_org_status_idx"
  ON public."OperationalNote" ("organizationId", "status", "createdAt" DESC);

CREATE INDEX "OperationalNote_org_priority_status_idx"
  ON public."OperationalNote" ("organizationId", "priority", "status");

CREATE INDEX "OperationalNote_org_workspace_idx"
  ON public."OperationalNote" ("organizationId", "workspaceId", "status");

CREATE INDEX "OperationalNote_org_storage_idx"
  ON public."OperationalNote" ("organizationId", "storageLocationId");

CREATE INDEX "OperationalNote_related_entity_idx"
  ON public."OperationalNote" ("relatedEntityType", "relatedEntityId");

CREATE INDEX "OperationalNote_author_idx"
  ON public."OperationalNote" ("authorUserId");

CREATE TABLE public."OperationalNoteAuditEvent" (
  "id"          TEXT                              NOT NULL,
  "noteId"      TEXT                              NOT NULL,
  "action"      public."OperationalNoteAuditAction" NOT NULL,
  "actorUserId" TEXT                              NOT NULL,
  "before"      JSONB,
  "after"       JSONB,
  "createdAt"   TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  CONSTRAINT "OperationalNoteAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalNoteAuditEvent_noteId_fkey"
    FOREIGN KEY ("noteId") REFERENCES public."OperationalNote"("id") ON DELETE CASCADE
);

CREATE INDEX "OperationalNoteAuditEvent_noteId_idx"
  ON public."OperationalNoteAuditEvent" ("noteId", "createdAt" DESC);

CREATE INDEX "OperationalNoteAuditEvent_actor_idx"
  ON public."OperationalNoteAuditEvent" ("actorUserId");

-- Grant to app_runtime (backend service role)
GRANT SELECT, INSERT, UPDATE ON public."OperationalNote"           TO app_runtime;
GRANT SELECT, INSERT          ON public."OperationalNoteAuditEvent" TO app_runtime;
