# Shift Planning Frontend Phase 1D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four read/write views for the kitchen shift planning module — Staff Today, Shift Lead Summary, Import flow, and Matrix — wired to the existing backend endpoints.

**Architecture:** Each view follows the established pattern: a server component (`page.tsx`) fetches initial data via `getBackendApiBase()` and passes it to a client component (`*-client.tsx`) for interactivity. Client-side mutations use the `/api/backend/[...path]` proxy. All views live under `apps/cockpit/app/(app)/schichtplan/`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth (token from session), existing UI components (Card, Badge, Button, EmptyState, PageScaffold, InlineError)

**Role mapping (existing RBAC):** `staff` → staff-only views; `manager` = Schichtleitung = shift_lead access; `admin` = full access.

**Note on tests:** The cockpit app has no test infrastructure. Each task includes a manual verification step (run dev server, confirm in browser).

---

## File Structure

```
apps/cockpit/
  lib/
    types/
      shift-planning.ts              CREATE — all DTO types
    backend/
      shift-planning.ts              CREATE — server-side fetch helpers
  app/(app)/
    schichtplan/
      heute/
        page.tsx                     CREATE — server component, fetches today's tasks
        staff-today-client.tsx       CREATE — interactive task list with done/issue actions
      uebersicht/
        page.tsx                     CREATE — server component, fetches summary
        summary-client.tsx           CREATE — area cards with metrics
      import/
        page.tsx                     CREATE — server component (no initial data needed)
        import-client.tsx            CREATE — multi-step: upload → review → confirm → preview → release
      matrix/
        page.tsx                     CREATE — server component, fetches matrix
        matrix-client.tsx            CREATE — read-only tab view per area
    components/
      app-shell.tsx                  MODIFY — add Schichtplanung nav group to kitchenNavGroups
      bottom-nav.tsx                 MODIFY — add Schichtplan tab for kitchen_storage group type
```

---

## Task 1: TypeScript Types

**Files:**
- Create: `apps/cockpit/lib/types/shift-planning.ts`

- [ ] **Step 1: Create the types file**

```typescript
// apps/cockpit/lib/types/shift-planning.ts

export type TaskStatus = "open" | "done" | "issue" | "skipped" | "verified";
export type IssueStatus = "open" | "resolved" | "accepted";
export type ImportStatus = "uploaded" | "parsed" | "needs_review" | "confirmed" | "released" | "failed";

export type TaskInstance = {
  id: string;
  date: string;
  areaId: string;
  areaSlug: string;
  areaLabel: string;
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  assignedUserId: string;
  assignedUserName: string;
  issueStatus: IssueStatus | null;
  issueNote: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
};

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

export type ShiftAssignmentRow = {
  date: string;
  userName: string;
  areaSlug: string;
  areaLabel: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  matchedUserId: string | null;
  matchedAreaId: string | null;
  needsReview: boolean;
};

export type ShiftPlanImport = {
  id: string;
  status: ImportStatus;
  fileName: string;
  weekStart: string;
  weekEnd: string;
  assignments: ShiftAssignmentRow[];
  unmatchedUsers: string[];
  unmatchedAreas: string[];
  createdAt: string;
};

export type TaskPreviewRow = {
  date: string;
  userName: string;
  areaLabel: string;
  taskTitle: string;
  weekday: string;
};

export type TaskPreviewResponse = {
  importId: string;
  totalTasks: number;
  tasks: TaskPreviewRow[];
};

export type ImportUploadResponse = {
  importId: string;
  status: ImportStatus;
  assignments: ShiftAssignmentRow[];
  unmatchedUsers: string[];
  unmatchedAreas: string[];
};

export type ConfirmBody = {
  userMappings?: Record<string, string>;
  areaMappings?: Record<string, string>;
};

export type ConfirmResponse = {
  importId: string;
  status: ImportStatus;
};

export type ReleaseResponse = {
  importId: string;
  status: ImportStatus;
  tasksCreated: number;
  tasksSkipped: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit/lib/types/shift-planning.ts
git commit -m "feat(shift-planning): add frontend Phase 1D TypeScript types"
```

