export const dynamic = "force-dynamic";

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
