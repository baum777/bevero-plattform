export type TaskStatus = "open" | "done" | "issue" | "skipped" | "verified";
export type IssueStatus = "open" | "resolved" | "accepted";
export type ImportStatus =
  | "uploaded"
  | "parsed"
  | "needs_review"
  | "confirmed"
  | "released"
  | "failed";

export type TaskInstance = {
  id: string;
  date: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  shiftAssignmentId: string | null;
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  assignedUserId: string;
  assignedUserName: string | null;
  issueStatus: IssueStatus | null;
  issueNote: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  requiresPhoto: boolean;
  requiresComment: boolean;
  dueAt: string | null;
};

export type ShiftSession = {
  id: string;
  assignmentId: string;
  sessionStatus: "scheduled" | "active" | "completed" | "missed";
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  serverStartedAt: string | null;
  startDeltaMinutes: number | null;
  endDeltaMinutes: number | null;
  startStatus: "on_time" | "early" | "late" | null;
  endStatus: "on_time" | "early" | "late" | null;
  startSource: string | null;
  endSource: string | null;
  startNote: string | null;
  endNote: string | null;
};

export type TodayShift = {
  assignmentId: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  plannedStartAt: string;
  plannedEndAt: string;
  session: ShiftSession | null;
};

export type ShiftTodayResponse = { date: string; shifts: TodayShift[] };

export type StaffTodayResponse = {
  date: string;
  weekday: string;
  assignedArea: string | null;
  assignedAreaLabel: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  tasks: TaskInstance[];
};

export type AreaSummary = {
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  assignedUsers: string[];
  totalTasks: number;
  openTasks: number;
  doneTasks: number;
  issueTasks: number;
  skippedTasks: number;
  verifiedTasks: number;
  openIssues: number;
  assignments: Array<{
    assignmentId: string;
    userId: string;
    displayName: string | null;
    plannedStartAt: string;
    plannedEndAt: string;
    session: Pick<ShiftSession, "id" | "sessionStatus" | "actualStartedAt" | "actualEndedAt" | "startDeltaMinutes" | "endDeltaMinutes" | "startStatus" | "endStatus"> | null;
  }>;
};

export type ShiftLeadSummaryResponse = {
  date: string;
  weekday: string;
  areas: AreaSummary[];
};

export type MatrixDay = {
  key: string;
  label: string;
  active: boolean;
};

export type MatrixTask = {
  taskId: string;
  taskTitle: string;
  days: MatrixDay[];
  confidence: "high" | "medium" | "low";
  requiresManualReview: boolean;
  matrixStatus: "explicit" | "default_all_days";
};

export type MatrixArea = {
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  tasks: MatrixTask[];
};

export type MatrixResponse = {
  version: string;
  areas: MatrixArea[];
};

// ── Import flow types (multi-step: upload → map-columns → confirm → preview → release) ──

/** Step 1: POST /shift-planning/imports — returns column detection + raw preview rows */
export type ImportUploadResponse = {
  id: string;
  status: ImportStatus;
  fileName: string;
  detectedColumns: {
    dateColumn: number | null;
    nameColumn: number | null;
    areaColumn: number | null;
    shiftStartColumn: number | null;
    shiftEndColumn: number | null;
    headerRow: number;
  };
  previewRows: string[][];
  totalRows: number;
};

/** Step 2: POST /shift-planning/imports/:id/map-columns — returns assignment review */
export type MappingReviewResponse = {
  id: string;
  status: ImportStatus;
  importedRowCount: number;
  matchedUserCount: number;
  unmatchedUserNames: string[];
  unmatchedAreas: string[];
  rowErrors: Array<{ row: number; message: string }>;
};

/** Step 3: POST /shift-planning/imports/:id/confirm */
export type ConfirmResponse = {
  id: string;
  status: ImportStatus;
  assignmentCount: number;
};

/** Step 4: GET /shift-planning/imports/:id/task-preview */
export type TaskPreviewTask = {
  assignmentId: string;
  userId: string;
  userName: string | null;
  areaSlug: string;
  areaName: string;
  taskId: string;
  taskTitle: string;
};

export type TaskPreviewResponse = {
  importId: string;
  totalTasks: number;
  byArea: Record<string, number>;
  tasks: TaskPreviewTask[];
};

/** Step 5: POST /shift-planning/imports/:id/release */
export type ReleaseResponse = {
  importId: string;
  status: ImportStatus;
  tasksCreated: number;
  tasksSkipped: number;
};

// ── Mängel (Issues) ───────────────────────────────────────────────────────────

export type IssueResolveStatus = "resolved" | "accepted";

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

export type IssuesResponse = {
  date: string;
  workspaceGroupId: string | null;
  openCount: number;
  issues: IssueDto[];
};

// ── Schichtabschluss (Signoff) ────────────────────────────────────────────────

export type SignoffRecord = {
  id: string;
  signedAt: string;
  signedByName: string | null;
  completedTaskCount: number;
  totalTaskCount: number;
  openIssueCount: number;
  summary: string | null;
  notes: string | null;
};

export type SignoffStatusResponse = {
  date: string;
  weekday: string;
  workspaceGroupId: string | null;
  department: string;
  totalTaskCount: number;
  completedTaskCount: number;
  openTaskCount: number;
  blockingTaskCount: number;
  openIssueCount: number;
  canSignOff: boolean;
  blockingReasons: string[];
  existingSignoff: SignoffRecord | null;
};