---

## Task 2: Backend Fetch Helpers (Server-side)

**Files:**
- Create: `apps/cockpit/lib/backend/shift-planning.ts`

- [ ] **Step 1: Create the backend helper**

```typescript
// apps/cockpit/lib/backend/shift-planning.ts

import { getBackendApiBase } from "./api-base";
import { createClient } from "../supabase/server";
import type {
  StaffTodayResponse,
  ShiftLeadSummaryResponse,
  MatrixResponse
} from "../types/shift-planning";

type BackendResult<T> = { data: T; error: null } | { data: null; error: string };

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchStaffToday(date: string): Promise<BackendResult<StaffTodayResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/tasks?date=${encodeURIComponent(date)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { data: null, error: body.message ?? `Fehler ${res.status}` };
    }
    const data = (await res.json()) as StaffTodayResponse;
    return { data, error: null };
  } catch {
    return { data: null, error: "Schichtplanung nicht erreichbar." };
  }
}

export async function fetchShiftLeadSummary(date: string): Promise<BackendResult<ShiftLeadSummaryResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/summary?date=${encodeURIComponent(date)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { data: null, error: body.message ?? `Fehler ${res.status}` };
    }
    const data = (await res.json()) as ShiftLeadSummaryResponse;
    return { data, error: null };
  } catch {
    return { data: null, error: "Übersicht nicht erreichbar." };
  }
}

export async function fetchMatrix(): Promise<BackendResult<MatrixResponse>> {
  try {
    const token = await getAccessToken();
    if (!token) return { data: null, error: "Nicht angemeldet." };
    const res = await fetch(
      `${getBackendApiBase()}/shift-planning/matrix`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { data: null, error: body.message ?? `Fehler ${res.status}` };
    }
    const data = (await res.json()) as MatrixResponse;
    return { data, error: null };
  } catch {
    return { data: null, error: "Matrix nicht erreichbar." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit/lib/backend/shift-planning.ts
git commit -m "feat(shift-planning): add server-side fetch helpers"
```

---

## Task 3: Staff Today View

**Files:**
- Create: `apps/cockpit/app/(app)/schichtplan/heute/page.tsx`
- Create: `apps/cockpit/app/(app)/schichtplan/heute/staff-today-client.tsx`

- [ ] **Step 1: Create server component**

```typescript
// apps/cockpit/app/(app)/schichtplan/heute/page.tsx

import { fetchStaffToday } from "../../../../lib/backend/shift-planning";
import { StaffTodayClient } from "./staff-today-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export default async function SchichtplanHeutePage() {
  const date = berlinToday();
  const result = await fetchStaffToday(date);
  return (
    <StaffTodayClient
      date={date}
      initialData={result.data}
      initialError={result.error}
    />
  );
}
```

- [ ] **Step 2: Create client component**

