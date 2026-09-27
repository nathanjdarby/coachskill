import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getAuthSecret } from "@/lib/auth-secret";
import { getDb } from "@/lib/db";
import { signups, workshops, type Workshop } from "@/lib/db/schema";
import { SEAT_STATUSES } from "@/lib/signup-status";

export type WorkshopWithSeats = Workshop & {
  seatsTaken: number;
  /** Null when the run has no seat limit. */
  seatsLeft: number | null;
};

/** Paid deposits that hold a seat. */
const holdsSeat = and(isNotNull(signups.depositPaidAt), inArray(signups.status, [...SEAT_STATUSES]));

export async function seatsTaken(workshopId: number) {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(signups)
    .where(and(eq(signups.workshopId, workshopId), holdsSeat));
  return row?.n ?? 0;
}

function withSeats(w: Workshop, taken: number): WorkshopWithSeats {
  return { ...w, seatsTaken: taken, seatsLeft: w.capacity == null ? null : Math.max(0, w.capacity - taken) };
}

/** Published runs that haven't started yet, soonest first. */
export async function listUpcomingWorkshops(now = new Date()): Promise<WorkshopWithSeats[]> {
  const rows = await getDb()
    .select()
    .from(workshops)
    .where(and(eq(workshops.published, true), gt(workshops.startsAt, now)))
    .orderBy(asc(workshops.startsAt));
  return Promise.all(rows.map(async (w) => withSeats(w, await seatsTaken(w.id))));
}

/** The run to feature on the public page: the soonest one with seats, else the soonest. */
export async function featuredWorkshop(): Promise<WorkshopWithSeats | null> {
  const upcoming = await listUpcomingWorkshops();
  return upcoming.find((w) => w.seatsLeft !== 0) ?? upcoming[0] ?? null;
}

export type WorkshopAdminRow = WorkshopWithSeats & {
  past: boolean;
  balancePaid: number;
  balanceRequested: number;
  paidPence: number;
};

export async function listWorkshopsForAdmin(): Promise<WorkshopAdminRow[]> {
  const db = getDb();
  const rows = await db.select().from(workshops).orderBy(desc(workshops.startsAt), desc(workshops.createdAt));
  const stats = await db
    .select({
      workshopId: signups.workshopId,
      seats: sql<number>`sum(case when ${signups.depositPaidAt} is not null and ${signups.status} in ('pending', 'accepted') then 1 else 0 end)`,
      balancePaid: sql<number>`sum(case when ${signups.balancePaidAt} is not null then 1 else 0 end)`,
      balanceRequested: sql<number>`sum(case when ${signups.balanceRequestSentAt} is not null and ${signups.balancePaidAt} is null then 1 else 0 end)`,
      paidPence: sql<number>`coalesce(sum(${signups.amountPaidPence}), 0)`,
    })
    .from(signups)
    .groupBy(signups.workshopId);
  const now = Date.now();
  return rows.map((w) => {
    const s = stats.find((r) => r.workshopId === w.id);
    return {
      ...withSeats(w, s?.seats ?? 0),
      past: w.startsAt ? w.startsAt.getTime() < now : false,
      balancePaid: s?.balancePaid ?? 0,
      balanceRequested: s?.balanceRequested ?? 0,
      paidPence: s?.paidPence ?? 0,
    };
  });
}

export async function getWorkshop(id: number) {
  const [row] = await getDb().select().from(workshops).where(eq(workshops.id, id)).limit(1);
  return row ?? null;
}

// — Balance payment links —
// The link is `<signupId>.<hmac>`: stable across the request and reminder
// emails, unguessable, and needs no stored token.

function sign(signupId: number) {
  const secret = getAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET is required to sign balance links");
  return createHmac("sha256", secret).update(`balance:${signupId}`).digest("base64url").slice(0, 32);
}

export function balanceToken(signupId: number) {
  return `${signupId}.${sign(signupId)}`;
}

/** Returns the signup id for a valid token, else null. */
export function verifyBalanceToken(token: string): number | null {
  const m = /^(\d{1,10})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const id = Number(m[1]);
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
