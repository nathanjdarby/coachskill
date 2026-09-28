import "server-only";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { appointmentAttendance, isNoShow } from "@/lib/attendance";
import { creditPackageSync } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { clientNotes, coachingSessions, users, type Appointment } from "@/lib/db/schema";
import { emailSessionFollowUp } from "@/lib/email";
import { appointmentRecipient } from "@/lib/session-notify";

// The email that goes out after an appointment: thanks, Monika's recap (if she wrote
// one) and the obvious next step. Sent automatically a little after the end, or
// straight away from the session page.

const MINUTE = 60_000;
/** How long after the end the follow-up goes out. */
export const FOLLOW_UP_DELAY_MIN = 30;
/** Older appointments are left alone (so switching this on doesn't email old sessions). */
const FOLLOW_UP_MAX_AGE_MS = 3 * 24 * 60 * MINUTE;

export function endOf(a: Pick<Appointment, "startsAt" | "durationMinutes">) {
  return new Date(a.startsAt.getTime() + a.durationMinutes * MINUTE);
}

/** Everything the follow-up email will say, or why there's nothing to send. */
export async function composeFollowUp(a: Appointment) {
  const recipient = await appointmentRecipient(a);
  if (!recipient) return { error: "There's no email address to send a follow-up to." } as const;

  let next: { text: string; button?: { label: string; url: string } };
  if (!recipient.guest && a.clientId) {
    const credit = creditPackageSync(a.clientId);
    next = credit
      ? {
          text: "When you're ready, book our next session in your client area.",
          button: { label: "Book your next session", url: await appUrl("/portal/sessions#book") },
        }
      : {
          text: "Whenever you'd like to continue, you'll find the coaching packages in your client area.",
          button: { label: "See coaching packages", url: await appUrl("/portal/sessions") },
        };
  } else {
    next = { text: "If you'd like to take the next step, just reply to this email and we'll arrange it." };
  }

  const recap = (a.recap ?? "").trim();
  return {
    recipient,
    email: {
      to: recipient.to,
      name: recipient.name,
      title: a.title,
      recap: recap ? recap.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : [],
      nextText: next.text,
      button: next.button,
    },
  } as const;
}

/**
 * Sends the follow-up once: claimed first, un-claimed if the email doesn't go out.
 * For clients, a recap is also saved as a shared update in their client area.
 */
export async function sendFollowUp(appointmentId: number, now = new Date(), opts: { automatic?: boolean } = {}) {
  const db = getDb();
  const a = db.select().from(coachingSessions).where(eq(coachingSessions.id, appointmentId)).get();
  if (!a || a.cancelledAt) return { ok: false, message: "This appointment was cancelled." } as const;
  if (a.followUpSentAt) return { ok: false, message: "The follow-up has already been sent." } as const;
  if (opts.automatic && isNoShow(appointmentAttendance([a.id]).get(a.id))) {
    return { ok: false, message: "They didn't join the call, so no follow-up was sent." } as const;
  }

  const composed = await composeFollowUp(a);
  if ("error" in composed) return { ok: false, message: composed.error } as const;

  const claimed = db
    .update(coachingSessions)
    .set({ followUpSentAt: now })
    .where(and(eq(coachingSessions.id, a.id), isNull(coachingSessions.followUpSentAt)))
    .run();
  if (claimed.changes !== 1) return { ok: false, message: "The follow-up has already been sent." } as const;

  const result = await emailSessionFollowUp(composed.email);
  if (!result.ok) {
    db.update(coachingSessions).set({ followUpSentAt: null }).where(eq(coachingSessions.id, a.id)).run();
    return { ok: false, message: "The email couldn't be sent. Try again in a moment." } as const;
  }

  if (a.clientId && !composed.recipient.guest && a.recap?.trim()) {
    const author =
      (a.recapById ? db.select({ id: users.id }).from(users).where(eq(users.id, a.recapById)).get() : undefined) ??
      db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).orderBy(asc(users.id)).get();
    if (author) {
      db.insert(clientNotes)
        .values({ clientId: a.clientId, authorId: author.id, body: a.recap.trim(), shared: true, sessionId: a.id, createdAt: now })
        .run();
    }
  }
  return { ok: true, message: `Follow-up sent to ${composed.recipient.to}.` } as const;
}

/** Scheduled job: follow-ups for appointments that ended a little while ago. */
export async function sendDueFollowUps(now: Date) {
  const endedBefore = now.getTime() - FOLLOW_UP_DELAY_MIN * MINUTE;
  const endedAfter = now.getTime() - FOLLOW_UP_MAX_AGE_MS;
  const due = getDb()
    .select({ id: coachingSessions.id })
    .from(coachingSessions)
    .where(
      and(
        isNull(coachingSessions.cancelledAt),
        isNull(coachingSessions.followUpSentAt),
        eq(coachingSessions.followUpEnabled, true),
        lte(sql`${coachingSessions.startsAt} + ${coachingSessions.durationMinutes} * 60000`, endedBefore),
        gte(sql`${coachingSessions.startsAt} + ${coachingSessions.durationMinutes} * 60000`, endedAfter),
      ),
    )
    .all();
  let sent = 0;
  for (const { id } of due) if ((await sendFollowUp(id, now, { automatic: true })).ok) sent++;
  return sent;
}