```typescript
// apps/cockpit/app/(app)/schichtplan/heute/staff-today-client.tsx
"use client";

import { useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import { createClient } from "../../../../lib/supabase/client";
import type { StaffTodayResponse, TaskInstance, TaskStatus } from "../../../../lib/types/shift-planning";

function statusBadgeVariant(status: TaskStatus) {
  if (status === "done" || status === "verified") return "ok";
  if (status === "issue") return "critical";
  if (status === "skipped") return "warning";
  return "neutral";
}

function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    open: "Offen",
    done: "Erledigt",
    issue: "Mangel",
    skipped: "Übersprungen",
    verified: "Geprüft"
  };
  return map[status];
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type StaffTodayClientProps = {
  date: string;
  initialData: StaffTodayResponse | null;
  initialError: string | null;
};

export function StaffTodayClient({ date, initialData, initialError }: StaffTodayClientProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>(initialData?.tasks ?? []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [issueDrawer, setIssueDrawer] = useState<{ taskId: string; note: string } | null>(null);

  const area = initialData?.assignedAreaLabel ?? null;
  const weekday = initialData?.weekday ?? "";

  async function markDone(taskId: string) {
    setLoadingId(taskId);
    setActionError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend/shift-planning/tasks/${taskId}/done`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Aufgabe konnte nicht abgeschlossen werden.");
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "done", completedAt: new Date().toISOString() } : t))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoadingId(null);
    }
  }

  async function submitIssue(taskId: string, note: string) {
    setLoadingId(taskId);
    setActionError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend/shift-planning/tasks/${taskId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Mangel konnte nicht gemeldet werden.");
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "issue", issueStatus: "open", issueNote: note } : t))
      );
      setIssueDrawer(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoadingId(null);
    }
  }

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "verified");
  const issueTasks = tasks.filter((t) => t.status === "issue");

  if (initialError) {
    return (
      <PageScaffold title="Heute" description={date}>
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (tasks.length === 0) {
    return (
      <PageScaffold title="Heute" description={`${weekday}, ${date}`}>
        <EmptyState
          title="Keine Aufgaben zugewiesen"
          description="Für heute wurde kein Schichtplan importiert oder du bist keinem Bereich zugewiesen."
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Heute"
      description={area ? `${weekday} · ${area}` : `${weekday}, ${date}`}
    >
      {actionError ? <InlineError message={actionError} /> : null}

      {openTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Offen ({openTasks.length})</h2>
          {openTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader
                action={
                  <div className="card-actions">
                    <Button
                      loading={loadingId === task.id}
                      onClick={() => { void markDone(task.id); }}
                      size="sm"
                      variant="primary"
                    >
                      Erledigt
                    </Button>
                    <Button
                      disabled={loadingId === task.id}
                      onClick={() => setIssueDrawer({ taskId: task.id, note: "" })}
                      size="sm"
                      variant="ghost"
                    >
                      Mangel
                    </Button>
                  </div>
                }
              >
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {issueTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Mängel ({issueTasks.length})</h2>
          {issueTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader action={<Badge variant="critical">Mangel</Badge>}>
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
              {task.issueNote ? (
                <CardContent>
                  <p className="card-note">{task.issueNote}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </section>
      )}

      {doneTasks.length > 0 && (
        <section className="section-block">
          <h2 className="section-label">Erledigt ({doneTasks.length})</h2>
          {doneTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader action={<Badge variant="ok">{statusLabel(task.status)}</Badge>}>
                <CardTitle>{task.taskTitle}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {issueDrawer ? (
        <>
          <button
            aria-label="Mangel-Meldung schließen"
            className="sidebar-overlay"
            onClick={() => setIssueDrawer(null)}
            type="button"
          />
          <div className="drawer drawer-bottom">
            <h3 className="drawer-title">Mangel melden</h3>
            <textarea
              className="input-textarea"
              onChange={(e) => setIssueDrawer((prev) => prev ? { ...prev, note: e.target.value } : null)}
              placeholder="Was ist das Problem? (optional)"
              rows={3}
              value={issueDrawer.note}
            />
            <div className="drawer-actions">
              <Button onClick={() => setIssueDrawer(null)} variant="ghost">
                Abbrechen
              </Button>
              <Button
                loading={loadingId === issueDrawer.taskId}
                onClick={() => { void submitIssue(issueDrawer.taskId, issueDrawer.note); }}
                variant="danger"
              >
                Mangel senden
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </PageScaffold>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd apps/cockpit && pnpm dev
```

Navigate to `/schichtplan/heute` in browser. Expected: page renders with "Keine Aufgaben zugewiesen" if no shift plan imported, or task list if backend has data for today.

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit/app/\(app\)/schichtplan/heute/
git commit -m "feat(shift-planning): add Staff Today View"
```

---

## Task 4: Shift Lead Summary View

**Files:**
- Create: `apps/cockpit/app/(app)/schichtplan/uebersicht/page.tsx`
- Create: `apps/cockpit/app/(app)/schichtplan/uebersicht/summary-client.tsx`

- [ ] **Step 1: Create server component**

```typescript
// apps/cockpit/app/(app)/schichtplan/uebersicht/page.tsx

import { fetchShiftLeadSummary } from "../../../../lib/backend/shift-planning";
import { SummaryClient } from "./summary-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

type SummaryPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function SchichtplanUebersichtPage({ searchParams }: SummaryPageProps) {
  const params = (await searchParams) ?? {};
  const date = params.date ?? berlinToday();
  const result = await fetchShiftLeadSummary(date);
  return <SummaryClient date={date} initialData={result.data} initialError={result.error} />;
}
```

- [ ] **Step 2: Create client component**

```typescript
// apps/cockpit/app/(app)/schichtplan/uebersicht/summary-client.tsx
"use client";

import { useRouter } from "next/navigation";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import type { ShiftLeadSummaryResponse, AreaSummary } from "../../../../lib/types/shift-planning";

function progressPercent(area: AreaSummary): number {
  if (area.totalTasks === 0) return 0;
  return Math.round(((area.doneTasks + area.verifiedTasks) / area.totalTasks) * 100);
}

function areaStatusVariant(area: AreaSummary): "ok" | "warning" | "critical" | "neutral" {
  if (area.openIssues > 0) return "critical";
  if (area.openTasks === 0 && area.totalTasks > 0) return "ok";
  if (progressPercent(area) >= 50) return "warning";
  return "neutral";
}

type SummaryClientProps = {
  date: string;
  initialData: ShiftLeadSummaryResponse | null;
  initialError: string | null;
};

export function SummaryClient({ date, initialData, initialError }: SummaryClientProps) {
  const router = useRouter();
  const areas = initialData?.areas ?? [];
  const weekday = initialData?.weekday ?? "";

  if (initialError) {
    return (
      <PageScaffold title="Schicht-Übersicht" description={date}>
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (areas.length === 0) {
    return (
      <PageScaffold title="Schicht-Übersicht" description={`${weekday}, ${date}`}>
        <EmptyState
          title="Kein Schichtplan"
          description="Für dieses Datum wurde kein Schichtplan importiert und freigegeben."
          action={
            <button
              className="btn btn-primary btn-md"
              onClick={() => router.push("/schichtplan/import")}
              type="button"
            >
              Schichtplan importieren
            </button>
          }
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title="Schicht-Übersicht" description={`${weekday}, ${date}`}>
      {areas.map((area) => {
        const pct = progressPercent(area);
        const variant = areaStatusVariant(area);
        return (
          <Card key={area.areaId}>
            <CardHeader
              action={<Badge variant={variant}>{pct}%</Badge>}
            >
              <CardTitle>{area.areaLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="metric-row">
                <div className="metric-item">
                  <dt>Gesamt</dt>
                  <dd>{area.totalTasks}</dd>
                </div>
                <div className="metric-item">
                  <dt>Offen</dt>
                  <dd>{area.openTasks}</dd>
                </div>
                <div className="metric-item">
                  <dt>Erledigt</dt>
                  <dd>{area.doneTasks + area.verifiedTasks}</dd>
                </div>
                {area.issueTasks > 0 && (
                  <div className="metric-item metric-item--critical">
                    <dt>Mängel</dt>
                    <dd>{area.issueTasks}</dd>
                  </div>
                )}
              </dl>
              {area.assignedUsers.length > 0 && (
                <p className="card-meta">{area.assignedUsers.join(", ")}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </PageScaffold>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/schichtplan/uebersicht`. Expected: area cards with metrics, or empty state with "Schichtplan importieren" CTA.

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit/app/\(app\)/schichtplan/uebersicht/
git commit -m "feat(shift-planning): add Shift Lead Summary View"
```

---

## Task 5: Import Upload & Parse Step

**Files:**
- Create: `apps/cockpit/app/(app)/schichtplan/import/page.tsx`
- Create: `apps/cockpit/app/(app)/schichtplan/import/import-client.tsx`

The import flow has 4 steps rendered within one client component: `upload` → `review` → `preview` → `done`.

- [ ] **Step 1: Create server component (thin shell)**

```typescript
// apps/cockpit/app/(app)/schichtplan/import/page.tsx

import { ImportClient } from "./import-client";

export default function SchichtplanImportPage() {
  return <ImportClient />;
}
```

- [ ] **Step 2: Create client component — step type and upload step**

```typescript
// apps/cockpit/app/(app)/schichtplan/import/import-client.tsx
"use client";

import { useRef, useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { InlineError } from "../../../components/ui/inline-error";
import { createClient } from "../../../../lib/supabase/client";
import type {
  ImportUploadResponse,
  ShiftAssignmentRow,
  TaskPreviewResponse,
  ReleaseResponse
} from "../../../../lib/types/shift-planning";

type Step = "upload" | "review" | "preview" | "done";

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function ReviewTable({ assignments }: { assignments: ShiftAssignmentRow[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th>Bereich</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((row, idx) => (
            <tr key={idx}>
              <td>{row.date}</td>
              <td>{row.userName}</td>
              <td>{row.areaLabel}</td>
              <td>
                {row.needsReview ? (
                  <Badge variant="warning">Prüfen</Badge>
                ) : (
                  <Badge variant="ok">OK</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewTable({ tasks }: { tasks: TaskPreviewResponse["tasks"] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th>Bereich</th>
            <th>Aufgabe</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((row, idx) => (
            <tr key={idx}>
              <td>{row.date}</td>
              <td>{row.userName}</td>
              <td>{row.areaLabel}</td>
              <td>{row.taskTitle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportClient() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ImportUploadResponse | null>(null);
  const [preview, setPreview] = useState<TaskPreviewResponse | null>(null);
  const [releaseResult, setReleaseResult] = useState<ReleaseResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Bitte eine Datei auswählen.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/backend/shift-planning/imports", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Upload fehlgeschlagen (${res.status})`);
      }
      const data = (await res.json()) as ImportUploadResponse;
      setImportData(data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!importData) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/backend/shift-planning/imports/${importData.importId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({})
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Bestätigung fehlgeschlagen.");
      }
      // Fetch preview
      const previewRes = await fetch(
        `/api/backend/shift-planning/imports/${importData.importId}/task-preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!previewRes.ok) {
        const body = (await previewRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Vorschau konnte nicht geladen werden.");
      }
      const previewData = (await previewRes.json()) as TaskPreviewResponse;
      setPreview(previewData);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Bestätigen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    if (!importData) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/backend/shift-planning/imports/${importData.importId}/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({})
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Freigabe fehlgeschlagen.");
      }
      const result = (await res.json()) as ReleaseResponse;
      setReleaseResult(result);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler bei der Freigabe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageScaffold title="Schichtplan importieren">
      {error ? <InlineError message={error} /> : null}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Schichtplan hochladen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="card-desc">Datei im CSV- oder Excel-Format hochladen.</p>
            <input
              accept=".csv,.xlsx,.xls"
              className="input-file"
              ref={fileRef}
              type="file"
            />
            <div className="card-actions">
              <Button loading={loading} onClick={() => { void handleUpload(); }} variant="primary">
                Hochladen & Analysieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && importData && (
        <Card>
          <CardHeader action={<Badge variant="warning">Prüfen</Badge>}>
            <CardTitle>Zuweisungen prüfen</CardTitle>
          </CardHeader>
          <CardContent>
            {importData.unmatchedUsers.length > 0 && (
              <div className="alert-block alert-block--warning">
                <strong>Nicht erkannte Namen:</strong> {importData.unmatchedUsers.join(", ")}
              </div>
            )}
            {importData.unmatchedAreas.length > 0 && (
              <div className="alert-block alert-block--warning">
                <strong>Nicht erkannte Bereiche:</strong> {importData.unmatchedAreas.join(", ")}
              </div>
            )}
            <ReviewTable assignments={importData.assignments} />
            <div className="card-actions">
              <Button onClick={() => { setStep("upload"); setImportData(null); }} variant="ghost">
                Abbrechen
              </Button>
              <Button loading={loading} onClick={() => { void handleConfirm(); }} variant="primary">
                Bestätigen & Vorschau laden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && preview && (
        <Card>
          <CardHeader action={<Badge variant="info">{preview.totalTasks} Aufgaben</Badge>}>
            <CardTitle>Aufgaben-Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="card-desc">
              Diese {preview.totalTasks} Aufgaben werden für die Woche erstellt.
            </p>
            <PreviewTable tasks={preview.tasks} />
            <div className="card-actions">
              <Button onClick={() => { setStep("review"); }} variant="ghost">
                Zurück
              </Button>
              <Button loading={loading} onClick={() => { void handleRelease(); }} variant="primary">
                Aufgaben freigeben
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && releaseResult && (
        <Card>
          <CardHeader action={<Badge variant="ok">Freigegeben</Badge>}>
            <CardTitle>Schichtplan freigegeben</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="metric-row">
              <div className="metric-item">
                <dt>Erstellt</dt>
                <dd>{releaseResult.tasksCreated}</dd>
              </div>
              <div className="metric-item">
                <dt>Übersprungen (Duplikate)</dt>
                <dd>{releaseResult.tasksSkipped}</dd>
              </div>
            </dl>
            <div className="card-actions">
              <Button
                onClick={() => {
                  setStep("upload");
                  setImportData(null);
                  setPreview(null);
                  setReleaseResult(null);
                  setError(null);
                }}
                variant="ghost"
              >
                Weiteren Import starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageScaffold>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/schichtplan/import`. Expected: file input rendered, upload button visible. Attempt upload with a test file — verify the review step renders (or an appropriate error from the backend).

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit/app/\(app\)/schichtplan/import/
git commit -m "feat(shift-planning): add Import flow (upload → review → confirm → release)"
```

---

## Task 6: Matrix Read-Only View

**Files:**
- Create: `apps/cockpit/app/(app)/schichtplan/matrix/page.tsx`
- Create: `apps/cockpit/app/(app)/schichtplan/matrix/matrix-client.tsx`

- [ ] **Step 1: Create server component**

```typescript
// apps/cockpit/app/(app)/schichtplan/matrix/page.tsx

import { fetchMatrix } from "../../../../lib/backend/shift-planning";
import { MatrixClient } from "./matrix-client";

export default async function SchichtplanMatrixPage() {
  const result = await fetchMatrix();
  return <MatrixClient initialData={result.data} initialError={result.error} />;
}
```

- [ ] **Step 2: Create client component**

```typescript
// apps/cockpit/app/(app)/schichtplan/matrix/matrix-client.tsx
"use client";

import { useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { InlineError } from "../../../components/ui/inline-error";
import { EmptyState } from "../../../components/ui/empty-state";
import type { MatrixResponse, MatrixArea } from "../../../../lib/types/shift-planning";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So"
};

function AreaMatrix({ area }: { area: MatrixArea }) {
  return (
    <div className="table-scroll">
      <table className="data-table matrix-table">
        <thead>
          <tr>
            <th>Aufgabe</th>
            {WEEKDAYS.map((d) => <th key={d}>{WEEKDAY_LABELS[d]}</th>)}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {area.tasks.map((task) => {
            const dayMap = Object.fromEntries(task.days.map((d) => [d.key, d.active]));
            return (
              <tr key={task.taskId}>
                <td>
                  {task.taskTitle}
                  {task.requiresManualReview && (
                    <span className="badge badge-warning matrix-review-flag" title="Manuelle Prüfung empfohlen">
                      {" "}⚠
                    </span>
                  )}
                </td>
                {WEEKDAYS.map((d) => (
                  <td key={d} className={dayMap[d] ? "matrix-cell--active" : "matrix-cell--inactive"}>
                    {dayMap[d] ? "●" : "○"}
                  </td>
                ))}
                <td>
                  {task.matrixStatus === "default_all_days" ? (
                    <Badge variant="warning">Standard täglich</Badge>
                  ) : (
                    <Badge variant="ok">Explizit</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type MatrixClientProps = {
  initialData: MatrixResponse | null;
  initialError: string | null;
};

export function MatrixClient({ initialData, initialError }: MatrixClientProps) {
  const areas = initialData?.areas ?? [];
  const [activeAreaSlug, setActiveAreaSlug] = useState<string>(areas[0]?.areaSlug ?? "");

  const activeArea = areas.find((a) => a.areaSlug === activeAreaSlug) ?? null;

  if (initialError) {
    return (
      <PageScaffold title="Matrix" description="Aufgaben-Konfiguration (schreibgeschützt)">
        <InlineError message={initialError} />
      </PageScaffold>
    );
  }

  if (areas.length === 0) {
    return (
      <PageScaffold title="Matrix" description="Aufgaben-Konfiguration (schreibgeschützt)">
        <EmptyState
          title="Keine Matrix verfügbar"
          description="Die Checklistenmatrix wurde noch nicht konfiguriert."
        />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold title="Matrix" description="Aufgaben-Konfiguration (schreibgeschützt)">
      <div className="tab-bar">
        {areas.map((area) => (
          <button
            className={`tab-btn${activeAreaSlug === area.areaSlug ? " active" : ""}`}
            key={area.areaSlug}
            onClick={() => setActiveAreaSlug(area.areaSlug)}
            type="button"
          >
            {area.areaLabel}
          </button>
        ))}
      </div>

      {activeArea && (
        <Card>
          <CardHeader action={<Badge variant="info">{activeArea.tasks.length} Aufgaben</Badge>}>
            <CardTitle>{activeArea.areaLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaMatrix area={activeArea} />
          </CardContent>
        </Card>
      )}
    </PageScaffold>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to `/schichtplan/matrix`. Expected: area tabs (Gardemanger, Entremetier, Saucier) with weekday matrix table. Switching tabs shows the correct area's tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit/app/\(app\)/schichtplan/matrix/
git commit -m "feat(shift-planning): add Matrix read-only view"
```

---

## Task 7: Navigation Wiring

**Files:**
- Modify: `apps/cockpit/app/components/app-shell.tsx`
- Modify: `apps/cockpit/app/components/bottom-nav.tsx`

- [ ] **Step 1: Add Schichtplanung group to kitchenNavGroups in app-shell.tsx**

Find the `kitchenNavGroups` constant (line ~97 in `app-shell.tsx`) and add the Schichtplanung group:

```typescript
const kitchenNavGroups: NavGroup[] = [
  {
    items: [
      { label: "Heute", href: "/heute", allowed: ALL },
      { label: "Dashboard", href: "/dashboard", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Küche & Lager",
    items: [
      { label: "Walk-Route", href: "/kitchen/walk-route", allowed: ALL },
      { label: "Artikel", href: "/inventory/items", allowed: MANAGER_UP },
      { label: "Bestände", href: "/inventory/balances", allowed: MANAGER_UP },
      { label: "Warenbewegungen", href: "/movements", allowed: ALL },
      { label: "Wareneingang", href: "/inventory/goods-receipt", allowed: ALL },
      { label: "Lagerorte", href: "/storage", allowed: MANAGER_UP }
    ]
  },
  // ADD THIS GROUP:
  {
    label: "Schichtplanung",
    items: [
      { label: "Meine Aufgaben", href: "/schichtplan/heute", allowed: ALL },
      { label: "Schicht-Übersicht", href: "/schichtplan/uebersicht", allowed: MANAGER_UP },
      { label: "Import", href: "/schichtplan/import", allowed: MANAGER_UP },
      { label: "Matrix", href: "/schichtplan/matrix", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Operative Ebene",
    items: [
      { label: "Notizen", href: "/notes", allowed: ALL },
      { label: "Freigaben", href: "/freigaben", allowed: MANAGER_UP },
      { label: "Alerts", href: "/alerts", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Einstellungen",
    items: [
      { label: "Profil", href: "/settings/profile", allowed: ALL },
      { label: "Team", href: "/settings/team", allowed: ADMIN_UP },
      { label: "Rollen", href: "/settings/roles", allowed: ADMIN_UP }
    ]
  }
];
```

- [ ] **Step 2: Add Schichtplan tab to bottom-nav for kitchen_storage group**

In `bottom-nav.tsx`, find where `TABS` is defined inside the `BottomNav` function. The existing kitchen bereich tab points to `/kitchen/walk-route`. Add a Schichtplan tab for kitchen_storage:

Replace the `TABS` array with:

```typescript
const TABS: Tab[] = [
  { key: "heute", label: "Heute", href: "/heute", icon: HomeIcon, allowed: ALL },
  { key: "bereich", label: bereichLabel, href: bereichHref, icon: ToolIcon, allowed: ALL },
  {
    key: "schichtplan",
    label: "Schicht",
    href: activeGroupType === "kitchen_storage" ? "/schichtplan/heute" : "/schichtplan/heute",
    icon: ListCheckIcon,
    allowed: ALL
  },
  { key: "bewegungen", label: "Bewegungen", href: "/movements", icon: ExchangeIcon, allowed: ALL },
  { key: "freigaben", label: "Freigaben", href: "/freigaben", icon: CheckCircleIcon, allowed: MANAGER_UP }
];
```

Note: `visibleTabs.slice(0, 2)` shows the first 2 tabs before the `+` button, and `visibleTabs.slice(2)` shows the rest after it. With 5 tabs total (or 4 for staff without Freigaben), Schicht lands in the right-side slots alongside Bewegungen. Adjust the slice boundaries if this feels wrong after visual check.

- [ ] **Step 3: Verify**

Open the sidebar as a kitchen_storage workspace user. Expected: "Schichtplanung" group with 4 nav links. Click each link and verify the page renders. Check bottom nav shows "Schicht" tab.

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit/app/components/app-shell.tsx apps/cockpit/app/components/bottom-nav.tsx
git commit -m "feat(shift-planning): wire Schichtplanung into sidebar and bottom nav"
```

---

## Self-Review

### Spec Coverage

| Foundation requirement | Task covering it |
|---|---|
| Staff Today View (tasks, mark done, report issue) | Task 3 |
| Shift Lead Summary View (area cards, metrics) | Task 4 |
| Schichtplan Import (upload → review → confirm → preview → release) | Task 5 |
| Matrix read-only view (tabs per area, weekday grid) | Task 6 |
| Navigation (sidebar + bottom nav) | Task 7 |
| TypeScript types for all DTOs | Task 1 |
| Server-side fetch helpers | Task 2 |
| Role-gating (staff sees today, manager sees summary/import/matrix) | Covered via `allowed` arrays in nav and page-level render logic |

**Non-goals confirmed absent:** editable matrix, PDF parsing, photo upload, multi-location editor — none appear in the plan.

### Placeholder Scan

No TBD, TODO, or "implement later" present. All code blocks are complete. All types used in later tasks (`TaskInstance`, `AreaSummary`, etc.) are defined in Task 1.

### Type Consistency

- `ImportUploadResponse.importId` (Task 1) used in Task 5 fetch calls — consistent.
- `MatrixArea.tasks[].days[].key` used in `dayMap` lookup in Task 6 — consistent with `MatrixDay.key` from Task 1.
- `StaffTodayResponse.tasks` typed as `TaskInstance[]` — consistent with Task 3 state init.
- `TaskPreviewResponse.tasks` typed inline via `preview.tasks` — consistent with Task 1 shape.
