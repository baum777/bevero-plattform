-- Phase 1: Schichtplan-Import → Bereichszuweisung → Tagesaufgaben
--
-- Adds the kitchen shift-planning system:
--   kitchen_areas        operative day-role areas (Gardemanger/Entremetier/Saucier)
--   shift_plan_imports   tracks uploaded shift plans + parsing/review state
--   shift_assignments    day-bound area assignment of a user (from a plan)
--   checklist_tasks      master list of possible kitchen tasks
--   task_day_matrix      area × weekday active/inactive flags per task
--   task_instances       concrete task for a user on a day (generated on release)
--   task_issues          defects reported against a task instance
--   task_comments        comments on a task instance
--   shift_signoffs       shift-lead end-of-shift confirmation
--
-- Convention: snake_case table names (@@map), camelCase quoted columns
-- (matches the approved Prisma models). Org-scoping is enforced in the
-- application layer; RLS (separate file) only grants service_role access.

-- ── kitchen_areas ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."kitchen_areas" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "workspaceGroupId" TEXT,
  "slug"             TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kitchen_areas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kitchen_areas_organizationId_slug_key" UNIQUE ("organizationId", "slug")
);

CREATE INDEX IF NOT EXISTS "kitchen_areas_organizationId_workspaceGroupId_idx"
  ON "public"."kitchen_areas" ("organizationId", "workspaceGroupId");

-- ── shift_plan_imports ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."shift_plan_imports" (
  "id"                  TEXT NOT NULL,
  "organizationId"      TEXT NOT NULL,
  "workspaceGroupId"    TEXT,
  "fileName"            TEXT NOT NULL,
  "fileSize"            INTEGER NOT NULL,
  "weekNumber"          INTEGER,
  "yearNumber"          INTEGER,
  "uploadedByUserId"    TEXT NOT NULL,
  "status"              TEXT NOT NULL,
  "parseErrors"         JSONB,
  "importedRowCount"    INTEGER NOT NULL DEFAULT 0,
  "matchedUserCount"    INTEGER NOT NULL DEFAULT 0,
  "unmatchedUserNames"  JSONB,
  "areaDetectionIssues" JSONB,
  "parsedData"          JSONB,
  "confirmedAt"         TIMESTAMP(3),
  "confirmedByUserId"   TEXT,
  "releasedAt"          TIMESTAMP(3),
  "releasedByUserId"    TEXT,
  "failureReason"       TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_plan_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shift_plan_imports_organizationId_status_createdAt_idx"
  ON "public"."shift_plan_imports" ("organizationId", "status", "createdAt");

-- ── shift_assignments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."shift_assignments" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "importId"         TEXT NOT NULL,
  "date"             DATE NOT NULL,
  "weekday"          INTEGER NOT NULL,
  "userId"           TEXT NOT NULL,
  "workspaceGroupId" TEXT,
  "areaId"           TEXT NOT NULL,
  "shiftStartAt"     TIMESTAMP(3) NOT NULL,
  "shiftEndAt"       TIMESTAMP(3) NOT NULL,
  "locationId"       TEXT,
  "department"       TEXT NOT NULL,
  "assignmentType"   TEXT NOT NULL DEFAULT 'primary',
  "sourceRow"        INTEGER,
  "status"           TEXT NOT NULL DEFAULT 'active',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_assignments_date_userId_areaId_shiftStartAt_shiftEndAt_key"
    UNIQUE ("date", "userId", "areaId", "shiftStartAt", "shiftEndAt"),
  CONSTRAINT "shift_assignments_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "public"."shift_plan_imports" ("id") ON DELETE CASCADE,
  CONSTRAINT "shift_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."UserProfile" ("id") ON DELETE CASCADE,
  CONSTRAINT "shift_assignments_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "public"."kitchen_areas" ("id")
);

CREATE INDEX IF NOT EXISTS "shift_assignments_organizationId_date_areaId_idx"
  ON "public"."shift_assignments" ("organizationId", "date", "areaId");

CREATE INDEX IF NOT EXISTS "shift_assignments_userId_date_idx"
  ON "public"."shift_assignments" ("userId", "date");

-- ── checklist_tasks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."checklist_tasks" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "workspaceGroupId" TEXT,
  "department"       TEXT NOT NULL,
  "areaId"           TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "notes"            TEXT,
  "requiresPhoto"    BOOLEAN NOT NULL DEFAULT false,
  "requiresComment"  BOOLEAN NOT NULL DEFAULT false,
  "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
  "frequency"        TEXT NOT NULL DEFAULT 'daily',
  "sortOrder"        INTEGER NOT NULL DEFAULT 0,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "checklist_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_tasks_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "public"."kitchen_areas" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "checklist_tasks_organizationId_department_areaId_idx"
  ON "public"."checklist_tasks" ("organizationId", "department", "areaId");

CREATE INDEX IF NOT EXISTS "checklist_tasks_active_idx"
  ON "public"."checklist_tasks" ("active");

