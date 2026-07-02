import { KitchenChecklisteClient } from "./checkliste-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export default function KitchenChecklistePage() {
  return <KitchenChecklisteClient date={berlinToday()} />;
}
