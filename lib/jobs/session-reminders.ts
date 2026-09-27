import "server-only";
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { emailSessionReminder } from "@/lib/email";
import { appointmentRecipient } from "@/lib/session-notify";

const HOUR = 60 * 60 * 1000;

type Window = "24h" | "1h";

/**
 * Emails a reminder for sessions starting within the window. Each session is claimed
 * before sending and un-claimed if the email didn't go out, so it's sent exactly once.
 */
async function sendReminders(now: Date, window: Window) {
  const db = getDb();
  const column = window === "24h" ? coachingSessions.reminder24hSentAt : coachingSessions.reminder1hSentAt;
  const key = window === "24h" ? "reminder24hSentAt" : "reminder1hSentAt";
  const horizon = new Date(now.getTime() + (window === "24h" ? 24 : 1) * HOUR);

  const due = await db
    .select()
    .from(coachingSessions)
    .where(
      and(
        isNull(coachingSessions.cancelledAt),
        isNull(column),
        // The day-before reminder leaves sessions under an hour away to the 1-hour one.
        gt(coachingSessions.startsAt, window === "24h" ? new Date(now.getTime() + HOUR) : now),
        lte(coachingSessions.startsAt, horizon),
        // Booked less than 25h ahead: the booking email is recent enough, skip the day-before one.
        window === "24h"
          ? sql`${coachingSessions.startsAt} - coalesce(${coachingSessions.updatedAt}, ${coachingSessions.createdAt}) >= ${25 * HOUR}`
          : undefined,
      ),
    );

  let sent = 0;
  for (const session of due) {
    // Clients with an account, or prospects booked by email.
    const recipient = await appointmentRecipient(session);
    if (!recipient) continue;
    const claimed = db
      .update(coachingSessions)
      .set({ [key]: new Date() })
      .where(and(eq(coachingSessions.id, session.id), isNull(column)))
      .run();
    if (claimed.changes !== 1) continue;
    const result = await emailSessionReminder({
      ...recipient,
      title: session.title,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
      meetingUrl: session.meetingUrl,
      when: window === "1h" ? "soon" : "tomorrow",
    });
    if (!result.ok) {
      db.update(coachingSessions).set({ [key]: null }).where(eq(coachingSessions.id, session.id)).run();
      continue;
    }
    sent++;
  }
  return sent;
}

export const sendSessionReminders24h = (now: Date) => sendReminders(now, "24h");
export const sendSessionReminders1h = (now: Date) => sendReminders(now, "1h");
