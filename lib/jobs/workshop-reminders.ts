import "server-only";
import { and, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { emailWorkshopReminder } from "@/lib/email";
import { SEAT_STATUSES } from "@/lib/signup-status";
import { workshopJoinUrl } from "@/lib/workshop-invite";

const HOUR = 60 * 60 * 1000;

type Window = "24h" | "1h";

/**
 * Reminds everyone holding a place on a workshop starting within the window. Each
 * signup is claimed before sending and un-claimed if the email didn't go out.
 */
async function sendReminders(now: Date, window: Window) {
  const db = getDb();
  const column = window === "24h" ? signups.reminder24hSentAt : signups.reminder1hSentAt;
  const key = window === "24h" ? "reminder24hSentAt" : "reminder1hSentAt";
  const horizon = new Date(now.getTime() + (window === "24h" ? 24 : 1) * HOUR);

  const due = db
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(
      and(
        isNotNull(signups.depositPaidAt),
        inArray(signups.status, [...SEAT_STATUSES]),
        isNull(column),
        isNotNull(workshops.startsAt),
        // The day-before reminder leaves workshops under an hour away to the 1-hour one.
        gt(workshops.startsAt, window === "24h" ? new Date(now.getTime() + HOUR) : now),
        lte(workshops.startsAt, horizon),
        // Booked in the last day: the confirmation is recent enough, skip the day-before one.
        window === "24h" ? sql`${workshops.startsAt} - ${signups.depositPaidAt} >= ${25 * HOUR}` : undefined,
      ),
    )
    .all();

  const url = await appUrl("/portal");
  let sent = 0;
  for (const { signup, workshop } of due) {
    const claimed = db
      .update(signups)
      .set({ [key]: new Date() })
      .where(and(eq(signups.id, signup.id), isNull(column)))
      .run();
    if (claimed.changes !== 1) continue;
    const result = await emailWorkshopReminder({
      to: signup.email,
      name: signup.name,
      workshopName: workshop.name,
      startsAt: workshop.startsAt,
      location: workshop.location,
      meetingUrl: workshopJoinUrl(workshop),
      url,
      when: window === "1h" ? "soon" : "tomorrow",
    });
    if (!result.ok) {
      db.update(signups).set({ [key]: null }).where(eq(signups.id, signup.id)).run();
      continue;
    }
    sent++;
  }
  return sent;
}

export const sendWorkshopReminders24h = (now: Date) => sendReminders(now, "24h");
export const sendWorkshopReminders1h = (now: Date) => sendReminders(now, "1h");
