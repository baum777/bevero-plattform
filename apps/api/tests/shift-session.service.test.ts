import { describe, expect, it } from "vitest";

import { ShiftSessionService } from "../src/modules/shift-planning/shift-session.service.js";
import type { ShiftSessionDatabaseClient, ShiftSessionRow } from "../src/modules/shift-planning/shift-session.service.js";
import type { Actor } from "../src/modules/auth/actor.js";

const ORGANIZATION_ID = "org-test";
const ASSIGNMENT_ID = "assignment-1";
const PROFILE_ID = "profile-1";
const AUTH_USER_ID = "auth-user-1";
const NOW = new Date("2026-06-20T12:00:00.000Z");

const staffActor: Actor = { userId: AUTH_USER_ID, organizationId: ORGANIZATION_ID, role: "staff" };
const leadActor: Actor = { userId: "auth-lead", organizationId: ORGANIZATION_ID, role: "shift_lead" };

type Fixture = { events: Record<string, unknown>[]; getSession: () => ShiftSessionRow | null };

function makeDb(overrides: Partial<{ assignment: Record<string, unknown> | null; session: ShiftSessionRow | null }> = {}): [ShiftSessionDatabaseClient, Fixture] {
  const events: Record<string, unknown>[] = [];
  const assignment = overrides.assignment ?? {
    id: ASSIGNMENT_ID, organizationId: ORGANIZATION_ID, userId: PROFILE_ID, areaId: "area-1",
    workspaceGroupId: "group-1", shiftStartAt: new Date("2026-06-20T11:55:00.000Z"),
    shiftEndAt: new Date("2026-06-20T19:00:00.000Z"), status: "active"
  };
  let session = overrides.session ?? null;
  let db: ShiftSessionDatabaseClient;
  db = {
    userProfile: { findUnique: async () => ({ id: PROFILE_ID }) },
    shiftAssignment: { findUnique: async () => assignment as never, findMany: async () => [] },
    shiftSession: {
      findUnique: async ({ where }) => where.id ? (session?.id === where.id ? session : null) : session,
      findMany: async () => session ? [session] : [],
      create: async ({ data }) => { session = data as ShiftSessionRow; return session; },
      update: async ({ data }) => { session = { ...(session ?? {}), ...data } as ShiftSessionRow; return session; }
    },
    shiftSessionEvent: { create: async ({ data }) => { events.push(data); return { id: `event-${events.length}` }; } },
    $transaction: async (fn) => fn(db)
  };
  return [db, { events, getSession: () => session }];
}

describe("ShiftSessionService", () => {
  it("starts an own assignment in the allowed window with server time and one audit event", async () => {
    const [db, fixture] = makeDb();
    const service = new ShiftSessionService({ db, now: () => NOW });

    const result = await service.start(ASSIGNMENT_ID, { timezone: "Europe/Berlin" }, staffActor);

    expect(result).toMatchObject({ assignmentId: ASSIGNMENT_ID, sessionStatus: "active", actualStartedAt: NOW.toISOString(), serverStartedAt: NOW.toISOString(), startStatus: "on_time", startDeltaMinutes: 5, startSource: "staff_cta" });
    expect(fixture.events).toHaveLength(1);
    expect(fixture.events[0]).toMatchObject({ eventType: "shift_started", actorUserId: PROFILE_ID });
  });

  it("requires a staff note from eleven minutes late", async () => {
    const [db] = makeDb({ assignment: {
      id: ASSIGNMENT_ID, organizationId: ORGANIZATION_ID, userId: PROFILE_ID, areaId: "area-1", workspaceGroupId: null,
      shiftStartAt: new Date("2026-06-20T11:49:00.000Z"), shiftEndAt: new Date("2026-06-20T19:00:00.000Z"), status: "active"
    } });
    const service = new ShiftSessionService({ db, now: () => NOW });

    await expect(service.start(ASSIGNMENT_ID, { timezone: "Europe/Berlin" }, staffActor)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("allows only a shift lead outside the planned start window", async () => {
    const [db] = makeDb({ assignment: {
      id: ASSIGNMENT_ID, organizationId: ORGANIZATION_ID, userId: PROFILE_ID, areaId: "area-1", workspaceGroupId: null,
      shiftStartAt: new Date("2026-06-20T12:31:00.000Z"), shiftEndAt: new Date("2026-06-20T19:00:00.000Z"), status: "active"
    } });
    const service = new ShiftSessionService({ db, now: () => NOW });

    await expect(service.start(ASSIGNMENT_ID, { timezone: "Europe/Berlin" }, staffActor)).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.start(ASSIGNMENT_ID, { timezone: "Europe/Berlin" }, leadActor)).resolves.toMatchObject({ startStatus: "early", startSource: "lead_override" });
  });

  it("keeps punctuality status while auditing a lead correction", async () => {
    const [db, fixture] = makeDb({ session: {
      id: "session-1", organizationId: ORGANIZATION_ID, workspaceGroupId: null, shiftAssignmentId: ASSIGNMENT_ID,
      userId: PROFILE_ID, areaId: "area-1", plannedStartAt: new Date("2026-06-20T12:00:00.000Z"), plannedEndAt: new Date("2026-06-20T19:00:00.000Z"),
      clientStartedAt: null, serverStartedAt: NOW, actualStartedAt: NOW, actualEndedAt: null, sessionStatus: "active",
      startStatus: "on_time", endStatus: null, startDeltaMinutes: 0, endDeltaMinutes: null, startedByUserId: PROFILE_ID,
      endedByUserId: null, timezone: "Europe/Berlin", clockSkewMs: null, startSource: "staff_cta", endSource: null,
      startNote: null, endNote: null
    } });
    const service = new ShiftSessionService({ db, now: () => NOW });

    const result = await service.correctStart("session-1", { actualStartedAt: "2026-06-20T12:12:00.000Z", reason: "Vorherige Aufgabe" }, leadActor);

    expect(result).toMatchObject({ startStatus: "late", startDeltaMinutes: 12, startSource: "lead_correction" });
    expect(fixture.events[0]).toMatchObject({ eventType: "shift_start_corrected", payload: { reason: "Vorherige Aufgabe" } });
  });
});
