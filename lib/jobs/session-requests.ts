import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { notifySessionDeclined } from "@/lib/session-notify";

/**
 * Scheduled job: a client's request still unapproved when its time arrives is released,
 * so the package session goes back and the client knows to pick another time.
 */
export async function expireSessionRequests(now: Date) {
  const db = getDb();
  const due = db
    .update(coachingSessions)
    .set({ cancelledAt: now, cancelledBy: "admin", icsSequence: sql`${coachingSessions.icsSequence} + 1`, updatedAt: now })
    .where(
      and(
        eq(coachingSessions.awaitingApproval, true),
        isNull(coachingSessions.approvedAt),
        isNull(coachingSessions.cancelledAt),
        lte(coachingSessions.startsAt, now),
      ),
    )
    .returning({ id: coachingSessions.id })
    .all();
  for (const { id } of due) await notifySessionDeclined(id, { expired: true });
  return due.length;
}
