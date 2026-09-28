import "server-only";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { coachingSessions, meetingAttendance, type MeetingAttendance } from "@/lib/db/schema";
import { emailGuestWaiting } from "@/lib/email";
import { adminEmails } from "@/lib/portal";

const MINUTE = 60_000;
/** A tab counts as still in the call if it reported within this long. */
const ACTIVE_WITHIN_MS = 2 * MINUTE + 15_000;

type Target = { appointmentId: number } | { workshopId: number; signupId?: number };

/** Records a join, heartbeat or leave from the in-app room. */
export async function recordPresence(input: {
  target: Target;
  role: "host" | "guest";
  name: string;
  sessionKey: string;
  event: "join" | "beat" | "leave";
  now?: Date;
}) {
  const db = getDb();
  const now = input.now ?? new Date();
  const existing = db.select().from(meetingAttendance).where(eq(meetingAttendance.sessionKey, input.sessionKey)).get();
  if (!existing) {
    if (input.event === "leave") return;
    db.insert(meetingAttendance)
      .values({
        appointmentId: "appointmentId" in input.target ? input.target.appointmentId : null,
        workshopId: "workshopId" in input.target ? input.target.workshopId : null,
        signupId: "signupId" in input.target ? (input.target.signupId ?? null) : null,
        role: input.role,
        name: input.name.slice(0, 120),
        sessionKey: input.sessionKey,
        joinedAt: now,
        lastSeenAt: now,
      })
      .run();
  } else {
    db.update(meetingAttendance)
      .set({ lastSeenAt: now, ...(input.event === "leave" ? { leftAt: now } : {}) })
      .where(eq(meetingAttendance.id, existing.id))
      .run();
  }

  if (input.event === "join" && input.role === "guest" && "appointmentId" in input.target) {
    await alertIfHostAbsent(input.target.appointmentId, input.name, now);
  }
}

function isActive(row: MeetingAttendance, now: number) {
  return !row.leftAt && now - row.lastSeenAt.getTime() < ACTIVE_WITHIN_MS;
}

/** Emails Monika (once per appointment) when the guest is in the room and she isn't. */
async function alertIfHostAbsent(appointmentId: number, guestName: string, now: Date) {
  const db = getDb();
  const rows = db.select().from(meetingAttendance).where(eq(meetingAttendance.appointmentId, appointmentId)).all();
  if (rows.some((r) => r.role === "host" && isActive(r, now.getTime()))) return;
  const claimed = db
    .update(coachingSessions)
    .set({ waitingAlertSentAt: now })
    .where(and(eq(coachingSessions.id, appointmentId), isNull(coachingSessions.waitingAlertSentAt)))
    .run();
  if (claimed.changes !== 1) return;
  const appt = db.select().from(coachingSessions).where(eq(coachingSessions.id, appointmentId)).get();
  const to = await adminEmails();
  if (!appt || !to.length) return;
  const sent = await emailGuestWaiting({ to, guestName, title: appt.title, url: await appUrl(`/meet/host/a/${appointmentId}`) });
  if (!sent.ok) db.update(coachingSessions).set({ waitingAlertSentAt: null }).where(eq(coachingSessions.id, appointmentId)).run();
}

export type AttendanceSummary = {
  /** Total minutes the guest(s) were in the call. */
  guestMinutes: number;
  guestJoined: boolean;
  hostJoined: boolean;
  /** A guest is in the call right now and the host isn't. */
  waiting: boolean;
  /** Names of guests in the call right now. */
  waitingNames: string[];
};

function minutesOf(rows: MeetingAttendance[]) {
  const ms = rows.reduce((sum, r) => sum + ((r.leftAt ?? r.lastSeenAt).getTime() - r.joinedAt.getTime()), 0);
  return Math.max(0, Math.round(ms / MINUTE));
}

function summarise(rows: MeetingAttendance[], now: number): AttendanceSummary {
  const guests = rows.filter((r) => r.role === "guest");
  const hosts = rows.filter((r) => r.role === "host");
  const activeGuests = guests.filter((r) => isActive(r, now));
  const waiting = activeGuests.length > 0 && !hosts.some((r) => isActive(r, now));
  return {
    guestMinutes: minutesOf(guests),
    guestJoined: guests.length > 0,
    hostJoined: hosts.length > 0,
    waiting,
    waitingNames: waiting ? [...new Set(activeGuests.map((r) => r.name))] : [],
  };
}

/** Attendance per appointment (only appointments with any in-app activity are included). */
export function appointmentAttendance(appointmentIds: number[], now = Date.now()) {
  const out = new Map<number, AttendanceSummary>();
  if (appointmentIds.length === 0) return out;
  const rows = getDb().select().from(meetingAttendance).where(inArray(meetingAttendance.appointmentId, appointmentIds)).all();
  const byAppt = new Map<number, MeetingAttendance[]>();
  for (const r of rows) byAppt.set(r.appointmentId!, [...(byAppt.get(r.appointmentId!) ?? []), r]);
  for (const [id, list] of byAppt) out.set(id, summarise(list, now));
  return out;
}

/** Signups that joined a workshop's in-app room, with their minutes. */
export function workshopAttendance(workshopIds: number[]) {
  const out = new Map<number, number>();
  if (workshopIds.length === 0) return out;
  const rows = getDb()
    .select()
    .from(meetingAttendance)
    .where(and(inArray(meetingAttendance.workshopId, workshopIds), eq(meetingAttendance.role, "guest")))
    .all();
  const bySignup = new Map<number, MeetingAttendance[]>();
  for (const r of rows) if (r.signupId) bySignup.set(r.signupId, [...(bySignup.get(r.signupId) ?? []), r]);
  for (const [signupId, list] of bySignup) out.set(signupId, minutesOf(list));
  return out;
}

/** Appointments where someone is in the room waiting for Monika right now. */
export function waitingNow(now = Date.now()) {
  const recent = getDb()
    .select()
    .from(meetingAttendance)
    .where(and(gt(meetingAttendance.lastSeenAt, new Date(now - ACTIVE_WITHIN_MS)), isNull(meetingAttendance.leftAt)))
    .all();
  const ids = [...new Set(recent.filter((r) => r.appointmentId).map((r) => r.appointmentId!))];
  return [...appointmentAttendance(ids, now)].filter(([, s]) => s.waiting).map(([id, s]) => ({ appointmentId: id, names: s.waitingNames }));
}

/**
 * "No-show" is only claimed when Monika used the in-app room and the guest never
 * joined it — earlier bookings may have been joined through an old link.
 */
export function isNoShow(summary: AttendanceSummary | undefined) {
  return Boolean(summary && summary.hostJoined && !summary.guestJoined);
}
