import { AbschlussClient } from "./abschluss-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

type AbschlussPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function SchichtplanAbschlussPage({ searchParams }: AbschlussPageProps) {
  const params = (await searchParams) ?? {};
  const date = params.date ?? berlinToday();
  return <AbschlussClient date={date} />;
}
