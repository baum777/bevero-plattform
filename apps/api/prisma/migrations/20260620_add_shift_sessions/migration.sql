-- Runtime evidence for planned shift assignments. The plan remains immutable;
-- sessions and their append-only events record actual execution.

CREATE TABLE "public"."shift_sessions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workspaceGroupId" TEXT,
  "shiftAssignmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "plannedStartAt" TIMESTAMP(3) NOT NULL,
  "plannedEndAt" TIMESTAMP(3) NOT NULL,
  "clientStartedAt" TIMESTAMP(3),
  "serverStartedAt" TIMESTAMP(3),
  "actualStartedAt" TIMESTAMP(3),
  "actualEndedAt" TIMESTAMP(3),
  "sessionStatus" TEXT NOT NULL DEFAULT 'scheduled',
  "startStatus" TEXT,
  "endStatus" TEXT,
  "startDeltaMinutes" INTEGER,
  "endDeltaMinutes" INTEGER,
  "startedByUserId" TEXT,
  "endedByUserId" TEXT,
  "timezone" TEXT,
  "clockSkewMs" INTEGER,
  "startSource" TEXT,
  "endSource" TEXT,
  "startNote" TEXT,
  "endNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_sessions_shiftAssignmentId_key" UNIQUE ("shiftAssignmentId"),
  CONSTRAINT "shift_sessions_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "public"."shift_assignments"("id") ON DELETE CASCADE,
  CONSTRAINT "shift_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE,
  CONSTRAINT "shift_sessions_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."kitchen_areas"("id"),
  CONSTRAINT "shift_sessions_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL,
  CONSTRAINT "shift_sessions_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL
);

CREATE INDEX "shift_sessions_organizationId_userId_plannedStartAt_idx"
  ON "public"."shift_sessions"("organizationId", "userId", "plannedStartAt");
CREATE INDEX "shift_sessions_organizationId_workspaceGroupId_plannedStartAt_idx"
  ON "public"."shift_sessions"("organizationId", "workspaceGroupId", "plannedStartAt");

CREATE TABLE "public"."shift_session_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "shiftSessionId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "serverCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,

  CONSTRAINT "shift_session_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shift_session_events_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "public"."shift_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "shift_session_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."UserProfile"("id") ON DELETE RESTRICT
);

CREATE INDEX "shift_session_events_organizationId_occurredAt_idx"
  ON "public"."shift_session_events"("organizationId", "occurredAt");
CREATE INDEX "shift_session_events_shiftSessionId_occurredAt_idx"
  ON "public"."shift_session_events"("shiftSessionId", "occurredAt");

ALTER TABLE "public"."shift_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shift_session_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role admin access" ON "public"."shift_sessions"
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role admin access" ON "public"."shift_session_events"
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

REVOKE UPDATE, DELETE ON "public"."shift_session_events" FROM anon, authenticated, service_role;
