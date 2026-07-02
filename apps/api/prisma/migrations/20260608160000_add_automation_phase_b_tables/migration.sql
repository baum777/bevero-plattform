-- ADR-0022: Phase B Rules Engine MVP — schema additions (B-1).
-- Forward-only. Rollback is the manual DROP script documented in ADR-0022 §Rollback Plan.
-- Five tables + seven enums in the public schema. No RLS, no grants, no trigger here
-- (those land in the companion RLS migration 20260608161000_add_automation_phase_b_rls).

CREATE TYPE "AutomationRuleType" AS ENUM ('threshold', 'time', 'event', 'anomaly');
CREATE TYPE "AutomationRuleEvaluationMode" AS ENUM ('write', 'schedule', 'both');
CREATE TYPE "AutomationSuggestionType" AS ENUM ('refill', 'receipt_alert', 'consumption_anomaly', 'alert_consolidation', 'custom');
CREATE TYPE "AutomationSuggestionStatus" AS ENUM ('open', 'approved', 'rejected', 'expired');
CREATE TYPE "AutomationDecisionStatus" AS ENUM ('approved', 'rejected');
CREATE TYPE "OfflineActionType" AS ENUM ('quick_note', 'refill_confirm', 'correction_request', 'movement', 'transfer', 'other');
CREATE TYPE "OfflineActionStatus" AS ENUM ('pending', 'synced', 'conflict', 'failed');

CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "ruleType" "AutomationRuleType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "condition" JSONB NOT NULL,
  "action" JSONB NOT NULL,
  "evaluateOn" "AutomationRuleEvaluationMode" NOT NULL,
  "schedule" TEXT,
  "metadata" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationSuggestion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "ruleVersion" INTEGER NOT NULL,
  "status" "AutomationSuggestionStatus" NOT NULL,
  "type" "AutomationSuggestionType" NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "relatedItemIds" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "automaticActionOnApproval" JSONB,
  CONSTRAINT "AutomationSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationDecision" (
  "id" TEXT NOT NULL,
  "suggestionId" TEXT NOT NULL,
  "status" "AutomationDecisionStatus" NOT NULL,
  "actor" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  CONSTRAINT "AutomationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineActionQueue" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "actionType" "OfflineActionType" NOT NULL,
  "clientMutationId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "operationData" JSONB NOT NULL,
  "status" "OfflineActionStatus" NOT NULL DEFAULT 'pending',
  "syncedAt" TIMESTAMP(3),
  "conflictReason" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfflineActionQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShiftHandoverDraft" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "shiftLeadId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "date" DATE NOT NULL,
  "startTime" TIME(3),
  "endTime" TIME(3),
  "summary" TEXT,
  "openItems" JSONB,
  "alerts" JSONB,
  "notes" TEXT,
  "synthesizedHandover" TEXT,
  "synthesizedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShiftHandoverDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationRule_organizationId_enabled_evaluateOn_idx" ON "AutomationRule"("organizationId", "enabled", "evaluateOn");
CREATE INDEX "AutomationRule_organizationId_ruleType_idx" ON "AutomationRule"("organizationId", "ruleType");
CREATE INDEX "AutomationRule_enabled_schedule_idx" ON "AutomationRule"("enabled", "schedule");

CREATE INDEX "AutomationSuggestion_organizationId_status_createdAt_idx" ON "AutomationSuggestion"("organizationId", "status", "createdAt" DESC);
CREATE INDEX "AutomationSuggestion_organizationId_expiresAt_idx" ON "AutomationSuggestion"("organizationId", "expiresAt");
CREATE INDEX "AutomationSuggestion_ruleId_status_idx" ON "AutomationSuggestion"("ruleId", "status");

CREATE INDEX "AutomationDecision_suggestionId_idx" ON "AutomationDecision"("suggestionId");
CREATE INDEX "AutomationDecision_actor_timestamp_idx" ON "AutomationDecision"("actor", "timestamp" DESC);
CREATE INDEX "AutomationDecision_timestamp_idx" ON "AutomationDecision"("timestamp");

CREATE UNIQUE INDEX "OfflineActionQueue_clientMutationId_key" ON "OfflineActionQueue"("clientMutationId");
CREATE INDEX "OfflineActionQueue_userId_deviceId_status_idx" ON "OfflineActionQueue"("userId", "deviceId", "status");
CREATE INDEX "OfflineActionQueue_organizationId_status_createdAt_idx" ON "OfflineActionQueue"("organizationId", "status", "createdAt");

CREATE INDEX "ShiftHandoverDraft_organizationId_date_shiftLeadId_idx" ON "ShiftHandoverDraft"("organizationId", "date", "shiftLeadId");
CREATE INDEX "ShiftHandoverDraft_confirmedAt_idx" ON "ShiftHandoverDraft"("confirmedAt");

ALTER TABLE "AutomationSuggestion"
  ADD CONSTRAINT "AutomationSuggestion_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AutomationDecision"
  ADD CONSTRAINT "AutomationDecision_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "AutomationSuggestion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