-- ── task_day_matrix ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."task_day_matrix" (
  "id"              TEXT NOT NULL,
  "organizationId"  TEXT NOT NULL,
  "taskId"          TEXT NOT NULL,
  "areaId"          TEXT NOT NULL,
  "mondayActive"    BOOLEAN NOT NULL DEFAULT true,
  "tuesdayActive"   BOOLEAN NOT NULL DEFAULT true,
  "wednesdayActive" BOOLEAN NOT NULL DEFAULT true,
  "thursdayActive"  BOOLEAN NOT NULL DEFAULT true,
  "fridayActive"    BOOLEAN NOT NULL DEFAULT true,
  "saturdayActive"  BOOLEAN NOT NULL DEFAULT true,
  "sundayActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_day_matrix_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_day_matrix_taskId_areaId_key" UNIQUE ("taskId", "areaId"),
  CONSTRAINT "task_day_matrix_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "public"."checklist_tasks" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_day_matrix_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "public"."kitchen_areas" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "task_day_matrix_organizationId_areaId_idx"
  ON "public"."task_day_matrix" ("organizationId", "areaId");

-- ── task_instances ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."task_instances" (
  "id"                TEXT NOT NULL,
  "organizationId"    TEXT NOT NULL,
  "date"              DATE NOT NULL,
  "weekday"           INTEGER NOT NULL,
  "importId"          TEXT,
  "shiftAssignmentId" TEXT,
  "userId"            TEXT NOT NULL,
  "areaId"            TEXT NOT NULL,
  "taskId"            TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'open',
  "completedAt"       TIMESTAMP(3),
  "completedByUserId" TEXT,
  "verifiedAt"        TIMESTAMP(3),
  "verifiedByUserId"  TEXT,
  "dueAt"             TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_instances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_instances_shiftAssignmentId_taskId_key"
    UNIQUE ("shiftAssignmentId", "taskId"),
  CONSTRAINT "task_instances_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "public"."shift_plan_imports" ("id") ON DELETE SET NULL,
  CONSTRAINT "task_instances_shiftAssignmentId_fkey"
    FOREIGN KEY ("shiftAssignmentId") REFERENCES "public"."shift_assignments" ("id") ON DELETE SET NULL,
  CONSTRAINT "task_instances_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."UserProfile" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_instances_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "public"."kitchen_areas" ("id"),
  CONSTRAINT "task_instances_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "public"."checklist_tasks" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_instances_completedByUserId_fkey"
    FOREIGN KEY ("completedByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE SET NULL,
  CONSTRAINT "task_instances_verifiedByUserId_fkey"
    FOREIGN KEY ("verifiedByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "task_instances_organizationId_date_userId_idx"
  ON "public"."task_instances" ("organizationId", "date", "userId");

CREATE INDEX IF NOT EXISTS "task_instances_organizationId_status_date_idx"
  ON "public"."task_instances" ("organizationId", "status", "date");

CREATE INDEX IF NOT EXISTS "task_instances_areaId_date_idx"
  ON "public"."task_instances" ("areaId", "date");

-- ── task_issues ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."task_issues" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "taskInstanceId"   TEXT NOT NULL,
  "reportedByUserId" TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "photoUrl"         TEXT,
  "severity"         TEXT NOT NULL DEFAULT 'medium',
  "status"           TEXT NOT NULL DEFAULT 'open',
  "resolvedByUserId" TEXT,
  "resolvedAt"       TIMESTAMP(3),
  "resolutionNotes"  TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_issues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_issues_taskInstanceId_fkey"
    FOREIGN KEY ("taskInstanceId") REFERENCES "public"."task_instances" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_issues_reportedByUserId_fkey"
    FOREIGN KEY ("reportedByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_issues_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "task_issues_organizationId_status_idx"
  ON "public"."task_issues" ("organizationId", "status");

CREATE INDEX IF NOT EXISTS "task_issues_taskInstanceId_idx"
  ON "public"."task_issues" ("taskInstanceId");

-- ── task_comments ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."task_comments" (
  "id"              TEXT NOT NULL,
  "taskInstanceId"  TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_comments_taskInstanceId_fkey"
    FOREIGN KEY ("taskInstanceId") REFERENCES "public"."task_instances" ("id") ON DELETE CASCADE,
  CONSTRAINT "task_comments_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "task_comments_taskInstanceId_idx"
  ON "public"."task_comments" ("taskInstanceId");

-- ── shift_signoffs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."shift_signoffs" (
  "id"                 TEXT NOT NULL,
  "organizationId"     TEXT NOT NULL,
  "date"               DATE NOT NULL,
  "weekday"            INTEGER NOT NULL,
  "workspaceGroupId"   TEXT NOT NULL,
  "department"         TEXT NOT NULL,
  "signedByUserId"     TEXT NOT NULL,
  "completedTaskCount" INTEGER NOT NULL,
  "totalTaskCount"     INTEGER NOT NULL,
  "openIssueCount"     INTEGER NOT NULL,
  "summary"            TEXT,
  "notes"              TEXT,
  "signedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_signoffs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_signoffs_signedByUserId_fkey"
    FOREIGN KEY ("signedByUserId") REFERENCES "public"."UserProfile" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "shift_signoffs_organizationId_date_workspaceGroupId_idx"
  ON "public"."shift_signoffs" ("organizationId", "date", "workspaceGroupId");
