import "server-only";
import { and, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { emailBalanceReminder, emailBalanceRequest, type SendResult } from "@/lib/email";
import { balancePayUrl } from "@/lib/payments/workshop";
import { SEAT_STATUSES } from "@/lib/signup-status";

const DAY = 24 * 60 * 60 * 1000;
type ClaimColumn = typeof signups.balanceRequestSentAt | typeof signups.balanceReminderSentAt;

/**
 * Marks the email as sent before sending, so overlapping runs can't double-send.
 * A failed send is un-marked so the next run retries it.
 */
async function claimAndSend(id: number, column: ClaimColumn, send: () => Promise<SendResult>) {
  const db = getDb();
  const key = column === signups.balanceRequestSentAt ? "balanceRequestSentAt" : "balanceReminderSentAt";
  const claimed = db
    .update(signups)
    .set({ [key]: new Date() })
    .where(and(eq(signups.id, id), isNull(column)))
    .run();
  if (claimed.changes !== 1) return false;
  const result = await send();
  if (!result.ok && result.reason === "failed") {
    db.update(signups).set({ [key]: null }).where(eq(signups.id, id)).run();
    return false;
  }
  return true;
}

/** Owes a balance: holds a seat, balance unpaid, run in the future. */
function owing(now: Date) {
  return and(
    isNotNull(signups.depositPaidAt),
    isNull(signups.balancePaidAt),
    inArray(signups.status, [...SEAT_STATUSES]),
    gt(workshops.balancePence, 0),
    isNotNull(workshops.startsAt),
    gt(workshops.startsAt, now),
  );
}

async function due(where: ReturnType<typeof and>) {
  return getDb()
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(where);
}

/** A week before the run, email the balance payment link. */
export async function sendBalanceRequests(now: Date) {
  const rows = await due(
    and(owing(now), isNull(signups.balanceRequestSentAt), lte(workshops.startsAt, new Date(now.getTime() + 7 * DAY))),
  );
  let sent = 0;
  for (const { signup, workshop } of rows) {
    const url = await balancePayUrl(signup.id);
    const ok = await claimAndSend(signup.id, signups.balanceRequestSentAt, () =>
      emailBalanceRequest({
        to: signup.email,
        name: signup.name,
        workshopName: workshop.name,
        startsAt: workshop.startsAt,
        location: workshop.location,
        balancePence: workshop.balancePence,
        url,
      }),
    );
    if (ok) sent++;
  }
  return sent;
}

/** Three days before, remind anyone still unpaid (at least a day after the request). */
export async function sendBalanceReminders(now: Date) {
  const rows = await due(
    and(
      owing(now),
      isNull(signups.balanceReminderSentAt),
      isNotNull(signups.balanceRequestSentAt),
      lte(signups.balanceRequestSentAt, new Date(now.getTime() - DAY)),
      lte(workshops.startsAt, new Date(now.getTime() + 3 * DAY)),
    ),
  );
  let sent = 0;
  for (const { signup, workshop } of rows) {
    const url = await balancePayUrl(signup.id);
    const ok = await claimAndSend(signup.id, signups.balanceReminderSentAt, () =>
      emailBalanceReminder({
        to: signup.email,
        name: signup.name,
        workshopName: workshop.name,
        startsAt: workshop.startsAt,
        location: workshop.location,
        balancePence: workshop.balancePence,
        url,
      }),
    );
    if (ok) sent++;
  }
  return sent;
}

/** Sends the balance link to one attendee now (admin override). Returns the email result. */
export async function sendBalanceLinkNow(signupId: number) {
  const [row] = await getDb()
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(eq(signups.id, signupId))
    .limit(1);
  if (!row) return { ok: false as const, message: "Signup not found." };
  if (row.signup.balancePaidAt) return { ok: false as const, message: "The balance is already paid." };
  const url = await balancePayUrl(signupId);
  const result = await emailBalanceRequest({
    to: row.signup.email,
    name: row.signup.name,
    workshopName: row.workshop.name,
    startsAt: row.workshop.startsAt,
    location: row.workshop.location,
    balancePence: row.workshop.balancePence,
    url,
  });
  getDb()
    .update(signups)
    .set({ balanceRequestSentAt: sql`coalesce(${signups.balanceRequestSentAt}, ${Date.now()})` })
    .where(eq(signups.id, signupId))
    .run();
  return { ok: true as const, emailed: result.ok, url };
}
