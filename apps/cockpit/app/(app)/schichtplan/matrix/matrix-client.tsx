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
                  <td key={d} className={dayMap[d] === true ? "matrix-cell--active" : "matrix-cell--inactive"}>
                    {dayMap[d] === true ? "●" : "○"}
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
