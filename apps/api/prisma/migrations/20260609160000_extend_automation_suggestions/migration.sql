-- Scope E: Extend AutomationSuggestion for Human-in-the-Loop Engine
-- Adds severity, explanation, evidence (JSON), workspaceId, storageLocationId,
-- and the 'superseded' status value.

CREATE TYPE public."AutomationSuggestionSeverity" AS ENUM ('info', 'warning', 'critical');

ALTER TABLE public."AutomationSuggestion"
  ADD COLUMN "workspaceId"       TEXT,
  ADD COLUMN "storageLocationId" TEXT,
  ADD COLUMN "severity"          public."AutomationSuggestionSeverity" NOT NULL DEFAULT 'warning',
  ADD COLUMN "explanation"       TEXT,
  ADD COLUMN "evidence"          JSONB;

-- Add 'superseded' to existing enum
ALTER TYPE public."AutomationSuggestionStatus" ADD VALUE IF NOT EXISTS 'superseded';

-- Indexes for new filter dimensions
CREATE INDEX "AutomationSuggestion_org_severity_status_idx"
  ON public."AutomationSuggestion" ("organizationId", "severity", "status");

CREATE INDEX "AutomationSuggestion_org_workspace_idx"
  ON public."AutomationSuggestion" ("organizationId", "workspaceId", "status");
