"use client";

import { useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { ErrorState } from "../../components/ui/error-state";
import { InquiryDetailDrawer } from "../../components/bestand/InquiryDetailDrawer";
import { InquiryListItemCard } from "../../components/bestand/InquiryListItem";
import { PageScaffold } from "../../components/page-scaffold";
import { useInquiries, type InquiryFilters } from "../../../lib/mother-concern-hooks";

type TabKey = "open" | "today" | "offer" | "closed";

const TABS: Array<{ key: TabKey; label: string; statuses: string[] }> = [
  { key: "open", label: "Offen", statuses: ["NEW", "NEEDS_CLASSIFICATION", "NEEDS_HUMAN_REVIEW"] },
  { key: "today", label: "Heute eingegangen", statuses: [] }, // uses dateFrom
  { key: "offer", label: "Angebot in Vorbereitung", statuses: ["OFFER_DRAFT", "APPROVED"] },
  {
    key: "closed",
    label: "Abgeschlossen",
    statuses: ["SENT", "CONFIRMED", "LOST", "REJECTED", "ARCHIVED"]
  }
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function InquiriesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const filters: InquiryFilters = useMemo(() => {
    const base: InquiryFilters = { limit: 100 };
    const tab = TABS.find((t) => t.key === activeTab);
    if (activeTab === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      base.dateFrom = start.toISOString();
    } else if (tab) {
      base.status = tab.statuses[0];
    }
    if (businessUnitFilter) base.businessUnitHint = businessUnitFilter;
    if (sourceFilter) base.source = sourceFilter;
    return base;
  }, [activeTab, businessUnitFilter, sourceFilter]);

  const { data: inquiries, loading, error, refetch } = useInquiries(filters);

  const filteredInquiries = useMemo(() => {
    const list = inquiries ?? [];
    if (activeTab === "open") {
      return list.filter((i) =>
        ["NEW", "NEEDS_CLASSIFICATION", "NEEDS_HUMAN_REVIEW"].includes(i.status)
      );
    }
    if (activeTab === "today") {
      return list.filter((i) => isToday(i.createdAt));
    }
    return list;
  }, [inquiries, activeTab]);

  const selectedInquiry = useMemo(
    () => filteredInquiries.find((i) => i.id === selectedInquiryId) ?? null,
    [filteredInquiries, selectedInquiryId]
  );

  return (
    <PageScaffold
      title="Anfragen — Routing-Review"
      description="Manager-Sicht: Klassifizierungs-Vorschläge prüfen und PII-sanitized Detail anzeigen."
    >
      <div className="toolbar-row" data-testid="inquiry-tabs">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedInquiryId(null);
            }}
            variant={activeTab === tab.key ? "primary" : "outline"}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <form className="toolbar-row" data-testid="inquiry-filters">
        <select
          className="toolbar-input"
          onChange={(e) => setBusinessUnitFilter(e.target.value)}
          value={businessUnitFilter}
        >
          <option value="">Alle BUs</option>
          <option value="CORPORATE_EVENTS">Corporate Events</option>
          <option value="PRIVATE_EVENTS">Private Events</option>
          <option value="RESTAURANTS">Restaurants</option>
          <option value="BOOK_THE_CONCEPT">Buchbare Konzepte</option>
          <option value="LOCATIONS">Standorte</option>
        </select>
        <select
          className="toolbar-input"
          onChange={(e) => setSourceFilter(e.target.value)}
          value={sourceFilter}
        >
          <option value="">Alle Quellen</option>
          <option value="RAUSCHENBERGER_WEBSITE">Group Website</option>
          <option value="CUBE_WEBSITE">Premium Site Website</option>
          <option value="MOTORWORLD_INN_WEBSITE">Site Website</option>
          <option value="MANUAL_ENTRY">Manuell</option>
          <option value="EMAIL_IMPORT">E-Mail</option>
        </select>
        <Button onClick={() => void refetch()} variant="outline">
          Aktualisieren
        </Button>
      </form>

      {error ? (
        <ErrorState
          title="Anfragen konnten nicht geladen werden"
          description={error}
        />
      ) : null}
      {loading ? <p className="field-help">Lade…</p> : null}

      {filteredInquiries.length === 0 ? (
        <EmptyState
          title="Keine Anfragen"
          description="Aktuell sind keine Anfragen für die gewählten Filter erfasst."
        />
      ) : (
        <Card>
          <CardHeader
            action={<Badge variant="info">{filteredInquiries.length} Treffer</Badge>}
          >
            <CardTitle>{TABS.find((t) => t.key === activeTab)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-reset" data-testid="inquiry-list">
              {filteredInquiries.map((inq) => (
                <li key={inq.id}>
                  <InquiryListItemCard
                    inquiry={inq}
                    onSelect={(id) => setSelectedInquiryId(id)}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {selectedInquiry ? (
        <div
          className="drawer-backdrop"
          onClick={() => setSelectedInquiryId(null)}
          role="presentation"
        >
          <div
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "640px" }}
          >
            <InquiryDetailDrawer
              inquiry={selectedInquiry}
              onClose={() => setSelectedInquiryId(null)}
            />
          </div>
        </div>
      ) : null}
    </PageScaffold>
  );
}
