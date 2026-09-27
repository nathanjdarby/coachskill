import "server-only";
import { and, asc, eq, gt, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  availabilityBlocks,
  availabilityRules,
  bookingSettings,
  clientPackages,
  coachingSessions,
  workshops,
  type BookingSettings,
} from "@/lib/db/schema";
import { londonDate, londonLocalToUtc } from "@/lib/time";

// These helpers are synchronous on purpose (better-sqlite3): checking a slot and
// inserting the booking happen with no await in between, so two requests can't
// both take the same slot.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function getBookingSettings(): BookingSettings {
  const db = getDb();
  const row = db.select().from(bookingSettings).where(eq(bookingSettings.id, 1)).get();
  if (row) return row;
  db.insert(bookingSettings).values({ id: 1 }).onConflictDoNothing().run();
  return db.select().from(bookingSettings).where(eq(bookingSettings.id, 1)).get()!;
}

export function listAvailabilityRules() {
  return getDb().select().from(availabilityRules).orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startMinute)).all();
}

export function listUpcomingBlocks(now = new Date()) {
  return getDb().select().from(availabilityBlocks).where(gt(availabilityBlocks.endsAt, now)).orderBy(asc(availabilityBlocks.startsAt)).all();
}

type Busy = { start: number; end: number; buffered: boolean };

/** Everything that makes time unavailable between `from` and `to`. */
function busyPeriods(from: Date, to: Date, excludeSessionId?: number): Busy[] {
  const db = getDb();
  const sessions = db
    .select({ startsAt: coachingSessions.startsAt, durationMinutes: coachingSessions.durationMinutes })
    .from(coachingSessions)
    .where(
      and(
        isNull(coachingSessions.cancelledAt),
        lt(coachingSessions.startsAt, to),
        sql`${coachingSessions.startsAt} + ${coachingSessions.durationMinutes} * 60000 > ${from.getTime() - DAY}`,
        excludeSessionId ? ne(coachingSessions.id, excludeSessionId) : undefined,
      ),
    )
    .all();
  const runs = db
    .select({ startsAt: workshops.startsAt, durationMinutes: workshops.durationMinutes })
    .from(workshops)
    .where(and(isNotNull(workshops.startsAt), lt(workshops.startsAt, to), gt(workshops.startsAt, new Date(from.getTime() - DAY))))
    .all();
  const blocks = db
    .select()
    .from(availabilityBlocks)
    .where(and(lt(availabilityBlocks.startsAt, to), gt(availabilityBlocks.endsAt, from)))
    .all();
  return [
    ...sessions.map((s) => ({ start: s.startsAt.getTime(), end: s.startsAt.getTime() + s.durationMinutes * MINUTE, buffered: true })),
    ...runs.map((w) => ({ start: w.startsAt!.getTime(), end: w.startsAt!.getTime() + w.durationMinutes * MINUTE, buffered: true })),
    ...blocks.map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime(), buffered: false })),
  ];
}

/** Bookable start times for a session of `durationMinutes`, soonest first. */
export function availableSlots(
  durationMinutes: number,
  opts: { now?: Date; excludeSessionId?: number; bufferMinutes?: number | null } = {},
): Date[] {
  const now = opts.now ?? new Date();
  const settings = getBookingSettings();
  const rules = listAvailabilityRules();
  if (rules.length === 0) return [];

  const earliest = now.getTime() + settings.minNoticeHours * 60 * MINUTE;
  const latest = now.getTime() + settings.maxAdvanceDays * DAY;
  const busy = busyPeriods(new Date(earliest), new Date(latest + durationMinutes * MINUTE), opts.excludeSessionId);
  const buffer = (opts.bufferMinutes ?? settings.bufferMinutes) * MINUTE;
  const step = Math.max(5, settings.slotStepMinutes);

  const today = londonDate(now);
  const slots: Date[] = [];
  for (let i = 0; i <= settings.maxAdvanceDays + 1; i++) {
    // Walk calendar days in London; UTC midnight of the same date gives the weekday.
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const dayRules = rules.filter((r) => r.weekday === day.getUTCDay());
    for (const rule of dayRules) {
      for (let m = rule.startMinute; m + durationMinutes <= rule.endMinute; m += step) {
        const start = londonLocalToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), Math.floor(m / 60), m % 60);
        const s = start.getTime();
        const e = s + durationMinutes * MINUTE;
        if (s < earliest || s > latest) continue;
        const clash = busy.some((b) => {
          const pad = b.buffered ? buffer : 0;
          return s < b.end + pad && e > b.start - pad;
        });
        if (!clash) slots.push(start);
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export function isSlotAvailable(start: Date, durationMinutes: number, excludeSessionId?: number, bufferMinutes?: number | null) {
  return availableSlots(durationMinutes, { excludeSessionId, bufferMinutes }).some((s) => s.getTime() === start.getTime());
}

/** The client's oldest paid package with sessions left (sync twin of lib/packages activeCredit). */
export function creditPackageSync(clientId: number) {
  return (
    getDb()
      .select()
      .from(clientPackages)
      .where(
        and(
          eq(clientPackages.clientId, clientId),
          eq(clientPackages.status, "paid"),
          sql`(select count(*) from coaching_sessions cs where cs.client_package_id = "client_packages"."id" and cs.cancelled_at is null) < "client_packages"."session_count"`,
        ),
      )
      .orderBy(asc(clientPackages.paidAt))
      .get() ?? null
  );
}

/** Groups slots by London calendar day, for the picker. */
export function groupSlotsByDay(slots: Date[]) {
  const days = new Map<string, string[]>();
  for (const s of slots) {
    const d = londonDate(s);
    const key = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
    days.set(key, [...(days.get(key) ?? []), s.toISOString()]);
  }
  return [...days.entries()].map(([date, times]) => ({ date, times }));
}

/** Can a client still change this session themselves? */
export function canClientChange(startsAt: Date, settings: BookingSettings, now = Date.now()) {
  return startsAt.getTime() - settings.cancelCutoffHours * 60 * MINUTE > now;
}
