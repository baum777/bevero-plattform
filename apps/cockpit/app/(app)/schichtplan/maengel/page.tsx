export const dynamic = "force-dynamic";

import { fetchIssues } from "../../../../lib/backend/shift-planning";
import { MaengelClient } from "./maengel-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

type MaengelPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function SchichtplanMaengelPage({ searchParams }: MaengelPageProps) {
  const params = (await searchParams) ?? {};
  const date = params.date ?? berlinToday();
  const result = await fetchIssues(date);
  return <MaengelClient date={date} initialData={result.data} initialError={result.error} />;
}
