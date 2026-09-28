import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getAuthSecret } from "@/lib/auth-secret";
import { getDb } from "@/lib/db";
import { signups, workshopProgrammes, workshops, type Workshop, type WorkshopProgramme } from "@/lib/db/schema";
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

// — Workshops (programmes) —

/** Where a workshop's image is served from: a /public path as-is, an upload via its route. */
export function programmeImageUrl(p: Pick<WorkshopProgramme, "imageKey">) {
  if (!p.imageKey) return null;
  return p.imageKey.startsWith("/") ? p.imageKey : `/api/workshop-images/${p.imageKey}`;
}

export type ProgrammeWithDates = WorkshopProgramme & { upcoming: WorkshopWithSeats[] };

async function withUpcoming(rows: WorkshopProgramme[], now: Date): Promise<ProgrammeWithDates[]> {
  const upcoming = await listUpcomingWorkshops(now);
  return rows.map((p) => ({ ...p, upcoming: upcoming.filter((w) => w.programmeId === p.id) }));
}

/** Soonest next date first; workshops without upcoming dates last, by title. */
function byNextDate(a: ProgrammeWithDates, b: ProgrammeWithDates) {
  const at = a.upcoming[0]?.startsAt?.getTime() ?? Infinity;
  const bt = b.upcoming[0]?.startsAt?.getTime() ?? Infinity;
  return at === bt ? a.title.localeCompare(b.title) : at - bt;
}

/** Published workshops for the public listing, in date order. */
export async function listPublishedProgrammes(now = new Date()): Promise<ProgrammeWithDates[]> {
  const rows = await getDb().select().from(workshopProgrammes).where(eq(workshopProgrammes.published, true));
  return (await withUpcoming(rows, now)).sort(byNextDate);
}

/** Every workshop for the admin, in date order. */
export async function listProgrammesForAdmin(now = new Date()): Promise<ProgrammeWithDates[]> {
  const rows = await getDb().select().from(workshopProgrammes);
  return (await withUpcoming(rows, now)).sort(byNextDate);
}

export async function getProgrammeBySlug(slug: string, now = new Date()): Promise<ProgrammeWithDates | null> {
  const [row] = await getDb().select().from(workshopProgrammes).where(eq(workshopProgrammes.slug, slug)).limit(1);
  return row ? (await withUpcoming([row], now))[0] : null;
}

export async function getProgramme(id: number) {
  const [row] = await getDb().select().from(workshopProgrammes).where(eq(workshopProgrammes.id, id)).limit(1);
  return row ?? null;
}

/** The public page a run is booked from. */
export async function workshopPagePath(w: Pick<Workshop, "programmeId">) {
  const p = w.programmeId == null ? null : await getProgramme(w.programmeId);
  return p ? `/workshop/${p.slug}` : "/workshop";
}

/** The run to feature on the public page: the soonest one with seats, else the soonest. */
export async function featuredWorkshop(): Promise<WorkshopWithSeats | null> {
  const upcoming = await listUpcomingWorkshops();
  return upcoming.find((w) => w.seatsLeft !== 0) ?? upcoming[0] ?? null;
}

export type WorkshopAdminRow = WorkshopWithSeats & {
  past: boolean;
  /** False when the date's workshop page is still a draft. */
  pagePublished: boolean;
  balancePaid: number;
  balanceRequested: number;
  paidPence: number;
};

export async function listWorkshopsForAdmin(): Promise<WorkshopAdminRow[]> {
  const db = getDb();
  const rows = await db.select().from(workshops).orderBy(desc(workshops.startsAt), desc(workshops.createdAt));
  const pages = await db.select({ id: workshopProgrammes.id, published: workshopProgrammes.published }).from(workshopProgrammes);
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
      pagePublished: pages.find((p) => p.id === w.programmeId)?.published ?? false,
      balancePaid: s?.balancePaid ?? 0,
      balanceRequested: s?.balanceRequested ?? 0,
      paidPence: s?.paidPence ?? 0,
    };
  });
}

/** The admin badge for a run. */
export function workshopStatus(w: Pick<WorkshopAdminRow, "past" | "published" | "startsAt" | "pagePublished">) {
  if (w.past) return { label: "Past", tone: "" };
  if (w.published && !w.pagePublished) return { label: "Workshop in draft", tone: "is-warn" };
  if (w.published) return { label: "On sale", tone: "is-ok" };
  return { label: w.startsAt ? "Hidden" : "No date", tone: "is-warn" };
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
