// apps/cockpit/app/(app)/schichtplan/heute/page.tsx

export const dynamic = "force-dynamic";

import { fetchShiftToday, fetchStaffToday } from "../../../../lib/backend/shift-planning";
import { StaffTodayClient } from "./staff-today-client";

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

export default async function SchichtplanHeutePage() {
  const date = berlinToday();
  const [result, shifts] = await Promise.all([fetchStaffToday(date), fetchShiftToday(date)]);
  return (
    <StaffTodayClient
      date={date}
      initialData={result.data}
      initialError={result.error}
      initialShifts={shifts.data?.shifts ?? []}
      shiftsError={shifts.error}
    />
  );
}
