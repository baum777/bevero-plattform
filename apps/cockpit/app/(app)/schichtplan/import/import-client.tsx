"use client";

import { useRef, useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { InlineError } from "../../../components/ui/inline-error";
import {
  uploadShiftPlan,
  mapShiftPlanColumns,
  confirmShiftPlan,
  fetchTaskPreview,
  releaseShiftPlan
} from "../../../../lib/backend/shift-planning-browser";
import type {
  ImportUploadResponse,
  MappingReviewResponse,
  TaskPreviewResponse,
  ReleaseResponse
} from "../../../../lib/types/shift-planning";

type Step = "upload" | "review" | "preview" | "done";

export function ImportClient() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<ImportUploadResponse | null>(null);
  const [reviewData, setReviewData] = useState<MappingReviewResponse | null>(null);
  const [preview, setPreview] = useState<TaskPreviewResponse | null>(null);
  const [releaseResult, setReleaseResult] = useState<ReleaseResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setUploadData(null);
    setReviewData(null);
    setPreview(null);
    setReleaseResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Bitte eine Datei auswählen."); return; }

    setLoading(true);
    setError(null);
    try {
      const content = await file.text();
      const uploadResult = await uploadShiftPlan(file.name, content);
      if (uploadResult.error) throw new Error(uploadResult.error);
      if (!uploadResult.data) throw new Error("Upload lieferte keine Daten.");

      const upload = uploadResult.data;
      setUploadData(upload);

      // Auto-apply detected column mapping
      const dc = upload.detectedColumns;
      if (dc.dateColumn === null || dc.nameColumn === null || dc.areaColumn === null) {
        throw new Error("Spalten konnten nicht automatisch erkannt werden. Bitte Datei prüfen.");
      }

      const mappingResult = await mapShiftPlanColumns(upload.id, {
        dateColumn: dc.dateColumn,
        nameColumn: dc.nameColumn,
        areaColumn: dc.areaColumn,
        ...(dc.shiftStartColumn !== null ? { shiftStartColumn: dc.shiftStartColumn } : {}),
        ...(dc.shiftEndColumn !== null ? { shiftEndColumn: dc.shiftEndColumn } : {}),
        headerRow: dc.headerRow
      });
      if (mappingResult.error) throw new Error(mappingResult.error);

      setReviewData(mappingResult.data);
      setStep("review");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!uploadData) return;
    setLoading(true);
    setError(null);
    try {
      const confirmResult = await confirmShiftPlan(uploadData.id);
      if (confirmResult.error) throw new Error(confirmResult.error);

      const previewResult = await fetchTaskPreview(uploadData.id);
      if (previewResult.error) throw new Error(previewResult.error);

      setPreview(previewResult.data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bestätigung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    if (!uploadData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await releaseShiftPlan(uploadData.id);
      if (result.error) throw new Error(result.error);
      setReleaseResult(result.data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Freigabe fehlgeschlagen.");
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
            <p className="card-desc">CSV-Datei mit Datum, Name und Bereich hochladen.</p>
            <input accept=".csv" className="input-file" ref={fileRef} type="file" />
            <div className="card-actions">
              <Button loading={loading} onClick={() => { void handleUpload(); }} variant="primary">
                Hochladen & Analysieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && reviewData && (
        <Card>
          <CardHeader action={<Badge variant={reviewData.unmatchedUserNames.length > 0 ? "warning" : "ok"}>Prüfen</Badge>}>
            <CardTitle>Zuweisungen prüfen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="metric-row">
              <div className="metric-item">
                <dt>Zeilen</dt>
                <dd>{reviewData.importedRowCount}</dd>
              </div>
              <div className="metric-item">
                <dt>Erkannte User</dt>
                <dd>{reviewData.matchedUserCount}</dd>
              </div>
            </dl>

            {reviewData.unmatchedUserNames.length > 0 && (
              <div className="alert-block alert-block--warning">
                <strong>Nicht erkannte Namen:</strong> {reviewData.unmatchedUserNames.join(", ")}
              </div>
            )}
            {reviewData.unmatchedAreas.length > 0 && (
              <div className="alert-block alert-block--warning">
                <strong>Nicht erkannte Bereiche:</strong> {reviewData.unmatchedAreas.join(", ")}
              </div>
            )}
            {reviewData.rowErrors.length > 0 && (
              <div className="alert-block alert-block--warning">
                <strong>{reviewData.rowErrors.length} Zeilen mit Fehlern</strong>
              </div>
            )}

            <div className="card-actions">
              <Button onClick={reset} variant="ghost">Abbrechen</Button>
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
              Diese {preview.totalTasks} Aufgaben werden für die Schicht erstellt.
            </p>
            {Object.entries(preview.byArea).length > 0 && (
              <dl className="metric-row">
                {Object.entries(preview.byArea).map(([area, count]) => (
                  <div className="metric-item" key={area}>
                    <dt>{area}</dt>
                    <dd>{count}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="card-actions">
              <Button onClick={() => setStep("review")} variant="ghost">Zurück</Button>
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
                <dt>Übersprungen</dt>
                <dd>{releaseResult.tasksSkipped}</dd>
              </div>
            </dl>
            <div className="card-actions">
              <Button onClick={reset} variant="ghost">Weiteren Import starten</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageScaffold>
  );
}
