"use client";

import { useCallback, useEffect, useState } from "react";
import { PageScaffold } from "../../../components/page-scaffold";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

type CheckItem = {
  id: string;
  label: string;
  checked: boolean;
};

type Section = {
  id: string;
  title: string;
  items: CheckItem[];
};

const TEMPLATE: (Omit<Section, "items"> & { items: Omit<CheckItem, "checked">[] })[] = [
  {
    id: "opening",
    title: "Öffnung",
    items: [
      { id: "op-1", label: "Kühlhäuser & Kühlschränke — Temperatur prüfen (≤ 4 °C)" },
      { id: "op-2", label: "Tiefkühlbereiche — Temperatur prüfen (≤ −18 °C)" },
      { id: "op-3", label: "Arbeitsflächen reinigen & desinfizieren" },
      { id: "op-4", label: "Schneidbretter auf Zustand prüfen" },
      { id: "op-5", label: "MHD kritischer Waren kontrollieren" },
      { id: "op-6", label: "Mise en place vorbereiten" },
      { id: "op-7", label: "Frittieröl Zustand prüfen" },
      { id: "op-8", label: "Reinigungsmittel & Desinfektionsmittel aufgefüllt?" },
    ],
  },
  {
    id: "service",
    title: "Laufender Betrieb",
    items: [
      { id: "sv-1", label: "Lebensmittel korrekt beschriftet & abgedeckt?" },
      { id: "sv-2", label: "Kreuzverunreinigung-Risiken geprüft" },
      { id: "sv-3", label: "Wareneingang auf Qualität & Temperatur geprüft" },
      { id: "sv-4", label: "Lagerbestände nachgefüllt (Trockenlager)" },
      { id: "sv-5", label: "Abfall ordnungsgemäß entsorgt" },
      { id: "sv-6", label: "Frittierbad gewechselt / Zustand protokolliert" },
    ],
  },
  {
    id: "closing",
    title: "Schließung",
    items: [
      { id: "cl-1", label: "Alle Geräte ausgeschaltet / Stand-by" },
      { id: "cl-2", label: "Kühlhäuser — Restbestände korrekt eingelagert & gekühlt?" },
      { id: "cl-3", label: "Grills, Herde & Öfen gereinigt" },
      { id: "cl-4", label: "Frittierstation gereinigt & Öl abgedeckt" },
      { id: "cl-5", label: "Böden & Abläufe gereinigt" },
      { id: "cl-6", label: "Abfall & Recycling vollständig entsorgt" },
      { id: "cl-7", label: "Küche abgesperrt" },
    ],
  },
];

function buildInitialSections(): Section[] {
  return TEMPLATE.map((s) => ({
    ...s,
    items: s.items.map((i) => ({ ...i, checked: false })),
  }));
}

function storageKey(date: string) {
  return `bevero-kitchen-checkliste:${date}`;
}

function loadSections(date: string): Section[] {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return buildInitialSections();
    const parsed = JSON.parse(raw) as Section[];
    return parsed;
  } catch {
    return buildInitialSections();
  }
}

function saveSections(date: string, sections: Section[]) {
  try {
    localStorage.setItem(storageKey(date), JSON.stringify(sections));
  } catch {
    // localStorage not available
  }
}

function sectionProgress(section: Section): { done: number; total: number } {
  return {
    done: section.items.filter((i) => i.checked).length,
    total: section.items.length,
  };
}

function totalProgress(sections: Section[]): { done: number; total: number } {
  return sections.reduce(
    (acc, s) => {
      const p = sectionProgress(s);
      return { done: acc.done + p.done, total: acc.total + p.total };
    },
    { done: 0, total: 0 }
  );
}

function progressVariant(done: number, total: number): "ok" | "warning" | "critical" | "neutral" {
  if (total === 0) return "neutral";
  const pct = done / total;
  if (pct === 1) return "ok";
  if (pct >= 0.5) return "warning";
  return "critical";
}

type KitchenChecklisteClientProps = {
  date: string;
};

export function KitchenChecklisteClient({ date }: KitchenChecklisteClientProps) {
  const [sections, setSections] = useState<Section[]>(buildInitialSections);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSections(loadSections(date));
    setMounted(true);
  }, [date]);

  const toggle = useCallback(
    (sectionId: string, itemId: string) => {
      setSections((prev) => {
        const next = prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((i) =>
                  i.id === itemId ? { ...i, checked: !i.checked } : i
                ),
              }
            : s
        );
        saveSections(date, next);
        return next;
      });
    },
    [date]
  );

  const reset = useCallback(() => {
    const fresh = buildInitialSections();
    saveSections(date, fresh);
    setSections(fresh);
  }, [date]);

  const { done, total } = totalProgress(sections);
  const allDone = done === total && total > 0;

  const formattedDate = new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });

  return (
    <PageScaffold
      title="Küchen-Checkliste"
      description={`${formattedDate} · ${done}/${total} erledigt`}
    >
      <div className="card-actions" style={{ marginBottom: "1rem" }}>
        <Badge variant={progressVariant(done, total)}>
          {allDone ? "Vollständig ✓" : `${done} / ${total} erledigt`}
        </Badge>
        <Button onClick={reset} size="sm" variant="ghost">
          Zurücksetzen
        </Button>
      </div>

      {!mounted ? (
        <p className="card-meta">Lädt…</p>
      ) : (
        sections.map((section) => {
          const { done: sDone, total: sTotal } = sectionProgress(section);
          return (
            <Card key={section.id}>
              <CardHeader
                action={
                  <Badge variant={progressVariant(sDone, sTotal)}>
                    {sDone}/{sTotal}
                  </Badge>
                }
              >
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.625rem",
                          cursor: "pointer",
                          opacity: item.checked ? 0.55 : 1,
                        }}
                      >
                        <input
                          checked={item.checked}
                          onChange={() => toggle(section.id, item.id)}
                          style={{ marginTop: "0.2rem", flexShrink: 0, cursor: "pointer" }}
                          type="checkbox"
                        />
                        <span
                          className="card-meta"
                          style={{
                            textDecoration: item.checked ? "line-through" : "none",
                            margin: 0,
                          }}
                        >
                          {item.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}
    </PageScaffold>
  );
}
